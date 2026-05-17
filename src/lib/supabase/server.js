import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseConfig, getServiceRoleKey } from "./config";

// Cookie-bound server client for use inside Server Components / Route Handlers
// that act on behalf of the signed-in user. Honours RLS.
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

// Service-role client for trusted server-only operations (Edge Function calls,
// privileged RPCs). NEVER expose to the browser; never use inside Server
// Components rendered to the client.
let _service = null;
export function getServiceSupabase() {
  if (_service) return _service;
  const cfg = getSupabaseConfig();
  const serviceKey = getServiceRoleKey();
  if (!cfg || !serviceKey) return null;
  // Lazy import to avoid bundling for client.
  const { createClient } = require("@supabase/supabase-js");
  _service = createClient(cfg.url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _service;
}
