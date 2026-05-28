---
name: projections
description: Partitions, weighted-sum scores, and threshold-band mappings
version: 1
---

# Projections (Layer 2)

Projections derive additional facts from signal values that decisions
can branch on. All three sub-blocks are optional.

```yaml
projections:
  partitions: [ ... ]
  scores:     [ ... ]
  mappings:   [ ... ]
```

Every projection output (a partition member name, a mapping band
name, or a named score) becomes a referenceable leaf with
`type: projection` (see `rule-trees`).

## Partitions -- exclusive bucketing

A partition picks exactly one of N signals. Useful for intents or
domains where you want one winner.

```yaml
partitions:
  - name: intent
    semantics: exclusive            # exclusive | softmax_exclusive
    temperature: 1.0                # only used when semantics=softmax_exclusive
    members: [billing, support, sales]   # signal names -- >=1
    default: support                # optional fallback when nothing fires
```

- `semantics: exclusive` -- the winning member is the one whose signal
  fires (highest confidence breaks ties).
- `semantics: softmax_exclusive` -- softmax over member confidences with
  the given `temperature`; the argmax wins.
- Every member name in `members` MUST be a declared signal `name`.
- Reference a winner from a decision with
  `{ type: projection, name: billing }`.

## Scores -- weighted sum

A score blends multiple signals into a single number.

```yaml
scores:
  - name: risk_score
    method: weighted_sum            # only valid value
    inputs:                         # >=1
      - type: jailbreak
        name: jailbreak_attempt
        weight: 0.5
        value_source: confidence    # confidence | match  (default confidence)
        match: 1.0                  # value used when value_source=match and the signal fired
        miss: 0.0                   # value used when it didn't fire
```

- Each input must reference a declared signal by `type` + `name`.
- `weight` is a float (positive OR negative -- see the `difficulty_score`
  example in `full_example.yaml` for negative weights that pull
  cheap/fast-QA traffic down).
- `value_source: confidence` uses the signal's reported confidence
  (0..1). `value_source: match` uses `match` when it fired and `miss`
  when it didn't.
- A `score` can be referenced directly with
  `{ type: projection, name: risk_score }`, but more commonly it feeds
  into a `mapping`.

## Mappings -- threshold bands

A mapping turns a score into named bands. Each band name becomes a
referenceable leaf.

```yaml
mappings:
  - name: risk_band
    source: risk_score              # must be a declared score name
    method: threshold_bands         # only valid value
    calibration:                    # optional
      method: sigmoid_distance
      slope: 10
    outputs:                        # >=1 -- each needs >=1 of lt/lte/gt/gte
      - { name: risk_high,     gte: 0.7 }
      - { name: risk_elevated, lt: 0.7, gte: 0.3 }
      - { name: risk_low,      lt: 0.3 }
```

- `source` must be a declared score in `projections.scores`.
- Each `outputs[].name` becomes a `type: projection` leaf for
  decisions.
- Each output must have at least one of `lt` / `lte` / `gt` / `gte`.
  Combine two (e.g. `lt + gte`) for a closed band.
- `calibration` is optional. `sigmoid_distance` with a `slope`
  smooths the cutoff.

## Worked example -- risk gate

```yaml
projections:
  scores:
    - name: risk_score
      method: weighted_sum
      inputs:
        - { type: pii,        name: restricted_pii,     weight: 0.7 }
        - { type: jailbreak,  name: jailbreak_attempt,  weight: 0.7 }
        - type: keyword
          name: fraud_markers
          weight: 0.2
          value_source: confidence
  mappings:
    - name: risk_band
      source: risk_score
      method: threshold_bands
      outputs:
        - { name: risk_high, gte: 0.65 }
        - { name: risk_low,  lt: 0.65 }

decisions:
  - name: block_high_risk
    priority: 980
    rules: { type: projection, name: risk_high }
    model: cx/gpt-5.4
    plugins:
      - router_replay
```

## When to add projections

- The user describes a "risk score", a "composite signal", or "if A and
  B or 2 of 3 fire".
- You'd otherwise need a deeply-nested AND/OR/NOT tree referencing the
  same signals over and over.
- The user wants smooth thresholds rather than hard boolean cutoffs.

Don't add projections "just to have them". The minimal router has none.
