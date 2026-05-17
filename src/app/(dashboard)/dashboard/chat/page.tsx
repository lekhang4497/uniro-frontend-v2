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

type Role = "user" | "assistant";

type Message = {
  role: Role;
  content: string;
  model?: string;
};

type Conversation = {
  id: string;
  title: string;
  model: string;
  messages: Message[];
  updatedAt: number;
};

type ModelOption = {
  id: string;
  label: string;
  description: string;
};

type ApiModel = {
  id: string;
  owned_by?: string;
};

function newConversation(): Conversation {
  return {
    id: `c-${Date.now().toString(36)}`,
    title: "New chat",
    model: DEFAULT_MODEL,
    messages: [],
    updatedAt: Date.now(),
  };
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>(() => [newConversation()]);
  const [activeId, setActiveId] = useState<string>(() => conversations[0]?.id ?? "");
  const [models, setModels] = useState<ModelOption[]>([
    { id: "auto", label: "Auto", description: "Uniro decides" },
  ]);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listEndRef = useRef<HTMLDivElement | null>(null);

  const active = useMemo<Conversation | undefined>(
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
        const list: ApiModel[] = Array.isArray(data.data) ? data.data : [];
        const opts: ModelOption[] = list.slice(0, 80).map((m) => ({
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

  const updateActive = useCallback((updater: (c: Conversation) => Conversation) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === active?.id ? updater(c) : c))
    );
  }, [active?.id]);

  const handleNewChat = () => {
    const c = newConversation();
    setConversations((prev) => [c, ...prev]);
    setActiveId(c.id);
    setInput("");
    setError(null);
  };

  const handleSelectModel = (id: string) => {
    updateActive((c) => ({ ...c, model: id }));
    setModelMenuOpen(false);
  };

  const handleDelete = (id: string) => {
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== id);
      const remaining: Conversation[] = next.length ? next : [newConversation()];
      if (id === active?.id && remaining[0]) setActiveId(remaining[0].id);
      return remaining;
    });
  };

  const handleSend = async (e?: React.FormEvent | React.KeyboardEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || sending || !active) return;
    setError(null);
    const userMsg: Message = { role: "user", content: text };
    const baseMessages: Message[] = [...active.messages, userMsg];

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
      const reply: string = data?.choices?.[0]?.message?.content ?? "(empty response)";
      updateActive((c) => ({
        ...c,
        messages: [...c.messages, { role: "assistant", content: reply, model: data?.model }],
        updatedAt: Date.now(),
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Request failed";
      setError(msg);
    } finally {
      setSending(false);
    }
  };

  const activeModelLabel = models.find((m) => m.id === active?.model)?.label || active?.model;

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Conversation list */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 border-r border-[var(--bg-secondary)] bg-[var(--bg-primary)]">
        <div className="p-3 border-b border-[var(--bg-secondary)]">
          <button
            type="button"
            onClick={handleNewChat}
            className="w-full inline-flex items-center justify-center gap-2 h-9 rounded-[var(--radius)] border border-[var(--bg-secondary)] hover:bg-[var(--bg-secondary)] text-[13px] font-medium text-[var(--text-primary)] transition-colors"
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
                "group w-full text-left px-3 py-2 rounded-[var(--radius)] mb-0.5 transition-colors flex items-center gap-2",
                c.id === active?.id
                  ? "bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                  : "hover:bg-[var(--bg-secondary)] text-[var(--text-primary)]"
              )}
            >
              <span className="truncate flex-1 text-[13px]">{c.title}</span>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); handleDelete(c.id); } }}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--text-secondary)] hover:text-[var(--accent-red)]"
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
        <header className="flex items-center gap-3 px-4 sm:px-6 h-14 border-b border-[var(--bg-secondary)] bg-[var(--bg-primary)]">
          <UniroMark size={20} className="text-[var(--accent-blue)]" />
          <div className="text-[26px] font-semibold tracking-[-0.01em] text-[var(--text-primary)] truncate flex-1">
            {active?.title || "Chat"}
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setModelMenuOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[var(--radius)] border border-[var(--bg-secondary)] hover:bg-[var(--bg-secondary)] text-[12.5px] font-medium text-[var(--text-primary)]"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {activeModelLabel}
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </button>
            {modelMenuOpen && (
              <div className="absolute right-0 top-9 z-10 w-64 max-h-80 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--bg-secondary)] bg-[var(--bg-primary)] p-1">
                {models.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleSelectModel(m.id)}
                    className={cn(
                      "w-full text-left px-2.5 py-1.5 rounded-[var(--radius-sm)] flex items-start gap-2 hover:bg-[var(--bg-secondary)]",
                      m.id === active?.model && "bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[12.5px] font-medium truncate text-[var(--text-primary)]">{m.label}</div>
                      {m.description && (
                        <div className="text-[10.5px] text-[var(--text-secondary)] truncate">{m.description}</div>
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
              <UniroMark size={56} className="text-[var(--accent-blue)] mb-4" />
              <h2 className="text-[26px] font-semibold tracking-[-0.01em] text-[var(--text-primary)] mb-1">Ask anything.</h2>
              <p className="text-[13px] text-[var(--text-secondary)] max-w-md">
                Messages go through Uniro&apos;s router and land at whatever provider matches the selected model.
              </p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-4">
              {active?.messages.map((m, i) => (
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
          className="border-t border-[var(--bg-secondary)] p-3 sm:p-4 bg-[var(--bg-primary)]"
        >
          <div className="max-w-3xl mx-auto">
            {error && (
              <div className="mb-2 text-[12px] text-[var(--accent-red)]">Error: {error}</div>
            )}
            <div className="relative flex items-end gap-2 rounded-[var(--radius-lg)] border border-[var(--bg-secondary)] bg-[var(--bg-primary)] px-3 py-2 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--accent-blue)]">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e);
                  }
                }}
                placeholder="Type a message…"
                rows={1}
                className="flex-1 resize-none bg-transparent text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none py-1.5 max-h-40 overflow-y-auto"
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
            <div className="mt-1.5 text-[10.5px] text-[var(--text-secondary)] text-center">
              Routed through <span className="font-mono">{activeModelLabel}</span>. Press <kbd>Enter</kbd> to send, <kbd>Shift</kbd>+<kbd>Enter</kbd> for newline.
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}

type BubbleProps = {
  role: Role;
  content: string;
  model?: string;
  pending?: boolean;
};

function Bubble({ role, content, model, pending }: BubbleProps) {
  const isUser = role === "user";
  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="size-7 shrink-0 rounded-full bg-[var(--bg-secondary)] grid place-items-center text-[var(--accent-blue)]">
          <UniroMark size={14} className="text-[var(--accent-blue)]" />
        </div>
      )}
      <div
        className={cn(
          "whitespace-pre-wrap leading-relaxed",
          isUser
            ? "ml-auto max-w-[80%] rounded-[var(--radius-md)] bg-[var(--accent-blue)] px-4 py-2 text-[14px] text-[var(--text-inverted)]"
            : "max-w-[80%] rounded-[var(--radius-md)] border border-[var(--bg-secondary)] bg-[var(--bg-primary)] px-4 py-2 text-[14px] text-[var(--text-primary)]"
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
          <div className="mt-1 text-[10.5px] font-mono text-[var(--text-secondary)]">{model}</div>
        )}
      </div>
    </div>
  );
}
