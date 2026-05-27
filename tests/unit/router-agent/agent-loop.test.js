// Tests for the framework-agnostic agent loop.
//
// We stub fetch with a ReadableStream that emits a deterministic OpenAI SSE
// transcript. The fixtures exercise:
//   - a single tool_call followed by a final assistant message
//   - malformed tool arguments (JSON.parse failure) -> structured tool result
//   - MAX_TOOLS_PER_TURN cap (loop runs only the first 8)
//   - MAX_TURNS_PER_USER_MSG cap (loop stops at 12 turns)

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  runAgentTurn,
  MAX_TURNS_PER_USER_MSG,
  MAX_TOOLS_PER_TURN,
} from "@/lib/router-agent/agent.js";
import { createTools, findTool } from "@/lib/router-agent/tools/index.js";
import { parseYaml, stringifyYaml, summarizeYaml } from "@/lib/router-agent/yaml.js";

function sseStream(events) {
  // events: Array<object | "[DONE]"> -> ReadableStream<Uint8Array>
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const e of events) {
        const line = e === "[DONE]" ? "data: [DONE]\n\n" : `data: ${JSON.stringify(e)}\n\n`;
        controller.enqueue(encoder.encode(line));
      }
      controller.close();
    },
  });
}

function makeAssistantChunk({ content, toolCalls, finishReason }) {
  return {
    choices: [
      {
        index: 0,
        delta: {
          ...(content ? { content } : {}),
          ...(toolCalls ? { tool_calls: toolCalls } : {}),
        },
        finish_reason: finishReason || null,
      },
    ],
  };
}

function toolCallDelta({ index, id, name, args }) {
  return {
    index,
    ...(id ? { id, type: "function" } : {}),
    function: {
      ...(name ? { name } : {}),
      ...(args != null ? { arguments: args } : {}),
    },
  };
}

function makeCtx(initialYaml = "") {
  const store = { yaml: initialYaml };
  return createTools({
    getYaml: () => store.yaml,
    setYaml: (next) => {
      store.yaml = next;
    },
    validate: () => ({ ok: true, errors: [], warnings: [] }),
    summarize: summarizeYaml,
    parseYaml,
    stringifyYaml,
    loadSkill: async () => ({ body: "stub" }),
  });
}

function makeFetchStub(responseStreams) {
  // Each call to fetch returns the next preconfigured stream.
  const queue = [...responseStreams];
  return vi.fn(async () => {
    const stream = queue.shift();
    if (!stream) throw new Error("fetchStub: ran out of stubbed responses");
    return new Response(stream, {
      status: 200,
      headers: { "Content-Type": "text/event-stream" },
    });
  });
}

