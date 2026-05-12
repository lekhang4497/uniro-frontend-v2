"use client";

// Simple chat UI with model selection. Talks to Uniro's own
// /v1/chat/completions endpoint (OpenAI-compatible). Conversations are
// kept in component state only — persisting them is out of scope for
// this prototype; the existing /dashboard/basic-chat handles that
// flow when needed.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, MessageSquarePlus, Send, Sparkles, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { UniroMark } from "@/shared/components/UniroMark";

const DEFAULT_MODEL = "auto";

function newConversation() {
  return {
    id: `c-${Date.now().toString(36)}`,
    title: "New chat",
    model: DEFAULT_MODEL,
    messages: [],
    updatedAt: Date.now(),
  };
}

export default function ChatPage() {
  const [conversations, setConversations] = useState(() => [newConversation()]);
  const [activeId, setActiveId] = useState(() => conversations[0]?.id);
  const [models, setModels] = useState([{ id: "auto", label: "Auto", description: "Uniro decides" }]);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const listEndRef = useRef(null);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) || conversations[0],
    [conversations, activeId]
  );

  // Pull available models from Uniro's own /v1/models endpoint. Failure is
  // non-fatal — the dropdown just stays on "auto".
  useEffect(() => {
    let cancelled = false;
    fetch("/v1/models")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const list = Array.isArray(data.data) ? data.data : [];
        const opts = list.slice(0, 80).map((m) => ({
          id: m.id,
          label: m.id,
          description: m.owned_by || "",
        }));
        setModels([{ id: "auto", label: "Auto", description: "Uniro decides" }, ...opts]);
      })
      .catch(() => { /* ignore */ });
    return () => { cancelled = true; };
  }, []);

  // Keep the message list pinned to the latest reply.
  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [active?.messages.length, sending]);

  const updateActive = useCallback((updater) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === active.id ? updater(c) : c))
    );
  }, [active?.id]);

  const handleNewChat = () => {
    const c = newConversation();
    setConversations((prev) => [c, ...prev]);
    setActiveId(c.id);
    setInput("");
    setError(null);
  };

  const handleSelectModel = (id) => {
    updateActive((c) => ({ ...c, model: id }));
    setModelMenuOpen(false);
  };

  const handleDelete = (id) => {
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      const remaining = next.length ? next : [newConversation()];
      if (id === active?.id) setActiveId(remaining[0].id);
      return remaining;
    });
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setError(null);
    const userMsg = { role: "user", content: text };
    const baseMessages = [...active.messages, userMsg];

    updateActive((c) => ({
      ...c,
      messages: baseMessages,
      title: c.messages.length === 0 ? text.slice(0, 40) + (text.length > 40 ? "…" : "") : c.title,
      updatedAt: Date.now(),
    }));
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: active.model,
          messages: baseMessages,
          stream: false,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const reply = data?.choices?.[0]?.message?.content ?? "(empty response)";
      updateActive((c) => ({
        ...c,
        messages: [...c.messages, { role: "assistant", content: reply, model: data?.model }],
        updatedAt: Date.now(),
      }));
    } catch (err) {
      setError(err.message || "Request failed");
    } finally {
      setSending(false);
    }
  };

  const activeModelLabel = models.find((m) => m.id === active?.model)?.label || active?.model;

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Conversation list */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-border bg-card">
        <div className="p-3 border-b border-border">
          <button
            type="button"
            onClick={handleNewChat}
            className="w-full inline-flex items-center justify-center gap-2 h-9 rounded-lg border border-border hover:bg-secondary text-sm font-medium transition-colors"
          >
            <MessageSquarePlus className="h-4 w-4" />
            New chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={cn(
                "group w-full text-left px-3 py-2 rounded-lg mb-0.5 transition-colors flex items-center gap-2",
                c.id === active?.id
                  ? "bg-[var(--color-brand-50)] text-primary"
                  : "hover:bg-secondary text-foreground"
              )}
            >
              <span className="truncate flex-1 text-[13px]">{c.title}</span>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); handleDelete(c.id); } }}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                aria-label={`Delete ${c.title}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </span>
            </button>
          ))}
        </div>
      </aside>

      {/* Conversation pane */}
      <section className="flex flex-col flex-1 min-w-0">
        {/* Header — model selector */}
        <header className="flex items-center gap-3 px-4 sm:px-6 h-14 border-b border-border bg-card">
          <UniroMark size={20} className="text-primary" />
          <div className="text-sm font-semibold truncate flex-1">{active?.title || "Chat"}</div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setModelMenuOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border hover:bg-secondary text-[12.5px] font-medium"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {activeModelLabel}
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </button>
            {modelMenuOpen && (
              <div className="absolute right-0 top-9 z-10 w-64 max-h-80 overflow-y-auto rounded-lg border border-border bg-popover p-1">
                {models.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleSelectModel(m.id)}
                    className={cn(
                      "w-full text-left px-2.5 py-1.5 rounded-md flex items-start gap-2 hover:bg-secondary",
                      m.id === active?.model && "bg-[var(--color-brand-50)] text-primary"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[12.5px] font-medium truncate">{m.label}</div>
                      {m.description && (
                        <div className="text-[10.5px] text-muted-foreground truncate">{m.description}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {active?.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6">
              <UniroMark size={56} className="text-primary mb-4" />
              <h2 className="text-2xl mb-1">Ask anything.</h2>
              <p className="text-sm text-muted-foreground max-w-md">
                Messages go through Uniro&apos;s router and land at whatever provider matches the selected model.
              </p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-4">
              {active.messages.map((m, i) => (
                <Bubble key={i} role={m.role} content={m.content} model={m.model} />
              ))}
              {sending && <Bubble role="assistant" content="…" pending />}
              <div ref={listEndRef} />
            </div>
          )}
        </div>

        {/* Composer */}
        <form
          onSubmit={handleSend}
          className="border-t border-border p-3 sm:p-4 bg-card"
        >
          <div className="max-w-3xl mx-auto">
            {error && (
              <div className="mb-2 text-xs text-destructive">Error: {error}</div>
            )}
            <div className="relative flex items-end gap-2 rounded-2xl border border-border bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-ring/40">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Type a message…"
                rows={1}
                className="flex-1 resize-none bg-transparent text-sm outline-none py-1.5 max-h-40 overflow-y-auto"
              />
              <Button
                type="submit"
                disabled={sending || !input.trim()}
                size="icon"
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-1.5 text-[10.5px] text-muted-foreground text-center">
              Routed through <span className="mono">{activeModelLabel}</span>. Press <kbd>Enter</kbd> to send, <kbd>Shift</kbd>+<kbd>Enter</kbd> for newline.
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}

function Bubble({ role, content, model, pending }) {
  const isUser = role === "user";
  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="size-7 shrink-0 rounded-full bg-[var(--color-brand-50)] grid place-items-center text-primary">
          <UniroMark size={14} className="text-primary" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[min(680px,80%)] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap leading-relaxed",
          isUser
            ? "bg-foreground text-background"
            : "bg-card border border-border text-foreground"
        )}
      >
        {pending ? (
          <span className="inline-flex gap-1 items-center">
            <span className="size-1.5 rounded-full bg-current animate-pulse" />
            <span className="size-1.5 rounded-full bg-current animate-pulse" style={{ animationDelay: "120ms" }} />
            <span className="size-1.5 rounded-full bg-current animate-pulse" style={{ animationDelay: "240ms" }} />
          </span>
        ) : (
          content
        )}
        {!isUser && !pending && model && (
          <div className="mt-1 text-[10.5px] mono text-muted-foreground">{model}</div>
        )}
      </div>
    </div>
  );
}
