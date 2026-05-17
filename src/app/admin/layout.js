import Link from "next/link";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { Shield, Users, FileSliders, Gauge, LogOut } from "lucide-react";

export default async function AdminLayout({ children }) {
  const { user } = await requireAdmin();

  return (
    <div className="min-h-screen flex bg-bg">
      <aside className="w-60 border-r border-border bg-bg-muted/40 flex flex-col">
        <div className="px-4 py-5 border-b border-border">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Shield className="size-4 text-amber-500" />
            Uniro Admin
          </div>
          <p className="text-xs text-text-muted mt-1 truncate" title={user.email}>
            {user.email}
          </p>
        </div>

        <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5 text-sm">
          <NavLink href="/admin" icon={Gauge}>Overview</NavLink>
          <NavLink href="/admin/users" icon={Users}>Users</NavLink>
          <NavLink href="/admin/plans" icon={FileSliders}>Plans</NavLink>
        </nav>

        <div className="border-t border-border p-2 flex flex-col gap-1">
          <Link
            href="/dashboard"
            className="px-3 py-2 rounded text-xs text-text-muted hover:bg-bg-muted hover:text-text"
          >
            ← back to dashboard
          </Link>
          <form action="/cloud/logout" method="POST">
            <button
              type="submit"
              className="w-full px-3 py-2 rounded text-xs text-text-muted hover:bg-bg-muted hover:text-text flex items-center gap-1.5"
            >
              <LogOut className="size-3" /> Sign out
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}

function NavLink({ href, icon: Icon, children }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-3 py-2 rounded hover:bg-bg-muted text-text-muted hover:text-text"
    >
      <Icon className="size-4" />
      {children}
    </Link>
  );
}
