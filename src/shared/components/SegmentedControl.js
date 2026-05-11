"use client";

import { Icon } from "./Icon";
import { cn } from "@/lib/utils";

const sizes = {
  sm: "h-7 text-xs",
  md: "h-9 text-sm",
  lg: "h-11 text-base",
};

export default function SegmentedControl({
  options = [],
  value,
  onChange,
  size = "md",
  className,
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center p-1 rounded-md overflow-x-auto bg-muted",
        className
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "shrink-0 inline-flex items-center gap-1.5 px-4 rounded-sm font-medium transition-all",
            sizes[size],
            value === option.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {option.icon && (
            <Icon name={typeof option.icon === "string" ? option.icon : undefined} icon={typeof option.icon !== "string" ? option.icon : undefined} size={14} />
          )}
          {option.label}
        </button>
      ))}
    </div>
  );
}
