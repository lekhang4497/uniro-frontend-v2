"use client";

import { Switch } from "@/shared/components/ui/switch";
import { cn } from "@/lib/utils";

const sizeClasses = {
  sm: "h-4 w-8 [&_[data-state]]:size-3 data-[state=checked]:[&_[data-state]]:translate-x-4",
  md: "",
  lg: "h-7 w-14 [&_[data-state]]:size-6 data-[state=checked]:[&_[data-state]]:translate-x-7",
};

export default function Toggle({
  checked = false,
  onChange,
  label,
  description,
  disabled = false,
  size = "md",
  className,
}) {
  return (
    <div
      className={cn("flex items-center gap-3", disabled && "opacity-50 cursor-not-allowed", className)}
    >
      <Switch
        checked={!!checked}
        onCheckedChange={(v) => !disabled && onChange && onChange(v)}
        disabled={disabled}
        className={sizeClasses[size]}
      />
      {(label || description) && (
        <div className="flex flex-col">
          {label && <span className="text-sm font-medium text-foreground">{label}</span>}
          {description && <span className="text-xs text-muted-foreground">{description}</span>}
        </div>
      )}
    </div>
  );
}
