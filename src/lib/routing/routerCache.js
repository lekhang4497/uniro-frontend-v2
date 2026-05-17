// In-memory cache for session envelopes keyed by API key.
// Honours the ETag returned by `session-resolve` for cheap refreshes.

import { resolveSession } from "./sessionResolve";

const TTL_MS = 5 * 60 * 1000;

const cache = new Map();

function isFresh(entry) {
  return entry && Date.now() - entry.fetchedAt < TTL_MS;
}

export async function getSessionEnvelope(apiKey) {
  const entry = cache.get(apiKey);

  if (isFresh(entry)) {
    // Within TTL — but still revalidate with ETag in background once per minute
    // to catch router/quota changes. For simplicity, just return the cached
    // copy here; an explicit `revalidate()` call can be wired later.
    return entry.envelope;
  }

  const result = await resolveSession(apiKey, entry?.etag);

  if (result.status === 304 && entry) {
    entry.fetchedAt = Date.now();
    return entry.envelope;
  }

  if (result.status === 401) {
    cache.delete(apiKey);
    const err = new Error("invalid_api_key");
    err.code = "UNAUTHORIZED";
    throw err;
  }

  cache.set(apiKey, {
    envelope: result.envelope,
    etag: result.etag,
    fetchedAt: Date.now(),
  });
  return result.envelope;
}

export function invalidateSession(apiKey) {
  cache.delete(apiKey);
}

export function clearSessionCache() {
  cache.clear();
}
