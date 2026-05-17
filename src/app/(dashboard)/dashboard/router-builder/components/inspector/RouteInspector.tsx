"use client";

// Route inspector. Extracted from page.js (RouteEditor) with no behavior change.

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { PLUGINS } from "../../catalog";
import { WhenEditor } from "../../WhenEditor";
import { Field, FormRow, SectionLabel, SelectInput, TextInput } from "./primitives";

export function RouteEditor({
  route,
  signalIds,
  projIds,
  modelNames,
  pluginNames: _pluginNames,
  routes: _routes,
  onUpdate,
}: {
  route: any;
  signalIds: string[];
  projIds: string[];
  modelNames: string[];
  pluginNames: string[];
  routes: any[];
  onUpdate: (patch: any) => void;
}) {
  void _pluginNames;
  void _routes;
  const togglePlugin = (name: string) => {
    const has = route.plugins?.includes(name);
    onUpdate({
      plugins: has
        ? route.plugins.filter((p: string) => p !== name)
        : [...(route.plugins || []), name],
    });
  };
  return (
    <>
      <Field label="Name" required>
        <TextInput value={route.name} onChange={(v) => onUpdate({ name: v })} mono />
      </Field>
      <FormRow>
        <Field label="Priority" hint="Higher wins">
          <TextInput
            type="number"
            value={route.priority ?? 0}
            onChange={(v) => onUpdate({ priority: Number(v) || 0 })}
          />
        </Field>
        <Field label="Model">
          <SelectInput
            value={route.model || ""}
            onChange={(v) => onUpdate({ model: v })}
            options={[
              { value: "", label: "(none)" },
              ...modelNames.map((n: string) => ({ value: n, label: n })),
            ]}
          />
        </Field>
      </FormRow>
      <SectionLabel>Plugins on this route</SectionLabel>
      <div className="flex flex-wrap gap-1.5 -mt-1">
        {PLUGINS.map((p: any) => {
          const active = route.plugins?.includes(p.type);
          return (
            <button
              key={p.type}
              type="button"
              onClick={() => togglePlugin(p.type)}
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] transition-colors font-medium",
                active
                  ? "border-rose-400 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-300"
                  : "border-border bg-card text-muted-foreground hover:bg-secondary"
              )}
            >
              {active && <Check className="h-3 w-3" />}
              {p.label}
            </button>
          );
        })}
      </div>
      <SectionLabel>When</SectionLabel>
      <WhenEditor
        value={route.when}
        signalIds={signalIds}
        projIds={projIds}
        onChange={(when: any) => onUpdate({ when })}
      />
    </>
  );
}
