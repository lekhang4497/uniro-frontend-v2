import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { UserActions } from "./UserActions";

export default async function AdminUserDetailPage({ params }) {
  const { id } = await params;
  const { supabase, user: me } = await requireAdmin();

  const [{ data: user }, { data: subs }, { data: routers }, { data: keys }, { data: balance }, { data: events }, { data: plans }] =
    await Promise.all([
      supabase.from("admin_users_summary").select("*").eq("id", id).maybeSingle(),
      supabase.from("subscriptions").select("id, plan_code, status, period_start, period_end, created_at")
        .eq("user_id", id).order("created_at", { ascending: false }),
      supabase.from("routers").select("id, name, engine, version, is_default, updated_at, deleted_at")
        .eq("user_id", id).is("deleted_at", null).order("updated_at", { ascending: false }),
      supabase.from("api_keys").select("id, name, key_prefix, created_at, last_used_at, revoked_at")
        .eq("user_id", id).order("created_at", { ascending: false }),
      supabase.from("quota_balance").select("resource, used, granted, period_start, period_end")
        .eq("user_id", id),
      supabase.from("quota_events").select("id, resource, delta, source, ref_id, occurred_at, metadata")
        .eq("user_id", id).order("occurred_at", { ascending: false }).limit(50),
      supabase.from("plans").select("code, name").order("sort_order"),
    ]);

  if (!user) {
    return (
      <div className="p-8">
        <Link href="/admin/users" className="text-text-muted hover:text-text inline-flex items-center gap-1 text-sm">
          <ChevronLeft className="size-4" /> Back
        </Link>
        <p className="mt-4">User not found.</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto flex flex-col gap-6">
      <Link href="/admin/users" className="text-text-muted hover:text-text inline-flex items-center gap-1 text-sm">
        <ChevronLeft className="size-4" /> All users
      </Link>

      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{user.email}</h1>
          <p className="text-xs text-text-muted mt-1 font-mono">{user.id}</p>
        </div>
        <UserActions
          userId={user.id}
          isAdmin={user.is_admin}
          isSelf={me.id === user.id}
          currentPlan={user.plan_code}
          plans={plans || []}
        />
      </header>

      <Section title="Subscription">
        <KV label="Active plan" value={<code className="text-xs">{user.plan_code || "—"}</code>} />
        <KV label="Status" value={user.subscription_status || "—"} />
        <KV label="Period" value={
          user.period_start
            ? `${new Date(user.period_start).toLocaleDateString()} → ${new Date(user.period_end).toLocaleDateString()}`
            : "—"
        } />
        {(subs || []).length > 1 && (
          <details className="mt-3">
            <summary className="text-xs text-text-muted cursor-pointer hover:text-text">
              {subs.length - 1} historical
            </summary>
            <table className="w-full text-xs mt-2">
              <tbody>
                {subs.slice(1).map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="py-1 pr-3"><code>{s.plan_code}</code></td>
                    <td className="py-1 pr-3">{s.status}</td>
                    <td className="py-1 text-text-muted">{new Date(s.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        )}
      </Section>

      <Section title="Quota balance (current period)">
        {(balance || []).length === 0
          ? <p className="text-sm text-text-muted">No usage in the current period.</p>
          : <BalanceTable rows={balance} />}
      </Section>

      <Section title={`Routers (${(routers || []).length})`}>
        {(routers || []).length === 0
          ? <p className="text-sm text-text-muted">No routers.</p>
          : <RoutersTable rows={routers} />}
      </Section>

      <Section title={`API Keys (${(keys || []).filter((k) => !k.revoked_at).length} active)`}>
        {(keys || []).length === 0
          ? <p className="text-sm text-text-muted">No API keys.</p>
          : <ApiKeysTable rows={keys} />}
      </Section>

      <Section title="Quota event log (most recent 50)">
        {(events || []).length === 0
          ? <p className="text-sm text-text-muted">No events.</p>
          : <EventsTable rows={events} />}
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="rounded-lg border border-border bg-bg p-5 flex flex-col gap-3">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div>{children}</div>
    </section>
  );
}
function KV({ label, value }) {
  return (
    <div className="grid grid-cols-[140px,1fr] gap-2 text-sm py-0.5">
      <span className="text-text-muted">{label}</span>
      <span>{value}</span>
    </div>
  );
}
function BalanceTable({ rows }) {
  return (
    <table className="w-full text-sm">
      <thead className="text-left text-xs text-text-muted">
        <tr><th className="py-1">Resource</th><th className="py-1 text-right">Used</th><th className="py-1 text-right">Granted</th><th className="py-1 text-right">Available</th></tr>
      </thead>
      <tbody>
        {rows.map((b) => (
          <tr key={`${b.resource}-${b.period_start}`} className="border-t border-border">
            <td className="py-1 font-mono text-xs">{b.resource}</td>
            <td className="py-1 text-right tabular-nums">{Number(b.used).toLocaleString()}</td>
            <td className="py-1 text-right tabular-nums">{Number(b.granted).toLocaleString()}</td>
            <td className="py-1 text-right tabular-nums">{(Number(b.granted) - Number(b.used)).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
function RoutersTable({ rows }) {
  return (
    <table className="w-full text-sm">
      <thead className="text-left text-xs text-text-muted">
        <tr><th className="py-1">Name</th><th className="py-1">Engine</th><th className="py-1">Version</th><th className="py-1">Default</th><th className="py-1">Updated</th></tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-t border-border">
            <td className="py-1">{r.name}</td>
            <td className="py-1"><code className="text-xs">{r.engine}</code></td>
            <td className="py-1">v{r.version}</td>
            <td className="py-1">{r.is_default ? "★" : ""}</td>
            <td className="py-1 text-text-muted text-xs">{new Date(r.updated_at).toLocaleDateString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
function ApiKeysTable({ rows }) {
  return (
    <table className="w-full text-sm">
      <thead className="text-left text-xs text-text-muted">
        <tr><th className="py-1">Name</th><th className="py-1">Prefix</th><th className="py-1">Created</th><th className="py-1">Last used</th><th className="py-1">Status</th></tr>
      </thead>
      <tbody>
        {rows.map((k) => (
          <tr key={k.id} className="border-t border-border">
            <td className="py-1">{k.name}</td>
            <td className="py-1 font-mono text-xs">{k.key_prefix}…</td>
            <td className="py-1 text-text-muted text-xs">{new Date(k.created_at).toLocaleDateString()}</td>
            <td className="py-1 text-text-muted text-xs">{k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : "—"}</td>
            <td className="py-1 text-xs">{k.revoked_at ? <span className="text-red-500">revoked</span> : <span className="text-emerald-500">active</span>}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
function EventsTable({ rows }) {
  return (
    <table className="w-full text-sm">
      <thead className="text-left text-xs text-text-muted">
        <tr><th className="py-1">When</th><th className="py-1">Resource</th><th className="py-1 text-right">Delta</th><th className="py-1">Source</th><th className="py-1">Ref</th></tr>
      </thead>
      <tbody>
        {rows.map((e) => (
          <tr key={e.id} className="border-t border-border">
            <td className="py-1 text-text-muted text-xs">{new Date(e.occurred_at).toLocaleString()}</td>
            <td className="py-1 font-mono text-xs">{e.resource}</td>
            <td className={`py-1 text-right tabular-nums ${e.delta < 0 ? "text-emerald-500" : ""}`}>
              {Number(e.delta).toLocaleString()}
            </td>
            <td className="py-1 text-xs">{e.source}</td>
            <td className="py-1 text-xs text-text-muted truncate max-w-[160px]" title={e.ref_id || ""}>{e.ref_id || "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
