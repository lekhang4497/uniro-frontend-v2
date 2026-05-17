"use client";

// Projection node renderer. Extracted from page.js with no behavior change.

import { Boxes } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROJECTION_TYPE_BY_KEY } from "../../catalog";
import { ICONS } from "../../lib/constants";
import { CARD_BASE, CARD_SELECTED, NodeBadge, NodeHandle } from "./shared";

export function ProjectionNodeRenderer({
  data,
  selected,
}: {
  data: any;
  selected?: boolean;
}) {
  const proj = data.node;
  const spec: any = (PROJECTION_TYPE_BY_KEY as any)[proj.type];
  const Icon = ICONS[spec?.icon] || Boxes;
  return (
    <div className={cn(CARD_BASE, selected && CARD_SELECTED)}>
      <NodeHandle type="target" side="target" color="#8b5cf6" />
      <div className="px-3 py-2.5 flex items-start gap-2.5">
        <div className="size-8 rounded-lg grid place-items-center shrink-0 bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-300">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <NodeBadge className="bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 mb-1">
            Projection
          </NodeBadge>
          <div className="text-[10px] text-muted-foreground">{spec?.label || proj.type}</div>
          <div className="text-[12px] font-semibold font-mono truncate mt-0.5">
            {proj.name || "(no name)"}
          </div>
        </div>
      </div>
      <NodeHandle type="source" side="source" color="#8b5cf6" />
    </div>
  );
}
