"use client";

// Route inspector. Extracted from page.js (RouteEditor) with no behavior change.

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { PLUGINS } from "../../catalog";
import { RulesEditor } from "../../RulesEditor";
import { Field, FormRow, SectionLabel, SelectInput, TextInput } from "./primitives";

export function RouteEditor({
  route,
  signalIds,
  projIds,
  modelOptions,
  pluginNames: _pluginNames,
  routes: _routes,
  onUpdate,
}: {
  route: any;
  signalIds: string[];      // signal NAMES (label kept for back-compat of callsite)
  projIds: string[];        // projection names
  // Layer-4 nodes (Model + Model Group) — value is the node uid, label is a
  // human-readable model summary. `route.model` stores the chosen uid.
  modelOptions: { value: string; label: string }[];
  pluginNames: string[];
  routes: any[];
  onUpdate: (patch: any) => void;
}) {
  void _pluginNames;
  void _routes;
  // The new rules tree references signals AND projections (which the runtime
  // exposes as boolean facts named after the projection). Both kinds appear
  // in the leaf-signal dropdown as a single namespace.
  const referenceNames = [...signalIds, ...projIds];
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
            options={[{ value: "", label: "(none)" }, ...modelOptions]}
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
      <SectionLabel>Rules</SectionLabel>
      <RulesEditor
        value={route.rules}
        signalNames={referenceNames}
        onChange={(rules: any) => onUpdate({ rules })}
      />
    </>
  );
}
