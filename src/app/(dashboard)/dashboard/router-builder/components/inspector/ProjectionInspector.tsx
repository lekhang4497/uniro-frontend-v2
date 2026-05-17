"use client";

// Projection inspector. Extracted from page.js (ProjectionEditor) with no behavior change.

import { Plus, X } from "lucide-react";
import { PROJECTION_TYPE_BY_KEY, PROJECTION_TYPES } from "../../catalog";
import { ConfigField, Field, SectionLabel, SelectInput, TextInput } from "./primitives";

export function ProjectionEditor({
  proj,
  onUpdate,
  signalIds,
}: {
  proj: any;
  onUpdate: (patch: any) => void;
  signalIds: string[];
}) {
  const spec: any = (PROJECTION_TYPE_BY_KEY as any)[proj.type];
  const setConfig = (key: string, value: any) =>
    onUpdate({ config: { ...(proj.config || {}), [key]: value } });
  const inputs = proj.config?.inputs || [];
  const availableSignals = signalIds.filter(
    (sid: string) => !inputs.some((i: any) => i.name === sid)
  );
  return (
    <>
      <Field label="Name" required>
        <TextInput value={proj.name} onChange={(v) => onUpdate({ name: v })} mono />
      </Field>
      <Field label="Type" required>
        <SelectInput
          value={proj.type}
          onChange={(v) => onUpdate({ type: v, config: {} })}
          options={PROJECTION_TYPES.map((p: any) => ({ value: p.type, label: p.label }))}
        />
      </Field>
      {spec?.summary && (
        <div className="text-[11.5px] text-muted-foreground -mt-1">{spec.summary}</div>
      )}

      {/* Signal Inputs Section */}
      <SectionLabel>Signal Inputs</SectionLabel>
      {inputs.length === 0 && (
        <div className="text-[11px] text-muted-foreground italic">
          Connect signals from Layer 1 to this projection, or add manually below
        </div>
      )}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {inputs.map((input: any, idx: number) => (
          <div
            key={idx}
            className="inline-flex items-center gap-1 rounded-md border border-blue-300 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-700 px-2 py-0.5 text-[11px] text-blue-700 dark:text-blue-300"
          >
            <span className="font-mono">{input.name}</span>
            <button
              type="button"
              onClick={() => {
                const newInputs = inputs.filter((_: any, i: number) => i !== idx);
                setConfig("inputs", newInputs);
              }}
              className="ml-0.5 text-blue-500 hover:text-blue-700 dark:hover:text-blue-200"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
      {availableSignals.length > 0 && (
        <div className="mb-2">
          <div className="text-[10px] text-muted-foreground mb-1">Add connected signal:</div>
          <div className="flex flex-wrap gap-1">
            {availableSignals.map((sid: string) => (
              <button
                key={sid}
                type="button"
                onClick={() => {
                  // Preserve original behavior — original assigned to an unused `sig` var.
                  const sig = signalIds.includes(sid) && proj;
                  void sig;
                  setConfig("inputs", [...inputs, { type: "signal", name: sid }]);
                }}
                className="inline-flex items-center gap-1 rounded border border-dashed border-blue-300 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-700 px-2 py-0.5 text-[10.5px] text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30"
              >
                <Plus className="h-3 w-3" /> {sid}
              </button>
            ))}
          </div>
        </div>
      )}

      {spec?.fields?.length > 0 && (
        <>
          <SectionLabel>Config</SectionLabel>
          {spec.fields.map((field: any) => (
            <ConfigField
              key={field.key}
              field={field}
              value={proj.config?.[field.key]}
              onChange={(v) => setConfig(field.key, v)}
            />
          ))}
        </>
      )}
    </>
  );
}
