"use client";

import { Bot, CheckCircle2, XCircle, Loader2, FlaskConical, Check, Copy as CopyIcon, X } from "lucide-react";

export default function ModelRow({
  model,
  fullModel,
  copied,
  onCopy,
  testStatus,
  isCustom,
  onDeleteAlias,
  onTest,
  isTesting,
  onDisable,
}: {
  model: { id: string; name?: string };
  fullModel: string;
  alias?: string;
  copied?: string | null;
  onCopy: (text: string, key: string) => void;
  testStatus?: "ok" | "error";
  isCustom?: boolean;
  isFree?: boolean;
  onDeleteAlias?: () => void;
  onTest?: () => void;
  isTesting?: boolean;
  onDisable?: () => void;
}) {
  const borderColor =
    testStatus === "ok"
      ? "border-[var(--accent-green)]/40"
      : testStatus === "error"
      ? "border-[var(--accent-red)]/40"
      : "border-[var(--bg-secondary)]";

  const StatusIcon = testStatus === "ok" ? CheckCircle2 : testStatus === "error" ? XCircle : Bot;
  const iconColor =
    testStatus === "ok"
      ? "var(--accent-green)"
      : testStatus === "error"
      ? "var(--accent-red)"
      : undefined;

  return (
    <div
      className={`group min-w-0 max-w-full rounded-lg border px-3 py-2 ${borderColor} hover:bg-[var(--bg-secondary)]/40`}
    >
      <div className="flex min-w-0 items-start gap-2 sm:items-center">
        <StatusIcon size={16} className="shrink-0" style={iconColor ? { color: iconColor } : undefined} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <code className="max-w-[72vw] truncate rounded bg-[var(--bg-secondary)] px-1.5 py-0.5 font-mono text-xs text-[var(--text-secondary)] sm:max-w-[360px]">
            {fullModel}
          </code>
          {model.name && (
            <span className="truncate pl-1 text-[9px] italic text-[var(--text-tertiary)]">
              {model.name}
            </span>
          )}
        </div>
        {onTest && (
          <div className="relative shrink-0 group/btn">
            <button
              onClick={onTest}
              disabled={isTesting}
              className={`rounded p-0.5 text-[var(--text-secondary)] transition-opacity hover:bg-[var(--bg-secondary)] hover:text-[var(--accent-blue)] ${isTesting ? "opacity-100" : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100"}`}
            >
              {isTesting ? <Loader2 size={14} className="animate-spin" /> : <FlaskConical size={14} />}
            </button>
            <span className="pointer-events-none absolute mt-1 top-5 left-1/2 -translate-x-1/2 text-[10px] text-[var(--text-secondary)] whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity">
              {isTesting ? "Testing..." : "Test"}
            </span>
          </div>
        )}
        <div className="relative shrink-0 group/btn">
          <button
            onClick={() => onCopy(fullModel, `model-${model.id}`)}
            className="rounded p-0.5 text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--accent-blue)]"
          >
            {copied === `model-${model.id}` ? <Check size={14} /> : <CopyIcon size={14} />}
          </button>
          <span className="pointer-events-none absolute mt-1 top-5 left-1/2 -translate-x-1/2 text-[10px] text-[var(--text-secondary)] whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity">
            {copied === `model-${model.id}` ? "Copied!" : "Copy"}
          </span>
        </div>
        {isCustom ? (
          <button
            onClick={onDeleteAlias}
            className="ml-auto rounded p-0.5 text-[var(--text-secondary)] opacity-100 transition-opacity hover:bg-[var(--accent-red)]/10 hover:text-[var(--accent-red)] sm:opacity-0 sm:group-hover:opacity-100"
            title="Remove custom model"
          >
            <X size={14} />
          </button>
        ) : onDisable ? (
          <button
            onClick={onDisable}
            className="ml-auto rounded p-0.5 text-[var(--text-secondary)] opacity-100 transition-opacity hover:bg-[var(--accent-red)]/10 hover:text-[var(--accent-red)] sm:opacity-0 sm:group-hover:opacity-100"
            title="Disable this model"
          >
            <X size={14} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
