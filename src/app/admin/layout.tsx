// Admin shell. Mirrors the dashboard layout shape (Sidebar + Header) so the
// admin area feels like one app, but passes `isAdmin={true}` to Sidebar so
// the Admin nav group becomes visible.
//
// Auth: server-side `requireAdmin()` runs once per navigation and redirects
// non-admins before any children render. This is intentional — the is_admin()
// RPC needs a DB round-trip and we don't want it on every request inside
// Edge middleware. See `src/lib/admin/requireAdmin.js`.
import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import AdminLayoutShell from "./AdminLayoutShell";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // Redirects (and never returns) if the viewer isn't a confirmed admin.
  await requireAdmin();
  return <AdminLayoutShell>{children}</AdminLayoutShell>;
}
