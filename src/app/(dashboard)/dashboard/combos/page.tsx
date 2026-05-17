"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Layers,
  Copy as CopyIcon,
  Check,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  X,
} from "lucide-react";
import {
  Card,
  Button,
  Modal,
  Input,
  CardSkeleton,
  ModelSelectModal,
  Toggle,
} from "@/shared/components";
import { useCopyToClipboard } from "@/shared/hooks/useCopyToClipboard";

// Validate combo name: only a-z, A-Z, 0-9, -, _
const VALID_NAME_REGEX = /^[a-zA-Z0-9_.\-]+$/;

type Combo = {
  id: string;
  name: string;
  models: string[];
  kind?: string | null;
};

type ProviderConnection = {
  id: string;
  provider: string;
  [k: string]: unknown;
};

type ComboStrategy = {
  fallbackStrategy?: string;
};

export default function CombosPage() {
  const [combos, setCombos] = useState<Combo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCombo, setEditingCombo] = useState<Combo | null>(null);
  const [activeProviders, setActiveProviders] = useState<ProviderConnection[]>([]);
  const [comboStrategies, setComboStrategies] = useState<Record<string, ComboStrategy>>({});
  const { copied, copy } = useCopyToClipboard();

  useEffect(() => {
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    try {
      const [combosRes, providersRes, settingsRes] = await Promise.all([
        fetch("/api/combos"),
        fetch("/api/providers"),
        fetch("/api/settings"),
      ]);
      const combosData = await combosRes.json();
      const providersData = await providersRes.json();
      const settingsData = settingsRes.ok ? await settingsRes.json() : {};

      // Only LLM combos here — webSearch/webFetch combos belong to media-providers/web
      if (combosRes.ok) setCombos((combosData.combos || []).filter((c: Combo) => !c.kind));
      if (providersRes.ok) {
        setActiveProviders(providersData.connections || []);
      }
      setComboStrategies(settingsData.comboStrategies || {});
    } catch (error) {
      console.log("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: { name: string; models: string[] }) => {
    try {
      const res = await fetch("/api/combos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        await fetchData();
        setShowCreateModal(false);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create combo");
      }
    } catch (error) {
      console.log("Error creating combo:", error);
    }
  };

  const handleUpdate = async (id: string, data: { name: string; models: string[] }) => {
    try {
      const res = await fetch(`/api/combos/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        await fetchData();
        setEditingCombo(null);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update combo");
      }
    } catch (error) {
      console.log("Error updating combo:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this combo?")) return;
    try {
      const res = await fetch(`/api/combos/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCombos(combos.filter((c) => c.id !== id));
      }
    } catch (error) {
      console.log("Error deleting combo:", error);
    }
  };

  const handleToggleRoundRobin = async (comboName: string, enabled: boolean) => {
    try {
      const updated = { ...comboStrategies };
      if (enabled) {
        updated[comboName] = { fallbackStrategy: "round-robin" };
      } else {
        delete updated[comboName];
      }

      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comboStrategies: updated }),
      });

      setComboStrategies(updated);
    } catch (error) {
      console.log("Error updating combo strategy:", error);
    }
  };

  if (loading) {
    return (
      <div className="px-8 py-7">
        <div className="flex flex-col gap-6">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="px-8 py-7">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 max-w-2xl">
          <h1 className="text-[26px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
            Combos
          </h1>
          <p className="mt-1 text-[14px] text-[var(--text-secondary)] max-w-[540px] leading-relaxed">
            Chain providers together. Uniro routes by weight; if one fails or hits its quota,
            the next takes over automatically.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {combos.length > 0 && (
            <span className="inline-flex items-center rounded-full border border-[var(--bg-secondary)] bg-[var(--bg-secondary)]/40 px-2.5 py-0.5 text-[11px] font-medium text-[var(--text-secondary)]">
              {combos.length} {combos.length === 1 ? "combo" : "combos"}
            </span>
          )}
          <Button icon={Plus} onClick={() => setShowCreateModal(true)} className="w-full sm:w-auto">
            New combo
          </Button>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {combos.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] mb-4">
                <Layers size={32} />
              </div>
              <p className="text-[var(--text-primary)] font-medium mb-1">No combos yet</p>
              <p className="text-sm text-[var(--text-secondary)] mb-4">
                Create model combos with fallback support
              </p>
              <Button
                icon={Plus}
                onClick={() => setShowCreateModal(true)}
                className="w-full sm:w-auto"
              >
                Create Combo
              </Button>
            </div>
          </Card>
        ) : (
          combos.map((combo) => (
            <ComboCard
              key={combo.id}
              combo={combo}
              copied={copied}
              onCopy={copy}
              onEdit={() => setEditingCombo(combo)}
              onDelete={() => handleDelete(combo.id)}
              roundRobinEnabled={
                comboStrategies[combo.name]?.fallbackStrategy === "round-robin"
              }
              onToggleRoundRobin={(enabled) => handleToggleRoundRobin(combo.name, enabled)}
            />
          ))
        )}
      </div>

      {/* Create Modal - Use key to force remount and reset state */}
      <ComboFormModal
        key="create"
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleCreate}
        activeProviders={activeProviders}
      />

      {/* Edit Modal - Use key to force remount and reset state */}
      <ComboFormModal
        key={editingCombo?.id || "new"}
        isOpen={!!editingCombo}
        combo={editingCombo}
        onClose={() => setEditingCombo(null)}
        onSave={async (data) => {
          if (editingCombo) await handleUpdate(editingCombo.id, data);
        }}
        activeProviders={activeProviders}
      />
    </div>
  );
}

