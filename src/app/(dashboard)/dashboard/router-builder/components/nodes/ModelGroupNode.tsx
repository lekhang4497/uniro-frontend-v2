"use client";

// Model Group node renderer. Holds the YAML `modelRefs:` form — a weighted
// list of models picked by a selection `algorithm`. Same Layer-4 column as
// the single Model node.

import { Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { CARD_BASE, CARD_SELECTED, NodeBadge, NodeHandle } from "./shared";

export function ModelGroupNodeRenderer({
  data,
  selected,
}: {
  data: any;
  selected?: boolean;
}) {
  const group = data.node;
  const refs: any[] = Array.isArray(group.refs) ? group.refs : [];
  const shown = refs.slice(0, 4);
  return (
    <div className={cn(CARD_BASE, selected && CARD_SELECTED)}>
      <NodeHandle type="target" side="target" color="#34d399" />
      <div className="px-3 py-2.5 flex items-start gap-2.5">
        <div className="size-8 rounded-lg grid place-items-center shrink-0 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-300">
          <Layers className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <NodeBadge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 mb-1">
            Model Group
          </NodeBadge>
          <div className="text-[10px] text-muted-foreground mb-1">
            algorithm: <span className="font-mono">{group.algorithm || "static"}</span>
          </div>
          {refs.length === 0 ? (
            <div className="text-[11px] text-muted-foreground italic">(no models)</div>
          ) : (
            <div className="flex flex-col gap-0.5">
              {shown.map((r: any, i: number) => (
                <div key={i} className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[11px] font-mono font-semibold truncate">
                    {r.model || "(no model)"}
                  </span>
                  <span className="text-[9px] text-muted-foreground shrink-0">
                    w{typeof r.weight === "number" ? r.weight : 1}
                    {r.use_reasoning && r.reasoning_effort ? ` · ${r.reasoning_effort}` : ""}
                  </span>
                </div>
              ))}
              {refs.length > shown.length && (
                <div className="text-[9.5px] text-muted-foreground">
                  +{refs.length - shown.length} more
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <NodeHandle type="source" side="source" color="#34d399" />
    </div>
  );
}
