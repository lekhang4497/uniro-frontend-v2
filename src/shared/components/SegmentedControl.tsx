"use client";

import type { ComponentType, ReactNode } from "react";
import type { LucideProps } from "lucide-react";
import { Icon, type IconName } from "./Icon";
import { cn } from "@/lib/utils";

type SegmentedSize = "sm" | "md" | "lg";

const sizes: Record<SegmentedSize, string> = {
  sm: "h-7 text-xs",
  md: "h-9 text-sm",
  lg: "h-11 text-base",
};

export interface SegmentedOption {
  value: string;
  label: ReactNode;
  icon?: IconName | ComponentType<LucideProps>;
}

export interface SegmentedControlProps {
  options?: SegmentedOption[];
  value?: string;
  onChange: (value: string) => void;
  size?: SegmentedSize;
  className?: string;
}

export default function SegmentedControl({
  options = [],
  value,
  onChange,
  size = "md",
  className,
}: SegmentedControlProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center p-1 rounded-[var(--radius)] overflow-x-auto bg-[var(--bg-secondary)]",
        className
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "shrink-0 inline-flex items-center gap-1.5 px-4 rounded-[6px] font-medium transition-colors",
            sizes[size],
            value === option.value
              ? "bg-[var(--bg-primary)] text-[var(--text-primary)]"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          )}
        >
          {option.icon && (
            <Icon
              name={typeof option.icon === "string" ? (option.icon as IconName) : undefined}
              icon={typeof option.icon !== "string" ? option.icon : undefined}
              size={14}
            />
          )}
          {option.label}
        </button>
      ))}
    </div>
  );
}
