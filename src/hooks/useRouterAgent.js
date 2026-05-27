"use client";

// React hook wiring the router-builder agent into a page.
//
// Responsibilities:
//   - Load the persisted thread + skill manifest on mount.
//   - Expose `send(text)` which runs runAgentTurn against the OpenAI gateway
//     and the live YAML store.
//   - Persist the user message before the LLM call (spec §6.2 "Persistence
//     timing"). Persist updated messages atomically after each turn.
//   - Surface streaming text and accumulated tool calls so the UI can show
//     in-progress state.
//   - Expose `cancel()` (aborts the loop) and `resetThread()` (DELETEs the
//     thread row and clears local state).
//
// Reasoning model is read from /api/agent-settings; if unset the hook
// exposes `reasoningModelMissing: true` and `send()` refuses.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouterYamlStore } from "./useRouterYamlStore.js";
import { runAgentTurn } from "@/lib/router-agent/agent.js";
import { buildSystemPrompt } from "@/lib/router-agent/systemPrompt.js";
import { createTools } from "@/lib/router-agent/tools/index.js";
import {
  parseYaml,
  stringifyYaml,
  summarizeYaml,
} from "@/lib/router-agent/yaml.js";
import { validateYaml } from "@/lib/router-agent/validator/index.js";

const SUGGESTED_PROMPTS = [
  "Build a fallback chain: try a cheap model first, fall back to a strong one.",
  "Route Vietnamese to gemini-1.5-flash, English to gpt-4o-mini.",
  "Add a PII guard before any cloud model.",
  "Set a daily cost cap of $5 across this router.",
  "Send code-completion traffic to a fast model and everything else to a strong one.",
];

function safeValidate(yaml) {
  if (typeof yaml !== "string" || yaml.trim() === "") {
    return { ok: true, errors: [], warnings: [] };
  }
  try {
    return validateYaml(yaml);
  } catch (e) {
    return {
      ok: false,
      errors: [
        { path: "$", code: "validator_threw", message: e?.message || String(e) },
      ],
      warnings: [],
    };
  }
}

