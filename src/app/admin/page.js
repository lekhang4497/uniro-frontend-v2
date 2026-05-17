import { requireAdmin } from "@/lib/admin/requireAdmin";
import { Users, Shield, KeyRound, Workflow, Activity } from "lucide-react";

export default async function AdminOverviewPage() {
  const { supabase } = await requireAdmin();
  const { data: counts, error } = await supabase.rpc("admin_overview_counts");

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-red-500 mt-4">Failed to load counts: {error.message}</p>
      </div>
    );
  }

  const cards = [
    { label: "Users",          value: counts.users,        icon: Users,    hint: `${counts.admins} admin${counts.admins === 1 ? "" : "s"}` },
    { label: "Active routers", value: counts.routers,      icon: Workflow },
    { label: "Active API keys",value: counts.api_keys,     icon: KeyRound },
    { label: "Requests (30d)", value: counts.requests_30d, icon: Activity },
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-sm text-text-muted mt-1">Uniro Management Service · Supabase</p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border border-border bg-bg p-5 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted">{c.label}</span>
              <c.icon className="size-4 text-text-muted" />
            </div>
            <div className="text-3xl font-semibold tabular-nums">{Number(c.value || 0).toLocaleString()}</div>
            {c.hint && <div className="text-xs text-text-muted">{c.hint}</div>}
          </div>
        ))}
      </section>

      <section>
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Shield className="size-4" />
          Active subscriptions by plan
        </h2>
        <div className="rounded-lg border border-border bg-bg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg-muted">
              <tr>
                <th className="px-3 py-2 text-left">Plan</th>
                <th className="px-3 py-2 text-right">Users</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(counts.subs_by_plan || {}).length === 0 && (
                <tr><td colSpan={2} className="px-3 py-6 text-center text-text-muted">No active subscriptions.</td></tr>
              )}
              {Object.entries(counts.subs_by_plan || {}).map(([plan, n]) => (
                <tr key={plan} className="border-t border-border">
                  <td className="px-3 py-2 font-mono text-xs">{plan}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
