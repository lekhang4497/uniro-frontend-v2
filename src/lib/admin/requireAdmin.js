import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";

// Server-side guard for /admin pages. Returns the signed-in user when they're
// confirmed admin, otherwise redirects (never returns).
//
// Why this isn't in middleware: the is_admin() RPC needs a DB round-trip, and
// running it for every request inside Edge middleware is wasteful. The layout
// runs once per navigation and is the right place.
export async function requireAdmin() {
  const supabase = await getServerSupabase();
  if (!supabase) {
    redirect("/login");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/cloud/login?next=/admin");
  }

  const { data: isAdmin, error } = await supabase.rpc("is_admin");
  if (error || !isAdmin) {
    redirect("/dashboard");
  }

  return { supabase, user };
}