function ComboCard({
  combo,
  copied,
  onCopy,
  onEdit,
  onDelete,
  roundRobinEnabled,
  onToggleRoundRobin,
}: {
  combo: Combo;
  copied: string | null;
  onCopy: (text: string, key: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  roundRobinEnabled: boolean;
  onToggleRoundRobin: (enabled: boolean) => void;
}) {
  return (
    <Card padding="sm" className="group">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
          <div
            className="size-9 rounded-[9px] flex items-center justify-center shrink-0"
            style={{ background: "var(--bg-secondary)" }}
          >
            <Layers size={20} className="text-[var(--accent-blue)]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <code className="truncate font-mono text-sm font-semibold">{combo.name}</code>
              {combo.models.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-green)]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent-green)]">
                  <span
                    className="size-1.5 rounded-full bg-[var(--accent-green)]"
                    aria-hidden="true"
                  />
                  active
                </span>
              )}
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-1">
              {combo.models.length === 0 ? (
                <span className="text-xs text-[var(--text-secondary)] italic">No models</span>
              ) : (
                combo.models.slice(0, 3).map((model, index) => (
                  <code
                    key={index}
                    className="max-w-full truncate rounded bg-[var(--bg-secondary)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-secondary)] sm:max-w-[220px]"
                  >
                    {model}
                  </code>
                ))
              )}
              {combo.models.length > 3 && (
                <span className="text-[10px] text-[var(--text-secondary)]">
                  +{combo.models.length - 3} more
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3 sm:shrink-0">
          {/* Round Robin Toggle */}
          <div className="flex items-center justify-between gap-1.5 rounded-lg bg-[var(--bg-secondary)]/40 px-2 py-1.5 sm:justify-start sm:bg-transparent sm:px-0 sm:py-0">
            <span className="text-xs text-[var(--text-secondary)] font-medium">Round Robin</span>
            <Toggle size="sm" checked={roundRobinEnabled} onChange={onToggleRoundRobin} />
          </div>

          <div className="grid grid-cols-3 gap-1 sm:flex">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCopy(combo.name, `combo-${combo.id}`);
              }}
              className="flex flex-col items-center rounded px-2 py-1 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--accent-blue)]"
              title="Copy combo name"
            >
              {copied === `combo-${combo.id}` ? <Check size={18} /> : <CopyIcon size={18} />}
              <span className="text-[10px] leading-tight">Copy</span>
            </button>
            <button
              onClick={onEdit}
              className="flex flex-col items-center rounded px-2 py-1 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--accent-blue)]"
              title="Edit"
            >
              <Pencil size={18} />
              <span className="text-[10px] leading-tight">Edit</span>
            </button>
            <button
              onClick={onDelete}
              className="flex flex-col items-center rounded px-2 py-1 text-[var(--accent-red)] transition-colors hover:bg-[var(--accent-red)]/10"
              title="Delete"
            >
              <Trash2 size={18} />
              <span className="text-[10px] leading-tight">Delete</span>
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

