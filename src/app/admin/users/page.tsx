// Admin users — searchable paginated list backed by the
// `admin_users_summary` view. Server component; the search box submits a
// plain ?q=... query string and Next re-renders with a fresh fetch.
import Link from "next/link";
import { Shield, ChevronRight } from "lucide-react";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";

const PAGE_SIZE = 50;

type UserRow = {
  id: string;
  email: string | null;
  is_admin: boolean | null;
  plan_code: string | null;
  active_api_keys: number | null;
  routers_count: number | null;
  requests_used_lifetime: number | null;
  profile_created_at: string | null;
};

type AdminUsersPageProps = {
  searchParams?: Promise<{ q?: string; page?: string }>;
};

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const sp = (await searchParams) ?? {};
  const search = (sp.q || "").trim();
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
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

  const { data, count, error } = await query;
  const users = (data ?? []) as UserRow[];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
            Users
          </h1>
          <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
            {count != null ? `${count.toLocaleString()} total` : "Loading…"}
          </p>
        </div>
        <form className="flex gap-2">
          <Input
            name="q"
            defaultValue={search}
            placeholder="Search email…"
            className="w-64"
          />
          <Button type="submit">Search</Button>
        </form>
      </header>

      {error && (
        <div className="rounded-[var(--radius)] border border-[var(--accent-red)]/40 bg-[var(--accent-red)]/10 px-3 py-2 text-[13px] text-[var(--accent-red)]">
          {error.message}
        </div>
      )}

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead className="text-right">Keys</TableHead>
              <TableHead className="text-right">Routers</TableHead>
              <TableHead className="text-right">Requests (lifetime)</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-[var(--text-tertiary)]">
                  No users found.
                </TableCell>
              </TableRow>
            )}
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {u.is_admin && (
                      <Shield
                        className="h-3 w-3 text-[var(--accent-orange)]"
                        aria-label="Admin"
                      />
                    )}
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="text-[var(--text-primary)] hover:text-[var(--accent-blue)] hover:underline"
                    >
                      {u.email}
                    </Link>
                  </div>
                </TableCell>
                <TableCell>
                  <code className="text-[11px] text-[var(--text-secondary)]">
                    {u.plan_code || "—"}
                  </code>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {u.active_api_keys ?? 0}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {u.routers_count ?? 0}
                </TableCell>
                <TableCell className="text-right tabular-nums text-[var(--text-secondary)]">
                  {Number(u.requests_used_lifetime ?? 0).toLocaleString()}
                </TableCell>
                <TableCell className="text-[12px] text-[var(--text-tertiary)]">
                  {u.profile_created_at
                    ? new Date(u.profile_created_at).toLocaleDateString()
                    : "—"}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/admin/users/${u.id}`}
                    className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {count != null && count > PAGE_SIZE && (
        <Pagination page={page} pageSize={PAGE_SIZE} total={count} search={search} />
      )}
    </div>
  );
}

type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  search: string;
};

function Pagination({ page, pageSize, total, search }: PaginationProps) {
  const lastPage = Math.ceil(total / pageSize);
  const qs = (p: number) => {
    const u = new URLSearchParams();
    if (search) u.set("q", search);
    if (p > 1) u.set("page", String(p));
    const s = u.toString();
    return s ? `?${s}` : "";
  };
  return (
    <div className="flex items-center justify-between text-[13px] text-[var(--text-secondary)]">
      <span>
        Page {page} of {lastPage}
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <Link
            href={`/admin/users${qs(page - 1)}`}
            className="rounded-[var(--radius)] px-2 py-1 hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
          >
            ← Prev
          </Link>
        )}
        {page < lastPage && (
          <Link
            href={`/admin/users${qs(page + 1)}`}
            className="rounded-[var(--radius)] px-2 py-1 hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
          >
            Next →
          </Link>
        )}
      </div>
    </div>
  );
}
