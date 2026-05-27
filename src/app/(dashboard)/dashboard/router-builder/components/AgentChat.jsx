"use client";

// Chat tab inside the right dock. Renders the persistent thread and the
// composer. Spec §9.2 + §11:
//   - If the user has no reasoning model configured, show a banner and
//     disable the composer.
//   - Stream assistant text token-by-token.
//   - Render tool calls as compact cards attached to the assistant message.
//   - Render system messages as small italic notices.
//   - Empty state: 3-5 suggested prompts as clickable buttons.
//   - Composer: textarea, Cmd/Ctrl+Enter to send, disabled during streaming.

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Send, Settings, Square, Wrench } from "lucide-react";

import { cn } from "@/lib/utils";

export function AgentChat({ agent, onOpenSettings, onFocusComposer }) {
  const {
    messages,
    streaming,
    send,
    cancel,
    error,
    reasoningModelMissing,
    suggestedPrompts,
  } = agent;

  const [input, setInput] = useState("");
  const listRef = useRef(null);

  // Auto-scroll on new content.
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, streaming.currentAssistantText]);

  // Group messages: each assistant message owns the tool messages whose
  // tool_call_id matches one of its tool_calls.
  const grouped = useMemo(() => groupMessages(messages), [messages]);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || streaming.active) return;
    const text = input;
    setInput("");
    send(text).catch((err) => {
      // send() handles its own error state; we just log here.
      console.log("[AgentChat] send failed:", err?.message || err);
    });
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {reasoningModelMissing && (
        <div className="m-3 p-3 rounded-lg border border-amber-300/40 bg-amber-50/40 text-[12.5px] text-foreground">
          <div className="font-medium mb-0.5">Pick a reasoning model</div>
          <div className="text-muted-foreground">
            Choose one in Settings before chatting with the router-builder agent.
          </div>
          <button
            type="button"
            onClick={onOpenSettings}
            className="mt-2 inline-flex items-center gap-1 text-[12px] text-primary hover:underline"
          >
            <Settings className="h-3.5 w-3.5" />
            Open Settings
          </button>
        </div>
      )}

      <div
        ref={listRef}
        className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-3 py-3 space-y-3"
      >
        {messages.length === 0 && !streaming.active && !reasoningModelMissing && (
          <EmptyState
            suggestedPrompts={suggestedPrompts}
            onPick={(t) => setInput(t)}
          />
        )}

        {grouped.map((entry, idx) => (
          <MessageEntry key={idx} entry={entry} />
        ))}

        {streaming.active && streaming.currentAssistantText && (
          <AssistantBubble streaming text={streaming.currentAssistantText} />
        )}
        {streaming.active && !streaming.currentAssistantText && (
          <div className="flex items-center gap-2 px-1 text-[12px] text-muted-foreground italic">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-pulse"
              aria-hidden
            />
            Agent is thinking...
          </div>
        )}

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-[12.5px] text-destructive">
            {String(error.message || error)}
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-border p-2 flex items-end gap-2 bg-card"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={onFocusComposer}
          rows={2}
          placeholder={
            reasoningModelMissing
              ? "Set a reasoning model to chat..."
              : "Describe what you want the router to do (Cmd/Ctrl+Enter to send)"
          }
          disabled={reasoningModelMissing || streaming.active}
          className="flex-1 resize-none rounded-md border border-input bg-background px-2.5 py-2 text-[13px] outline-none focus:ring-1 focus:ring-ring disabled:opacity-60"
        />
        {streaming.active ? (
          <button
            type="button"
            onClick={cancel}
            title="Stop"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            <Square className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={reasoningModelMissing || !input.trim()}
            title="Send"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        )}
      </form>
    </div>
  );
}

// ---- Empty state ----

