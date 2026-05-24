"use client";

// Simple chat UI with model selection. Talks to Uniro's own
// /v1/chat/completions endpoint (OpenAI-compatible). Conversations are
// kept in component state only — persisting them is out of scope for
// this prototype; the existing /dashboard/basic-chat handles that
// flow when needed.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, MessageSquarePlus, Send, Sparkles, Trash2, Workflow } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { UniroMark } from "@/shared/components/UniroMark";
import { listRouters } from "@/lib/routing/routersApi";

type Router = {
  id: string;
  name: string;
  description?: string | null;
  engine: "local" | "remote";
  is_default?: boolean;
};

// Selection is either a router (let the user's router decide the model) OR
// a direct model id (skip routing, dispatch to that model verbatim).
type Selection =
  | { kind: "router"; routerId: string; routerName: string }
  | { kind: "model"; modelId: string };

const DEFAULT_SELECTION: Selection = { kind: "model", modelId: "auto" };

type Role = "user" | "assistant";

type Message = {
  role: Role;
  content: string;
  model?: string;
};

type Conversation = {
  id: string;
  title: string;
  selection: Selection;
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
    selection: DEFAULT_SELECTION,
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
  const [routers, setRouters] = useState<Router[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [chatKeyReady, setChatKeyReady] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listEndRef = useRef<HTMLDivElement | null>(null);

  const active = useMemo<Conversation | undefined>(
    () => conversations.find((c) => c.id === activeId) || conversations[0],
    [conversations, activeId]
  );

  // /v1/models?connectedOnly=true returns ONLY models backed by an active
  // provider connection (plus combos). Without the flag, when no providers
  // are connected the API falls back to the full static catalog — fine for
  // CLI discovery, but the dashboard Chat dropdown should match what can
  // actually be served.
  useEffect(() => {
    let cancelled = false;
    fetch("/v1/models?connectedOnly=true")
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

  // Load the signed-in user's custom routers (RLS scopes to auth.uid()). On
  // an unauthenticated or non-connected install this just yields an empty
  // list and the router selector hides itself.
  useEffect(() => {
    let cancelled = false;
    listRouters()
      .then((rows: Router[]) => {
        if (cancelled) return;
        setRouters(rows || []);
      })
      .catch(() => { /* ignore — no connected mode */ });
    return () => { cancelled = true; };
  }, []);

  // Ensure the HttpOnly chat-key cookie is set BEFORE the first message goes
  // out — otherwise /v1/chat/completions returns 401 with missing_api_key.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/internal/chat-key", { method: "POST", credentials: "include" })
      .then((r) => { if (!cancelled && r.ok) setChatKeyReady(true); })
      .catch(() => { /* surfaced as a send-time error */ });
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

  const handleSelect = (sel: Selection) => {
    updateActive((c) => ({ ...c, selection: sel }));
    setPickerOpen(false);
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
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      // Router-mode → let the routing pipeline pick the model; we send
      // model:"auto" so the router-service is what decides.
      // Direct-mode → no router header; just send the chosen model.
      let bodyModel = "auto";
      if (active.selection.kind === "router") {
        headers["x-uniro-router-id"] = active.selection.routerId;
      } else {
        bodyModel = active.selection.modelId;
      }
      const res = await fetch("/v1/chat/completions", {
        method: "POST",
        credentials: "include",  // send HttpOnly uniro_chat_key cookie
        headers,
        body: JSON.stringify({
          model: bodyModel,
          messages: baseMessages,
          stream: false,
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}${text ? `: ${text}` : ""}`);
      }
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

  // Label + icon for the merged picker button
  const sel = active?.selection ?? DEFAULT_SELECTION;
  const pickerIcon = sel.kind === "router" ? <Workflow className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />;
  const pickerLabel = sel.kind === "router"
    ? `Router: ${sel.routerName || routers.find((r) => r.id === sel.routerId)?.name || "(unknown)"}`
    : (models.find((m) => m.id === sel.modelId)?.label || sel.modelId);

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
          {/* Combined picker — Routers first, then Direct models. Picking a
              router lets the router-service decide the model for each request
              (sends x-uniro-router-id, body.model="auto"). Picking a model
              skips routing and dispatches verbatim. */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[var(--radius)] border border-[var(--bg-secondary)] hover:bg-[var(--bg-secondary)] text-[12.5px] font-medium text-[var(--text-primary)] max-w-[260px]"
              title={sel.kind === "router" ? "Routing via a custom router" : "Dispatching directly to a model"}
            >
              {pickerIcon}
              <span className="truncate">{pickerLabel}</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-60 shrink-0" />
            </button>
            {pickerOpen && (
              <div className="absolute right-0 top-9 z-10 w-80 max-h-96 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--bg-secondary)] bg-[var(--bg-primary)] p-1 shadow-[var(--shadow-popover)]">
                {/* Section: Routers */}
                {routers.length > 0 && (
                  <>
                    <div className="px-2.5 pt-2 pb-1 text-[10px] uppercase tracking-[0.08em] font-semibold text-[var(--text-tertiary)] flex items-center gap-1.5">
                      <Workflow className="h-3 w-3" />
                      Use a router
                    </div>
                    {routers.map((r) => {
                      const isActive = sel.kind === "router" && sel.routerId === r.id;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => handleSelect({ kind: "router", routerId: r.id, routerName: r.name })}
                          className={cn(
                            "w-full text-left px-2.5 py-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--bg-secondary)]",
                            isActive && "bg-[var(--bg-secondary)]"
                          )}
                        >
                          <div className="text-[12.5px] font-medium text-[var(--text-primary)] truncate">
                            {r.name}{r.is_default ? " · default" : ""}
                          </div>
                          <div className="text-[10.5px] text-[var(--text-secondary)] truncate">
                            engine: {r.engine}{r.description ? ` — ${r.description}` : ""}
                          </div>
                        </button>
                      );
                    })}
                  </>
                )}

                {/* Section: Direct models */}
                <div className="px-2.5 pt-3 pb-1 text-[10px] uppercase tracking-[0.08em] font-semibold text-[var(--text-tertiary)] flex items-center gap-1.5 border-t border-[var(--bg-secondary)] mt-1">
                  <Sparkles className="h-3 w-3" />
                  Pick a model directly
                </div>
                {models.map((m) => {
                  const isActive = sel.kind === "model" && sel.modelId === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleSelect({ kind: "model", modelId: m.id })}
                      className={cn(
                        "w-full text-left px-2.5 py-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--bg-secondary)]",
                        isActive && "bg-[var(--bg-secondary)]"
                      )}
                    >
                      <div className="text-[12.5px] font-medium truncate text-[var(--text-primary)]">{m.label}</div>
                      {m.description && (
                        <div className="text-[10.5px] text-[var(--text-secondary)] truncate">{m.description}</div>
                      )}
                    </button>
                  );
                })}
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
              {sel.kind === "router" ? "Routing via" : "Direct model"}{" "}
              <span className="font-mono">{pickerLabel.replace(/^Router: /, "")}</span>
              {!chatKeyReady && <> · <span className="text-[var(--accent-amber)]">preparing chat key…</span></>}
              {" · "}Press <kbd>Enter</kbd> to send, <kbd>Shift</kbd>+<kbd>Enter</kbd> for newline.
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