describe("runAgentTurn", () => {
  it("runs a tool call then returns the final assistant message", async () => {
    const tools = makeCtx("");
    const fetchImpl = makeFetchStub([
      // Turn 1: assistant streams a brief text + one tool call to add_signal.
      sseStream([
        makeAssistantChunk({ content: "Adding a signal." }),
        makeAssistantChunk({
          toolCalls: [
            toolCallDelta({
              index: 0,
              id: "call_1",
              name: "add_signal",
              args: '{"name":"lang","type":"language"}',
            }),
          ],
          finishReason: "tool_calls",
        }),
        "[DONE]",
      ]),
      // Turn 2: assistant returns plain text, no tool_calls -> loop ends.
      sseStream([
        makeAssistantChunk({ content: "Done!" }),
        makeAssistantChunk({ finishReason: "stop" }),
        "[DONE]",
      ]),
    ]);

    const onMessageAppend = vi.fn();
    const onAssistantDelta = vi.fn();
    const onToolCallResult = vi.fn();

    const result = await runAgentTurn({
      messages: [],
      userInput: "add a language signal",
      model: "test-model",
      tools,
      systemPrompt: "system",
      fetchImpl,
      onMessageAppend,
      onAssistantDelta,
      onToolCallResult,
    });

    expect(result.map((m) => m.role)).toEqual([
      "user",
      "assistant",
      "tool",
      "assistant",
    ]);
    expect(result[0].content).toBe("add a language signal");
    expect(result[1].tool_calls).toHaveLength(1);
    expect(result[1].tool_calls[0].function.name).toBe("add_signal");
    const toolResult = JSON.parse(result[2].content);
    expect(toolResult.ok).toBe(true);
    expect(result[3].content).toBe("Done!");
    // onAssistantDelta saw token text
    expect(onAssistantDelta).toHaveBeenCalled();
    // onToolCallResult was called once for add_signal
    expect(onToolCallResult).toHaveBeenCalledTimes(1);
    expect(onToolCallResult.mock.calls[0][0].function.name).toBe("add_signal");
  });

  it("pushes malformed_args result when tool arguments are not valid JSON", async () => {
    const tools = makeCtx("");
    const fetchImpl = makeFetchStub([
      sseStream([
        makeAssistantChunk({
          toolCalls: [
            toolCallDelta({
              index: 0,
              id: "call_bad",
              name: "add_signal",
              args: "{not valid json",
            }),
          ],
          finishReason: "tool_calls",
        }),
        "[DONE]",
      ]),
      sseStream([
        makeAssistantChunk({ content: "fixed it" }),
        makeAssistantChunk({ finishReason: "stop" }),
        "[DONE]",
      ]),
    ]);

    const result = await runAgentTurn({
      messages: [],
      userInput: "do the thing",
      model: "test-model",
      tools,
      systemPrompt: "system",
      fetchImpl,
    });

    const toolMsg = result.find((m) => m.role === "tool");
    expect(toolMsg).toBeDefined();
    const parsed = JSON.parse(toolMsg.content);
    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toBe("malformed_args");
  });

  it("returns unknown_tool result when tool name is not registered", async () => {
    const tools = makeCtx("");
    const fetchImpl = makeFetchStub([
      sseStream([
        makeAssistantChunk({
          toolCalls: [
            toolCallDelta({
              index: 0,
              id: "call_x",
              name: "nonexistent_tool",
              args: "{}",
            }),
          ],
          finishReason: "tool_calls",
        }),
        "[DONE]",
      ]),
      sseStream([
        makeAssistantChunk({ content: "ok" }),
        makeAssistantChunk({ finishReason: "stop" }),
        "[DONE]",
      ]),
    ]);

    const result = await runAgentTurn({
      messages: [],
      userInput: "test",
      model: "test-model",
      tools,
      systemPrompt: "system",
      fetchImpl,
    });

    const toolMsg = result.find((m) => m.role === "tool");
    const parsed = JSON.parse(toolMsg.content);
    expect(parsed.error.code).toBe("unknown_tool");
  });

  it("respects MAX_TOOLS_PER_TURN (only first 8 of 10 calls executed)", async () => {
    const tools = makeCtx("");
    // 10 tool call deltas in one assistant message.
    const tenCalls = Array.from({ length: 10 }, (_, i) =>
      toolCallDelta({
        index: i,
        id: `call_${i}`,
        name: "validate_router",
        args: "{}",
      })
    );

    const fetchImpl = makeFetchStub([
      sseStream([
        makeAssistantChunk({ toolCalls: tenCalls, finishReason: "tool_calls" }),
        "[DONE]",
      ]),
      sseStream([
        makeAssistantChunk({ content: "ok" }),
        makeAssistantChunk({ finishReason: "stop" }),
        "[DONE]",
      ]),
    ]);

    const onToolCallResult = vi.fn();

    const result = await runAgentTurn({
      messages: [],
      userInput: "spray",
      model: "test-model",
      tools,
      systemPrompt: "system",
      fetchImpl,
      onToolCallResult,
    });

    const toolMessages = result.filter((m) => m.role === "tool");
    expect(toolMessages).toHaveLength(MAX_TOOLS_PER_TURN); // 8, not 10
    expect(onToolCallResult).toHaveBeenCalledTimes(MAX_TOOLS_PER_TURN);
  });

  it("stops after MAX_TURNS_PER_USER_MSG with a cautionary system message", async () => {
    const tools = makeCtx("");
    // Build an infinite supply of "tool_calls" turns (one tool_call each).
    const responses = [];
    for (let i = 0; i < MAX_TURNS_PER_USER_MSG + 5; i++) {
      responses.push(
        sseStream([
          makeAssistantChunk({
            toolCalls: [
              toolCallDelta({
                index: 0,
                id: `c_${i}`,
                name: "validate_router",
                args: "{}",
              }),
            ],
            finishReason: "tool_calls",
          }),
          "[DONE]",
        ])
      );
    }
    const fetchImpl = makeFetchStub(responses);

    const result = await runAgentTurn({
      messages: [],
      userInput: "loop forever",
      model: "test-model",
      tools,
      systemPrompt: "system",
      fetchImpl,
    });

    // The loop made exactly MAX_TURNS_PER_USER_MSG LLM calls.
    expect(fetchImpl).toHaveBeenCalledTimes(MAX_TURNS_PER_USER_MSG);
    // Final message is the cautionary system note.
    const last = result[result.length - 1];
    expect(last.role).toBe("system");
    expect(last.content).toMatch(/turn budget/i);
  });

  it("preserves existing messages and appends in order", async () => {
    const tools = makeCtx("");
    const prior = [
      { role: "user", content: "hi" },
      { role: "assistant", content: "hello" },
    ];
    const fetchImpl = makeFetchStub([
      sseStream([
        makeAssistantChunk({ content: "ack" }),
        makeAssistantChunk({ finishReason: "stop" }),
        "[DONE]",
      ]),
    ]);

    const result = await runAgentTurn({
      messages: prior,
      userInput: "again",
      model: "test-model",
      tools,
      systemPrompt: "system",
      fetchImpl,
    });

    expect(result.slice(0, 2)).toEqual(prior);
    expect(result[2]).toEqual({ role: "user", content: "again" });
    expect(result[3].role).toBe("assistant");
    expect(result[3].content).toBe("ack");
  });
});
