"use client";

import type { ChangeEventHandler, ComponentType, ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import type { LucideProps } from "lucide-react";
import { Input as ShadInput } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Icon, type IconName } from "./Icon";
import { cn } from "@/lib/utils";

type IconLike = IconName | ComponentType<LucideProps>;

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  label?: ReactNode;
  type?: string;
  placeholder?: string;
  value?: string | number;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  error?: ReactNode;
  hint?: ReactNode;
  icon?: IconLike;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  inputClassName?: string;
}

export default function Input({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  error,
  hint,
  icon,
  disabled = false,
  required = false,
  className,
  inputClassName,
  ...props
}: InputProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <Label>
          {label}
          {required && <span className="text-[var(--accent-red)] ml-1">*</span>}
        </Label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[var(--text-tertiary)]">
            <Icon
              name={typeof icon === "string" ? (icon as IconName) : undefined}
              icon={typeof icon !== "string" ? icon : undefined}
              size={18}
            />
          </div>
        )}
        <ShadInput
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          className={cn(
            "text-[16px] sm:text-sm",
            icon && "pl-10",
            error && "border-[var(--accent-red)] focus-visible:outline-[var(--accent-red)]",
            inputClassName
          )}
          {...props}
        />
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
