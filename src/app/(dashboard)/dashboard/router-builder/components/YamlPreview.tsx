"use client";

// YAML preview drawer (live preview of `router.yaml`).
// Extracted from page.js with no behavior change.

import { AlertTriangle, Code2, FileWarning, X } from "lucide-react";

export function YamlPreview({
  yaml,
  lint,
  onClose,
}: {
  yaml: string;
  lint: { errors: string[]; warnings: string[] };
  onClose: () => void;
}) {
  return (
    <aside className="hidden md:flex w-[380px] xl:w-[440px] shrink-0 flex-col bg-[var(--bg-tertiary)] border-l border-[var(--bg-secondary)]">
      <div className="px-3 py-2.5 border-b border-[var(--bg-secondary)] flex items-center gap-2 bg-[var(--bg-primary)] shrink-0">
        <Code2 className="h-4 w-4 text-[var(--text-secondary)]" />
        <div className="text-[12px] font-semibold text-[var(--text-primary)]">router.yaml</div>
        <span className="text-[11px] text-[var(--text-tertiary)]">live preview</span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <pre className="flex-1 overflow-auto custom-scrollbar m-3 p-3 text-[12px] leading-[1.55] font-mono whitespace-pre bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-[var(--radius)]">
        {yaml}
      </pre>
      {(lint.errors.length > 0 || lint.warnings.length > 0) && (
        <div className="border-t border-[var(--bg-secondary)] bg-[var(--bg-primary)] px-3 py-2 text-[11.5px] space-y-0.5 max-h-[180px] overflow-auto custom-scrollbar shrink-0">
          {lint.errors.map((e: string, i: number) => (
            <div
              key={`e-${i}`}
              className="text-[var(--accent-red)] flex items-start gap-1.5"
            >
              <FileWarning className="h-3 w-3 mt-0.5 shrink-0" />
              <span>{e}</span>
            </div>
          ))}
          {lint.warnings.map((w: string, i: number) => (
            <div
              key={`w-${i}`}
              className="text-[var(--accent-orange)] flex items-start gap-1.5"
            >
              <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
