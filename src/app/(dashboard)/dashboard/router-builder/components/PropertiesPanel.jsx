"use client";

// Properties tab. Spec §9.2 + §3 decision 11: scalar patches only. We round-
// trip YAML through parse/stringify and rewrite the affected node in place.
//
// Editable for now:
//   - Signal: name (regex-checked), type read-only, config read-only JSON
//   - Decision: name, priority (number), model/rules/plugins read-only
// All other selections render the underlying YAML block as read-only JSON.
// No add / delete / structural changes — those go through the agent or
// the YAML editor.

import { useMemo, useState } from "react";
import { Edit3 } from "lucide-react";

import { parseYaml, stringifyYaml } from "@/lib/router-agent/yaml.js";
import {
  NAME_RE,
  SIGNAL_NAME_RE,
} from "@/lib/router-agent/validator/registries.js";

export function PropertiesPanel({
  yaml,
  setYaml,
  selectedNodeId,
  onOpenYaml,
  streaming = false,
}) {
  const selection = useMemo(
    () => parseSelection(selectedNodeId),
    [selectedNodeId]
  );

  if (!selection) {
    return (
      <div className="flex-1 grid place-items-center px-6 text-center text-[12.5px] text-muted-foreground">
        <div>
          <Edit3 className="h-5 w-5 mx-auto mb-2 opacity-60" />
          Click a node to edit its properties.
        </div>
      </div>
    );
  }

  return (
    <PropertiesBody
      key={selectedNodeId /* reset local input state when selection changes */}
      yaml={yaml}
      setYaml={setYaml}
      selection={selection}
      onOpenYaml={onOpenYaml}
      streaming={streaming}
    />
  );
}

// "signal:foo" / "decision:bar" / "projection:partition:baz" / "placeholder:guardrails:guardrails"
function parseSelection(id) {
  if (typeof id !== "string" || !id) return null;
  const parts = id.split(":");
  const kind = parts[0];
  if (kind === "signal" && parts.length === 2) {
    return { kind: "signal", name: parts[1] };
  }
  if (kind === "decision" && parts.length === 2) {
    return { kind: "decision", name: parts[1] };
  }
  if (kind === "projection" && parts.length === 3) {
    return { kind: "projection", projectionKind: parts[1], name: parts[2] };
  }
  if (kind === "placeholder" && parts.length === 3) {
    return { kind: "placeholder", placeholderKind: parts[1], name: parts[2] };
  }
  return null;
}

