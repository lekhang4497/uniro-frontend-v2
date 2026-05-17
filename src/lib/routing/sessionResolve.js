// Client for the Supabase `session-resolve` Edge Function.
// Validates an API key and returns the gateway envelope (user, plan, quota,
// router, scopes, service-token for the Router Service).

import { getSupabaseConfig, getGatewaySecret } from "@/lib/supabase/config";

let inflight = new Map();

async function fetchEnvelope(apiKey, ifNoneMatch) {
  const cfg = getSupabaseConfig();
  const secret = getGatewaySecret();
  if (!cfg || !secret) {
    throw new Error("session_resolve_disabled: supabase or gateway secret missing");
  }

  const headers = {
    "Content-Type": "application/json",
    "x-gateway-secret": secret,
  };
  if (ifNoneMatch) headers["If-None-Match"] = ifNoneMatch;

  const res = await fetch(`${cfg.url}/functions/v1/session-resolve`, {
    method: "POST",
    headers,
    body: JSON.stringify({ api_key: apiKey }),
  });

  if (res.status === 304) {
    return { status: 304, etag: res.headers.get("ETag") };
  }
  if (res.status === 401) {
    return { status: 401, error: "unauthorized" };
  }
  if (!res.ok) {
    throw new Error(`session_resolve_failed: ${res.status}`);
  }
  const body = await res.json();
  return { status: 200, etag: res.headers.get("ETag"), envelope: body };
}

// Coalesce concurrent calls for the same key — common when many requests arrive
// at once for the same client.
export async function resolveSession(apiKey, ifNoneMatch) {
  const cacheKey = `${apiKey}:${ifNoneMatch || ""}`;
  if (inflight.has(cacheKey)) return inflight.get(cacheKey);
  const promise = fetchEnvelope(apiKey, ifNoneMatch).finally(() => {
    inflight.delete(cacheKey);
  });
  inflight.set(cacheKey, promise);
  return promise;
}
