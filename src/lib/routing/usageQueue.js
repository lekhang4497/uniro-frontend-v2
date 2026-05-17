// Batched async flusher for quota events. Sends to the Supabase
// `usage-events` Edge Function every FLUSH_INTERVAL_MS or when the queue
// exceeds MAX_BATCH, whichever first. Events with `ref_id` are idempotent.

import { getSupabaseConfig, getGatewaySecret } from "@/lib/supabase/config";

const FLUSH_INTERVAL_MS = 5000;
const MAX_BATCH = 50;
const MAX_RETRY = 5;

let queue = [];
let timer = null;
let flushing = false;

function scheduleFlush() {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    flush().catch(() => {});
  }, FLUSH_INTERVAL_MS);
}

async function postBatch(events, attempt = 0) {
  const cfg = getSupabaseConfig();
  const secret = getGatewaySecret();
  if (!cfg || !secret) return false;

  try {
    const res = await fetch(`${cfg.url}/functions/v1/usage-events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-gateway-secret": secret,
      },
      body: JSON.stringify({ events }),
    });
    if (res.ok) return true;
    if (res.status >= 500 && attempt < MAX_RETRY) {
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
      return postBatch(events, attempt + 1);
    }
    return false;
  } catch {
    if (attempt < MAX_RETRY) {
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
      return postBatch(events, attempt + 1);
    }
    return false;
  }
}

export async function flush() {
  if (flushing) return;
  if (queue.length === 0) return;
  flushing = true;
  try {
    while (queue.length > 0) {
      const batch = queue.splice(0, MAX_BATCH);
      const ok = await postBatch(batch);
      if (!ok) {
        // Drop after retries; log and move on so the gateway never blocks.
        // eslint-disable-next-line no-console
        console.warn("[uniro] dropped %d usage events after retries", batch.length);
      }
    }
  } finally {
    flushing = false;
  }
}

export function enqueueUsageEvent(event) {
  if (!event || !event.user_id || !event.resource) return;
  queue.push(event);
  if (queue.length >= MAX_BATCH) {
    flush().catch(() => {});
    return;
  }
  scheduleFlush();
}

// Drain on process shutdown so we don't lose in-flight events.
if (typeof process !== "undefined" && process.on) {
  for (const sig of ["SIGINT", "SIGTERM", "beforeExit"]) {
    process.on(sig, () => {
      flush().catch(() => {});
    });
  }
}
