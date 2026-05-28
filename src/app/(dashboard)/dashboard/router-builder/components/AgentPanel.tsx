"use client";

// Agent dock for the router-builder. Wraps the conversational agent
// (useRouterAgent) and bridges its YAML store to the redesign's canvas:
//
//   - On open, seed the store from the canvas YAML.
//   - When the agent (or undo) changes the store YAML, apply it to the canvas
//     via onApplyYaml so the nodes/edges rebuild live.
//   - Before each send, push the current canvas YAML into the store so the
//     agent reasons over the user's latest manual edits.
//
// The store is the agent's working source of truth; the canvas `state` object
// stays the redesign's source of truth. They are kept in step with a single
// applied-ref guard instead of a fragile two-way reactive mirror. A
// parse->serialize round-trip can drift the YAML text slightly; that is
// harmless (semantically identical) and the guard prevents it from looping.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageSquare, Settings, X } from "lucide-react";

import { useRouterAgent } from "@/hooks/useRouterAgent";
import { useRouterYamlStore } from "@/hooks/useRouterYamlStore";
import { cn } from "@/lib/utils";

import { AgentChat } from "./AgentChat";
import { AgentEditToast } from "./AgentEditToast";
import { SettingsDialog } from "./SettingsDialog";

export function AgentPanel({
  routerId,
  currentYaml,
  onApplyYaml,
  onClose,
  hidden = false,
}: {
  routerId: string | null;
  currentYaml: string;
  onApplyYaml: (text: string) => void;
  onClose: () => void;
  hidden?: boolean;
}) {
  const agent = useRouterAgent({ routerId });

  const storeYaml = useRouterYamlStore((s: any) => s.yaml);
  const setStoreYaml = useRouterYamlStore((s: any) => s.setYaml);
  const loadInitial = useRouterYamlStore((s: any) => s.loadInitial);
  const undo = useRouterYamlStore((s: any) => s.undo);
  const undoStack = useRouterYamlStore((s: any) => s.undoStack);

  const [settingsOpen, setSettingsOpen] = useState(false);

  // Last store YAML reflected on the canvas. Initialised from the first-render
  // store value so the store->canvas effect's initial run (which still sees the
  // pre-seed value) bails instead of applying a stale/empty document and wiping
  // the canvas.
  const appliedRef = useRef<string | null>(storeYaml);
  // Latest canvas YAML, read synchronously inside send() without waiting for a
  // re-render.
  const canvasYamlRef = useRef(currentYaml);
  useEffect(() => {
    canvasYamlRef.current = currentYaml;
  }, [currentYaml]);

  // Seed the store from the canvas YAML once, when the dock first mounts.
  useEffect(() => {
    loadInitial(currentYaml || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Store -> canvas: agent tool writes (and undo/redo) change storeYaml; push
  // them onto the canvas so nodes/edges rebuild. Skip our own echo and the
  // already-in-sync case.
  useEffect(() => {
    if (storeYaml === appliedRef.current) return;
    if (storeYaml === canvasYamlRef.current) {
      appliedRef.current = storeYaml;
      return;
    }
    appliedRef.current = storeYaml;
    try {
      onApplyYaml(storeYaml);
    } catch {
      // Malformed intermediate YAML from a partial agent edit — leave the
      // canvas as-is; the next valid write reconciles it.
    }
  }, [storeYaml, onApplyYaml]);

  // Before sending, make the store reflect the user's latest canvas edits so
  // the agent reasons over current state. setYaml is a no-op when unchanged.
  const send = useCallback(
    (text: string) => {
      const canvasYaml = canvasYamlRef.current;
      if (useRouterYamlStore.getState().yaml !== canvasYaml) {
        appliedRef.current = canvasYaml; // aligning store to canvas; don't echo back
        setStoreYaml(canvasYaml, { actor: "user", description: "Canvas edit" });
      }
      return agent.send(text);
    },
    [agent, setStoreYaml]
  );

  const wrappedAgent = useMemo(() => ({ ...agent, send }), [agent, send]);

  // Newest agent-authored undo entry drives the "Agent edited / Undo" toast.
  const lastAgentEdit = useMemo(() => {
    const stack = Array.isArray(undoStack) ? undoStack : [];
    for (let i = stack.length - 1; i >= 0; i--) {
      if (stack[i]?.actor === "agent") return stack[i];
    }
    return null;
  }, [undoStack]);
  const editId = lastAgentEdit
    ? `${lastAgentEdit.timestamp}-${lastAgentEdit.actor}`
    : null;

  return (
    <aside
      className={cn(
        "relative w-[380px] xl:w-[440px] shrink-0 flex-col bg-[var(--bg-primary)] border-l border-[var(--bg-secondary)]",
        hidden ? "hidden" : "flex"
      )}
    >
      <div className="px-3 py-2.5 border-b border-[var(--bg-secondary)] flex items-center gap-2 bg-[var(--bg-primary)] shrink-0">
        <MessageSquare className="h-4 w-4 text-[var(--text-secondary)]" />
        <div className="text-[12px] font-semibold text-[var(--text-primary)]">
          Router Agent
        </div>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          title="Agent settings"
          className="inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
        >
          <Settings className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onClose}
          title="Close"
          className="inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <AgentChat agent={wrappedAgent} onOpenSettings={() => setSettingsOpen(true)} />

      <AgentEditToast
        editId={editId}
        description={lastAgentEdit?.description}
        onUndo={undo}
      />

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} agent={agent} />
    </aside>
  );
}
