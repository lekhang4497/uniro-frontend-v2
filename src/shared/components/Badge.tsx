"use client";

import type { ComponentType, ReactNode } from "react";
import type { LucideProps } from "lucide-react";
import { Badge as ShadBadge } from "@/shared/components/ui/badge";
import { Icon, type IconName } from "./Icon";
import { cn } from "@/lib/utils";

export type BadgeVariant = "default" | "primary" | "success" | "warning" | "error" | "info" | "neutral";
export type BadgeSize = "sm" | "md" | "lg";

type IconLike = IconName | ComponentType<LucideProps>;

const variants: Record<BadgeVariant, string> = {
  default: "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-transparent",
  neutral: "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-transparent",
  primary: "bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] border-transparent",
  success: "bg-[var(--accent-green)]/10 text-[var(--accent-green)] border-transparent",
  warning: "bg-[var(--accent-orange)]/10 text-[var(--accent-orange)] border-transparent",
  error: "bg-[var(--accent-red)]/10 text-[var(--accent-red)] border-transparent",
  info: "bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] border-transparent",
};

const sizes: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-[10px] rounded-full",
  md: "px-2.5 py-1 text-xs rounded-full",
  lg: "px-3 py-1.5 text-sm rounded-full",
};

const dotColors: Record<BadgeVariant, string> = {
  default: "bg-[var(--text-tertiary)]",
  neutral: "bg-[var(--text-tertiary)]",
  primary: "bg-[var(--accent-blue)]",
  success: "bg-[var(--accent-green)]",
  warning: "bg-[var(--accent-orange)]",
  error: "bg-[var(--accent-red)]",
  info: "bg-[var(--accent-blue)]",
};

export interface BadgeProps {
  children?: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  icon?: IconLike;
  className?: string;
}

export default function Badge({
  children,
  variant = "default",
  size = "md",
  dot = false,
  icon,
  className,
}: BadgeProps) {
  return (
    <ShadBadge className={cn("font-semibold gap-1.5", variants[variant], sizes[size], className)}>
      {dot && <span className={cn("size-1.5 rounded-full", dotColors[variant])} />}
      {icon && (
        <Icon
          name={typeof icon === "string" ? (icon as IconName) : undefined}
          icon={typeof icon !== "string" ? icon : undefined}
          size={12}
        />
      )}
      {children}
    </ShadBadge>
  );
}
