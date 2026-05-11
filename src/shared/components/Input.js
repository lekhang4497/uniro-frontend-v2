"use client";

import { AlertCircle } from "lucide-react";
import { Input as ShadInput } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Icon } from "./Icon";
import { cn } from "@/lib/utils";

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
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <Label>
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
            <Icon name={typeof icon === "string" ? icon : undefined} icon={typeof icon !== "string" ? icon : undefined} size={18} />
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
            error && "border-destructive focus-visible:ring-destructive",
            inputClassName
          )}
          {...props}
        />
      </div>
      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </p>
      )}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
