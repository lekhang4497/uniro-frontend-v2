// Framework-agnostic router-builder agent loop.
//
// Spec §6.2. A single user message kicks off up to MAX_TURNS_PER_USER_MSG
// turns. Each turn calls /api/v1/chat/completions with the current message
// list and OpenAI-shape tool definitions, streams text deltas back through
// `onAssistantDelta`, then executes any returned tool_calls (up to
// MAX_TOOLS_PER_TURN). The loop stops when the assistant returns no
// tool_calls or budgets are exhausted.
//
// Error handling (per spec §11):
//   - LLM call network failure -> throws (caller surfaces as system msg)
//   - Aborted mid-stream -> caller's signal fires; we push the partial
//     assistant text and rethrow `AbortError`
//   - Malformed tool args (JSON parse fails) -> push a structured
//     `malformed_args` tool result, continue the loop
//   - Unknown tool name -> push `unknown_tool` tool result, continue
//   - Tool execute() throws -> push `tool_threw` tool result, continue

import { findTool, toOpenAiDefinitions } from "./tools/index.js";

export const MAX_TURNS_PER_USER_MSG = 12;
export const MAX_TOOLS_PER_TURN = 8;

const ENDPOINT = "/api/v1/chat/completions";

/**
 * @param {object} opts
 * @param {Array} opts.messages           Existing conversation (OpenAI-shaped, no system message)
 * @param {string} opts.userInput         The new user message text
 * @param {string} opts.model             Reasoning model alias
 * @param {Array} opts.tools              Output of createTools() — each {definition, execute}
 * @param {string} opts.systemPrompt
 * @param {AbortSignal} [opts.signal]
 * @param {(delta: string) => void} [opts.onAssistantDelta]    Token-by-token text
 * @param {(msg: object) => void} [opts.onMessageAppend]       Whole assistant or tool message added
 * @param {(call: object, result: object) => void} [opts.onToolCallResult]
 * @param {(err: Error) => void} [opts.onError]
 * @param {typeof fetch} [opts.fetchImpl]  Override (for tests). Defaults to global fetch.
 * @returns {Promise<Array>}              The full updated messages array (system message stripped).
 */
export async function runAgentTurn(opts) {
  const {
    messages = [],
    userInput,
    model,
    tools,
    systemPrompt,
    signal,
    onAssistantDelta,
    onMessageAppend,
    onToolCallResult,
    onError,
    fetchImpl,
  } = opts;

  if (typeof userInput !== "string" || userInput.length === 0) {
    throw new Error("userInput must be a non-empty string");
  }
  if (!Array.isArray(tools)) {
    throw new Error("tools must be an array");
  }

  const fetchFn = fetchImpl || globalThis.fetch;
  const toolDefs = toOpenAiDefinitions(tools);

  const userMessage = { role: "user", content: userInput };
  const conversation = [...messages, userMessage];
  onMessageAppend?.(userMessage);

  let turns = 0;

  try {
    while (turns < MAX_TURNS_PER_USER_MSG) {
      throwIfAborted(signal);

      const messagesWithSystem = [
        { role: "system", content: systemPrompt },
        ...conversation,
      ];

      const assistantMsg = await streamChatCompletion({
        fetchFn,
        model,
        messages: messagesWithSystem,
        tools: toolDefs,
        signal,
        onAssistantDelta,
      });

      conversation.push(assistantMsg);
      onMessageAppend?.(assistantMsg);

      const toolCalls = Array.isArray(assistantMsg.tool_calls)
        ? assistantMsg.tool_calls
        : [];

      if (toolCalls.length === 0) {
        // Finished — model returned no tool_calls.
        return conversation;
      }

      const callsToRun = toolCalls.slice(0, MAX_TOOLS_PER_TURN);
      for (const call of callsToRun) {
        throwIfAborted(signal);
        const toolResult = await runOneToolCall(call, tools);
        const toolMsg = {
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(toolResult),
        };
        conversation.push(toolMsg);
        onMessageAppend?.(toolMsg);
        onToolCallResult?.(call, toolResult);
      }

      turns += 1;
    }

    // Turn budget exhausted.
    const sysMsg = {
      role: "system",
      content: "Agent exceeded turn budget; stopping.",
    };
    conversation.push(sysMsg);
    onMessageAppend?.(sysMsg);
    return conversation;
  } catch (err) {
    if (err && err.name === "AbortError") throw err;
    onError?.(err);
    throw err;
  }
}

function throwIfAborted(signal) {
  if (signal && signal.aborted) {
    const e = new Error("Aborted");
    e.name = "AbortError";
    throw e;
  }
}

