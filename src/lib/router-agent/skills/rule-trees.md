---
name: rule-trees
description: AND/OR/NOT composites, leaf references, and projection leaves
version: 1
---

# Rule Trees

A decision's `rules:` is a recursive `RuleNode` tree. A node is **either
a leaf or a composite — never both**.

## Leaf nodes

A leaf references one signal (or projection output) by name.

```yaml
rules: { type: keyword, name: urgent_markers }
```

Rules:

- `type` — must match the declared signal's `type` (e.g. `keyword`,
  `language`, `embedding`, `pii`, `jailbreak`...). For projection
  outputs use the literal string `projection` (see below).
- `name` — must resolve to a declared `signals[].name` OR a projection
  output name (partition member, mapping band, or score name).

If a leaf's `name` doesn't resolve, validation fails with
`unresolved_leaf`. If `type` mismatches the declared signal's type,
validation fails with `type_mismatch`.

## Composite nodes

Composites combine child nodes with a boolean operator.

```yaml
rules:
  operator: AND
  conditions:
    - { type: keyword, name: fraud_markers }
    - operator: NOT
      conditions:
        - { type: jailbreak, name: jailbreak_attempt }
    - operator: OR
      conditions:
        - { type: projection, name: risk_high }
        - { type: language,   name: lang_vi }
```

Rules:

- `operator` is one of `AND`, `OR`, `NOT`.
- `NOT` MUST have exactly one child in `conditions`.
- `AND` / `OR` MUST have at least one child. (Two or more is the
  common case.)
- `conditions` is required for composites.
- A composite node must NOT also have `type` / `name` keys (it is
  not a leaf).

## The `type: projection` special case

Projections (partitions, mapping bands, named scores) produce
"derived" boolean facts that decisions can branch on. Reference them
with `type: projection`, never the underlying signal's type.

Examples of projection leaf references:

- Mapping band: `{ type: projection, name: risk_high }` where
  `risk_high` is a band defined under
  `projections.mappings[*].outputs[*].name`.
- Partition member: `{ type: projection, name: billing }` where
  `billing` is a member of `projections.partitions[*].members`.

A `projection` leaf with a `name` that doesn't appear anywhere in the
`projections` block is an `unresolved_leaf` error.

## Composition patterns

### Catch-all
```yaml
rules: { type: always, name: any }
```
(requires a declared `{ name: any, type: always }` signal.)

### Two-of-three OR
```yaml
rules:
  operator: OR
  conditions:
    - { type: keyword, name: fraud_markers }
    - { type: embedding, name: fraud_report }
    - { type: keyword, name: urgent_markers }
```

### Match AND not-blocked
```yaml
rules:
  operator: AND
  conditions:
    - { type: language, name: lang_vi }
    - operator: NOT
      conditions:
        - operator: OR
          conditions:
            - { type: jailbreak, name: jailbreak_attempt }
            - { type: pii, name: restricted_pii }
```

### Nested AND-OR-AND
```yaml
rules:
  operator: AND
  conditions:
    - operator: OR
      conditions:
        - { type: keyword, name: fraud_markers }
        - operator: AND
          conditions:
            - { type: embedding, name: fraud_report }
            - { type: keyword, name: urgent_markers }
    - { type: authz, name: is_vip_customer }
```

## Decision ordering

Rules don't pick the decision on their own. The router picks the
first matching decision by `priority` (highest wins). With
`defaults.use_tiered_selection: true`, the router groups by `tier`
first, then by `priority` inside each tier.

To put a safety lane ahead of everything else, give it a much higher
`priority` (e.g. 1000) than the routine lanes (100-500).
