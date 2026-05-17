"use client";

import type { ChangeEventHandler, ReactNode, SelectHTMLAttributes } from "react";
import { AlertCircle, ChevronDown } from "lucide-react";
import { Label } from "@/shared/components/ui/label";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange" | "value"> {
  label?: ReactNode;
  options?: SelectOption[];
  value?: string;
  onChange?: ChangeEventHandler<HTMLSelectElement>;
  placeholder?: string;
  error?: ReactNode;
  hint?: ReactNode;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  selectClassName?: string;
}

export default function Select({
  label,
  options = [],
  value,
  onChange,
  placeholder = "Select an option",
  error,
  hint,
  disabled = false,
  required = false,
  className,
  selectClassName,
  ...props
}: SelectProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <Label>
          {label}
          {required && <span className="text-[var(--accent-red)] ml-1">*</span>}
        </Label>
      )}
      <div className="relative">
        <select
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={cn(
            "flex h-9 w-full appearance-none rounded-[var(--radius)] border border-[var(--bg-secondary)] bg-[var(--bg-primary)] px-3 py-1 pr-10 text-sm text-[var(--text-primary)]",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-blue)]",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "text-[16px] sm:text-sm",
            error && "border-[var(--accent-red)] focus-visible:outline-[var(--accent-red)]",
            selectClassName
          )}
          {...props}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[var(--text-tertiary)]">
          <ChevronDown className="h-4 w-4" />
        </div>
      </div>
      {error && (
        <p className="text-xs text-[var(--accent-red)] flex items-center gap-1">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </p>
      )}
      {hint && !error && <p className="text-xs text-[var(--text-tertiary)]">{hint}</p>}
    </div>
  );
}
