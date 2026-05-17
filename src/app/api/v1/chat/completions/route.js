import { callCloudWithMachineId } from "@/shared/utils/cloud.js";
import { handleChat } from "@/sse/handlers/chat.js";
import { initTranslators } from "open-sse/translator/index.js";
import {
  getApiKeyFromHeaders,
  resolveRouting,
  recordUsage,
  coordinatorErrorStatus,
} from "@/lib/routing/coordinator";
import { isConnectedMode } from "@/lib/supabase/config";

let initialized = false;

async function ensureInitialized() {
  if (!initialized) {
    await initTranslators();
    initialized = true;
  }
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}

// Feature flag: when false (default), route directly through the legacy
// open-sse handler so existing behaviour is preserved. When true and connected
// mode is on, run requests through the Coordinator (Supabase session-resolve →
// optional Router Service → execution).
const COORDINATOR_ENABLED = process.env.UNIRO_USE_COORDINATOR === "true";

export async function POST(request) {
  await ensureInitialized();

  if (!COORDINATOR_ENABLED || !isConnectedMode()) {
    return await handleChat(request);
  }

  const apiKey = getApiKeyFromHeaders(request.headers);
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "missing_api_key" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Coordinator path. We need to peek at the body to make routing decisions
  // and to mutate `model` based on the router. We re-emit the (possibly
  // mutated) body downstream.
  let payload;
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let routing, envelope;
  try {
    const result = await resolveRouting({ apiKey, request: payload });
    routing = result.routing;
    envelope = result.envelope;
  } catch (err) {
    const status = coordinatorErrorStatus(err);
    return new Response(
      JSON.stringify({ error: err?.message || "coordinator_error" }),
      { status, headers: { "Content-Type": "application/json" } },
    );
  }

  // Rebuild a Request with the (possibly mutated) body and pass to the legacy
  // handler. The model field may have been overridden by the router.
  const forwardedHeaders = new Headers(request.headers);
  forwardedHeaders.set("content-type", "application/json");
  forwardedHeaders.set("x-uniro-routed-by", routing.engine);
  forwardedHeaders.set("x-uniro-router-id", envelope.router?.id || "");
  const forwarded = new Request(request.url, {
    method: "POST",
    headers: forwardedHeaders,
    body: JSON.stringify(routing.request),
  });

  const response = await handleChat(forwarded);

  // Record one usage event per request (best-effort; the underlying handler
  // may surface tokens via response headers in a future change).
  const tokensIn = Number(response.headers.get("x-uniro-tokens-in") || 0);
  const tokensOut = Number(response.headers.get("x-uniro-tokens-out") || 0);
  const refId = response.headers.get("x-uniro-request-id") || cryptoRandomId();

  recordUsage({ envelope, refId, resource: "requests", delta: 1 });
  if (tokensIn) recordUsage({ envelope, refId: `${refId}:in`, resource: "tokens_in", delta: tokensIn });
  if (tokensOut) recordUsage({ envelope, refId: `${refId}:out`, resource: "tokens_out", delta: tokensOut });

  return response;
}

function cryptoRandomId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}
