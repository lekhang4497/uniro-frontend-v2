"use client";

// Model inspector. Extracted from page.js (ModelEditor) with no behavior change.

import { Field, FormRow, SectionLabel, SelectInput, TextInput } from "./primitives";

export function ModelEditor({
  model,
  onUpdate,
}: {
  model: any;
  onUpdate: (patch: any) => void;
}) {
  return (
    <>
      <Field label="Name" required>
        <TextInput value={model.name} onChange={(v) => onUpdate({ name: v })} mono />
      </Field>
      <Field label="Model ID">
        <TextInput
          value={model.model_id}
          onChange={(v) => onUpdate({ model_id: v })}
          placeholder="claude-sonnet-4-6"
          mono
        />
      </Field>
      <FormRow>
        <Field label="Max tokens">
          <TextInput
            type="number"
            value={model.max_tokens ?? ""}
            onChange={(v) => onUpdate({ max_tokens: v === "" ? undefined : Number(v) })}
            placeholder="4096"
          />
        </Field>
        <Field label="Temperature">
          <TextInput
            type="number"
            step="0.1"
            value={model.temperature ?? 0.7}
            onChange={(v) => onUpdate({ temperature: v === "" ? 0.7 : Number(v) })}
            placeholder="0.7"
          />
        </Field>
      </FormRow>
      <Field label="Parallel tool calls">
        <SelectInput
          value={String(model.parallel_tool_calls ?? "")}
          onChange={(v) =>
            onUpdate({ parallel_tool_calls: v === "" ? undefined : v === "true" })
          }
          options={[
            { value: "", label: "(default)" },
            { value: "true", label: "true" },
            { value: "false", label: "false" },
          ]}
        />
      </Field>
      <SectionLabel>Extra config (YAML)</SectionLabel>
      <textarea
        value={model.extra_config || ""}
        onChange={(e) => onUpdate({ extra_config: e.target.value })}
        rows={4}
        placeholder={"top_p: 0.9\npresence_penalty: 0.1"}
        className="w-full rounded-[var(--radius)] border border-[var(--bg-secondary)] bg-[var(--bg-primary)] text-[var(--text-primary)] px-3 py-2 text-[12px] font-mono resize-y"
      />
    </>
  );
}