function PropertiesBody({ yaml, setYaml, selection, onOpenYaml, streaming }) {
  const parsed = useMemo(() => parseYaml(yaml), [yaml]);

  if (!parsed.ok || !parsed.data || typeof parsed.data !== "object") {
    return (
      <div className="flex-1 px-3 py-3 text-[12.5px] text-muted-foreground">
        YAML is not parseable. Edit it in the YAML tab to fix.
      </div>
    );
  }

  const doc = parsed.data;
  const target = locateTarget(doc, selection);

  if (!target) {
    return (
      <div className="flex-1 px-3 py-3 text-[12.5px] text-muted-foreground">
        Selected node is no longer in the YAML.
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-3 space-y-4">
      <Heading
        kind={selection.kind}
        subkind={
          selection.kind === "projection"
            ? selection.projectionKind
            : selection.kind === "placeholder"
              ? selection.placeholderKind
              : null
        }
        name={selection.name}
        onOpenYaml={onOpenYaml}
      />

      {streaming && (
        <div className="text-[11.5px] text-muted-foreground italic rounded-md border border-border bg-secondary/40 px-2.5 py-1.5">
          Editing locked while agent is running.
        </div>
      )}

      {selection.kind === "signal" && (
        <SignalEditor
          // Keyed on the live YAML value so an external rename / change
          // remounts the editor with a fresh draft (replaces a
          // props-into-state effect).
          key={`s:${target.name}`}
          signal={target}
          disabled={streaming}
          onPatch={(patch) =>
            applySignalPatch(doc, selection.name, patch, setYaml)
          }
        />
      )}
      {selection.kind === "decision" && (
        <DecisionEditor
          key={`d:${target.name}:${target.priority ?? "_"}`}
          decision={target}
          disabled={streaming}
          onPatch={(patch) =>
            applyDecisionPatch(doc, selection.name, patch, setYaml)
          }
        />
      )}
      {selection.kind === "projection" && (
        <ReadOnlyJson value={target} label={`${selection.projectionKind}`} />
      )}
      {selection.kind === "placeholder" && (
        <ReadOnlyJson value={target} label={selection.placeholderKind} />
      )}
    </div>
  );
}

function Heading({ kind, subkind, name, onOpenYaml }) {
  return (
    <div className="flex items-start gap-2">
      <div className="flex-1">
        <div className="text-[10px] uppercase tracking-[0.08em] text-subtle font-semibold">
          {[kind, subkind].filter(Boolean).join(" ")}
        </div>
        <div className="text-[14px] font-semibold truncate">{name}</div>
      </div>
      {onOpenYaml && (
        <button
          type="button"
          onClick={onOpenYaml}
          className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2"
        >
          Open in YAML
        </button>
      )}
    </div>
  );
}

// ---- Signal editor ----

// SignalEditor is keyed on the signal's current name in the parent so an
// external rename remounts this component with a fresh draft. That avoids
// having to mirror props into state with a useEffect.
function SignalEditor({ signal, onPatch, disabled = false }) {
  const [name, setName] = useState(signal.name || "");
  const [nameError, setNameError] = useState(null);

  const commitName = () => {
    if (disabled) return;
    const trimmed = name.trim();
    if (trimmed === signal.name) return;
    if (!SIGNAL_NAME_RE.test(trimmed)) {
      setNameError("Use letters, numbers, underscore. Must start with a letter or underscore.");
      return;
    }
    onPatch({ name: trimmed });
    setNameError(null);
  };

  return (
    <div className="space-y-4">
      <Field label="Name">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          disabled={disabled}
          className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm mono disabled:bg-secondary disabled:text-muted-foreground disabled:cursor-not-allowed"
        />
        {nameError && (
          <div className="text-[11px] text-destructive">{nameError}</div>
        )}
      </Field>
      <Field label="Type">
        <input
          type="text"
          value={signal.type || ""}
          readOnly
          className="w-full h-9 rounded-lg border border-border bg-secondary px-3 text-sm mono text-muted-foreground"
        />
      </Field>
      {signal.config && typeof signal.config === "object" && (
        <Field label="Config">
          <ReadOnlyJson value={signal.config} compact />
        </Field>
      )}
    </div>
  );
}

// ---- Decision editor ----

// DecisionEditor is keyed on the decision's identity in the parent so an
// external rename / priority change remounts this component with a fresh
// draft (see render below). That avoids mirroring props -> state with a
// useEffect.
function DecisionEditor({ decision, onPatch, disabled = false }) {
  const [name, setName] = useState(decision.name || "");
  const [nameError, setNameError] = useState(null);
  const [priority, setPriority] = useState(
    decision.priority === undefined ? "" : String(decision.priority)
  );

  const commitName = () => {
    if (disabled) return;
    const trimmed = name.trim();
    if (trimmed === decision.name) return;
    if (!NAME_RE.test(trimmed)) {
      setNameError("Use letters, numbers, hyphen, underscore. Must start with a letter or underscore.");
      return;
    }
    onPatch({ name: trimmed });
    setNameError(null);
  };

  const commitPriority = () => {
    if (disabled) return;
    if (priority === "") {
      if (decision.priority !== undefined) {
        onPatch({ priority: null });
      }
      return;
    }
    const n = Number(priority);
    if (!Number.isFinite(n)) return;
    if (n === decision.priority) return;
    onPatch({ priority: n });
  };

  return (
    <div className="space-y-4">
      <Field label="Name">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          disabled={disabled}
          className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm mono disabled:bg-secondary disabled:text-muted-foreground disabled:cursor-not-allowed"
        />
        {nameError && (
          <div className="text-[11px] text-destructive">{nameError}</div>
        )}
      </Field>
      <Field label="Priority">
        <input
          type="number"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          onBlur={commitPriority}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          disabled={disabled}
          className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm mono disabled:bg-secondary disabled:text-muted-foreground disabled:cursor-not-allowed"
          placeholder="(unset)"
        />
      </Field>

      {decision.model !== undefined && (
        <Field label="Model">
          <input
            type="text"
            value={decision.model || ""}
            readOnly
            className="w-full h-9 rounded-lg border border-border bg-secondary px-3 text-sm mono text-muted-foreground"
          />
          <Hint>Use the chat or YAML view to change the model wiring.</Hint>
        </Field>
      )}

      {decision.modelRefs && (
        <Field label="ModelRefs">
          <ReadOnlyJson value={decision.modelRefs} compact />
        </Field>
      )}

      {decision.rules && (
        <Field label="Rules">
          <ReadOnlyJson value={decision.rules} compact />
        </Field>
      )}

      {decision.plugins && decision.plugins.length > 0 && (
        <Field label="Plugins">
          <ReadOnlyJson value={decision.plugins} compact />
        </Field>
      )}
    </div>
  );
}

// ---- helpers ----

function locateTarget(doc, selection) {
  if (!doc || typeof doc !== "object") return null;
  if (selection.kind === "signal") {
    return Array.isArray(doc.signals)
      ? doc.signals.find((s) => s && s.name === selection.name)
      : null;
  }
  if (selection.kind === "decision") {
    return Array.isArray(doc.decisions)
      ? doc.decisions.find((d) => d && d.name === selection.name)
      : null;
  }
  if (selection.kind === "projection") {
    const bucket = doc.projections && doc.projections[
      selection.projectionKind === "partition" ? "partitions"
        : selection.projectionKind === "score" ? "scores"
        : "mappings"
    ];
    return Array.isArray(bucket)
      ? bucket.find((p) => p && p.name === selection.name)
      : null;
  }
  if (selection.kind === "placeholder") {
    return doc[selection.placeholderKind] || null;
  }
  return null;
}

function applySignalPatch(doc, name, patch, setYaml) {
  if (!Array.isArray(doc.signals)) return;
  const idx = doc.signals.findIndex((s) => s && s.name === name);
  if (idx === -1) return;
  const original = doc.signals[idx];
  doc.signals[idx] = { ...original, ...patch };
  const yamlOut = stringifyYaml(doc);
  setYaml(yamlOut, {
    actor: "user",
    description: `properties: signal ${patch.name ? `${name} -> ${patch.name}` : name}`,
  });
}

function applyDecisionPatch(doc, name, patch, setYaml) {
  if (!Array.isArray(doc.decisions)) return;
  const idx = doc.decisions.findIndex((d) => d && d.name === name);
  if (idx === -1) return;
  const original = doc.decisions[idx];
  const merged = { ...original };
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) delete merged[k];
    else merged[k] = v;
  }
  doc.decisions[idx] = merged;
  const yamlOut = stringifyYaml(doc);
  setYaml(yamlOut, {
    actor: "user",
    description: `properties: decision ${patch.name ? `${name} -> ${patch.name}` : name}`,
  });
}

// ---- presentational ----

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] uppercase tracking-[0.08em] text-subtle font-semibold">{label}</span>
      {children}
    </label>
  );
}

function Hint({ children }) {
  return <div className="text-[11px] text-muted-foreground">{children}</div>;
}

function ReadOnlyJson({ value, label, compact }) {
  const text = useMemo(() => {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }, [value]);
  return (
    <div className="space-y-1">
      {label && (
        <div className="text-[10px] uppercase tracking-[0.08em] text-subtle font-semibold">
          {label}
        </div>
      )}
      <pre
        className={`mono text-[11px] whitespace-pre-wrap break-words bg-background rounded p-2 border border-border ${
          compact ? "max-h-[180px]" : ""
        } overflow-y-auto`}
      >
{text}
      </pre>
    </div>
  );
}
