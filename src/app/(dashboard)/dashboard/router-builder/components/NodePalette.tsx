"use client";

// Left-rail palette of draggable node types.
// Flat, borderless structure: section header (collapsible) > optional category label > rows.

import { useState } from "react";
import { Boxes, ChevronDown, Cpu, Layers, ShieldCheck, Workflow } from "lucide-react";
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
    <aside className="hidden md:flex w-[260px] shrink-0 border-r border-[var(--border)] bg-[var(--bg-primary)] flex-col overflow-y-auto custom-scrollbar">
      <div className="px-4 pt-4 pb-2 shrink-0">
        <div className="text-[14px] font-semibold text-[var(--text-primary)]">
          Components
        </div>
        <div className="text-[12px] text-[var(--text-tertiary)] mt-0.5">
          Drag onto the canvas
        </div>
      </div>

      <div className="flex-1 px-2 pb-3">
        {/* Signal Extraction */}
        <PaletteSection title="Signal Extraction">
          {SIGNAL_CATEGORIES.map((cat: any) => {
            const items = SIGNAL_TYPES.filter((s: any) => s.category === cat.key);
            if (!items.length) return null;
            return (
              <CategoryGroup key={cat.key} label={cat.label}>
                {items.map((s: any) => {
                  const Icon = ICONS[s.icon] || Boxes;
                  return (
                    <PaletteItem
                      key={s.type}
                      onDragStart={(e) => onDragStart(e, `signal:${s.type}`)}
                      icon={Icon}
                      label={s.label}
                      description={s.summary}
                    />
                  );
                })}
              </CategoryGroup>
            );
          })}
        </PaletteSection>

        {/* Projection Coordination */}
        <PaletteSection title="Projection Coordination">
          {PROJECTION_CATEGORIES.map((cat: any) => {
            const items = PROJECTION_TYPES.filter((p: any) => p.category === cat.key);
            if (!items.length) return null;
            return (
              <CategoryGroup key={cat.key} label={cat.label}>
                {items.map((p: any) => (
                  <PaletteItem
                    key={p.type}
                    onDragStart={(e) => onDragStart(e, `projection:${p.type}`)}
                    icon={ICONS[p.icon] || Boxes}
                    label={p.label}
                    description={p.summary}
                  />
                ))}
              </CategoryGroup>
            );
          })}
        </PaletteSection>

        {/* Decision Making */}
        <PaletteSection title="Decision Making">
          <PaletteItem
            onDragStart={(e) => onDragStart(e, "route")}
            icon={Workflow}
            label="Route"
            description="Routing rule (when → model)"
          />
        </PaletteSection>

        {/* Model Selection */}
        <PaletteSection title="Model Selection">
          <PaletteItem
            onDragStart={(e) => onDragStart(e, "model")}
            icon={Cpu}
            label="Model"
            description="A single model for dispatch"
          />
          <PaletteItem
            onDragStart={(e) => onDragStart(e, "modelGroup")}
            icon={Layers}
            label="Model Group"
            description="A weighted set of models (modelRefs)"
          />
        </PaletteSection>

        {/* Plugin Chain */}
        <PaletteSection title="Plugin Chain">
          {PLUGINS.map((p: any) => (
            <PaletteItem
              key={p.type}
              onDragStart={(e) => onDragStart(e, `plugin:${p.type}`)}
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
    <div className="mt-2 first:mt-1">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-2 py-1.5 text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors rounded-[var(--radius-sm)]"
      >
        <span>{title}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-[var(--text-tertiary)] transition-transform",
            !isExpanded && "-rotate-90"
          )}
        />
      </button>
      {isExpanded && <div className="mt-0.5">{children}</div>}
    </div>
  );
}

function CategoryGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-1">
      <div className="px-2 pt-1.5 pb-0.5 text-[10px] uppercase tracking-[0.06em] text-[var(--text-tertiary)] font-medium">
        {label}
      </div>
      {children}
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
      className="flex items-start gap-2.5 rounded-[var(--radius-sm)] px-2 py-1.5 cursor-grab active:cursor-grabbing hover:bg-[var(--bg-tertiary)] transition-colors"
      title={description}
    >
      <Icon
        className="h-[14px] w-[14px] mt-[3px] text-[var(--text-tertiary)] shrink-0"
        strokeWidth={1.75}
      />
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] font-medium leading-tight text-[var(--text-primary)]">
          {label}
        </div>
        <div className="text-[11px] leading-tight text-[var(--text-tertiary)] mt-0.5 truncate">
          {description}
        </div>
      </div>
    </div>
  );
}
