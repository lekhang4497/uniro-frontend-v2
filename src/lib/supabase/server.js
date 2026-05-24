import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseConfig } from "./config";

// Cookie-bound server client for use inside Server Components / Route Handlers
// that act on behalf of the signed-in user. Honours RLS.
//
// NOTE: the previous `getServiceSupabase` (Supabase admin client with the
// service-role key) was removed. All server-side admin operations now go
// through the Management Service (UNIRO_MGMT_URL). The service-role key no
// longer needs to live in the frontend's env, so distributing the frontend
// via npm doesn't leak admin credentials.
export async function getServerSupabase() {
  const cfg = getSupabaseConfig();
  if (!cfg) return null;
  const cookieStore = await cookies();
  return createServerClient(cfg.url, cfg.anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // setAll fails inside Server Components — only Route Handlers and
          // Server Actions can mutate cookies. Safe to ignore for read flows.
        }
      },
    },
  });
}
