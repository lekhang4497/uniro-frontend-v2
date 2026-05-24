// Client for the UniRo Management Service's resolve-session endpoint.
// Validates an API key and returns the gateway envelope (user, plan, quota,
// router, scopes, service-token for the Router Service).
//
// Previously called the Supabase Edge Function directly with x-gateway-secret.
// That secret is now held by the Management Service so the frontend can be
// distributed (e.g. via npm) without admin credentials on disk.

import { resolveSessionViaMgmt } from "./mgmtClient";

let inflight = new Map();

async function fetchEnvelope(apiKey, _ifNoneMatch) {
  // ETag short-circuit is gone for now — mgmt doesn't yet support it.
  // The in-memory routerCache TTL still keeps repeat lookups cheap.
  try {
    const envelope = await resolveSessionViaMgmt(apiKey);
    return { status: 200, etag: null, envelope };
  } catch (err) {
    if (err?.code === "UNAUTHORIZED") {
      return { status: 401, error: "unauthorized" };
    }
    throw new Error(`session_resolve_failed: ${err?.message || err}`);
  }
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