/**
 * Run a single tool call. Returns a result object that will be JSON-
 * stringified into the tool message content. Never throws -- structured
 * errors become normal result objects so the model can recover.
 */
async function runOneToolCall(call, tools) {
  const fn = call?.function || {};
  const name = fn.name;

  if (!name) {
    return { ok: false, error: { code: "malformed_args", message: "Tool call has no function name." } };
  }

  const tool = findTool(tools, name);
  if (!tool) {
    return { ok: false, error: { code: "unknown_tool", message: `Unknown tool '${name}'.` } };
  }

  let args;
  try {
    args = fn.arguments == null || fn.arguments === "" ? {} : JSON.parse(fn.arguments);
  } catch (e) {
    return {
      ok: false,
      error: { code: "malformed_args", message: `Tool '${name}' arguments are not valid JSON: ${e.message}` },
    };
  }

  try {
    return await tool.execute(args);
  } catch (e) {
    return {
      ok: false,
      error: { code: "tool_threw", message: e && e.message ? e.message : String(e) },
    };
  }
}

/**
 * Stream a single chat completion. Returns the final assistant message
 * (with content + tool_calls accumulated from deltas).
 *
 * Parses OpenAI's SSE format manually. Each `data:` line is JSON except for
 * the terminator `[DONE]`. Deltas accumulate:
 *   - choices[0].delta.content -> text
 *   - choices[0].delta.tool_calls[i] -> {id, function.{name, arguments}}
 *     where arguments stream as partial JSON strings keyed by index.
 */
async function streamChatCompletion({
  fetchFn,
  model,
  messages,
  tools,
  signal,
  onAssistantDelta,
}) {
  const body = JSON.stringify({
    model,
    messages,
    tools: tools.length > 0 ? tools : undefined,
    stream: true,
  });

  const response = await fetchFn(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    signal,
  });

  if (!response.ok) {
    let detail = "";
    try {
      detail = await response.text();
    } catch {
      // ignore
    }
    throw new Error(
      `LLM request failed: ${response.status} ${response.statusText}${detail ? `: ${detail.slice(0, 200)}` : ""}`
    );
  }

  if (!response.body) {
    throw new Error("LLM response has no body");
  }

  return await parseSseAssistant(response.body, { signal, onAssistantDelta });
}

/**
 * Read an OpenAI SSE stream and return the accumulated assistant message.
 */
async function parseSseAssistant(stream, { signal, onAssistantDelta }) {
  const reader = stream.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let content = "";
  /** @type {Array<{id: string, type: string, function: {name: string, arguments: string}}>} */
  const toolCalls = [];

  try {
    while (true) {
      if (signal && signal.aborted) {
        const e = new Error("Aborted");
        e.name = "AbortError";
        throw e;
      }

      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE events are separated by blank lines. Split on \n and walk.
      let nlIdx;
      while ((nlIdx = buffer.indexOf("\n")) !== -1) {
        const rawLine = buffer.slice(0, nlIdx).replace(/\r$/, "");
        buffer = buffer.slice(nlIdx + 1);
        if (!rawLine.startsWith("data:")) continue;
        const data = rawLine.slice(5).trim();
        if (data === "" || data === "[DONE]") continue;

        let chunk;
        try {
          chunk = JSON.parse(data);
        } catch {
          // Skip unparseable lines; some upstreams sprinkle keep-alives.
          continue;
        }

        const delta = chunk?.choices?.[0]?.delta;
        if (!delta) continue;

        if (typeof delta.content === "string" && delta.content.length > 0) {
          content += delta.content;
          onAssistantDelta?.(delta.content);
        }

        if (Array.isArray(delta.tool_calls)) {
          for (const dt of delta.tool_calls) {
            applyToolCallDelta(toolCalls, dt);
          }
        }
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // ignore
    }
  }

  const msg = { role: "assistant", content };
  if (toolCalls.length > 0) msg.tool_calls = toolCalls;
  return msg;
}

function applyToolCallDelta(toolCalls, delta) {
  if (!delta || typeof delta !== "object") return;
  const idx = typeof delta.index === "number" ? delta.index : toolCalls.length;
  let entry = toolCalls[idx];
  if (!entry) {
    entry = { id: "", type: "function", function: { name: "", arguments: "" } };
    toolCalls[idx] = entry;
  }
  if (typeof delta.id === "string" && delta.id.length > 0) entry.id = delta.id;
  if (typeof delta.type === "string" && delta.type.length > 0) entry.type = delta.type;
  const fn = delta.function || {};
  if (typeof fn.name === "string" && fn.name.length > 0) {
    entry.function.name += fn.name;
  }
  if (typeof fn.arguments === "string") {
    entry.function.arguments += fn.arguments;
  }
}
