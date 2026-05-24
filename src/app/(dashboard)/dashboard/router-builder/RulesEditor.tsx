"use client";

// Recursive editor for a decision's `rules:` clause (new schema).
//
// State shape (component-internal):
//   { kind: 'leaf', signalName }
//   { kind: 'and' | 'or', children: [] }
//   { kind: 'not', child }
//
// Leaves point at signals by NAME (the schema's leaf form is
// {type, name} — the editor only stores the name; the YAML emitter fills
// in `type` by looking the signal up).
//
// The new RuleNode schema has no per-leaf operators (equals, gte, in, ...)
// because signals return boolean values. Composition is pure AND / OR / NOT.

import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";

const KIND_OPTIONS: { value: string; label: string; hint: string }[] = [
  { value: "leaf", label: "Signal", hint: "Match when this signal is true" },
  { value: "and", label: "AND",    hint: "All children must match" },
  { value: "or",  label: "OR",     hint: "At least one child must match" },
  { value: "not", label: "NOT",    hint: "Invert the inner rule" },
];

function makeDefault(kind: string, firstSignal?: string): any {
  switch (kind) {
    case "leaf":
      return { kind: "leaf", signalName: firstSignal || "" };
    case "and":
    case "or":
      return { kind, children: [{ kind: "leaf", signalName: firstSignal || "" }] };
    case "not":
      return { kind: "not", child: { kind: "leaf", signalName: firstSignal || "" } };
    default:
      return { kind: "leaf", signalName: firstSignal || "" };
  }
}

interface RulesEditorProps {
  value: any;
  onChange: (next: any) => void;
  signalNames: string[];
  depth?: number;
  onRemove?: () => void;
}

export function RulesEditor({ value, onChange, signalNames, depth = 0, onRemove }: RulesEditorProps) {
  const v = value || { kind: "leaf", signalName: "" };
  const first = signalNames[0];

  const setKind = (newKind: string) => {
    if (newKind === v.kind) return;
    onChange(makeDefault(newKind, first));
  };

  return (
    <div
      className={cn(
        "rounded-[var(--radius)] border border-[var(--bg-secondary)] bg-[var(--bg-tertiary)] p-2.5",
        depth === 0 && "bg-[var(--bg-primary)]"
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10.5px] uppercase tracking-[0.08em] text-[var(--text-tertiary)] font-semibold">
          {depth === 0 ? "Rules" : "Clause"}
        </span>
        <select
          value={v.kind}
          onChange={(e) => setKind(e.target.value)}
          className="h-7 rounded-[var(--radius)] border border-[var(--bg-secondary)] bg-[var(--bg-primary)] text-[var(--text-primary)] px-2 text-[12px]"
        >
          {KIND_OPTIONS.map((k) => (
            <option key={k.value} value={k.value} title={k.hint}>
              {k.label}
            </option>
          ))}
        </select>
        <div className="flex-1" />
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-[var(--text-tertiary)] hover:text-[var(--accent-red)] p-1"
            title="Remove clause"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {v.kind === "leaf" && (
        <LeafEditor
          signalName={v.signalName || ""}
          signalNames={signalNames}
          onChange={(name) => onChange({ kind: "leaf", signalName: name })}
        />
      )}

      {(v.kind === "and" || v.kind === "or") && (
        <GroupEditor
          rules={v}
          signalNames={signalNames}
          depth={depth}
          onChange={onChange}
        />
      )}

      {v.kind === "not" && (
        <div className="mt-1">
          <RulesEditor
            value={v.child}
            signalNames={signalNames}
            depth={depth + 1}
            onChange={(child) => onChange({ kind: "not", child })}
          />
        </div>
      )}
    </div>
  );
}

function LeafEditor({
  signalName,
  signalNames,
  onChange,
}: {
  signalName: string;
  signalNames: string[];
  onChange: (name: string) => void;
}) {
  // If the referenced signal doesn't exist (e.g. user renamed/deleted it),
  // surface that as a visible "missing" warning so they fix it.
  const missing = signalName && !signalNames.includes(signalName);

  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-[var(--text-tertiary)]">when</span>
      <select
        value={signalName}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-8 flex-1 rounded-[var(--radius)] border bg-[var(--bg-primary)] text-[var(--text-primary)] px-2 text-[12px] font-mono",
          missing
            ? "border-[var(--accent-red)]"
            : "border-[var(--bg-secondary)]"
        )}
      >
        {!signalName && <option value="">(pick a signal)</option>}
        {missing && <option value={signalName}>{signalName} (not found)</option>}
        {signalNames.map((n) => (
          <option key={n} value={n}>{n}</option>
        ))}
      </select>
      <span className="text-[11px] text-[var(--text-tertiary)]">is true</span>
    </div>
  );
}

function GroupEditor({
  rules,
  signalNames,
  depth,
  onChange,
}: {
  rules: any;
  signalNames: string[];
  depth: number;
  onChange: (next: any) => void;
}) {
  const first = signalNames[0];
  const children = rules.children || [];

  const updateChild = (i: number, next: any) => {
    const out = [...children];
    if (next === null) {
      out.splice(i, 1);
    } else {
      out[i] = next;
    }
    onChange({ ...rules, children: out });
  };

  const addChild = () => {
    onChange({
      ...rules,
      children: [...children, { kind: "leaf", signalName: first || "" }],
    });
  };

  return (
    <div className="flex flex-col gap-2 mt-1">
      {children.map((c: any, i: number) => (
        <RulesEditor
          key={i}
          value={c}
          signalNames={signalNames}
          depth={depth + 1}
          onChange={(next) => updateChild(i, next)}
          onRemove={children.length > 1 ? () => updateChild(i, null) : undefined}
        />
      ))}
      <button
        type="button"
        onClick={addChild}
        className="inline-flex items-center gap-1 self-start text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2 py-1 rounded-[var(--radius)] hover:bg-[var(--bg-secondary)]"
      >
        <Plus className="h-3 w-3" />
        Add condition
      </button>
    </div>
  );
}
