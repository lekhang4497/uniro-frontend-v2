---
name: build-router-basics
description: Minimum viable router recipe (1 signal + 1 decision)
version: 1
---

# Build a Router (Basics)

The smallest valid router is one `signals:` entry plus one `decisions:`
entry that references it. Everything else (`projections`, `guardrails`,
`plugins`, `algorithm`, `modelRefs`, `tier`) is optional and should
only be added when the user describes a need for it.

## Step-by-step recipe

1. Pick a `name` for the router (regex `^[a-zA-Z_][a-zA-Z0-9_-]*$`).
2. Optionally add `defaults.on_no_match` — use `route_to_default` so
   unmatched requests fall through to the caller's default model.
3. Add at least one signal in `signals:`. Each signal needs:
   - `name` — referenced by the decision rules. Snake-case identifier
     (`^[a-zA-Z_][a-zA-Z0-9_]*$`).
   - `type` — one of the 22 registered signal types (see
     `signal-reference`).
   - `config` — type-specific. Some types (notably `keyword`) have
     required keys with no default.
4. Add at least one decision in `decisions:` that references the
   signal. Each decision needs:
   - `name` — `^[a-zA-Z_][a-zA-Z0-9_-]*$`.
   - `rules` — a leaf `{type, name}` or a composite
     `{operator, conditions: [...]}`.
   - Exactly one of `model:` (single model) or `modelRefs:` (weighted
     list). Never both, never neither.
   - Optional `priority` (default 0; higher wins) and `description`.
5. (Optional) Add a higher-priority decision for an explicit
   catch-all using a `type: always` signal. The router service does NOT
   include an implicit always-match — unmatched requests fall through
   to `defaults.on_no_match`.
6. Validate before claiming the router is ready.

## Complete minimal YAML

```yaml
name: minimal_router
description: Route Vietnamese traffic to one model, everything else to another.

defaults:
  on_no_match: route_to_default

signals:
  - name: lang_vi
    type: language
    config:
      language: vi
  - name: any
    type: always

decisions:
  - name: vietnamese
    priority: 100
    rules: { type: language, name: lang_vi }
    model: gemini-2.5-flash

  - name: default
    priority: 0
    rules: { type: always, name: any }
    model: gpt-4o-mini
```

## Common starting patterns

- **Single language split.** One `language` signal + one decision that
  matches it; everything else falls through to `on_no_match`. (See
  `examples` for `minimal_example.yaml`.)
- **Cheap-then-strong fallback.** Two decisions on the same `always`
  catch-all, but with different `priority`. Use `modelRefs:` with two
  entries and a confidence algorithm to pick between models per
  request.
- **Add a guard before any decision matches.** A high-priority
  jailbreak / PII block decision with `plugins: [{type: fast_response,
  configuration: {message: "...", status_code: 200}}]` that short-
  circuits with a canned reply.

## Default behavior to remember

- A decision without `priority` has `priority: 0`.
- A decision without `tier` has `tier: 0`. `tier` is only honored when
  `defaults.use_tiered_selection: true`.
- A signal without `version` has `version: 1` and without `timeout_ms`
  has `timeout_ms: 50`.
- A bare-string plugin (`plugins: [router_replay]`) is equivalent to
  `{type: router_replay, configuration: {}}`.

Ask the user for a default model and target language(s) before guessing.
If the user says "cheap" you still need a model name — ask.
