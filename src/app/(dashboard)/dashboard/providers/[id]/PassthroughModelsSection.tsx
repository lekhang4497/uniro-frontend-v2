"use client";

import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Bot,
  Check,
  Copy as CopyIcon,
  Loader2,
  FlaskConical,
  Trash2,
  Plus,
} from "lucide-react";
import { Button } from "@/shared/components";

function PassthroughModelRow({
  modelId,
  fullModel,
  copied,
  onCopy,
  onDeleteAlias,
  onTest,
  testStatus,
  isTesting,
}: {
  modelId: string;
  fullModel: string;
  copied?: string | null;
  onCopy: (text: string, key: string) => void;
  onDeleteAlias: () => void;
  onTest?: () => void;
  testStatus?: "ok" | "error";
  isTesting?: boolean;
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
      : "var(--text-secondary)";

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border ${borderColor} hover:bg-[var(--bg-secondary)]/40`}
    >
      <StatusIcon size={16} style={{ color: iconColor }} />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{modelId}</p>

        <div className="flex items-center gap-1 mt-1">
          <code className="text-xs text-[var(--text-secondary)] font-mono bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded">
            {fullModel}
          </code>
          <div className="relative group/btn">
            <button
              onClick={() => onCopy(fullModel, `model-${modelId}`)}
              className="p-0.5 hover:bg-[var(--bg-secondary)] rounded text-[var(--text-secondary)] hover:text-[var(--accent-blue)]"
            >
              {copied === `model-${modelId}` ? <Check size={14} /> : <CopyIcon size={14} />}
            </button>
            <span className="pointer-events-none absolute top-5 left-1/2 -translate-x-1/2 text-[10px] text-[var(--text-secondary)] whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity">
              {copied === `model-${modelId}` ? "Copied!" : "Copy"}
            </span>
          </div>
          {onTest && (
            <div className="relative group/btn">
              <button
                onClick={onTest}
                disabled={isTesting}
                className="p-0.5 hover:bg-[var(--bg-secondary)] rounded text-[var(--text-secondary)] hover:text-[var(--accent-blue)] transition-colors"
              >
                {isTesting ? <Loader2 size={14} className="animate-spin" /> : <FlaskConical size={14} />}
              </button>
              <span className="pointer-events-none absolute top-5 left-1/2 -translate-x-1/2 text-[10px] text-[var(--text-secondary)] whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-opacity">
                {isTesting ? "Testing..." : "Test"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Delete button */}
      <button
        onClick={onDeleteAlias}
        className="p-1 hover:bg-[var(--accent-red)]/10 rounded text-[var(--accent-red)]"
        title="Remove model"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

export default function PassthroughModelsSection({
  providerAlias,
  modelAliases,
  copied,
  onCopy,
  onSetAlias,
  onDeleteAlias,
}: {
  providerAlias: string;
  modelAliases: Record<string, string>;
  copied?: string | null;
  onCopy: (text: string, key: string) => void;
  onSetAlias: (modelId: string, alias: string) => Promise<void> | void;
  onDeleteAlias: (alias: string) => Promise<void> | void;
}) {
  const [newModel, setNewModel] = useState("");
  const [adding, setAdding] = useState(false);

  const providerAliases = Object.entries(modelAliases).filter(([, model]) =>
    model.startsWith(`${providerAlias}/`),
  );

  const allModels = providerAliases.map(([alias, fullModel]) => ({
    modelId: fullModel.replace(`${providerAlias}/`, ""),
    fullModel,
    alias,
  }));

  const generateDefaultAlias = (modelId: string): string => {
    const parts = modelId.split("/");
    return parts[parts.length - 1] ?? modelId;
  };

  const handleAdd = async () => {
    if (!newModel.trim() || adding) return;
    const modelId = newModel.trim();
    const defaultAlias = generateDefaultAlias(modelId);

    if (modelAliases[defaultAlias]) {
      alert(
        `Alias "${defaultAlias}" already exists. Please use a different model or edit existing alias.`,
      );
      return;
    }

    setAdding(true);
    try {
      await onSetAlias(modelId, defaultAlias);
      setNewModel("");
    } catch (error) {
      console.log("Error adding model:", error);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-[var(--text-secondary)]">
        OpenRouter supports any model. Add models and create aliases for quick access.
      </p>

      {/* Add new model */}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label
            htmlFor="new-model-input"
            className="text-xs text-[var(--text-secondary)] mb-1 block"
          >
            Model ID (from OpenRouter)
          </label>
          <input
            id="new-model-input"
            type="text"
            value={newModel}
            onChange={(e) => setNewModel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="anthropic/claude-3-opus"
            className="w-full px-3 py-2 text-sm border border-[var(--bg-secondary)] rounded-lg bg-[var(--bg-primary)] focus:outline-none focus:border-[var(--accent-blue)]"
          />
        </div>
        <Button size="sm" icon={Plus} onClick={handleAdd} disabled={!newModel.trim() || adding}>
          {adding ? "Adding..." : "Add"}
        </Button>
      </div>

      {/* Models list */}
      {allModels.length > 0 && (
        <div className="flex flex-col gap-3">
          {allModels.map(({ modelId, fullModel, alias }) => (
            <PassthroughModelRow
              key={fullModel}
              modelId={modelId}
              fullModel={fullModel}
              copied={copied}
              onCopy={onCopy}
              onDeleteAlias={() => onDeleteAlias(alias)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
