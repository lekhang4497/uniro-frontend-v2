"use client";

// Model Group inspector — edits the YAML `modelRefs:` form: a weighted list
// of models plus a selection `algorithm`. Each row mirrors router_service's
// `ModelRef`. The YAML is the source of truth; there is no canvas-only alias.

import { Plus, Trash2 } from "lucide-react";
import { ALGORITHM_TYPES, REASONING_EFFORTS } from "../../catalog";
import { emptyModelRef } from "../../lib/state";
import { BoolField, Field, FormRow, SectionLabel, SelectInput, TextInput } from "./primitives";
import { ModelPicker } from "./ModelPicker";

export function ModelGroupEditor({
  group,
  onUpdate,
}: {
  group: any;
  onUpdate: (patch: any) => void;
}) {
  const refs: any[] = Array.isArray(group.refs) ? group.refs : [];

  const updateRef = (index: number, patch: any) => {
    onUpdate({
      refs: refs.map((r: any, i: number) => (i === index ? { ...r, ...patch } : r)),
    });
  };
  const addRef = () => onUpdate({ refs: [...refs, emptyModelRef()] });
  const removeRef = (index: number) => {
    onUpdate({ refs: refs.filter((_: any, i: number) => i !== index) });
  };

  return (
    <>
      <Field
        label="Algorithm"
        hint="How the engine picks one model from the set. `static` uses the highest weight."
      >
        <SelectInput
          value={group.algorithm || "static"}
          onChange={(v) => onUpdate({ algorithm: v })}
          options={ALGORITHM_TYPES}
        />
      </Field>

      <SectionLabel>Models ({refs.length})</SectionLabel>

      {refs.length === 0 && (
        <div className="text-[11.5px] text-[var(--text-secondary)]">
          No models yet — add at least one.
        </div>
      )}

      <div className="flex flex-col gap-4">
        {refs.map((ref: any, i: number) => (
          <div
            key={i}
            className="flex flex-col gap-3 rounded-[var(--radius)] border border-[var(--bg-secondary)] p-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] uppercase tracking-[0.08em] text-[var(--text-tertiary)] font-semibold">
                Model {i + 1}
              </span>
              <button
                type="button"
                onClick={() => removeRef(i)}
                aria-label={`Remove model ${i + 1}`}
                className="inline-flex h-6 w-6 items-center justify-center rounded-[var(--radius)] text-[var(--text-secondary)] hover:bg-[var(--accent-red)]/10 hover:text-[var(--accent-red)]"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            <Field label="Model" required>
              <ModelPicker
                value={ref.model || ""}
                onChange={(v) => updateRef(i, { model: v })}
              />
            </Field>

            <FormRow>
              <Field label="Weight" hint="Higher wins under `static`.">
                <TextInput
                  type="number"
                  step="0.1"
                  value={ref.weight ?? 1}
                  onChange={(v) => updateRef(i, { weight: v === "" ? 1 : Number(v) })}
                  placeholder="1.0"
                />
              </Field>
              <Field label="LoRA name">
                <TextInput
                  value={ref.lora_name ?? ""}
                  onChange={(v) => updateRef(i, { lora_name: v })}
                  placeholder="(optional)"
                  mono
                />
              </Field>
            </FormRow>

            <BoolField
              label="Use reasoning"
              hint="Enable extended reasoning for this model."
              value={!!ref.use_reasoning}
              onChange={(v) => updateRef(i, { use_reasoning: v })}
            />

            {ref.use_reasoning && (
              <>
                <Field label="Reasoning effort">
                  <SelectInput
                    value={ref.reasoning_effort ?? ""}
                    onChange={(v) =>
                      updateRef(i, { reasoning_effort: v === "" ? undefined : v })
                    }
                    options={[
                      { value: "", label: "(default)" },
                      ...REASONING_EFFORTS.map((e: string) => ({ value: e, label: e })),
                    ]}
                  />
                </Field>
                <Field label="Reasoning description">
                  <TextInput
                    value={ref.reasoning_description ?? ""}
                    onChange={(v) => updateRef(i, { reasoning_description: v })}
                    placeholder="(optional)"
                  />
                </Field>
              </>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addRef}
        className="inline-flex items-center justify-center gap-1.5 h-9 rounded-[var(--radius)] text-[12.5px] text-[var(--text-primary)] border border-[var(--bg-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        Add model
      </button>
    </>
  );
}