async function persistThread(routerId, messages) {
  if (!routerId) return;
  try {
    await fetch(`/api/router-agent/threads/${encodeURIComponent(routerId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
  } catch (e) {
    // Spec §11: thread persistence failure surfaces as a toast; the hook
    // logs and keeps the in-memory state.
    console.log("[useRouterAgent] persistThread failed:", e?.message || e);
  }
}

// Module-level skill cache. Spec §14 notes the body cache is deferred; a
// module-singleton Map is the smallest thing that prevents redundant
// fetches within a single page lifetime, and survives hook remounts.
const SKILL_CACHE = new Map();
async function loadSkillFromServer(name) {
  if (SKILL_CACHE.has(name)) return SKILL_CACHE.get(name);
  try {
    const res = await fetch(`/api/router-agent/skills/${encodeURIComponent(name)}`);
    if (!res.ok) {
      const result = { error: `Skill '${name}' not found (HTTP ${res.status}).` };
      SKILL_CACHE.set(name, result);
      return result;
    }
    const body = await res.text();
    const result = { body };
    SKILL_CACHE.set(name, result);
    return result;
  } catch (e) {
    return { error: `Skill '${name}' fetch failed: ${e?.message || e}` };
  }
}

/**
 * @param {object} opts
 * @param {string|null} opts.routerId
 */
export function useRouterAgent({ routerId }) {
  const setRouterId = useRouterYamlStore((s) => s.setRouterId);
  const loadInitial = useRouterYamlStore((s) => s.loadInitial);

  const [messages, setMessages] = useState([]);
  const [streaming, setStreaming] = useState({
    active: false,
    currentAssistantText: "",
  });
  const [lastToolCalls, setLastToolCalls] = useState([]);
  const [error, setError] = useState(null);
  const [reasoningModel, setReasoningModel] = useState("");
  const [reasoningModelLoaded, setReasoningModelLoaded] = useState(false);
  const [skills, setSkills] = useState([]);

  const abortRef = useRef(null);

  // Reflect routerId into the store.
  useEffect(() => {
    setRouterId(routerId);
  }, [routerId, setRouterId]);

  // Bootstrap: thread + reasoning model + manifest.
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      // Reasoning model
      try {
        const res = await fetch("/api/agent-settings");
        if (res.ok) {
          const json = await res.json().catch(() => ({}));
          if (!cancelled) {
            setReasoningModel(json?.reasoningModel || "");
            setReasoningModelLoaded(true);
          }
        } else if (!cancelled) {
          setReasoningModelLoaded(true);
        }
      } catch {
        if (!cancelled) setReasoningModelLoaded(true);
      }

      // Manifest
      try {
        const res = await fetch("/api/router-agent/manifest");
        if (res.ok) {
          const json = await res.json().catch(() => ({}));
          if (!cancelled && Array.isArray(json?.skills)) {
            setSkills(json.skills);
          }
        }
      } catch {
        // skills stay empty; system prompt notes "no skills available"
      }

      // Thread
      if (routerId) {
        try {
          const res = await fetch(
            `/api/router-agent/threads/${encodeURIComponent(routerId)}`
          );
          if (res.ok) {
            const json = await res.json().catch(() => ({}));
            const msgs = Array.isArray(json?.messages) ? json.messages : [];
            if (!cancelled) setMessages(msgs);
          }
        } catch {
          // Empty thread is fine.
        }
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [routerId]);

  // Build the tool registry once. Reads of YAML go through
  // useRouterYamlStore.getState() inside the async tool bodies, so we don't
  // need to subscribe in the hook (and don't trigger a re-render when the
  // store changes — the tools always see the latest value).
  const tools = useMemo(() => {
    return createTools({
      getYaml: () => useRouterYamlStore.getState().yaml,
      setYaml: (next, meta) => useRouterYamlStore.getState().setYaml(next, meta),
      validate: (text) => safeValidate(text),
      summarize: (text) => summarizeYaml(text),
      loadSkill: loadSkillFromServer,
      parseYaml,
      stringifyYaml,
    });
  }, []);

  const reasoningModelMissing = reasoningModelLoaded && !reasoningModel;

  const send = useCallback(
    async (text) => {
      if (typeof text !== "string" || text.trim() === "") return;
      if (!reasoningModel) {
        setError(
          new Error(
            "No reasoning model configured. Pick one in Settings before chatting."
          )
        );
        return;
      }
      if (streaming.active) return;

      const trimmed = text;
      setError(null);
      setLastToolCalls([]);
      setStreaming({ active: true, currentAssistantText: "" });

      const baseMessages = messages;
      const userMessage = { role: "user", content: trimmed };
      // Persist user message before the LLM call (spec §6.2).
      const optimisticMessages = baseMessages.concat(userMessage);
      setMessages(optimisticMessages);
      await persistThread(routerId, optimisticMessages);

      const ac = new AbortController();
      abortRef.current = ac;

      const currentYaml = useRouterYamlStore.getState().yaml;
      const summary = summarizeYaml(currentYaml);
      const validation = safeValidate(currentYaml);
      const systemPrompt = buildSystemPrompt({
        routerId,
        yaml: currentYaml,
        validation,
        summary,
        skills,
      });

      // We let runAgentTurn append the user message itself onto its
      // returned conversation — but we already optimistically appended.
      // To avoid double-counting we pass baseMessages and rely on the
      // loop's onMessageAppend to feed the final conversation back.
      let assistantChunks = "";
      const liveCalls = [];
      const turnAppendedMessages = [];

      try {
        const finalMessages = await runAgentTurn({
          messages: baseMessages,
          userInput: trimmed,
          model: reasoningModel,
          tools,
          systemPrompt,
          signal: ac.signal,
          onAssistantDelta: (delta) => {
            assistantChunks += delta;
            setStreaming({ active: true, currentAssistantText: assistantChunks });
          },
          onMessageAppend: (msg) => {
            turnAppendedMessages.push(msg);
            if (msg.role === "assistant") {
              // Reset streaming buffer for the next turn within this user msg.
              assistantChunks = "";
              setStreaming({ active: true, currentAssistantText: "" });
            }
            setMessages(baseMessages.concat(turnAppendedMessages));
          },
          onToolCallResult: (call, result) => {
            liveCalls.push({ call, result, when: Date.now() });
            setLastToolCalls(liveCalls.slice());
          },
          onError: (e) => {
            console.log("[useRouterAgent] error:", e?.message || e);
          },
        });

        setMessages(finalMessages);
        await persistThread(routerId, finalMessages);
      } catch (e) {
        if (e?.name === "AbortError") {
          // Push a partial assistant message if we captured any text.
          if (assistantChunks.length > 0) {
            const aborted = {
              role: "assistant",
              content: assistantChunks + "\n\n[aborted by user]",
            };
            const merged = baseMessages.concat(turnAppendedMessages, [aborted]);
            setMessages(merged);
            await persistThread(routerId, merged);
          }
        } else {
          const errMsg = {
            role: "system",
            content: `Agent error: ${e?.message || e}`,
          };
          const merged = baseMessages.concat(turnAppendedMessages, [errMsg]);
          setMessages(merged);
          await persistThread(routerId, merged);
          setError(e instanceof Error ? e : new Error(String(e)));
        }
      } finally {
        abortRef.current = null;
        setStreaming({ active: false, currentAssistantText: "" });
      }
    },
    [messages, reasoningModel, routerId, skills, streaming.active, tools]
  );

  const cancel = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
  }, []);

  const resetThread = useCallback(async () => {
    if (!routerId) {
      setMessages([]);
      return;
    }
    try {
      await fetch(
        `/api/router-agent/threads/${encodeURIComponent(routerId)}`,
        { method: "DELETE" }
      );
    } catch (e) {
      console.log("[useRouterAgent] resetThread failed:", e?.message || e);
    }
    setMessages([]);
    setLastToolCalls([]);
    setError(null);
  }, [routerId]);

  // Convenience: loadInitial passthrough so a page can bootstrap YAML from
  // its router fetch without importing the store separately.
  const loadInitialYaml = useCallback(
    (text) => {
      loadInitial(text);
    },
    [loadInitial]
  );

  return {
    messages,
    streaming,
    send,
    cancel,
    resetThread,
    error,
    reasoningModel,
    reasoningModelMissing,
    suggestedPrompts: SUGGESTED_PROMPTS,
    lastToolCalls,
    loadInitialYaml,
    skills,
  };
}
