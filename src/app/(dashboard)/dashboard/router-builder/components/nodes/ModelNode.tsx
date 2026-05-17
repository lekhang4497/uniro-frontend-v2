"use client";

// Model node renderer. Extracted from page.js with no behavior change.

import { Cpu } from "lucide-react";
import { cn } from "@/lib/utils";
import { CARD_BASE, NodeBadge, NodeHandle } from "./shared";

export function ModelNodeRenderer({
  data,
  selected,
}: {
  data: any;
  selected?: boolean;
}) {
  const model = data.node;
  return (
    <div
      className={cn(
        CARD_BASE,
        selected ? "border-emerald-400 ring-2 ring-emerald-400/20" : "border-border"
      )}
    >
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
            {model.name || "(no name)"}
          </div>
          {model.model_id && (
            <div className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">
              {model.model_id}
            </div>
          )}
          {(model.max_tokens || model.temperature !== undefined) && (
            <div className="flex gap-2 mt-1">
              {model.max_tokens && (
                <span className="text-[9.5px] text-muted-foreground">max: {model.max_tokens}</span>
              )}
              {model.temperature !== undefined && (
                <span className="text-[9.5px] text-muted-foreground">t: {model.temperature}</span>
              )}
            </div>
          )}
        </div>
      </div>
      <NodeHandle type="source" side="source" color="#34d399" />
    </div>
  );
}
