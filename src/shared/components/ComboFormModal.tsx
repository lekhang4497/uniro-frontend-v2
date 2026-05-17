"use client";

import { useState, useEffect, type KeyboardEvent } from "react";
import { ArrowDown, ArrowUp, Layers, Plus, X } from "lucide-react";
import Modal from "./Modal";
import Input from "./Input";
import Button from "./Button";
import ModelSelectModal from "./ModelSelectModal";

const VALID_NAME_REGEX = /^[a-zA-Z0-9_.\-]+$/;

interface ModelItemProps {
  index: number;
  model: string;
  isFirst: boolean;
  isLast: boolean;
  onEdit: (value: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}

// Inline editable model item
function ModelItem({ index, model, isFirst, isLast, onEdit, onMoveUp, onMoveDown, onRemove }: ModelItemProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(model);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== model) onEdit(trimmed);
    else setDraft(model);
    setEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") {
      setDraft(model);
      setEditing(false);
    }
  };

  return (
    <div className="group flex min-w-0 items-center gap-1.5 rounded-[var(--radius)] bg-[var(--bg-secondary)] px-2 py-1 transition-colors hover:bg-[var(--bg-tertiary)]">
      <span className="text-[10px] font-medium text-[var(--text-secondary)] w-3 text-center shrink-0">
        {index + 1}
      </span>
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
          className="min-w-0 flex-1 cursor-text truncate rounded px-1.5 py-0.5 font-mono text-xs text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
          onClick={() => setEditing(true)}
          title="Click to edit"
        >
          {model}
        </div>
      )}
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={isFirst}
          className={`p-0.5 rounded ${
            isFirst
              ? "text-[var(--text-tertiary)]/20 cursor-not-allowed"
              : "text-[var(--text-secondary)] hover:text-[var(--accent-blue)] hover:bg-[var(--bg-tertiary)]"
          }`}
          title="Move up"
        >
          <ArrowUp className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={isLast}
          className={`p-0.5 rounded ${
            isLast
              ? "text-[var(--text-tertiary)]/20 cursor-not-allowed"
              : "text-[var(--text-secondary)] hover:text-[var(--accent-blue)] hover:bg-[var(--bg-tertiary)]"
          }`}
          title="Move down"
        >
          <ArrowDown className="h-3 w-3" />
        </button>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="p-0.5 hover:bg-[var(--accent-red)]/10 rounded text-[var(--text-secondary)] hover:text-[var(--accent-red)] transition-colors"
        title="Remove"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

export interface Combo {
  id?: string;
  name?: string;
  models?: string[];
}

export interface ActiveProvider {
  provider: string;
  [key: string]: unknown;
}

export interface ComboFormModalProps {
  isOpen: boolean;
  combo?: Combo | null;
  onClose: () => void;
  onSave: (combo: { name: string; models: string[] }) => Promise<void> | void;
  activeProviders?: ActiveProvider[];
  kindFilter?: string | null;
  forcePrefix?: string;
  title?: string;
}

