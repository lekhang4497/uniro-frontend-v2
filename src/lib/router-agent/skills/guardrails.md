---
name: guardrails
description: Cost caps, forbidden models, PII outbound block, observability flags
version: 1
---

# Guardrails and Observability

Two top-level blocks gate the router from the outside:
`guardrails` and `observability`. Both are optional.

## guardrails

```yaml
guardrails:
  daily_cost_cap_usd: 50.0           # optional
  forbidden_models: [gpt-5-pro]      # optional
  pii_block_outbound: false          # optional, default false
  max_model_cost_usd_per_m: 10.0     # optional — validate-time per-model cap
```

### daily_cost_cap_usd
Soft per-day cost cap in USD across all decisions in this router.
Treated by the engine as a budget; once breached, fallback behavior
kicks in.

### forbidden_models
Hard deny-list of model names. A decision that routes to a forbidden
model fails validation. Use to keep a fleet-wide ban on an expensive
or deprecated model.

### pii_block_outbound
When `true`, every decision routing to a cloud model MUST include the
`pii_redact` plugin. Validation will flag any decision that does not.
Leave `false` unless the user explicitly asks for PII redaction.

### max_model_cost_usd_per_m
Validate-time cap. Any decision pointing at a model whose advertised
per-million-token cost exceeds this number is flagged. Use to keep
casual lanes from accidentally routing to a premium-tier model.

## observability

```yaml
observability:
  log_decisions: true                # default true
  shadow: false                      # default false
```

### log_decisions
Emit a decision-trace log line per request. Keep `true` while iterating
on a router; turn off only if log volume is a problem.

### shadow
When `true`, the router runs end-to-end but the decision is **not**
applied — the caller still uses its default. Pair with `log_decisions:
true` to A/B a new router shape against production traffic without
risk.

## When to set what

- Always set `daily_cost_cap_usd` on a customer-facing router so a
  runaway loop can't blow the budget.
- Set `forbidden_models` after the user mentions a specific model
  they want to ban (deprecated, too expensive, contractually
  off-limits).
- Set `pii_block_outbound: true` only when the user asks for
  outbound PII blocking. Adding it implicitly forces a `pii_redact`
  plugin on every cloud decision; don't surprise the user.
- Set `observability.shadow: true` when the user wants to
  shadow-test a router against live traffic before turning it on.

## Defaults to remember

- Omitting `guardrails` is fine — no caps, no forbidden list, no
  outbound PII block.
- Omitting `observability` leaves `log_decisions: true` and
  `shadow: false`.
