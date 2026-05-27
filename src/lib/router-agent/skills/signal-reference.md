---
name: signal-reference
description: All 22 signal types with required config keys and examples
version: 1
---

# Signal Reference

Each entry in `signals:` is one signal block:

```yaml
- name: lang_vi          # REQUIRED, ^[a-zA-Z_][a-zA-Z0-9_]*$
  type: language         # REQUIRED, one of the 22 registered types
  version: 1             # optional, default 1
  timeout_ms: 50         # optional, default 50
  config: { ... }        # optional but usually required, shape depends on type
```

Signals fire in parallel under their `timeout_ms`. A signal that errors
or times out fails soft to `False` -- that is NOT a config error.

## Type catalog (all 22)

The deep configs for the 10 most common types are spelled out below.
Less common ones get a one-line purpose plus a pointer.

## Common signals -- full config

### always
Always returns `True`. Use as an explicit catch-all.
```yaml
- { name: any, type: always }
```

### language
Fires when the detected language matches a configured ISO 639-1 code.
```yaml
- name: lang_vi
  type: language
  config:
    language: vi          # REQUIRED -- ISO 639-1
```
One signal per language; combine with `OR` to match a set.

### keyword
Multi-method keyword match. `method` has NO default -- you MUST set it.
```yaml
- name: urgent_markers
  type: keyword
  config:
    method: bm25          # REQUIRED -- bm25 | ngram | fuzzy
    keywords: [urgent, asap, "khan cap"]   # REQUIRED, non-empty
    operator: OR          # OR | AND (default OR)
    case_sensitive: false # default false
    # method-specific knobs: bm25_threshold / ngram_threshold / fuzzy_threshold
```
Note: YAML keyword strings accept UTF-8; use the source script for real deployments (e.g., Vietnamese diacritics). Examples here are ASCII for skill readability.

### domain
MMLU-category classifier. `match_categories` lists the categories the
classifier must hit. Common categories: `math`, `physics`, `chemistry`,
`biology`, `engineering`, `computer_science`, `health`, `law`,
`business`, `economics`, `history`, `psychology`, `philosophy`, `other`.
```yaml
- name: domain_math
  type: domain
  config:
    match_categories: [math]
```

### embedding
Utterance/intent classifier. Provide `class_name`, a `threshold`, and a
list of `utterances` keyed by the class name.
```yaml
- name: refactor
  type: embedding
  config:
    class_name: refactor
    threshold: 0.55
    enable_soft_matching: false   # optional -- disable when you have many
                                  # similar-vocabulary classes (avoids every
                                  # cluster firing on every prompt)
    utterances:
      refactor:
        - "refactor this function"
        - "clean up this code"
```

### context
Token-count range gate.
```yaml
- name: long_context
  type: context
  config:
    chars_per_token: 4
    rules:
      - { name: long_context, min_tokens: 8000, max_tokens: 256000 }
    match_rule: long_context
```

### time_of_day
Hour, day-of-week, or business-hours flag.
```yaml
- name: after_hours
  type: time_of_day
  config:
    output: business_hours          # hour | dow | business_hours
    timezone: Asia/Ho_Chi_Minh
    business_hours: { start: 8, end: 18, days: [0,1,2,3,4] }
    holidays: vn                    # optional country code
    predicate: { equals: false }    # invert: fires OUTSIDE business hours
```

### pii
PII detector (HF classifier). Rule-based -- supply at least one rule and
point `match_rule` at it. `pii_types_allowed` is a whitelist of PII
types to ignore.
```yaml
- name: restricted_pii
  type: pii
  config:
    rules:
      - name: restricted_pii
        threshold: 0.6
        pii_types_allowed: []   # nothing allowed; flag every detection
    match_rule: restricted_pii
```

### jailbreak
Jailbreak / prompt-injection detector. Same shape as `pii`.
```yaml
- name: jailbreak_attempt
  type: jailbreak
  config:
    rules:
      - { name: jailbreak_attempt, threshold: 0.4 }
    match_rule: jailbreak_attempt
```

### fact_check
"Needs fact-checking" classifier. Same shape as `pii`/`jailbreak`.
```yaml
- name: needs_fact_check
  type: fact_check
  config:
    rules:
      - { name: needs_fact_check, threshold: 0.5 }
    match_rule: needs_fact_check
```

### authz
Kubernetes-style RBAC role binding from request metadata.
```yaml
- name: is_vip_customer
  type: authz
  config:
    user_field: metadata.user
    groups_field: metadata.user_groups
    role_bindings:
      - { role: vip, groups: [vip_customers, private_banking] }
    match_role: vip
```

## Less-common signals -- terse

For each of the following, see ROUTER_YAML.md Sec. 4.2 or the matching
module under `router_service/uniro_router/signals/` for the full
`config` shape.

### complexity
Contrastive hard-vs-easy difficulty signal. Provide `rules[].threshold`
plus `hard_examples` and `easy_examples` lists, then `match_rule`.
See ROUTER_YAML.md Sec. 4.2.

### token_estimator
Estimated token count gate. See ROUTER_YAML.md Sec. 4.2.

### structure
Request-structure predicates (regex / keyword density / sequence
detection over the prompt). See ROUTER_YAML.md Sec. 4.2.

### conversation
Conversation feature predicate (message counts, tool definitions, role
counts). See ROUTER_YAML.md Sec. 4.2.

### modality
Output-route classifier (text / image / diffusion). See ROUTER_YAML.md
Sec. 4.2.

### user_feedback
4-class user-feedback classifier (`wrong_answer`, `need_clarification`,
etc.). Set `match_class`. See ROUTER_YAML.md Sec. 4.2.

### reask
Fires when the user repeats a question. Set `threshold` and `lookback`
(turns to look back). See ROUTER_YAML.md Sec. 4.2.

### event_context
Event / metadata-context predicate. See ROUTER_YAML.md Sec. 4.2.

### session_metric
Per-session metric gate. See ROUTER_YAML.md Sec. 4.2.

### knowledge_base_inmem
In-memory KB match. See ROUTER_YAML.md Sec. 4.2.

### preference_llm
LLM-preference signal. See ROUTER_YAML.md Sec. 4.2.

## Naming and reuse

- Signal `name` is the identifier that decision rules use. Pick a
  descriptive snake_case name (`lang_vi`, `fraud_markers`,
  `is_oncall`).
- The same `type` can appear many times with different `name` and
  `config` (e.g. one `language` signal per ISO code).
- Some signals (`domain`, `pii`, `jailbreak`, `fact_check`,
  `user_feedback`, `modality`, `embedding`) need ML deps in the
  deployment. Without them the signal fails soft to `False` -- it is
  NOT a config error, and `validate()` does not flag it.
