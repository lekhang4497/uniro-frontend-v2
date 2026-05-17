import Link from "next/link";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { Shield, ChevronRight } from "lucide-react";

const PAGE_SIZE = 50;

export default async function AdminUsersPage({ searchParams }) {
  const sp = await searchParams;
  const search = (sp?.q || "").trim();
  const page = Math.max(1, parseInt(sp?.page || "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const { supabase } = await requireAdmin();

  let query = supabase
    .from("admin_users_summary")
    .select("*", { count: "exact" })
    .order("profile_created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (search) {
    query = query.ilike("email", `%${search}%`);
  }

  const { data: users, count, error } = await query;

  return (
    <div className="p-8 max-w-6xl mx-auto flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-sm text-text-muted mt-1">
            {count != null ? `${count.toLocaleString()} total` : "Loading…"}
          </p>
        </div>
        <form className="flex gap-2">
          <input
            name="q"
            defaultValue={search}
            placeholder="Search email…"
            className="px-3 py-1.5 rounded border border-border bg-bg text-sm w-64"
          />
          <button type="submit" className="px-3 py-1.5 rounded bg-primary text-primary-foreground text-sm">
            Search
          </button>
        </form>
      </header>

      {error && (
        <div className="rounded border border-red-500/40 bg-red-500/10 text-red-500 text-sm p-3">
          {error.message}
        </div>
      )}

      <div className="rounded-lg border border-border overflow-hidden bg-bg">
        <table className="w-full text-sm">
          <thead className="bg-bg-muted text-left">
            <tr>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Plan</th>
              <th className="px-3 py-2 text-right">Keys</th>
              <th className="px-3 py-2 text-right">Routers</th>
              <th className="px-3 py-2 text-right">Requests (lifetime)</th>
              <th className="px-3 py-2">Joined</th>
              <th className="px-3 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {(!users || users.length === 0) && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-text-muted">No users found.</td></tr>
            )}
            {(users || []).map((u) => (
              <tr key={u.id} className="border-t border-border hover:bg-bg-muted/50">
                <td className="px-3 py-2 flex items-center gap-2">
                  {u.is_admin && <Shield className="size-3 text-amber-500" title="Admin" />}
                  <Link href={`/admin/users/${u.id}`} className="hover:underline">{u.email}</Link>
                </td>
                <td className="px-3 py-2"><code className="text-xs">{u.plan_code || "—"}</code></td>
                <td className="px-3 py-2 text-right tabular-nums">{u.active_api_keys}</td>
                <td className="px-3 py-2 text-right tabular-nums">{u.routers_count}</td>
                <td className="px-3 py-2 text-right tabular-nums text-text-muted">{Number(u.requests_used_lifetime).toLocaleString()}</td>
                <td className="px-3 py-2 text-xs text-text-muted">
                  {u.profile_created_at ? new Date(u.profile_created_at).toLocaleDateString() : "—"}
                </td>
                <td className="px-3 py-2">
                  <Link href={`/admin/users/${u.id}`} className="text-text-muted hover:text-text">
                    <ChevronRight className="size-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {count != null && count > PAGE_SIZE && (
        <Pagination page={page} pageSize={PAGE_SIZE} total={count} search={search} />
      )}
    </div>
  );
}

function Pagination({ page, pageSize, total, search }) {
  const lastPage = Math.ceil(total / pageSize);
  const qs = (p) => {
    const u = new URLSearchParams();
    if (search) u.set("q", search);
    if (p > 1) u.set("page", String(p));
    return u.toString() ? `?${u}` : "";
  };
  return (
    <div className="flex items-center justify-between text-sm text-text-muted">
      <span>Page {page} of {lastPage}</span>
      <div className="flex gap-2">
        {page > 1 && <Link href={`/admin/users${qs(page - 1)}`} className="px-2 py-1 rounded hover:bg-bg-muted">← Prev</Link>}
        {page < lastPage && <Link href={`/admin/users${qs(page + 1)}`} className="px-2 py-1 rounded hover:bg-bg-muted">Next →</Link>}
      </div>
    </div>
  );
}
