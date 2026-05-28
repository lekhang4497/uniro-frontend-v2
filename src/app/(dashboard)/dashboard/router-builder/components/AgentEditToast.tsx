"use client";

// "Last edit by Agent -- Undo" toast (spec section 9.3). Lives for 5s after
// each agent edit; clicking Undo calls the store's undo() once.
//
// The parent computes `editId` from the undo stack as a stable per-snapshot
// fingerprint (`${timestamp}-${actor}`). We track dismissed ids in a Set
// stored in state so undoing past a dismissed agent edit -- and ending up
// with that same edit on top of the stack again -- doesn't resurface the
// toast.
//
// The 5s timer adds the current editId to the dismissed set when it
// elapses, hiding the toast and treating the timeout the same as a manual
// dismiss.

import { useCallback, useEffect, useState } from "react";
import { Undo2 } from "lucide-react";

const VISIBLE_MS = 5000;

export function AgentEditToast({
  editId,
  onUndo,
  description,
}: {
  editId: string | null;
  onUndo?: () => void;
  description?: string;
}) {
  // Set lives in state so render sees the latest membership without
  // reaching into a ref during render (which breaks the React rules of
  // hooks lint). Cloning on add keeps the Set treated as immutable.
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());

  const dismiss = useCallback((id: string | null) => {
    if (!id) return;
    setDismissed((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  // Schedule auto-hide for each new edit id. Setting state from inside an
  // effect callback that runs *after* a timer is fine -- the lint rule
  // targets *synchronous* setState in effect bodies.
  useEffect(() => {
    if (!editId) return undefined;
    if (dismissed.has(editId)) return undefined;
    const t = setTimeout(() => {
      dismiss(editId);
    }, VISIBLE_MS);
    return () => clearTimeout(t);
  }, [editId, dismissed, dismiss]);

  const open = !!editId && !dismissed.has(editId);
  if (!open) return null;

  return (
    <div className="absolute right-5 bottom-5 flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 shadow-sm">
      <span className="text-[12px] text-muted-foreground">
        Last edit by Agent
        {description ? ` -- ${description}` : ""}
      </span>
      <button
        type="button"
        onClick={() => {
          dismiss(editId);
          onUndo && onUndo();
        }}
        className="inline-flex items-center gap-1 text-[12px] text-foreground hover:text-primary"
      >
        <Undo2 className="h-3.5 w-3.5" />
        Undo
      </button>
    </div>
  );
}
