"use client";

// YAML tab inside the right dock. Spec §9.2:
//   - Monaco editor, language `yaml`.
//   - Read-only while a tool call is in flight (streaming.active).
//   - Local draft state — Save commits to the YAML store (and through to
//     persistence via the parent's auto-save) and pushes an undo entry.
//   - Reset discards the draft.
//   - Validation status bar at the bottom: green check + "Valid", or red +
//     "N errors" with a popover listing them.

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AlertTriangle, Check, RotateCcw, Save } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";

// Monaco does not SSR (it needs the DOM); dynamic import + ssr:false matches
// the pattern used in /dashboard/translator.
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 grid place-items-center text-[12px] text-muted-foreground">
      Loading editor...
    </div>
  ),
});

const EDITOR_OPTIONS = {
  minimap: { enabled: false },
  fontSize: 12,
  lineNumbers: "on",
  scrollBeyondLastLine: false,
  wordWrap: "on",
  automaticLayout: true,
  tabSize: 2,
  insertSpaces: true,
  renderWhitespace: "selection",
};

export function YamlView({ yaml, setYaml, validation, streaming }) {
  // Local draft. Initialize from store yaml; if the store yaml changes
  // externally (agent edit, undo/redo, etc.) and the local draft hasn't
  // been touched, sync. If draft has diverged, leave it but mark dirty.
  const [draft, setDraft] = useState(yaml);
  const lastSyncedRef = useRef(yaml);

  useEffect(() => {
    // If draft matches the previous synced value, the user hasn't touched
    // anything locally — pull in the new store yaml. Otherwise, leave the
    // local edits alone (the user can Reset to pull).
    if (draft === lastSyncedRef.current) {
      setDraft(yaml);
      lastSyncedRef.current = yaml;
    }
  }, [yaml, draft]);

  const dirty = draft !== yaml;

  const onSave = () => {
    if (!dirty) return;
    setYaml(draft, { actor: "user", description: "yaml edit" });
    lastSyncedRef.current = draft;
  };

  const onReset = () => {
    setDraft(yaml);
    lastSyncedRef.current = yaml;
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="px-3 py-2 border-b border-border flex items-center gap-2">
        <span className="text-[11px] uppercase tracking-[0.08em] text-subtle font-semibold flex-1">
          YAML
        </span>
        {streaming && (
          <span className="text-[10.5px] text-muted-foreground italic">
            agent editing -- read only
          </span>
        )}
        <button
          type="button"
          onClick={onReset}
          disabled={!dirty || streaming}
          title="Discard local changes"
          className="inline-flex items-center gap-1 px-2 h-7 rounded-md text-[11.5px] text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!dirty || streaming}
          title="Save to YAML store"
          className={cn(
            "inline-flex items-center gap-1 px-2 h-7 rounded-md text-[11.5px]",
            dirty && !streaming
              ? "bg-foreground text-background hover:bg-foreground/90"
              : "bg-secondary text-muted-foreground"
          )}
        >
          <Save className="h-3 w-3" />
          Save
        </button>
      </div>

      <div className="flex-1 min-h-0">
        <MonacoEditor
          height="100%"
          language="yaml"
          theme="vs"
          value={draft}
          onChange={(value) => setDraft(typeof value === "string" ? value : "")}
          options={{
            ...EDITOR_OPTIONS,
            readOnly: !!streaming,
          }}
        />
      </div>

      <ValidationBar validation={validation} dirty={dirty} />
    </div>
  );
}

function ValidationBar({ validation, dirty }) {
  const ok = validation?.ok !== false;
  const errors = Array.isArray(validation?.errors) ? validation.errors : [];
  const warnings = Array.isArray(validation?.warnings) ? validation.warnings : [];
  const errorCount = errors.length;
  const warningCount = warnings.length;

  const summary = useMemo(() => {
    if (ok && warningCount === 0) return "Valid";
    if (ok && warningCount > 0) return `${warningCount} warning${warningCount === 1 ? "" : "s"}`;
    return `${errorCount} error${errorCount === 1 ? "" : "s"}`;
  }, [ok, errorCount, warningCount]);

  return (
    <div className="border-t border-border bg-card px-3 py-1.5 flex items-center gap-2 text-[11.5px]">
      {ok ? (
        <Check className="h-3.5 w-3.5 text-emerald-600" />
      ) : (
        <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
      )}
      <span className={cn(ok ? "text-muted-foreground" : "text-destructive")}>
        {summary}
      </span>
      {(errorCount > 0 || warningCount > 0) && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="ml-1 text-[11px] underline underline-offset-2 text-muted-foreground hover:text-foreground"
            >
              details
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[320px] p-2 text-[11.5px] max-h-[280px] overflow-y-auto custom-scrollbar">
            <Issues label="Errors" items={errors} tone="destructive" />
            <Issues label="Warnings" items={warnings} tone="warning" />
          </PopoverContent>
        </Popover>
      )}
      <span className="flex-1" />
      {dirty && (
        <span className="text-[11px] text-amber-600">unsaved</span>
      )}
    </div>
  );
}

function Issues({ label, items, tone }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="mb-2 last:mb-0">
      <div
        className={cn(
          "text-[10px] uppercase tracking-[0.08em] font-semibold mb-1",
          tone === "destructive" ? "text-destructive" : "text-amber-600"
        )}
      >
        {label}
      </div>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i} className="rounded border border-border bg-card p-1.5">
            <div className="mono text-[10.5px] text-muted-foreground truncate">{it.path}</div>
            <div className="text-[11px]">{it.message}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
