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

import { resolveRouterViaMgmt } from "./mgmtClient";
import { getSessionEnvelope, invalidateSession } from "./routerCache";
import { routeViaService } from "./routerServiceClient";
import { enqueueUsageEvent } from "./usageQueue";

function extractApiKey(headerValue) {
  if (!headerValue) return null;
  const m = String(headerValue).match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : String(headerValue).trim();
}

// Load a router by id via the Management Service. Mgmt enforces ownership
// (returns 404 if the api_key's user doesn't own the router) and holds the
// service-role key — the frontend never needs Supabase admin credentials.
// Returns the envelope shape (id/name/engine/fallback_model/version/config_yaml)
// or null on 404.
async function loadRouterById(routerId, apiKey) {
  try {
    const { router } = await resolveRouterViaMgmt(apiKey, routerId);
    return router;
  } catch (err) {
    if (err?.status === 404) return null;
    throw err;
  }
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

// Resolves the model + request after consulting the user's router. If
// `routerIdOverride` is given and the router belongs to the resolved user,
// it replaces the envelope's default router for this single request.
export async function resolveRouting({ apiKey, request, signal, routerIdOverride }) {
  const envelope = await getSessionEnvelope(apiKey);

  const scopeCheck = enforceScopes(envelope, request);
  if (!scopeCheck.ok) {
    const err = new Error(`scope_violation: ${scopeCheck.reason}`);
    err.code = "FORBIDDEN";
    throw err;
  }

  let router = envelope.router;
  if (routerIdOverride) {
    const overrideRouter = await loadRouterById(routerIdOverride, apiKey);
    if (!overrideRouter) {
      console.log(`[ROUTING] coordinator  routerIdOverride=${routerIdOverride} not found / not owned (mgmt returned 404)`);
      const err = new Error("router_override_not_found_or_unauthorized");
      err.code = "FORBIDDEN";
      throw err;
    }
    console.log(`[ROUTING] coordinator  override applied  router=${overrideRouter.name} engine=${overrideRouter.engine} version=${overrideRouter.version}`);
    router = overrideRouter;
  } else {
    console.log(`[ROUTING] coordinator  using key's default router=${router?.name || "(none)"} engine=${router?.engine || "(n/a)"}`);
  }
  const fallbackModel = router?.fallback_model || request?.model;

  // No router configured for this key — pass the request through unchanged,
  // honouring the explicit `model` field (existing open-sse behaviour).
  if (!router) {
    console.log(`[ROUTING] coordinator  branch=passthrough (no router on key)`);
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
    console.log(`[ROUTING] coordinator  branch=local (router.engine=local → no router-service call)  fallback_model=${fallbackModel}  request.model=${request?.model || "(unset, using fallback)"}`);
    return {
      envelope,
      routing: { engine: "local", model: modified.model, request: modified, trace: null },
    };
  }

  // engine === "remote": call the Python Router Service.
  const serviceUrl = process.env.UNIRO_ROUTER_SERVICE_URL;
  console.log(`[ROUTING] coordinator  branch=remote  serviceUrl=${serviceUrl || "(UNSET!)"}  token=${envelope.mint?.token ? "present" : "missing"}`);
  try {
    const out = await routeViaService({
      baseUrl: serviceUrl,
      serviceToken: envelope.mint?.token,
      request,
      router,
      signal,
    });
    console.log(`[ROUTING] router-service  matched_decision=${out.trace?.decision || "(none)"}  model=${out.model || "(null)"}  plugins=${(out.plugins_applied || []).join(",") || "(none)"}`);
    // Defensive: stamp the routed model into the forwarded body even if the
    // router-service didn't (older engine versions returned modified_request
    // with the client's original "auto" preserved, which then fails downstream).
    const dispatchRequest = out.model
      ? { ...(out.modified_request || request), model: out.model }
      : (out.modified_request || request);
    return {
      envelope,
      routing: {
        engine: "remote",
        model: out.model,
        request: dispatchRequest,
        plugins_applied: out.plugins_applied || [],
        trace: out.trace || null,
      },
    };
  } catch (err) {
    // Degraded mode — fall back to local engine.
    console.log(`[ROUTING] router-service FAILED  reason=${err?.message || err}  →  falling back to ${fallbackModel}`);
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
