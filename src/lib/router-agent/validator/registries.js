// Hand-maintained registries for the JS shape validator.
//
// The router service owns the canonical lists; this file mirrors them. Keep
// the JS sets aligned with:
//
//   router_service/uniro_router/signals/__init__.py
//   router_service/uniro_router/plugins/__init__.py
//   router_service/ROUTER_YAML.md (top-level keys, name regex)
//
// Drift here means the JS validator either accepts unknown types or rejects
// types the service supports — both surface in the chat as false positives.
// A follow-up should add a CI check that diffs these against generated lists
// from the Python source.

// 22 signal types registered in router_service as of 2026-05-27.
// Note: `embedding` is also accepted because the schema also documents it,
// even though the Python module is named `embedding_real`.
export const REGISTERED_SIGNALS = new Set([
  "always",
  "language",
  "keyword",
  "embedding",
  "domain",
  "complexity",
  "context",
  "token_estimator",
  "structure",
  "conversation",
  "modality",
  "pii",
  "jailbreak",
  "fact_check",
  "user_feedback",
  "reask",
  "authz",
  "time_of_day",
  "event_context",
  "session_metric",
  "knowledge_base_inmem",
  "preference_llm",
]);

// 13 plugin types + 1 hyphenated alias for upstream parity.
export const REGISTERED_PLUGINS = new Set([
  "fast_response",
  "hallucination",
  "header_mutation",
  "image_gen",
  "memory",
  "rag",
  "request_params",
  "response_jailbreak",
  "router_replay",
  "semantic_cache",
  "semantic-cache",
  "system_prompt",
  "tool_selection",
  "tools",
]);

// Plugin names the router_service validator special-cases by string (e.g. the
// PII safety rule checks decision.plugin_types for "pii_redact"). These are
// accepted by the shape validator even though they aren't in the plugin
// registry per se.
export const RESERVED_PLUGIN_NAMES = new Set(["pii_redact"]);

// Top-level keys allowed at the router root, from ROUTER_YAML.md §2.
// Everything else is rejected (the pydantic schema is extra="forbid").
export const ALLOWED_TOP_KEYS = new Set([
  "name",
  "description",
  "version",
  "schema_version",
  "created_at",
  "created_by",
  "created_by_method",
  "defaults",
  "signals",
  "projections",
  "decisions",
  "guardrails",
  "observability",
]);

// Name regex for the router itself and for decisions (allows hyphens).
export const NAME_RE = /^[a-zA-Z_][a-zA-Z0-9_-]*$/;
// Signal / projection-member names per ROUTER_YAML.md §4 (no hyphens).
export const SIGNAL_NAME_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
