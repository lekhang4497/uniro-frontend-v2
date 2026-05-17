"use client";

import { cn } from "@/lib/utils";
import { formatResetTime } from "./utils";

// Calculate color based on remaining percentage
const getColorClasses = (remainingPercentage: number) => {
  if (remainingPercentage > 70) {
    return {
      text: "text-[var(--accent-green)]",
      bg: "bg-[var(--accent-green)]",
      bgLight: "bg-[var(--accent-green)]/10",
      emoji: "🟢",
    };
  }

  if (remainingPercentage >= 30) {
    return {
      text: "text-[var(--accent-orange)]",
      bg: "bg-[var(--accent-orange)]",
      bgLight: "bg-[var(--accent-orange)]/10",
      emoji: "🟡",
    };
  }

  // 0-29% including 0% (out of quota) - show red
  return {
    text: "text-[var(--accent-red)]",
    bg: "bg-[var(--accent-red)]",
    bgLight: "bg-[var(--accent-red)]/10",
    emoji: "🔴",
  };
};

// Format reset time display
const formatResetTimeDisplay = (resetTime: string | Date | null | undefined): string | null => {
  if (!resetTime) return null;

  try {
    const resetDate = new Date(resetTime);
    const now = new Date();
    const isToday = resetDate.toDateString() === now.toDateString();
    const isTomorrow =
      resetDate.toDateString() === new Date(now.getTime() + 86400000).toDateString();

    const timeStr = resetDate.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    if (isToday) return `Today, ${timeStr}`;
    if (isTomorrow) return `Tomorrow, ${timeStr}`;

    return resetDate.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return null;
  }
};

export interface QuotaProgressBarProps {
  percentage?: number;
  label?: string;
  used?: number;
  total?: number;
  unlimited?: boolean;
  resetTime?: string | Date | null;
}

export default function QuotaProgressBar({
  percentage = 0,
  label = "",
  used = 0,
  total = 0,
  unlimited = false,
  resetTime = null,
}: QuotaProgressBarProps) {
  const colors = getColorClasses(percentage);
  const countdown = formatResetTime(resetTime);
  const resetDisplay = formatResetTimeDisplay(resetTime);

  // percentage is already remaining percentage (from ProviderLimitCard)
  const remaining = percentage;

  return (
    <div className="space-y-2">
      {/* Label and percentage */}
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-[var(--text-primary)]">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs">{colors.emoji}</span>
          <span className={cn("font-medium", colors.text)}>{remaining}%</span>
        </div>
      </div>

      {/* Progress bar */}
      {!unlimited && (
        <div className={cn("h-2 rounded-full overflow-hidden", colors.bgLight)}>
          <div
            className={cn("h-full transition-all duration-300", colors.bg)}
            style={{ width: `${Math.min(remaining, 100)}%` }}
          />
        </div>
      )}

      {/* Usage details and countdown */}
      <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
        <span>
          {used.toLocaleString()} / {total.toLocaleString()} requests
        </span>
        {countdown !== "-" && (
          <div className="flex items-center gap-1">
            <span>•</span>
            <span className="font-medium">Reset in {countdown}</span>
          </div>
        )}
      </div>

      {/* Reset time display */}
      {resetDisplay && (
        <div className="text-xs text-[var(--text-tertiary)]">Reset at {resetDisplay}</div>
      )}
    </div>
  );
}
