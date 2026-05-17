"use client";

// Recursive editor for a decision's `when:` clause. The clause is held as a
// tagged tree: { kind: 'leaf'|'all'|'any'|'not'|'always', signalId?, projId?, op?, value? }.
//
// Leaf clauses can reference either a signal id (Layer 1) or a projection name (Layer 2).

import { cn } from "@/lib/utils";
import { LEAF_OPERATORS, LEAF_OPERATOR_BY_KEY, WHEN_KINDS } from "./catalog";

const KIND_LABEL: Record<string, string> = {
  leaf: "leaf",
  all: "all (AND)",
  any: "any (OR)",
  not: "not",
  always: "always",
};

function makeDefault(kind: string): any {
  switch (kind) {
    case "leaf":
      return { kind: "leaf", signalId: "", op: "equals", value: "" };
    case "all":
    case "any":
      return { kind, children: [{ kind: "leaf", signalId: "", op: "equals", value: "" }] };
    case "not":
      return { kind: "not", child: { kind: "leaf", signalId: "", op: "equals", value: "" } };
    case "always":
    default:
      return { kind: "always" };
  }
}

interface WhenEditorProps {
  value: any;
  onChange: (next: any) => void;
  signalIds?: string[];
  projIds?: string[];
  depth?: number;
  onRemove?: () => void;
}

export function WhenEditor({ value, onChange, signalIds = [], projIds = [], depth = 0, onRemove }: WhenEditorProps) {
  const v = value || { kind: "always" };

  const setKind = (newKind: string) => {
    if (newKind === v.kind) return;
    onChange(makeDefault(newKind));
  };

  return (
    <div
      className={cn(
        "rounded-md border border-border bg-background/50 p-2.5",
        depth === 0 && "bg-background"
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10.5px] uppercase tracking-[0.08em] text-subtle font-semibold">
          {depth === 0 ? "when" : "clause"}
        </span>
        <select
          value={v.kind}
          onChange={(e) => setKind(e.target.value)}
          className="h-7 rounded-md border border-border bg-card px-2 text-[12px]"
        >
          {WHEN_KINDS.map((k) => (
            <option key={k} value={k}>
              {KIND_LABEL[k]}
            </option>
          ))}
        </select>
        <div className="flex-1" />
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-[11px] text-muted-foreground hover:text-destructive px-1.5 py-0.5"
            title="Remove clause"
          >
            Remove
          </button>
        )}
      </div>

      {v.kind === "always" && (
        <div className="text-[12px] text-muted-foreground italic px-1">
          Matches every request (use only on the catch-all default route).
        </div>
      )}

      {v.kind === "leaf" && (
        <LeafEditor
          value={v}
          signalIds={signalIds}
          projIds={projIds}
          onChange={(patch: any) => onChange({ ...v, ...patch })}
        />
      )}

      {(v.kind === "all" || v.kind === "any") && (
        <GroupEditor
          value={v}
          signalIds={signalIds}
          projIds={projIds}
          depth={depth}
          onChange={onChange}
        />
      )}

      {v.kind === "not" && (
        <div className="pl-3 border-l-2 border-border">
          <WhenEditor
            value={v.child}
            signalIds={signalIds}
            projIds={projIds}
            depth={depth + 1}
            onChange={(child: any) => onChange({ ...v, child })}
          />
        </div>
      )}
    </div>
  );
}

interface LeafEditorProps {
  value: any;
  signalIds: string[];
  projIds: string[];
  onChange: (patch: any) => void;
}

