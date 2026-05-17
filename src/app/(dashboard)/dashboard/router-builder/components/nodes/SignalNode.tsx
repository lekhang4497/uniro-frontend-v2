"use client";

// Signal node renderer. Extracted from page.js with no behavior change.

import { Boxes } from "lucide-react";
import { cn } from "@/lib/utils";
import { SIGNAL_TYPE_BY_KEY } from "../../catalog";
import { ICONS } from "../../lib/constants";
import { CARD_BASE, NodeBadge, NodeHandle } from "./shared";

export function SignalNodeRenderer({
  data,
  selected,
}: {
  data: any;
  selected?: boolean;
}) {
  const sig = data.node;
  const spec: any = (SIGNAL_TYPE_BY_KEY as any)[sig.type];
  const Icon = ICONS[spec?.icon] || Boxes;
  return (
    <div
      className={cn(
        CARD_BASE,
        selected ? "border-blue-400 ring-2 ring-blue-400/20" : "border-border"
      )}
    >
      <NodeHandle type="target" side="target" color="#60a5fa" />
      <div className="px-3 py-2.5 flex items-start gap-2.5">
        <div className="size-8 rounded-lg grid place-items-center shrink-0 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-300">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <NodeBadge className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 mb-1">
            Signal
          </NodeBadge>
          <div className="text-[10px] text-muted-foreground">{spec?.label || sig.type}</div>
          <div className="text-[12px] font-semibold font-mono truncate mt-0.5">
            {sig.id || "(no id)"}
          </div>
        </div>
      </div>
      <NodeHandle type="source" side="source" color="#60a5fa" />
    </div>
  );
}
