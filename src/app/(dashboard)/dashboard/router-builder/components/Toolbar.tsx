"use client";

// Toolbar primitives: TemplatesMenu dropdown and ToolBtn pill button.
// Extracted from page.js with no behavior change.

import { useEffect, useRef, useState } from "react";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/components/ui/button";

export function TemplatesMenu({
  templates,
  onPick,
}: {
  templates: any[];
  onPick: (tmpl: any) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <Button variant="ghost" size="sm" onClick={() => setOpen((v) => !v)}>
        <FileText className="h-3.5 w-3.5 mr-1.5" />
        Templates
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 w-[320px] rounded-[var(--radius-md)] border border-[var(--bg-secondary)] bg-[var(--bg-primary)] shadow-[var(--shadow-popover)] p-1">
          <div className="px-2.5 py-1.5 text-[10.5px] uppercase tracking-[0.08em] text-[var(--text-tertiary)] font-semibold">
            Start from a template
          </div>
          {templates.map((t: any) => (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setOpen(false);
                onPick(t);
              }}
              className="w-full text-left rounded-[var(--radius)] px-2.5 py-2 hover:bg-[var(--bg-secondary)] transition-colors"
            >
              <div className="text-[12.5px] font-medium text-[var(--text-primary)]">
                {t.name}
              </div>
              <div className="text-[11px] text-[var(--text-secondary)] mt-0.5 line-clamp-3">
                {t.description}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ToolBtn({
  active,
  onClick,
  icon,
  label,
  disabled,
}: {
  active?: boolean;
  onClick?: () => void;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors",
        active
          ? "bg-[var(--accent-blue)] text-[var(--text-inverted)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]",
        disabled && "opacity-40 cursor-not-allowed hover:bg-transparent"
      )}
    >
      {icon}
    </button>
  );
}
