"use client";

import type { ReactNode } from "react";
import { Switch } from "@/shared/components/ui/switch";
import { cn } from "@/lib/utils";

type ToggleSize = "sm" | "md" | "lg";

const sizeClasses: Record<ToggleSize, string> = {
  sm: "h-4 w-8 [&_[data-state]]:size-3 data-[state=checked]:[&_[data-state]]:translate-x-4",
  md: "",
  lg: "h-7 w-14 [&_[data-state]]:size-6 data-[state=checked]:[&_[data-state]]:translate-x-7",
};

export interface ToggleProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  size?: ToggleSize;
  className?: string;
}

export default function Toggle({
  checked = false,
  onChange,
  label,
  description,
  disabled = false,
  size = "md",
  className,
}: ToggleProps) {
  return (
    <div
      className={cn("flex items-center gap-3", disabled && "opacity-50 cursor-not-allowed", className)}
    >
      <Switch
        checked={!!checked}
        onCheckedChange={(v) => !disabled && onChange?.(v)}
        disabled={disabled}
        className={sizeClasses[size]}
      />
      {(label || description) && (
        <div className="flex flex-col">
          {label && <span className="text-sm font-medium text-[var(--text-primary)]">{label}</span>}
          {description && <span className="text-xs text-[var(--text-secondary)]">{description}</span>}
        </div>
      )}
    </div>
  );
}
