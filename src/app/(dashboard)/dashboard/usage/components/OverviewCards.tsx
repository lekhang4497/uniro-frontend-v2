"use client";

import Card from "@/shared/components/Card";

const fmt = (n: number | undefined) => new Intl.NumberFormat().format(n || 0);
const fmtCost = (n: number | undefined) => `$${(n || 0).toFixed(2)}`;

export interface OverviewCardsProps {
  stats: {
    totalRequests?: number;
    totalPromptTokens?: number;
    totalCompletionTokens?: number;
    totalCost?: number;
  };
}

export default function OverviewCards({ stats }: OverviewCardsProps) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 sm:gap-4">
      <Card className="flex min-w-0 flex-col gap-1 px-4 py-3">
        <span className="text-[var(--text-secondary)] text-sm uppercase font-semibold">
          Total Requests
        </span>
        <span className="truncate text-2xl font-bold">{fmt(stats.totalRequests)}</span>
      </Card>
      <Card className="flex min-w-0 flex-col gap-1 px-4 py-3">
        <span className="text-[var(--text-secondary)] text-sm uppercase font-semibold">
          Total Input Tokens
        </span>
        <span className="truncate text-2xl font-bold text-[var(--accent-blue)]">
          {fmt(stats.totalPromptTokens)}
        </span>
      </Card>
      <Card className="flex min-w-0 flex-col gap-1 px-4 py-3">
        <span className="text-[var(--text-secondary)] text-sm uppercase font-semibold">
          Output Tokens
        </span>
        <span className="truncate text-2xl font-bold text-[var(--accent-green)]">
          {fmt(stats.totalCompletionTokens)}
        </span>
      </Card>
      <Card className="flex min-w-0 flex-col gap-1 px-4 py-3">
        <span className="text-[var(--text-secondary)] text-sm uppercase font-semibold">
          Est. Cost
        </span>
        <span className="truncate text-2xl font-bold text-[var(--accent-orange)]">
          ~{fmtCost(stats.totalCost)}
        </span>
        <span className="text-[10px] text-[var(--text-secondary)]">
          Estimated, not actual billing
        </span>
      </Card>
    </div>
  );
}
