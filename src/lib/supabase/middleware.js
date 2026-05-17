import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { getSupabaseConfig } from "./config";

// Updates the auth cookies on every request. Returns the (possibly mutated)
// NextResponse so the caller can chain further logic.
export async function updateSupabaseSession(request) {
  const cfg = getSupabaseConfig();
  if (!cfg) return { response: NextResponse.next({ request }), user: null };

  let response = NextResponse.next({ request });

  const supabase = createServerClient(cfg.url, cfg.anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Refresh expired tokens; populates request cookies via setAll above.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
