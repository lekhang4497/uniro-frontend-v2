---
name: understand-router
description: Top-level YAML structure and the 5-layer pipeline
version: 1
---

# Understand the Router

A router YAML tells the UniRo Router Service how to route one request:
which signals to extract, how to combine them, which model to pick, and
which plugins to run. The service is stateless — the caller ships the
whole YAML on every request.

## Top-level blocks

Only the following top-level keys are allowed. Unknown keys are rejected
(`extra="forbid"` on every block).

- `name` (REQUIRED) — `^[a-zA-Z_][a-zA-Z0-9_-]*$`.
- `description` — one-line summary, optional.
- `version`, `schema_version` — both default to 1.
- `created_at`, `created_by`, `created_by_method` — informational only.
- `defaults` — routing defaults (alpha, fallback_chain, on_no_match,
  decision_strategy, use_tiered_selection).
- `signals` — Layer 1 inputs. Array of signal blocks.
- `projections` — Layer 2 derived facts. Object with optional
  `partitions`, `scores`, `mappings`.
- `decisions` — Layer 3 + 4 rule-to-model bindings. Array.
- `guardrails` — safety / cost caps (daily_cost_cap_usd,
  forbidden_models, pii_block_outbound, max_model_cost_usd_per_m).
- `observability` — flags (log_decisions, shadow).

A router with just `name` plus one signal plus one decision is valid;
every other block has defaults.

## The 5-layer pipeline

For each incoming request the service runs:

1. **Signal extraction (Layer 1).** Every entry in `signals:` runs
   against the request in parallel under a per-signal `timeout_ms`. A
   signal returns a boolean (with an attached confidence). If it errors
   or times out it fails soft to `False`.
2. **Projection coordination (Layer 2).** `projections.partitions` pick
   exactly one signal from a set, `projections.scores` blend signals
   into a weighted-sum number, `projections.mappings` bucket a score
   into named bands. Each partition member, mapping band, and named
   score becomes a `type: projection` leaf that decisions can branch on.
3. **Decision (Layer 3).** Every `decisions[].rules` tree evaluates
   over Layer-1 and Layer-2 outputs. The first matching decision wins,
   sorted by `priority` (or by `(tier, priority)` if
   `defaults.use_tiered_selection` is true).
4. **Model (Layer 4).** Each decision specifies either a single
   `model:` or a weighted list of `modelRefs:`. An optional `algorithm`
   picks between the refs (default: highest-weight wins).
5. **Plugin chain (Layer 5).** Pre-plugins on the chosen decision may
   rewrite or short-circuit the request before dispatch; post-plugins
   run after the provider responds. Plugin config is per-decision.

## What the router service does NOT do

- It never calls the provider. It returns `{model, plugins_applied,
  modified_request, trace}` to the caller, which dispatches.
- It never owns user state. Each request carries the whole config; the
  service is a pure function of `(request, config_yaml)`.

## Defaults block

```yaml
defaults:
  alpha: 0.5
  fallback_chain: []
  on_no_match: route_to_default
  decision_strategy: priority
  use_tiered_selection: false
```

- `on_no_match` — `route_to_default` lets the caller resolve a fallback;
  `reject` returns a rejection; `use_operator_router` defers to an
  operator-defined router.
- `decision_strategy` — `priority` picks the highest-priority matching
  decision; `confidence` weighs signal confidences.

When in doubt about a block's shape, call the skill that covers it:
`signal-reference`, `plugin-reference`, `rule-trees`, `projections`,
`guardrails`, `validate-and-iterate`, `examples`.
