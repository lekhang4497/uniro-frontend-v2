// Single-user detail view. Issues 7 parallel Supabase queries to a mix of
// tables (admin_users_summary view + concrete tables) and a few helper
// admin RPCs, then renders subscription / quota / routers / api-keys /
// quota-event breakdowns. Server component.
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { Card } from "@/shared/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import UserActions, { type PlanOption } from "./UserActions";

type UserSummary = {
  id: string;
  email: string | null;
  is_admin: boolean | null;
  plan_code: string | null;
  subscription_status: string | null;
  period_start: string | null;
  period_end: string | null;
};

type Subscription = {
  id: string;
  plan_code: string;
  status: string;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
};

type Router = {
  id: string;
  name: string;
  engine: string;
  version: number;
  is_default: boolean | null;
  updated_at: string;
  deleted_at: string | null;
};

type ApiKey = {
  id: string;
  name: string | null;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

type QuotaBalance = {
  resource: string;
  used: number;
  granted: number;
  period_start: string | null;
  period_end: string | null;
};

type QuotaEvent = {
  id: string;
  resource: string;
  delta: number;
  source: string;
  ref_id: string | null;
  occurred_at: string;
  metadata?: unknown;
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminUserDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { supabase, user: me } = await requireAdmin();

  const [
    { data: userRow },
    { data: subsRow },
    { data: routersRow },
    { data: keysRow },
    { data: balanceRow },
    { data: eventsRow },
    { data: plansRow },
  ] = await Promise.all([
    supabase.from("admin_users_summary").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("subscriptions")
      .select("id, plan_code, status, period_start, period_end, created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("routers")
      .select("id, name, engine, version, is_default, updated_at, deleted_at")
      .eq("user_id", id)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false }),
    supabase
      .from("api_keys")
      .select("id, name, key_prefix, created_at, last_used_at, revoked_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("quota_balance")
      .select("resource, used, granted, period_start, period_end")
      .eq("user_id", id),
    supabase
      .from("quota_events")
      .select("id, resource, delta, source, ref_id, occurred_at, metadata")
      .eq("user_id", id)
      .order("occurred_at", { ascending: false })
      .limit(50),
    supabase.from("plans").select("code, name").order("sort_order"),
  ]);

  const user = userRow as UserSummary | null;
  const subs = (subsRow ?? []) as Subscription[];
  const routers = (routersRow ?? []) as Router[];
  const keys = (keysRow ?? []) as ApiKey[];
  const balance = (balanceRow ?? []) as QuotaBalance[];
  const events = (eventsRow ?? []) as QuotaEvent[];
  const plans = (plansRow ?? []) as PlanOption[];

  if (!user) {
    return (
      <div className="flex flex-col gap-3">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </Link>
        <p className="text-[13px] text-[var(--text-secondary)]">User not found.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <ChevronLeft className="h-4 w-4" /> All users
      </Link>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[26px] font-semibold tracking-[-0.01em] text-[var(--text-primary)] break-words">
            {user.email}
          </h1>
          <p className="mt-1 text-[12px] font-mono text-[var(--text-tertiary)]">
            {user.id}
          </p>
        </div>
        <UserActions
          userId={user.id}
          isAdmin={user.is_admin === true}
          isSelf={me.id === user.id}
          currentPlan={user.plan_code}
          plans={plans}
        />
      </header>

      <Section title="Subscription">
        <KV
          label="Active plan"
          value={
            <code className="text-[12px] text-[var(--text-secondary)]">
              {user.plan_code || "—"}
            </code>
          }
        />
        <KV label="Status" value={user.subscription_status || "—"} />
        <KV
          label="Period"
          value={
            user.period_start && user.period_end
              ? `${new Date(user.period_start).toLocaleDateString()} → ${new Date(user.period_end).toLocaleDateString()}`
              : "—"
          }
        />
        {subs.length > 1 && (
          <details className="mt-3">
            <summary className="cursor-pointer text-[12px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
              {subs.length - 1} historical
            </summary>
            <Table className="mt-2 text-[12px]">
              <TableBody>
                {subs.slice(1).map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="py-1">
                      <code className="text-[11px]">{s.plan_code}</code>
                    </TableCell>
                    <TableCell className="py-1">{s.status}</TableCell>
                    <TableCell className="py-1 text-[var(--text-tertiary)]">
                      {new Date(s.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </details>
        )}
      </Section>

      <Section title="Quota balance (current period)">
        {balance.length === 0 ? (
          <Empty>No usage in the current period.</Empty>
        ) : (
          <BalanceTable rows={balance} />
        )}
      </Section>

      <Section title={`Routers (${routers.length})`}>
        {routers.length === 0 ? <Empty>No routers.</Empty> : <RoutersTable rows={routers} />}
      </Section>

      <Section title={`API Keys (${keys.filter((k) => !k.revoked_at).length} active)`}>
        {keys.length === 0 ? <Empty>No API keys.</Empty> : <ApiKeysTable rows={keys} />}
      </Section>

      <Section title="Quota event log (most recent 50)">
        {events.length === 0 ? <Empty>No events.</Empty> : <EventsTable rows={events} />}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <h2 className="text-[13px] font-semibold text-[var(--text-primary)]">{title}</h2>
      <div>{children}</div>
    </Card>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] text-[var(--text-tertiary)]">{children}</p>;
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 py-[2px] text-[13px]">
      <span className="text-[var(--text-tertiary)]">{label}</span>
      <span className="text-[var(--text-primary)]">{value}</span>
    </div>
  );
}

function BalanceTable({ rows }: { rows: QuotaBalance[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Resource</TableHead>
          <TableHead className="text-right">Used</TableHead>
          <TableHead className="text-right">Granted</TableHead>
          <TableHead className="text-right">Available</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((b) => (
          <TableRow key={`${b.resource}-${b.period_start ?? ""}`}>
            <TableCell className="font-mono text-[12px]">{b.resource}</TableCell>
            <TableCell className="text-right tabular-nums">
              {Number(b.used).toLocaleString()}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {Number(b.granted).toLocaleString()}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {(Number(b.granted) - Number(b.used)).toLocaleString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function RoutersTable({ rows }: { rows: Router[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Engine</TableHead>
          <TableHead>Version</TableHead>
          <TableHead>Default</TableHead>
          <TableHead>Updated</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell>{r.name}</TableCell>
            <TableCell>
              <code className="text-[11px] text-[var(--text-secondary)]">{r.engine}</code>
            </TableCell>
            <TableCell>v{r.version}</TableCell>
            <TableCell>{r.is_default ? "★" : ""}</TableCell>
            <TableCell className="text-[12px] text-[var(--text-tertiary)]">
              {new Date(r.updated_at).toLocaleDateString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ApiKeysTable({ rows }: { rows: ApiKey[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Prefix</TableHead>
          <TableHead>Created</TableHead>
          <TableHead>Last used</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((k) => (
          <TableRow key={k.id}>
            <TableCell>{k.name}</TableCell>
            <TableCell className="font-mono text-[12px] text-[var(--text-secondary)]">
              {k.key_prefix}…
            </TableCell>
            <TableCell className="text-[12px] text-[var(--text-tertiary)]">
              {new Date(k.created_at).toLocaleDateString()}
            </TableCell>
            <TableCell className="text-[12px] text-[var(--text-tertiary)]">
              {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : "—"}
            </TableCell>
            <TableCell className="text-[12px]">
              {k.revoked_at ? (
                <span className="text-[var(--accent-red)]">revoked</span>
              ) : (
                <span className="text-[var(--accent-green)]">active</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function EventsTable({ rows }: { rows: QuotaEvent[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>When</TableHead>
          <TableHead>Resource</TableHead>
          <TableHead className="text-right">Delta</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Ref</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((e) => (
          <TableRow key={e.id}>
            <TableCell className="text-[12px] text-[var(--text-tertiary)]">
              {new Date(e.occurred_at).toLocaleString()}
            </TableCell>
            <TableCell className="font-mono text-[12px]">{e.resource}</TableCell>
            <TableCell
              className={`text-right tabular-nums ${e.delta < 0 ? "text-[var(--accent-green)]" : ""}`}
            >
              {Number(e.delta).toLocaleString()}
            </TableCell>
            <TableCell className="text-[12px]">{e.source}</TableCell>
            <TableCell
              className="max-w-[160px] truncate text-[12px] text-[var(--text-tertiary)]"
              title={e.ref_id || ""}
            >
              {e.ref_id || "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
