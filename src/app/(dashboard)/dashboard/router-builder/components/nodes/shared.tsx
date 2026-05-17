"use client";

// Shared primitives used by every node renderer.
// Extracted from page.js with no behavior change.

import { Handle, Position } from "@xyflow/react";
import { cn } from "@/lib/utils";

export const CARD_BASE =
  "rounded-xl border bg-card min-w-[160px] max-w-[200px] transition-colors shadow-sm";

export function NodeBadge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "rounded-md px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide",
        className
      )}
    >
      {children}
    </span>
  );
}

export function NodeHandle({
  type,
  side,
  color = "var(--primary)",
}: {
  type: "target" | "source";
  side: "target" | "source";
  color?: string;
}) {
  return (
    <Handle
      type={side === "source" ? "source" : "target"}
      position={side === "source" ? Position.Right : Position.Left}
      className="!border-card !w-2.5 !h-2.5"
      style={{ background: color, borderColor: color }}
    />
  );
}
