// Routing Coordinator — orchestrates per-request work for /v1/* in
// connected mode:
//
//   1. Validate API key + load router config via session-resolve (cached).
//   2. Enforce key scopes (router allowlist, max-tokens, etc.).
//   3. If router engine == "remote", call the Python Router Service to get the
//      target model + pre-processed request. Falls back to local engine on
//      failure.
//   4. Hand the routed model + request back to the caller, which executes it
//      via the existing open-sse pipeline.
//   5. After execution the caller calls `recordUsage()` to enqueue a
//      quota_event for async flush.
//
// This module is intentionally framework-agnostic: it doesn't know about
// Next.js req/res. The chat-completions route does the protocol glue.

import { getSessionEnvelope, invalidateSession } from "./routerCache";
import { routeViaService } from "./routerServiceClient";
import { enqueueUsageEvent } from "./usageQueue";

function extractApiKey(headerValue) {
  if (!headerValue) return null;
  const m = String(headerValue).match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : String(headerValue).trim();
}

function enforceScopes(envelope, request) {
  const scopes = envelope.scopes || [];
  const requestedModel = request?.model;

  const routerAllow = scopes
    .filter((s) => s.scope_type === "router_id")
    .map((s) => s.scope_value);
  if (routerAllow.length > 0 && envelope.router && !routerAllow.includes(envelope.router.id)) {
    return { ok: false, reason: "router_not_in_scope" };
  }

  const familyAllow = scopes
    .filter((s) => s.scope_type === "model_family")
    .map((s) => s.scope_value);
  if (familyAllow.length > 0 && requestedModel) {
    const matched = familyAllow.some((family) => requestedModel.startsWith(family));
    if (!matched) return { ok: false, reason: "model_family_not_in_scope" };
  }

  const maxTokensScope = scopes.find((s) => s.scope_type === "max_tokens_per_request");
  if (maxTokensScope && request?.max_tokens && Number(request.max_tokens) > Number(maxTokensScope.scope_value)) {
    return { ok: false, reason: "max_tokens_exceeded" };
  }

  return { ok: true };
}

// Resolves the model + request after consulting the user's router.
export async function resolveRouting({ apiKey, request, signal }) {
  const envelope = await getSessionEnvelope(apiKey);

  const scopeCheck = enforceScopes(envelope, request);
  if (!scopeCheck.ok) {
    const err = new Error(`scope_violation: ${scopeCheck.reason}`);
    err.code = "FORBIDDEN";
    throw err;
  }

  const router = envelope.router;
  const fallbackModel = router?.fallback_model || request?.model;

  // No router configured for this key — pass the request through unchanged,
  // honouring the explicit `model` field (existing open-sse behaviour).
  if (!router) {
    return {
      envelope,
      routing: { engine: "passthrough", model: request?.model, request, trace: null },
    };
  }

  if (router.engine === "local") {
    // open-sse already handles local routing inside the chat handler. We only
    // need to make sure the request carries the router's fallback model when
    // the caller didn't supply one.
    const modified = request?.model ? request : { ...request, model: fallbackModel };
    return {
      envelope,
      routing: { engine: "local", model: modified.model, request: modified, trace: null },
    };
  }

  // engine === "remote": call the Python Router Service.
  try {
    const serviceUrl = process.env.UNIRO_ROUTER_SERVICE_URL;
    const out = await routeViaService({
      baseUrl: serviceUrl,
      serviceToken: envelope.mint?.token,
      request,
      router,
      signal,
    });
    return {
      envelope,
      routing: {
        engine: "remote",
        model: out.model,
        request: out.modified_request || request,
        plugins_applied: out.plugins_applied || [],
        trace: out.trace || null,
      },
    };
  } catch (err) {
    // Degraded mode — fall back to local engine.
    return {
      envelope,
      routing: {
        engine: "remote-fallback",
        model: fallbackModel,
        request: { ...request, model: fallbackModel },
        trace: { degraded: true, reason: String(err?.message || err) },
      },
    };
  }
}

// Push a usage event into the batched flusher.
export function recordUsage({ envelope, refId, resource, delta, metadata }) {
  if (!envelope?.user_id) return;
  enqueueUsageEvent({
    user_id: envelope.user_id,
    resource,
    delta,
    source: "usage",
    ref_id: refId,
    metadata: metadata || {},
  });
}

// Helper for routes: pull the API key out of the incoming headers.
export function getApiKeyFromHeaders(headers) {
  return extractApiKey(headers?.get?.("authorization") || headers?.authorization);
}

// Helper for routes: surface auth errors as 401 / scope errors as 403.
export function coordinatorErrorStatus(err) {
  if (err?.code === "UNAUTHORIZED") return 401;
  if (err?.code === "FORBIDDEN") return 403;
  return 500;
}

export { invalidateSession };
