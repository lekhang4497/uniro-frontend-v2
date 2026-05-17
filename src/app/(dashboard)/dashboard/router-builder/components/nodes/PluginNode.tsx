"use client";

// Plugin node renderer. Extracted from page.js with no behavior change.

import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { PLUGIN_BY_TYPE } from "../../catalog";
import { CARD_BASE, NodeBadge, NodeHandle } from "./shared";

export function PluginNodeRenderer({
  data,
  selected,
}: {
  data: any;
  selected?: boolean;
}) {
  const plugin = data.node;
  const spec: any = (PLUGIN_BY_TYPE as any)[plugin.type];
  return (
    <div
      className={cn(
        CARD_BASE,
        selected ? "border-rose-400 ring-2 ring-rose-400/20" : "border-border"
      )}
    >
      <NodeHandle type="target" side="target" color="#f43f5e" />
      <div className="px-3 py-2.5 flex items-start gap-2.5">
        <div className="size-8 rounded-lg grid place-items-center shrink-0 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-300">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <NodeBadge className="bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
              Plugin
            </NodeBadge>
            {plugin.enabled === false && (
              <NodeBadge className="bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                off
              </NodeBadge>
            )}
          </div>
          <div className="text-[11px] font-semibold">{spec?.label || plugin.type}</div>
          <div className="text-[10px] text-muted-foreground font-mono truncate">
            {plugin.name || "(no name)"}
          </div>
        </div>
      </div>
      <NodeHandle type="source" side="source" color="#f43f5e" />
    </div>
  );
}
