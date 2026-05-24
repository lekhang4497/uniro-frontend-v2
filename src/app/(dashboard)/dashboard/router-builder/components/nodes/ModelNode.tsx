"use client";

// Model node renderer. A Model node is just the YAML `model:` string — the
// YAML is the source of truth, so there is no canvas-only alias to show.

import { Cpu } from "lucide-react";
import { cn } from "@/lib/utils";
import { CARD_BASE, CARD_SELECTED, NodeBadge, NodeHandle } from "./shared";

export function ModelNodeRenderer({
  data,
  selected,
}: {
  data: any;
  selected?: boolean;
}) {
  const model = data.node;
  return (
    <div className={cn(CARD_BASE, selected && CARD_SELECTED)}>
      <NodeHandle type="target" side="target" color="#34d399" />
      <div className="px-3 py-2.5 flex items-start gap-2.5">
        <div className="size-8 rounded-lg grid place-items-center shrink-0 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-300">
          <Cpu className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <NodeBadge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 mb-1">
            Model
          </NodeBadge>
          <div className="text-[12px] font-semibold font-mono truncate">
            {model.model_id || "(no model)"}
          </div>
        </div>
      </div>
      <NodeHandle type="source" side="source" color="#34d399" />
    </div>
  );
}