// Reusable Combo create/edit modal. forcePrefix auto-prepends to name.
export default function ComboFormModal({
  isOpen,
  combo,
  onClose,
  onSave,
  activeProviders,
  kindFilter = null,
  forcePrefix = "",
  title,
}: ComboFormModalProps) {
  // Strip prefix when editing existing combo so user only edits suffix
  const initialName = combo?.name
    ? forcePrefix && combo.name.startsWith(forcePrefix)
      ? combo.name.slice(forcePrefix.length)
      : combo.name
    : "";
  const [name, setName] = useState(initialName);
  const [models, setModels] = useState<string[]>(combo?.models || []);
  const [showModelSelect, setShowModelSelect] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState("");
  const [modelAliases, setModelAliases] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;
    fetch("/api/models/alias")
      .then((r) => (r.ok ? (r.json() as Promise<{ aliases?: Record<string, string> }>) : null))
      .then((d) => d && setModelAliases(d.aliases || {}))
      .catch(() => {});
  }, [isOpen]);

  const validateName = (value: string): boolean => {
    if (!value.trim()) {
      setNameError("Name is required");
      return false;
    }
    const full = forcePrefix + value;
    if (!VALID_NAME_REGEX.test(full)) {
      setNameError("Only letters, numbers, -, _ and . allowed");
      return false;
    }
    setNameError("");
    return true;
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (forcePrefix && value.startsWith(forcePrefix)) value = value.slice(forcePrefix.length);
    setName(value);
    if (value) validateName(value);
    else setNameError("");
  };

  const handleAddModel = (model: { value?: string }) => {
    if (model.value && !models.includes(model.value)) setModels([...models, model.value]);
  };
  const handleRemoveModel = (i: number) => setModels(models.filter((_, idx) => idx !== i));
  const handleMoveUp = (i: number) => {
    if (i === 0) return;
    const a = [...models];
    const tmp = a[i - 1];
    if (a[i] !== undefined && tmp !== undefined) {
      a[i - 1] = a[i];
      a[i] = tmp;
    }
    setModels(a);
  };
  const handleMoveDown = (i: number) => {
    if (i === models.length - 1) return;
    const a = [...models];
    const tmp = a[i + 1];
    if (a[i] !== undefined && tmp !== undefined) {
      a[i + 1] = a[i];
      a[i] = tmp;
    }
    setModels(a);
  };

  const handleSave = async () => {
    if (!validateName(name)) return;
    setSaving(true);
    await onSave({ name: forcePrefix + name.trim(), models });
    setSaving(false);
  };

  const isEdit = !!combo;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={title || (isEdit ? "Edit Combo" : "Create Combo")}
      >
        <div className="flex flex-col gap-3">
          <div>
            {forcePrefix ? (
              <>
                <label className="text-sm font-medium mb-1 block">Combo Name</label>
                <div className="flex items-stretch">
                  <span className="inline-flex items-center px-2 rounded-l border border-r-0 border-[var(--bg-secondary)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] font-mono text-sm">
                    {forcePrefix}
                  </span>
                  <input
                    value={name}
                    onChange={handleNameChange}
                    placeholder="my-combo"
                    className="flex-1 min-w-0 rounded-r border border-[var(--bg-secondary)] bg-[var(--bg-primary)] px-2 py-1.5 font-mono text-sm outline-none focus:border-[var(--accent-blue)]"
                  />
                </div>
                {nameError && (
                  <p className="text-[11px] text-[var(--accent-red)] mt-0.5">{nameError}</p>
                )}
              </>
            ) : (
              <Input
                label="Combo Name"
                value={name}
                onChange={handleNameChange}
                placeholder="my-combo"
                error={nameError}
              />
            )}
            <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
              {forcePrefix ? `Auto-prefixed with "${forcePrefix}". ` : ""}Only letters, numbers, -, _ and . allowed
            </p>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Models</label>
            {models.length === 0 ? (
              <div className="text-center py-4 border border-dashed border-[var(--bg-secondary)] rounded-[var(--radius-md)] bg-[var(--bg-secondary)]/30">
                <Layers className="h-5 w-5 mx-auto text-[var(--text-secondary)] mb-1" />
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
                    onEdit={(v) => {
                      const a = [...models];
                      a[index] = v;
                      setModels(a);
                    }}
                    onMoveUp={() => handleMoveUp(index)}
                    onMoveDown={() => handleMoveDown(index)}
                    onRemove={() => handleRemoveModel(index)}
                  />
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowModelSelect(true)}
              className="w-full mt-2 py-2 border border-dashed border-[var(--bg-secondary)] rounded-[var(--radius-md)] text-xs text-[var(--accent-blue)] font-medium hover:border-[var(--accent-blue)]/50 transition-colors flex items-center justify-center gap-1"
            >
              <Plus className="h-4 w-4" />
              Add Model
            </button>
          </div>

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

      <ModelSelectModal
        isOpen={showModelSelect}
        onClose={() => setShowModelSelect(false)}
        onSelect={handleAddModel}
        activeProviders={activeProviders}
        modelAliases={modelAliases}
        title="Add Model to Combo"
        kindFilter={kindFilter}
      />
    </>
  );
}
