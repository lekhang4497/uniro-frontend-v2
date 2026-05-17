"use client";

// Plugin inspector. Extracted from page.js (PluginEditor) with no behavior change.

import { PLUGINS } from "../../catalog";
import { Field, SectionLabel, SelectInput, TextInput } from "./primitives";

export function PluginEditor({
  plugin,
  onUpdate,
}: {
  plugin: any;
  onUpdate: (patch: any) => void;
}) {
  return (
    <>
      <Field label="Name" required>
        <TextInput value={plugin.name} onChange={(v) => onUpdate({ name: v })} mono />
      </Field>
      <Field label="Type" required>
        <SelectInput
          value={plugin.type}
          onChange={(v) => onUpdate({ type: v })}
          options={PLUGINS.map((p: any) => ({ value: p.type, label: p.label }))}
        />
      </Field>
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
        <input
          type="checkbox"
          checked={plugin.enabled !== false}
          onChange={(e) => onUpdate({ enabled: e.target.checked })}
          className="h-4 w-4"
        />
        <div>
          <div className="text-[13px] font-medium">Enabled</div>
          <div className="text-[11px] text-muted-foreground">Disable to bypass this plugin</div>
        </div>
      </div>
      <SectionLabel>Plugin config (YAML)</SectionLabel>
      <textarea
        value={plugin.config ? JSON.stringify(plugin.config, null, 2) : ""}
        onChange={(e) => {
          try {
            onUpdate({ config: e.target.value ? JSON.parse(e.target.value) : {} });
          } catch {
            // ignore invalid JSON while typing
          }
        }}
        rows={4}
        placeholder="{}"
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[12px] font-mono resize-y"
      />
    </>
  );
}
