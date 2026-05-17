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
    <aside className="hidden md:flex w-[380px] xl:w-[440px] shrink-0 flex-col bg-secondary/30 border-l border-border">
      <div className="px-3 py-2.5 border-b border-border flex items-center gap-2 bg-card shrink-0">
        <Code2 className="h-4 w-4 text-muted-foreground" />
        <div className="text-[12px] font-semibold">router.yaml</div>
        <span className="text-[11px] text-muted-foreground">live preview</span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <pre className="flex-1 overflow-auto custom-scrollbar p-4 m-0 text-[12px] leading-[1.55] font-mono whitespace-pre">
        {yaml}
      </pre>
      {(lint.errors.length > 0 || lint.warnings.length > 0) && (
        <div className="border-t border-border bg-card px-3 py-2 text-[11.5px] space-y-0.5 max-h-[180px] overflow-auto custom-scrollbar shrink-0">
          {lint.errors.map((e: string, i: number) => (
            <div key={`e-${i}`} className="text-destructive flex items-start gap-1.5">
              <FileWarning className="h-3 w-3 mt-0.5 shrink-0" />
              <span>{e}</span>
            </div>
          ))}
          {lint.warnings.map((w: string, i: number) => (
            <div
              key={`w-${i}`}
              className="text-amber-600 dark:text-amber-400 flex items-start gap-1.5"
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
