"use client";

// Form primitives used by the inspector (Field, FormRow, TextInput, etc.).
// Extracted from page.js with no behavior change.

import { cn } from "@/lib/utils";

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10.5px] uppercase tracking-[0.08em] text-[var(--text-tertiary)] font-semibold border-t border-[var(--bg-secondary)] pt-3 mt-1">
      {children}
    </div>
  );
}

export function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 min-w-0">
      <span className="text-[10.5px] uppercase tracking-[0.08em] text-[var(--text-tertiary)] font-semibold flex items-center gap-1">
        {label}
        {required && <span className="text-[var(--accent-red)]">*</span>}
      </span>
      {children}
      {hint && <span className="text-[10.5px] text-[var(--text-secondary)]">{hint}</span>}
    </label>
  );
}

export function FormRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

export function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  mono = false,
  step,
}: {
  value: any;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  mono?: boolean;
  step?: string;
}) {
  return (
    <input
      type={type}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      step={step}
      className={cn(
        "w-full h-9 rounded-[var(--radius)] border border-[var(--bg-secondary)] bg-[var(--bg-primary)] text-[var(--text-primary)] px-3 text-sm",
        mono && "font-mono"
      )}
    />
  );
}

export function SelectInput({
  value,
  onChange,
  options,
}: {
  value: any;
  onChange: (v: string) => void;
  options: any[];
}) {
  const opts = options.map((o: any) => (typeof o === "string" ? { value: o, label: o } : o));
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-9 rounded-[var(--radius)] border border-[var(--bg-secondary)] bg-[var(--bg-primary)] text-[var(--text-primary)] px-2.5 text-sm"
    >
      {opts.map((o: any) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function BoolField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 rounded-[var(--radius)] border border-[var(--bg-secondary)] bg-[var(--bg-primary)] p-3 cursor-pointer">
      <input
        type="checkbox"
        checked={!!value}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 mt-0.5 accent-[var(--accent-blue)]"
      />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium text-[var(--text-primary)]">{label}</div>
        {hint && (
          <div className="text-[11.5px] text-[var(--text-secondary)] mt-0.5">{hint}</div>
        )}
      </div>
    </label>
  );
}

export function ConfigField({
  field,
  value,
  onChange,
}: {
  field: any;
  value: any;
  onChange: (v: any) => void;
}) {
  switch (field.kind) {
    case "bool":
      return (
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4"
          />
          <span className="text-[12.5px]">{field.label}</span>
        </label>
      );
    case "number":
      return (
        <Field label={field.label} hint={field.help}>
          <TextInput
            type="number"
            value={value ?? ""}
            onChange={(v: string) => onChange(v === "" ? "" : Number(v))}
            placeholder={field.default !== undefined ? String(field.default) : undefined}
          />
        </Field>
      );
    case "select":
      return (
        <Field label={field.label} hint={field.help}>
          <SelectInput value={value ?? field.default ?? ""} onChange={onChange} options={field.options} />
        </Field>
      );
    case "string-list":
      return (
        <Field label={field.label} hint={field.help || "Comma- or newline-separated."}>
          <TextInput
            value={Array.isArray(value) ? value.join(", ") : (value ?? "")}
            onChange={onChange}
            placeholder={field.placeholder}
            mono
          />
        </Field>
      );
    case "yaml":
      return (
        <Field label={field.label} hint={field.help || "Raw YAML."}>
          <textarea
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            rows={5}
            placeholder={field.placeholder}
            className="w-full rounded-[var(--radius)] border border-[var(--bg-secondary)] bg-[var(--bg-primary)] text-[var(--text-primary)] px-3 py-2 text-[12px] font-mono resize-y"
          />
        </Field>
      );
    case "string":
    default:
      return (
        <Field label={field.label} hint={field.help}>
          <TextInput
            value={value ?? ""}
            onChange={onChange}
            placeholder={field.placeholder || (field.default ? String(field.default) : "")}
            mono={field.key !== "language"}
          />
        </Field>
      );
  }
}