// Inline editable model item
function ModelItem({
  index,
  model,
  isFirst,
  isLast,
  onEdit,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  index: number;
  model: string;
  isFirst: boolean;
  isLast: boolean;
  onEdit: (val: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(model);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== model) onEdit(trimmed);
    else setDraft(model); // revert if empty or unchanged
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") {
      setDraft(model);
      setEditing(false);
    }
  };

  return (
    <div className="group flex min-w-0 items-center gap-1.5 rounded-md bg-[var(--bg-secondary)]/40 px-2 py-1 transition-colors hover:bg-[var(--bg-secondary)]">
      {/* Index badge */}
      <span className="text-[10px] font-medium text-[var(--text-secondary)] w-3 text-center shrink-0">
        {index + 1}
      </span>

      {/* Inline editable model value */}
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          className="min-w-0 flex-1 rounded border border-[var(--accent-blue)]/40 bg-[var(--bg-primary)] px-1.5 py-0.5 font-mono text-xs text-[var(--text-primary)] outline-none"
        />
      ) : (
        <div
          className="min-w-0 flex-1 cursor-text truncate rounded px-1.5 py-0.5 font-mono text-xs text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
          onClick={() => setEditing(true)}
          title="Click to edit"
        >
          {model}
        </div>
      )}

      {/* Priority arrows */}
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          onClick={onMoveUp}
          disabled={isFirst}
          className={`p-0.5 rounded ${isFirst ? "text-[var(--text-tertiary)]/40 cursor-not-allowed" : "text-[var(--text-secondary)] hover:text-[var(--accent-blue)] hover:bg-[var(--bg-secondary)]"}`}
          title="Move up"
        >
          <ArrowUp size={12} />
        </button>
        <button
          onClick={onMoveDown}
          disabled={isLast}
          className={`p-0.5 rounded ${isLast ? "text-[var(--text-tertiary)]/40 cursor-not-allowed" : "text-[var(--text-secondary)] hover:text-[var(--accent-blue)] hover:bg-[var(--bg-secondary)]"}`}
          title="Move down"
        >
          <ArrowDown size={12} />
        </button>
      </div>

      {/* Remove */}
      <button
        onClick={onRemove}
        className="p-0.5 hover:bg-[var(--accent-red)]/10 rounded text-[var(--text-secondary)] hover:text-[var(--accent-red)] transition-all"
        title="Remove"
      >
        <X size={12} />
      </button>
    </div>
  );
}

