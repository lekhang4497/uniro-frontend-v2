"use client";

// Route node renderer. Extracted from page.js with no behavior change.

import { Workflow } from "lucide-react";
import { cn } from "@/lib/utils";
import { CARD_BASE, CARD_SELECTED, NodeBadge, NodeHandle } from "./shared";

export function RouteNodeRenderer({
  data,
  selected,
}: {
  data: any;
  selected?: boolean;
}) {
  const route = data.node;
  const isAlways = route.when?.kind === "always";
  return (
    <div className={cn(CARD_BASE, selected && CARD_SELECTED)}>
      <NodeHandle type="target" side="target" color="#fbbf24" />
      <div className="px-3 py-2.5">
        <div className="flex items-start gap-2.5 mb-1.5">
          <div className="size-8 rounded-lg grid place-items-center shrink-0 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-300">
            <Workflow className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <NodeBadge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                Route
              </NodeBadge>
              {isAlways && (
                <NodeBadge className="bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  always
                </NodeBadge>
              )}
            </div>
            <div className="text-[12px] font-semibold font-mono truncate mt-0.5">
              {route.name || "(unnamed)"}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">p{route.priority ?? 0}</div>
          </div>
        </div>
        {route.model && (
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono truncate pl-10">
            {"\\u2192"} {route.model}
          </div>
        )}
        {route.plugins?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1 pl-10">
            {route.plugins.slice(0, 3).map((p: string) => (
              <span
                key={p}
                className="rounded bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-300 px-1 py-px text-[9px] font-mono"
              >
                {p}
              </span>
            ))}
            {route.plugins.length > 3 && (
              <span className="text-[9px] text-muted-foreground">+{route.plugins.length - 3}</span>
            )}
          </div>
        )}
      </div>
      <NodeHandle type="source" side="source" color="#fbbf24" />
    </div>
  );
}
