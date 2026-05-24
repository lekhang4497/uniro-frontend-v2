"use client";

// Signal inspector. Extracted from page.js (SignalEditor) with no behavior change.

import { SIGNAL_TYPE_BY_KEY, SIGNAL_TYPES } from "../../catalog";
import { ConfigField, Field, SectionLabel, SelectInput, TextInput } from "./primitives";

export function SignalEditor({
  signal,
  onUpdate,
}: {
  signal: any;
  onUpdate: (patch: any) => void;
}) {
  const spec: any = (SIGNAL_TYPE_BY_KEY as any)[signal.type];
  const setConfig = (key: string, value: any) =>
    onUpdate({ config: { ...(signal.config || {}), [key]: value } });
  return (
    <>
      <Field label="Name" required>
        <TextInput value={signal.name} onChange={(v) => onUpdate({ name: v })} mono />
      </Field>
      <Field label="Type" required>
        <SelectInput
          value={signal.type}
          onChange={(v) => onUpdate({ type: v, config: {} })}
          options={SIGNAL_TYPES.map((s: any) => ({ value: s.type, label: s.label }))}
        />
      </Field>
      {spec?.summary && (
        <div className="text-[11.5px] text-muted-foreground -mt-1">{spec.summary}</div>
      )}
      <Field label="Timeout (ms)">
        <TextInput
          type="number"
          value={signal.timeout_ms ?? 50}
          onChange={(v) => onUpdate({ timeout_ms: Number(v) })}
        />
      </Field>
      {spec?.fields?.length > 0 && (
        <>
          <SectionLabel>Config</SectionLabel>
          {spec.fields.map((field: any) => (
            <ConfigField
              key={field.key}
              field={field}
              value={signal.config?.[field.key]}
              onChange={(v) => setConfig(field.key, v)}
            />
          ))}
        </>
      )}
    </>
  );
}
