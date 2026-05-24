"use client";

// User Query — the implicit entry point of the routing pipeline.
// Singleton, fixed position before the Signal column. Source handle only:
// signals connect FROM this node, never to it. Signals with no incoming
// User Query edge are excluded from YAML export (and flagged in lint).

import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { CARD_BASE, NodeBadge, NodeHandle } from "./shared";

export function UserQueryNodeRenderer({ selected }: { selected?: boolean }) {
  return (
    <div
      className={cn(
        CARD_BASE,
        "border-2 border-[var(--accent-blue)]/70",
        selected && "ring-2 ring-[var(--accent-blue)] ring-offset-2 ring-offset-[var(--bg-tertiary)]"
      )}
    >
      <div className="px-3 py-2.5 flex items-start gap-2.5">
        <div className="size-8 rounded-lg grid place-items-center shrink-0 bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]">
          <MessageSquare className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <NodeBadge className="bg-[var(--accent-blue)]/15 text-[var(--accent-blue)] mb-1">
            Entry
          </NodeBadge>
          <div className="text-[12px] font-semibold mt-0.5">User Query</div>
          <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">
            Connect to signals to use them
          </div>
        </div>
      </div>
      <NodeHandle type="source" side="source" color="var(--accent-blue)" />
    </div>
  );
}
