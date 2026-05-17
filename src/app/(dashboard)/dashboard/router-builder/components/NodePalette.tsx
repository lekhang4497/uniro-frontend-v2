"use client";

// Left-rail palette of draggable node types.
// Extracted from page.js with no behavior change.

import { useState } from "react";
import { Boxes, ChevronDown, Cpu, ShieldCheck, Workflow } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PLUGINS,
  PROJECTION_CATEGORIES,
  PROJECTION_TYPES,
  SIGNAL_CATEGORIES,
  SIGNAL_TYPES,
} from "../catalog";
import { DRAG_TYPE, ICONS } from "../lib/constants";

export function Palette() {
  const onDragStart = (e: React.DragEvent, payload: string) => {
    e.dataTransfer.setData(DRAG_TYPE, payload);
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <aside className="hidden md:flex w-[240px] shrink-0 border-r border-[var(--bg-secondary)] bg-[var(--bg-primary)] flex-col overflow-y-auto custom-scrollbar">
      <div className="px-4 py-3 border-b border-[var(--bg-secondary)] shrink-0">
        <div className="text-[11px] uppercase tracking-[0.08em] text-[var(--text-tertiary)] font-semibold">
          Palette
        </div>
        <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
          Drag onto canvas
        </div>
      </div>
      <div className="flex-1 p-2 space-y-3">
        {/* Signal Extraction */}
        <PaletteSection title="Signal Extraction">
          {SIGNAL_CATEGORIES.map((cat: any) => {
            const items = SIGNAL_TYPES.filter((s: any) => s.category === cat.key);
            if (!items.length) return null;
            return (
              <div key={cat.key}>
                <div className="px-2 py-1 text-[9.5px] uppercase tracking-[0.08em] text-[var(--text-tertiary)] font-semibold">
                  {cat.label}
                </div>
                {items.map((s: any) => {
                  const Icon = ICONS[s.icon] || Boxes;
                  return (
                    <PaletteItem
                      key={s.type}
                      onDragStart={(e: React.DragEvent) => onDragStart(e, `signal:${s.type}`)}
                      icon={Icon}
                      label={s.label}
                      description={s.summary}
                    />
                  );
                })}
              </div>
            );
          })}
        </PaletteSection>

        {/* Projection Coordination */}
        <PaletteSection title="Projection Coordination">
          {PROJECTION_CATEGORIES.map((cat: any) => {
            const items = PROJECTION_TYPES.filter((p: any) => p.category === cat.key);
            if (!items.length) return null;
            return (
              <div key={cat.key}>
                <div className="px-2 py-1 text-[9.5px] uppercase tracking-[0.08em] text-[var(--text-tertiary)] font-semibold">
                  {cat.label}
                </div>
                {items.map((p: any) => (
                  <PaletteItem
                    key={p.type}
                    onDragStart={(e: React.DragEvent) => onDragStart(e, `projection:${p.type}`)}
                    icon={ICONS[p.icon] || Boxes}
                    label={p.label}
                    description={p.summary}
                  />
                ))}
              </div>
            );
          })}
        </PaletteSection>

        {/* Decision Making */}
        <PaletteSection title="Decision Making">
          <PaletteItem
            onDragStart={(e: React.DragEvent) => onDragStart(e, "route")}
            icon={Workflow}
            label="Route"
            description="Routing rule (when → model)"
          />
        </PaletteSection>

        {/* Model Selection */}
        <PaletteSection title="Model Selection">
          <PaletteItem
            onDragStart={(e: React.DragEvent) => onDragStart(e, "model")}
            icon={Cpu}
            label="Model"
            description="Add a model for dispatch"
          />
        </PaletteSection>

        {/* Plugin Chain */}
        <PaletteSection title="Plugin Chain">
          {PLUGINS.map((p: any) => (
            <PaletteItem
              key={p.type}
              onDragStart={(e: React.DragEvent) => onDragStart(e, `plugin:${p.type}`)}
              icon={ShieldCheck}
              label={p.label}
              description={p.summary}
            />
          ))}
        </PaletteSection>
      </div>
    </aside>
  );
}

export function PaletteSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="border border-[var(--bg-secondary)] rounded-[var(--radius)] overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] uppercase tracking-[0.08em] text-[var(--text-tertiary)] font-semibold hover:bg-[var(--bg-tertiary)] transition-colors"
      >
        <span>{title}</span>
        <ChevronDown
          className={cn("h-3 w-3 transition-transform", !isExpanded && "-rotate-90")}
        />
      </button>
      {isExpanded && <div className="px-1 pb-2">{children}</div>}
    </div>
  );
}

export function PaletteItem({
  onDragStart,
  icon: Icon,
  label,
  description,
}: {
  onDragStart: (e: React.DragEvent) => void;
  icon: any;
  label: string;
  description: string;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex items-center gap-2 rounded-[var(--radius)] border border-[var(--bg-secondary)] bg-[var(--bg-primary)] p-2 cursor-grab active:cursor-grabbing hover:bg-[var(--bg-tertiary)] mb-1 transition-colors"
      title={description}
    >
      <Icon className="h-3.5 w-3.5 text-[var(--accent-blue)] shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-[11.5px] font-medium truncate text-[var(--text-primary)]">
          {label}
        </div>
        <div className="text-[10px] text-[var(--text-secondary)] truncate">
          {description}
        </div>
      </div>
    </div>
  );
}
