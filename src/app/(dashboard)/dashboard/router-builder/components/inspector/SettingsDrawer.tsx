"use client";

// Router-level settings drawer (metadata, defaults, guardrails, observability).
// Extracted from page.js with no behavior change.

import { Settings2, X } from "lucide-react";
import { CREATED_BY_METHOD, ON_NO_MATCH } from "../../catalog";
import {
  BoolField,
  Field,
  FormRow,
  SectionLabel,
  SelectInput,
  TextInput,
} from "./primitives";

export function SettingsDrawer({
  state,
  onPatch,
  onPatchPath,
  onClose,
}: {
  state: any;
  onPatch: (p: any) => void;
  onPatchPath: (key: string, p: any) => void;
  onClose: () => void;
}) {
  const setFallback = (text: string) => {
    const arr = text
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    onPatchPath("defaults", { fallback_chain: arr });
  };
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <aside className="w-full max-w-md bg-card border-l border-border flex flex-col overflow-hidden">
        <div className="px-4 h-14 shrink-0 flex items-center gap-2 border-b border-border">
          <Settings2 className="h-4 w-4 text-muted-foreground" />
          <div className="text-sm font-semibold flex-1">Router settings</div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-4">
          <SectionLabel>Metadata</SectionLabel>
          <Field label="Name" required>
            <TextInput value={state.name} onChange={(v) => onPatch({ name: v })} mono />
          </Field>
          <Field label="Description">
            <textarea
              value={state.description}
              onChange={(e) => onPatch({ description: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-y"
            />
          </Field>
          <FormRow>
            <Field label="Version">
              <TextInput
                type="number"
                value={state.version}
                onChange={(v) => onPatch({ version: Number(v) || 1 })}
              />
            </Field>
            <Field label="Schema version">
              <TextInput
                type="number"
                value={state.schema_version}
                onChange={(v) => onPatch({ schema_version: Number(v) || 1 })}
              />
            </Field>
          </FormRow>
          <FormRow>
            <Field label="Created at">
              <TextInput
                value={state.created_at}
                onChange={(v) => onPatch({ created_at: v })}
                placeholder="2026-05-12T00:00:00Z"
                mono
              />
            </Field>
            <Field label="Created by method">
              <SelectInput
                value={state.created_by_method}
                onChange={(v) => onPatch({ created_by_method: v })}
                options={CREATED_BY_METHOD}
              />
            </Field>
          </FormRow>
          <Field label="Created by">
            <TextInput
              value={state.created_by}
              onChange={(v) => onPatch({ created_by: v })}
              placeholder="alice@example.com"
            />
          </Field>

          <SectionLabel>Defaults</SectionLabel>
          <FormRow>
            <Field label="Alpha">
              <TextInput
                type="number"
                value={state.defaults.alpha}
                onChange={(v) => onPatchPath("defaults", { alpha: Number(v) })}
              />
            </Field>
            <Field label="On no match">
              <SelectInput
                value={state.defaults.on_no_match}
                onChange={(v) => onPatchPath("defaults", { on_no_match: v })}
                options={ON_NO_MATCH}
              />
            </Field>
          </FormRow>
          <Field label="Fallback chain" hint="Comma-separated list of model IDs.">
            <TextInput
              value={state.defaults.fallback_chain.join(", ")}
              onChange={setFallback}
              placeholder="claude-haiku-4-5, gemini-2.5-flash"
              mono
            />
          </Field>

          <SectionLabel>Guardrails</SectionLabel>
          <FormRow>
            <Field
              label="Daily cost cap (USD)"
              hint="Attaches cost_cap to every route."
            >
              <TextInput
                type="number"
                value={state.guardrails.daily_cost_cap_usd ?? ""}
                onChange={(v) =>
                  onPatchPath("guardrails", {
                    daily_cost_cap_usd: v === "" ? null : Number(v),
                  })
                }
                placeholder="50"
              />
            </Field>
            <Field label="Max model cost ($/M)" hint="Validate-time cap.">
              <TextInput
                type="number"
                value={state.guardrails.max_model_cost_usd_per_m ?? ""}
                onChange={(v) =>
                  onPatchPath("guardrails", {
                    max_model_cost_usd_per_m: v === "" ? null : Number(v),
                  })
                }
                placeholder="30"
              />
            </Field>
          </FormRow>
          <Field label="Forbidden models" hint="Comma-separated.">
            <TextInput
              value={(state.guardrails.forbidden_models || []).join(", ")}
              onChange={(v) =>
                onPatchPath("guardrails", {
                  forbidden_models: v
                    .split(/[,\n]/)
                    .map((s: string) => s.trim())
                    .filter(Boolean),
                })
              }
              mono
            />
          </Field>
          <BoolField
            label="Block outbound PII"
            hint="Validator errors if a route lacks pii_redact."
            value={state.guardrails.pii_block_outbound}
            onChange={(v) => onPatchPath("guardrails", { pii_block_outbound: v })}
          />

          <SectionLabel>Observability</SectionLabel>
          <BoolField
            label="Log decisions"
            hint="Write every decision to audit.jsonl."
            value={state.observability.log_decisions}
            onChange={(v) => onPatchPath("observability", { log_decisions: v })}
          />
          <BoolField
            label="Shadow mode"
            hint="Run parallel to the operator default for A/B."
            value={state.observability.shadow}
            onChange={(v) => onPatchPath("observability", { shadow: v })}
          />
        </div>
      </aside>
    </div>
  );
}
