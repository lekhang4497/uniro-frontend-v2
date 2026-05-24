// Issues (and lazily creates) a one-per-user API key for the dashboard Chat UI.
//
// All the actual minting is delegated to the Management Service — it owns
// the Supabase service-role key. This handler's job is just to:
//   1. Confirm the caller has a valid Supabase session (cookie-bound).
//   2. Forward the user's access token to mgmt.
//   3. Pipe the returned plaintext into an HttpOnly cookie scoped to /v1.
//
// The plaintext key never leaves this server process.

import { cookies } from "next/headers";
import { getServerSupabase } from "@/lib/supabase/server";
import { isConnectedMode } from "@/lib/supabase/config";
import { mintChatKeyViaMgmt } from "@/lib/routing/mgmtClient";

const COOKIE_NAME = "uniro_chat_key";

async function jsonError(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST() {
  if (!isConnectedMode()) {
    return jsonError(400, { error: "connected_mode_disabled" });
  }
  const userClient = await getServerSupabase();
  if (!userClient) return jsonError(500, { error: "supabase_not_configured" });

  // Pull both the user (for the 401 short-circuit) and the session (to get
  // the access token mgmt will verify).
  const { data: { session }, error } = await userClient.auth.getSession();
  if (error || !session?.user?.id || !session.access_token) {
    return jsonError(401, { error: "not_authenticated" });
  }

  // If the caller already holds a chat-key cookie, pass it to mgmt so we
  // can short-circuit when it's still valid (skips needless rotation).
  const cookieStore = await cookies();
  const existing = cookieStore.get(COOKIE_NAME)?.value || "";

  let resp;
  try {
    resp = await mintChatKeyViaMgmt(session.access_token, existing);
  } catch (err) {
    return jsonError(502, { error: "mgmt_unavailable", detail: String(err?.message || err) });
  }

  if (resp.plaintext) {
    cookieStore.set(COOKIE_NAME, resp.plaintext, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.AUTH_COOKIE_SECURE === "true",
      path: "/v1",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  return Response.json({
    key_id: resp.key_id,
    default_router_id: resp.default_router_id,
    rotated: resp.rotated,
  });
}