function LeafEditor({ value, signalIds, projIds, onChange }: LeafEditorProps) {
  const op = value.op || "equals";
  const opSpec: any = (LEAF_OPERATOR_BY_KEY as any)[op];

  // Determine whether this leaf references a signal or projection
  const hasProj = value.projId && projIds.includes(value.projId);
  const hasSig = value.signalId && signalIds.includes(value.signalId);
  const isProjRef = !!(value.projId && projIds.length > 0);

  const renderValueInput = () => {
    if (op === "exists") {
      return (
        <select
          value={value.value === false ? "false" : "true"}
          onChange={(e) => onChange({ value: e.target.value === "true" })}
          className="h-8 w-full rounded-md border border-border bg-card px-2 text-sm"
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      );
    }
    if (op === "in") {
      const text = Array.isArray(value.value) ? value.value.join(", ") : value.value || "";
      return (
        <input
          type="text"
          value={text}
          onChange={(e) =>
            onChange({
              value: e.target.value
                .split(/[,\n]/)
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          placeholder="a, b, c"
          className="h-8 w-full rounded-md border border-border bg-card px-2 text-sm"
        />
      );
    }
    if (op === "gte" || op === "lte") {
      return (
        <input
          type="number"
          value={value.value ?? ""}
          onChange={(e) =>
            onChange({ value: e.target.value === "" ? "" : Number(e.target.value) })
          }
          className="h-8 w-full rounded-md border border-border bg-card px-2 text-sm"
        />
      );
    }
    return (
      <input
        type="text"
        value={value.value ?? ""}
        onChange={(e) => onChange({ value: e.target.value })}
        placeholder={op === "matches" ? "^URGENT" : isProjRef ? "low" : "vi"}
        className="h-8 w-full rounded-md border border-border bg-card px-2 text-sm"
      />
    );
  };

  return (
    <div className="space-y-2">
      {/* Source selector: signal vs projection */}
      <div className="flex items-center gap-1.5 text-[11px]">
        <span className="text-muted-foreground">ref</span>
        <select
          value={isProjRef ? "proj" : "signal"}
          onChange={(e) => {
            const useProj = e.target.value === "proj";
            onChange({
              ...(useProj
                ? { signalId: "", projId: projIds[0] || "" }
                : { projId: "", signalId: signalIds[0] || "" }),
              value: "",
            });
          }}
          className="h-7 rounded-md border border-border bg-card px-2 text-xs"
        >
          <option value="signal">signal ({signalIds.length})</option>
          <option value="proj" disabled={projIds.length === 0}>
            projection ({projIds.length})
          </option>
        </select>
      </div>

      {/* ID selector */}
      {isProjRef ? (
        projIds.length > 0 ? (
          <select
            value={value.projId || ""}
            onChange={(e) => onChange({ projId: e.target.value, value: "" })}
            className="h-8 w-full rounded-md border border-border bg-card px-2 text-sm"
          >
            <option value="">— projection —</option>
            {projIds.map((id) => (
              <option key={id} value={id}>{id}</option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={value.projId || ""}
            onChange={(e) => onChange({ projId: e.target.value, value: "" })}
            placeholder="projection name"
            className="h-8 w-full rounded-md border border-border bg-card px-2 text-sm font-mono"
          />
        )
      ) : signalIds.length > 0 ? (
        <select
          value={value.signalId || ""}
          onChange={(e) => onChange({ signalId: e.target.value, value: "" })}
          className="h-8 w-full rounded-md border border-border bg-card px-2 text-sm"
        >
          <option value="">— signal —</option>
          {signalIds.map((id) => (
            <option key={id} value={id}>{id}</option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          value={value.signalId || ""}
          onChange={(e) => onChange({ signalId: e.target.value, value: "" })}
          placeholder="signal id"
          className="h-8 w-full rounded-md border border-border bg-card px-2 text-sm font-mono"
        />
      )}

      {/* Operator + value */}
      <div className="grid grid-cols-[auto_1fr] gap-1.5 items-center">
        <select
          value={op}
          onChange={(e) => onChange({ op: e.target.value, value: "" })}
          className="h-8 rounded-md border border-border bg-card px-2 text-sm"
        >
          {LEAF_OPERATORS.map((o) => (
            <option key={o.key} value={o.key}>{o.label}</option>
          ))}
        </select>
        {renderValueInput()}
      </div>

      {opSpec?.help && (
        <div className="text-[10.5px] text-muted-foreground">{opSpec.help}</div>
      )}
    </div>
  );
}

interface GroupEditorProps {
  value: any;
  signalIds: string[];
  projIds: string[];
  depth: number;
  onChange: (next: any) => void;
}

function GroupEditor({ value, signalIds, projIds, depth, onChange }: GroupEditorProps) {
  const setChild = (idx: number, child: any) => {
    const next = [...(value.children || [])];
    next[idx] = child;
    onChange({ ...value, children: next });
  };
  const removeChild = (idx: number) => {
    const next = (value.children || []).filter((_: any, i: number) => i !== idx);
    onChange({ ...value, children: next });
  };
  const addChild = () => {
    const next = [...(value.children || []), makeDefault("leaf")];
    onChange({ ...value, children: next });
  };

  return (
    <div className="pl-3 border-l-2 border-border space-y-2">
      {(value.children || []).map((c: any, i: number) => (
        <WhenEditor
          key={i}
          value={c}
          signalIds={signalIds}
          projIds={projIds}
          depth={depth + 1}
          onChange={(next: any) => setChild(i, next)}
          onRemove={() => removeChild(i)}
        />
      ))}
      <button
        type="button"
        onClick={addChild}
        className="text-[11.5px] text-primary hover:underline px-1"
      >
        + add clause
      </button>
    </div>
  );
}

export { makeDefault as makeDefaultWhen };
