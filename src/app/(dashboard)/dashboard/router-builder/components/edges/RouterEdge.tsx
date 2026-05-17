"use client";

// Custom edge with delete-on-hover affordance. Extracted from page.js as
// DeletableEdge with no behavior change.

import { useState } from "react";
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from "@xyflow/react";
import { XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function DeletableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  selected,
}: any) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  const [isHovered, setIsHovered] = useState(false);

  const onDelete = () => {
    // Trigger edge deletion through the onEdgesDelete callback
    const event = new CustomEvent("deleteEdge", { detail: { edgeId: id } });
    window.dispatchEvent(event);
  };

  return (
    <>
      {/* Use a transparent wider path for better hover detection */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        style={{ cursor: "pointer" }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />
      {/* Visible edge path */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: selected || isHovered ? 3 : 1.5,
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <button
            onClick={onDelete}
            className={cn(
              "h-5 w-5 rounded-full flex items-center justify-center transition-all",
              "bg-background border border-border shadow-sm",
              "hover:bg-destructive hover:border-destructive hover:text-destructive-foreground",
              selected || isHovered ? "opacity-100" : "opacity-0"
            )}
            title="Delete connection"
          >
            <XCircle className="h-3.5 w-3.5" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

// Edge types with the deletable edge
export const edgeTypes = {
  default: DeletableEdge,
};
