// Admin overview — single Supabase RPC (`admin_overview_counts`) fans out into
// summary cards + a "by plan" breakdown. Server component.
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { Users, Shield, KeyRound, Workflow, Activity, type LucideIcon } from "lucide-react";
import { Card } from "@/shared/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";

type OverviewCounts = {
  users: number;
  admins: number;
  routers: number;
  api_keys: number;
  requests_30d: number;
  subs_by_plan?: Record<string, number>;
};

type StatCard = {
  label: string;
  value: number;
  icon: LucideIcon;
  hint?: string;
};

export default async function AdminOverviewPage() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc("admin_overview_counts");
  const counts = data as OverviewCounts | null;

  if (error || !counts) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-[26px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
          Overview
        </h1>
        <p className="text-[13px] text-[var(--accent-red)]">
          Failed to load counts: {error?.message ?? "no data"}
        </p>
      </div>
    );
  }

  const cards: StatCard[] = [
    {
      label: "Users",
      value: counts.users,
      icon: Users,
      hint: `${counts.admins} admin${counts.admins === 1 ? "" : "s"}`,
    },
    { label: "Active routers", value: counts.routers, icon: Workflow },
    { label: "Active API keys", value: counts.api_keys, icon: KeyRound },
    { label: "Requests (30d)", value: counts.requests_30d, icon: Activity },
  ];

  const subsEntries = Object.entries(counts.subs_by_plan ?? {});

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-[26px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
          Overview
        </h1>
        <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
          Uniro Management Service · Supabase
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, hint }) => (
          <Card key={label} className="flex flex-col gap-2 p-5">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-[var(--text-tertiary)]">{label}</span>
              <Icon className="h-4 w-4 text-[var(--text-tertiary)]" />
            </div>
            <div className="text-[28px] font-semibold tabular-nums tracking-[-0.01em] text-[var(--text-primary)]">
              {Number(value || 0).toLocaleString()}
            </div>
            {hint && (
              <div className="text-[12px] text-[var(--text-tertiary)]">{hint}</div>
            )}
          </Card>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold text-[var(--text-primary)]">
          <Shield className="h-4 w-4 text-[var(--text-tertiary)]" />
          Active subscriptions by plan
        </h2>
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Users</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subsEntries.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={2}
                    className="py-8 text-center text-[var(--text-tertiary)]"
                  >
                    No active subscriptions.
                  </TableCell>
                </TableRow>
              ) : (
                subsEntries.map(([plan, n]) => (
                  <TableRow key={plan}>
                    <TableCell className="font-mono text-[12px]">{plan}</TableCell>
                    <TableCell className="text-right tabular-nums">{n}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </section>
    </div>
  );
}