function EmptyState({ suggestedPrompts, onPick }) {
  const list = Array.isArray(suggestedPrompts) ? suggestedPrompts : [];
  return (
    <div className="space-y-3">
      <div className="text-[13px] font-medium text-foreground">
        What kind of router are you building?
      </div>
      <div className="text-[12px] text-muted-foreground">
        Pick a starter or type your own description.
      </div>
      <div className="space-y-1.5 pt-1">
        {list.map((p, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onPick(p)}
            className="block w-full text-left rounded-md border border-border bg-background px-2.5 py-1.5 text-[12px] hover:bg-secondary transition-colors"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---- Grouping ----

// Walk messages once and emit grouped entries:
//   {kind: "user", message}
//   {kind: "assistant", message, toolMessages: [...]}
//   {kind: "system", message}
//
// Tool messages whose ID matches the assistant's tool_calls attach to that
// assistant entry. Orphan tool messages render standalone.
function groupMessages(messages) {
  const result = [];
  let lastAssistant = null;
  const callIdToAssistantIdx = new Map();

  for (const m of messages) {
    if (m.role === "user") {
      lastAssistant = null;
      result.push({ kind: "user", message: m });
    } else if (m.role === "assistant") {
      const entry = { kind: "assistant", message: m, toolMessages: [] };
      result.push(entry);
      lastAssistant = entry;
      if (Array.isArray(m.tool_calls)) {
        for (const tc of m.tool_calls) {
          if (tc && tc.id) callIdToAssistantIdx.set(tc.id, entry);
        }
      }
    } else if (m.role === "tool") {
      const owner = m.tool_call_id ? callIdToAssistantIdx.get(m.tool_call_id) : null;
      if (owner) owner.toolMessages.push(m);
      else result.push({ kind: "tool-orphan", message: m });
    } else if (m.role === "system") {
      result.push({ kind: "system", message: m });
    }
  }

  // Suppress empty assistant entries (no content + no tool_calls); they
  // occasionally appear as artifacts of the stream and just add noise.
  void lastAssistant;
  return result.filter((e) => {
    if (e.kind !== "assistant") return true;
    const hasContent =
      typeof e.message.content === "string" && e.message.content.trim().length > 0;
    const hasCalls = Array.isArray(e.message.tool_calls) && e.message.tool_calls.length > 0;
    return hasContent || hasCalls;
  });
}

// ---- Bubbles ----

function MessageEntry({ entry }) {
  if (entry.kind === "user") return <UserBubble text={entry.message.content} />;
  if (entry.kind === "system") return <SystemBubble text={entry.message.content} />;
  if (entry.kind === "tool-orphan") {
    return (
      <ToolCard
        name="(orphan tool)"
        result={entry.message.content}
        argsText=""
      />
    );
  }
  // assistant
  const text = typeof entry.message.content === "string" ? entry.message.content : "";
  const calls = Array.isArray(entry.message.tool_calls) ? entry.message.tool_calls : [];
  return (
    <div className="space-y-1.5">
      {text && <AssistantBubble text={text} />}
      {calls.map((call) => {
        const result = entry.toolMessages.find(
          (m) => m.tool_call_id === call.id
        );
        return (
          <ToolCard
            key={call.id}
            name={call.function?.name || "tool"}
            argsText={call.function?.arguments || ""}
            result={result?.content || ""}
          />
        );
      })}
    </div>
  );
}

function UserBubble({ text }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-lg bg-foreground text-background px-3 py-2 text-[13px] whitespace-pre-wrap break-words">
        {text}
      </div>
    </div>
  );
}

function AssistantBubble({ text, streaming }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] rounded-lg border border-border bg-card px-3 py-2 text-[13px] whitespace-pre-wrap break-words">
        {text}
        {streaming && (
          <span
            className="ml-0.5 inline-block w-1.5 h-3 align-middle bg-foreground/60 animate-pulse"
            aria-hidden
          />
        )}
      </div>
    </div>
  );
}

function SystemBubble({ text }) {
  return (
    <div className="text-[12px] italic text-muted-foreground px-1">{text}</div>
  );
}

function ToolCard({ name, argsText, result }) {
  const [open, setOpen] = useState(false);
  const argsPretty = useMemo(() => prettyJson(argsText), [argsText]);
  const resultPretty = useMemo(() => prettyJson(result), [result]);
  const status = parseToolStatus(result);

  return (
    <div className="rounded-md border border-border bg-secondary/50">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left"
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <Wrench className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-[12.5px] mono font-medium truncate">{name}</span>
        <span className="flex-1" />
        {status && (
          <span
            className={cn(
              "text-[10.5px] tracking-[0.06em] uppercase",
              status === "ok" ? "text-emerald-600" : "text-destructive"
            )}
          >
            {status}
          </span>
        )}
      </button>
      {open && (
        <div className="px-2.5 pb-2 space-y-1.5">
          {argsPretty && (
            <div>
              <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground mb-0.5">
                Arguments
              </div>
              <pre className="text-[11px] mono whitespace-pre-wrap break-words bg-background rounded p-1.5 border border-border max-h-[160px] overflow-y-auto">
{argsPretty}
              </pre>
            </div>
          )}
          {resultPretty && (
            <div>
              <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground mb-0.5">
                Result
              </div>
              <pre className="text-[11px] mono whitespace-pre-wrap break-words bg-background rounded p-1.5 border border-border max-h-[200px] overflow-y-auto">
{resultPretty}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function prettyJson(text) {
  if (typeof text !== "string" || text.trim() === "") return "";
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

function parseToolStatus(resultText) {
  if (typeof resultText !== "string" || resultText.trim() === "") return null;
  try {
    const parsed = JSON.parse(resultText);
    if (parsed && typeof parsed === "object") {
      if (parsed.ok === true) return "ok";
      if (parsed.ok === false) return "error";
    }
  } catch {
    // not json, no status
  }
  return null;
}
