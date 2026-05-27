"use client";

// Floating bottom toolbar above the canvas. Spec §9.3: Undo / Redo wired
// through the YAML store (max 50 entries).

import { Hand, MousePointer2, Redo2, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomToolbar({
  tool,
  onToolChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}) {
  return (
    <div className="absolute left-1/2 bottom-5 -translate-x-1/2 flex items-center gap-0.5 rounded-full border border-border bg-card px-1.5 py-1">
      <ToolBtn
        active={tool === "pan"}
        onClick={() => onToolChange("pan")}
        icon={<Hand className="h-4 w-4" />}
        label="Pan"
      />
      <ToolBtn
        active={tool === "select"}
        onClick={() => onToolChange("select")}
        icon={<MousePointer2 className="h-4 w-4" />}
        label="Select"
      />
      <span className="w-px h-5 bg-border mx-1" />
      <ToolBtn
        disabled={!canUndo}
        onClick={onUndo}
        icon={<Undo2 className="h-4 w-4" />}
        label="Undo"
      />
      <ToolBtn
        disabled={!canRedo}
        onClick={onRedo}
        icon={<Redo2 className="h-4 w-4" />}
        label="Redo"
      />
    </div>
  );
}

function ToolBtn({ active, onClick, icon, label, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors",
        active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
        disabled && "opacity-40 cursor-not-allowed hover:bg-transparent"
      )}
    >
      {icon}
    </button>
  );
}
