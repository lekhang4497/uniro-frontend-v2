"use client";

import { Badge as ShadBadge } from "@/shared/components/ui/badge";
import { Icon } from "./Icon";
import { cn } from "@/lib/utils";

const variants = {
  default: "bg-muted text-muted-foreground border-transparent hover:bg-muted",
  primary: "bg-primary/10 text-primary border-transparent hover:bg-primary/15",
  success: "bg-uniro-green/10 text-uniro-green border-transparent hover:bg-uniro-green/15",
  warning: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-transparent",
  error: "bg-destructive/10 text-destructive border-transparent hover:bg-destructive/15",
  info: "bg-uniro-blue/10 text-uniro-blue border-transparent hover:bg-uniro-blue/15",
};

const sizes = {
  sm: "px-2 py-0.5 text-[10px] rounded-full",
  md: "px-2.5 py-1 text-xs rounded-full",
  lg: "px-3 py-1.5 text-sm rounded-full",
};

const dotColors = {
  default: "bg-gray-500",
  primary: "bg-primary",
  success: "bg-uniro-green",
  warning: "bg-yellow-500",
  error: "bg-destructive",
  info: "bg-uniro-blue",
};

export default function Badge({
  children,
  variant = "default",
  size = "md",
  dot = false,
  icon,
  className,
}) {
  return (
    <ShadBadge className={cn("font-semibold gap-1.5", variants[variant], sizes[size], className)}>
      {dot && <span className={cn("size-1.5 rounded-full", dotColors[variant])} />}
      {icon && <Icon name={typeof icon === "string" ? icon : undefined} icon={typeof icon !== "string" ? icon : undefined} size={12} />}
      {children}
    </ShadBadge>
  );
}