function ComboFormModal({
  isOpen,
  combo,
  onClose,
  onSave,
  activeProviders,
  kindFilter = null,
}: {
  isOpen: boolean;
  combo?: Combo | null;
  onClose: () => void;
  onSave: (data: { name: string; models: string[] }) => void | Promise<void>;
  activeProviders: ProviderConnection[];
  kindFilter?: string | null;
}) {
  const [name, setName] = useState(combo?.name || "");
  const [models, setModels] = useState<string[]>(combo?.models || []);
  const [showModelSelect, setShowModelSelect] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState("");
  const [modelAliases, setModelAliases] = useState<Record<string, string>>({});

  const fetchModalData = async () => {
    try {
      const aliasesRes = await fetch("/api/models/alias");
      if (!aliasesRes.ok) return;
      const aliasesData = await aliasesRes.json();
      setModelAliases(aliasesData.aliases || {});
    } catch (error) {
      console.error("Error fetching modal data:", error);
    }
  };

  useEffect(() => {
    if (isOpen) fetchModalData();
  }, [isOpen]);

  const validateName = (value: string) => {
    if (!value.trim()) {
      setNameError("Name is required");
      return false;
    }
    if (!VALID_NAME_REGEX.test(value)) {
      setNameError("Only letters, numbers, -, _ and . allowed");
      return false;
    }
    setNameError("");
    return true;
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);
    if (value) validateName(value);
    else setNameError("");
  };

  const handleAddModel = (model: { value: string }) => {
    if (!models.includes(model.value)) {
      setModels([...models, model.value]);
    }
  };

  const handleDeselectModel = (model: { value: string }) => {
    setModels(models.filter((m) => m !== model.value));
  };

  const handleRemoveModel = (index: number) => {
    setModels(models.filter((_, i) => i !== index));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newModels = [...models];
    const a = newModels[index - 1]!;
    const b = newModels[index]!;
    newModels[index - 1] = b;
    newModels[index] = a;
    setModels(newModels);
  };

  const handleMoveDown = (index: number) => {
    if (index === models.length - 1) return;
    const newModels = [...models];
    const a = newModels[index]!;
    const b = newModels[index + 1]!;
    newModels[index] = b;
    newModels[index + 1] = a;
    setModels(newModels);
  };

  const handleSave = async () => {
    if (!validateName(name)) return;
    setSaving(true);
    await onSave({ name: name.trim(), models });
    setSaving(false);
  };

  const isEdit = !!combo;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? "Edit Combo" : "Create Combo"}>
        <div className="flex flex-col gap-3">
          {/* Name */}
          <div>
            <Input
              label="Combo Name"
              value={name}
              onChange={handleNameChange}
              placeholder="my-combo"
              error={nameError}
            />
            <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
              Only letters, numbers, -, _ and . allowed
            </p>
          </div>

          {/* Models */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Models</label>

            {models.length === 0 ? (
              <div className="text-center py-4 border border-dashed border-[var(--bg-secondary)] rounded-lg bg-[var(--bg-secondary)]/20">
                <Layers size={20} className="text-[var(--text-secondary)] mx-auto mb-1" />
                <p className="text-xs text-[var(--text-secondary)]">No models added yet</p>
              </div>
            ) : (
              <div className="flex max-h-[55vh] min-w-0 flex-col gap-1 overflow-y-auto sm:max-h-[350px]">
                {models.map((model, index) => (
                  <ModelItem
                    key={index}
                    index={index}
                    model={model}
                    isFirst={index === 0}
                    isLast={index === models.length - 1}
                    onEdit={(newVal) => {
                      const updated = [...models];
                      updated[index] = newVal;
                      setModels(updated);
                    }}
                    onMoveUp={() => handleMoveUp(index)}
                    onMoveDown={() => handleMoveDown(index)}
                    onRemove={() => handleRemoveModel(index)}
                  />
                ))}
              </div>
            )}

            {/* Add Model button */}
            <button
              onClick={() => setShowModelSelect(true)}
              className="w-full mt-2 py-2 border border-dashed border-[var(--bg-secondary)] rounded-lg text-xs text-[var(--accent-blue)] font-medium hover:border-[var(--accent-blue)]/50 transition-colors flex items-center justify-center gap-1"
            >
              <Plus size={16} />
              Add Model
            </button>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-1 sm:flex-row">
            <Button onClick={onClose} variant="ghost" fullWidth size="sm">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              fullWidth
              size="sm"
              disabled={!name.trim() || !!nameError || saving}
            >
              {saving ? "Saving..." : isEdit ? "Save" : "Create"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Model Select Modal */}
      <ModelSelectModal
        isOpen={showModelSelect}
        onClose={() => setShowModelSelect(false)}
        onSelect={handleAddModel}
        onDeselect={handleDeselectModel}
        activeProviders={activeProviders}
        modelAliases={modelAliases}
        title="Add Model to Combo"
        kindFilter={kindFilter}
        addedModelValues={models}
        closeOnSelect={false}
      />
    </>
  );
}
