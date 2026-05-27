"use client";

// "Last edit by Agent -- Undo" toast (spec §9.3). Lives for 5s after each
// agent edit; clicking Undo calls the store's undo() once.
//
// The parent computes `editId` from the undo stack (a stable per-edit
// token). We track which editId the user has dismissed so a manual close
// doesn't get re-shown if the parent re-renders with the same edit. The
// 5s timer flips `dismissedId` once it elapses, hiding the toast.

import { useEffect, useState } from "react";
import { Undo2 } from "lucide-react";

const VISIBLE_MS = 5000;

export function AgentEditToast({ editId, onUndo, description }) {
  const [dismissedId, setDismissedId] = useState(null);

  // Schedule auto-hide for each new edit id. Setting state from inside an
  // effect callback that runs *after* a timer is fine -- the lint rule
  // targets *synchronous* setState in effect bodies.
  useEffect(() => {
    if (!editId || editId === dismissedId) return undefined;
    const t = setTimeout(() => {
      setDismissedId(editId);
    }, VISIBLE_MS);
    return () => clearTimeout(t);
  }, [editId, dismissedId]);

  const open = !!editId && editId !== dismissedId;
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
          setDismissedId(editId);
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
