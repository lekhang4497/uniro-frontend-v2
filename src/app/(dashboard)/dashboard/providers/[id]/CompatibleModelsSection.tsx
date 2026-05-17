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
  Download,
} from "lucide-react";
import { Button } from "@/shared/components";

type Connection = { id: string; isActive?: boolean };

function CompatibleModelRow({
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

export default function CompatibleModelsSection({
  providerStorageAlias,
  providerDisplayAlias,
  modelAliases,
  copied,
  onCopy,
  onSetAlias,
  onDeleteAlias,
  connections,
  isAnthropic,
}: {
  providerStorageAlias: string;
  providerDisplayAlias: string;
  modelAliases: Record<string, string>;
  copied?: string | null;
  onCopy: (text: string, key: string) => void;
  onSetAlias: (modelId: string, alias: string, storageAlias: string) => Promise<void> | void;
  onDeleteAlias: (alias: string) => Promise<void> | void;
  connections: Connection[];
  isAnthropic?: boolean;
}) {
  const [newModel, setNewModel] = useState("");
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [testingModelId, setTestingModelId] = useState<string | null>(null);
  const [modelTestResults, setModelTestResults] = useState<Record<string, "ok" | "error">>({});

  const handleTestModel = async (modelId: string) => {
    if (testingModelId) return;
    setTestingModelId(modelId);
    try {
      const res = await fetch("/api/models/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: `${providerStorageAlias}/${modelId}` }),
      });
      const data = await res.json();
      setModelTestResults((prev) => ({ ...prev, [modelId]: data.ok ? "ok" : "error" }));
    } catch {
      setModelTestResults((prev) => ({ ...prev, [modelId]: "error" }));
    } finally {
      setTestingModelId(null);
    }
  };

  const providerAliases = Object.entries(modelAliases).filter(([, model]) =>
    model.startsWith(`${providerStorageAlias}/`),
  );

  const allModels = providerAliases.map(([alias, fullModel]) => ({
    modelId: fullModel.replace(`${providerStorageAlias}/`, ""),
    fullModel,
    alias,
  }));

  const generateDefaultAlias = (modelId: string): string => {
    const parts = modelId.split("/");
    return parts[parts.length - 1] ?? modelId;
  };

  const resolveAlias = (modelId: string): string | null => {
    const fullModel = `${providerStorageAlias}/${modelId}`;
    if (Object.values(modelAliases).includes(fullModel)) return null;
    const baseAlias = generateDefaultAlias(modelId);
    if (!modelAliases[baseAlias]) return baseAlias;
    const prefixedAlias = `${providerDisplayAlias}-${baseAlias}`;
    if (!modelAliases[prefixedAlias]) return prefixedAlias;
    return null;
  };

  const handleAdd = async () => {
    if (!newModel.trim() || adding) return;
    const modelId = newModel.trim();
    const resolvedAlias = resolveAlias(modelId);
    if (!resolvedAlias) {
      alert(
        "All suggested aliases already exist. Please choose a different model or remove conflicting aliases.",
      );
      return;
    }

    setAdding(true);
    try {
      await onSetAlias(modelId, resolvedAlias, providerStorageAlias);
      setNewModel("");
    } catch (error) {
      console.log("Error adding model:", error);
    } finally {
      setAdding(false);
    }
  };

  const handleImport = async () => {
    if (importing) return;
    const activeConnection = connections.find((conn) => conn.isActive !== false);
    if (!activeConnection) return;

    setImporting(true);
    try {
      const res = await fetch(`/api/providers/${activeConnection.id}/models`);
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to import models");
        return;
      }
      const models = data.models || [];
      if (models.length === 0) {
        alert("No models returned from /models.");
        return;
      }
      let importedCount = 0;
      for (const model of models) {
        const modelId = model.id || model.name || model.model;
        if (!modelId) continue;
        const resolvedAlias = resolveAlias(modelId);
        if (!resolvedAlias) continue;
        await onSetAlias(modelId, resolvedAlias, providerStorageAlias);
        importedCount += 1;
      }
      if (importedCount === 0) {
        alert("No new models were added.");
      }
    } catch (error) {
      console.log("Error importing models:", error);
    } finally {
      setImporting(false);
    }
  };

  const canImport = connections.some((conn) => conn.isActive !== false);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-[var(--text-secondary)]">
        Add {isAnthropic ? "Anthropic" : "OpenAI"}-compatible models manually or import them from
        the /models endpoint.
      </p>

      <div className="flex items-end gap-2 flex-wrap">
        <div className="flex-1 min-w-[240px]">
          <label
            htmlFor="new-compatible-model-input"
            className="text-xs text-[var(--text-secondary)] mb-1 block"
          >
            Model ID
          </label>
          <input
            id="new-compatible-model-input"
            type="text"
            value={newModel}
            onChange={(e) => setNewModel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder={isAnthropic ? "claude-3-opus-20240229" : "gpt-4o"}
            className="w-full px-3 py-2 text-sm border border-[var(--bg-secondary)] rounded-lg bg-[var(--bg-primary)] focus:outline-none focus:border-[var(--accent-blue)]"
          />
        </div>
        <Button size="sm" icon={Plus} onClick={handleAdd} disabled={!newModel.trim() || adding}>
          {adding ? "Adding..." : "Add"}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          icon={Download}
          onClick={handleImport}
          disabled={!canImport || importing}
        >
          {importing ? "Importing..." : "Import from /models"}
        </Button>
      </div>

      {!canImport && (
        <p className="text-xs text-[var(--text-secondary)]">
          Add a connection to enable importing models.
        </p>
      )}

      {allModels.length > 0 && (
        <div className="flex flex-col gap-3">
          {allModels.map(({ modelId, fullModel, alias }) => (
            <CompatibleModelRow
              key={fullModel}
              modelId={modelId}
              fullModel={`${providerDisplayAlias}/${modelId}`}
              copied={copied}
              onCopy={onCopy}
              onDeleteAlias={() => onDeleteAlias(alias)}
              onTest={connections.length > 0 ? () => handleTestModel(modelId) : undefined}
              testStatus={modelTestResults[modelId]}
              isTesting={testingModelId === modelId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
