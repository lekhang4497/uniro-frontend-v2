"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/shared/hooks/useTheme";
import { cn } from "@/shared/utils/cn";

type ThemeToggleVariant = "default" | "card";

type ThemeToggleProps = {
  /** Extra classes appended to the root button. */
  className?: string;
  /**
   * Visual variant. `default` is the small, inline header chip; `card`
   * is the floating circular button used on auth screens.
   */
  variant?: ThemeToggleVariant;
};

const VARIANT_CLASSES: Record<ThemeToggleVariant, string> = {
  default: cn(
    "flex h-8 w-8 items-center justify-center rounded-[var(--radius)]",
    "text-[var(--text-secondary)] transition-colors",
    "hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]",
  ),
  card: cn(
    "group flex size-11 items-center justify-center rounded-full",
    "border border-[var(--border)] bg-[var(--bg-secondary)]/60",
    "text-[var(--text-secondary)] backdrop-blur-md transition-all",
    "hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] hover:shadow-sm",
  ),
};

export default function ThemeToggle({ className, variant = "default" }: ThemeToggleProps) {
  const { isDark, toggleTheme } = useTheme();
  const nextLabel = isDark ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${nextLabel} mode`}
      title={`Switch to ${nextLabel} mode`}
      className={cn(VARIANT_CLASSES[variant], className)}
    >
      {isDark ? (
        <Sun
          className={cn(
            "h-4 w-4",
            variant === "card" && "transition-transform duration-300 group-hover:rotate-12",
          )}
        />
      ) : (
        <Moon
          className={cn(
            "h-4 w-4",
            variant === "card" && "transition-transform duration-300 group-hover:rotate-12",
          )}
        />
      )}
    </button>
  );
}
