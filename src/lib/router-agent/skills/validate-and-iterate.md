---
name: validate-and-iterate
description: What the JS validator checks, common pitfalls, fix recipes
version: 1
---

# Validate and Iterate

Always call `validate_router` before claiming a router is ready. The
JS shape validator is fast and catches the most common authoring
mistakes. Errors block; warnings are advisory.

## What the validator checks

1. **Top-level keys** are in the allowed set: `name`, `description`,
   `version`, `schema_version`, `created_at`, `created_by`,
   `created_by_method`, `defaults`, `signals`, `projections`,
   `decisions`, `guardrails`, `observability`. Anything else is an
   error.
2. **`name`** is required and matches `^[a-zA-Z_][a-zA-Z0-9_-]*$`.
3. **`signals[]`** if present:
   - `name` is required and matches `^[a-zA-Z_][a-zA-Z0-9_]*$`.
   - `type` is required and must be one of the 22 registered signal
     types.
   - `config` keys are NOT deep-validated by the JS shape validator;
     the full python validator does that on the server.
4. **`decisions[]`** if present:
   - `name` is required and matches `^[a-zA-Z_][a-zA-Z0-9_-]*$`.
   - `rules` is required (the rule tree is walked, see (5)).
   - Exactly one of `model` or `modelRefs` must be set (xor).
5. **Rule trees**:
   - Leaves: `name` resolves to a declared signal OR a projection
     output (partition member name, mapping band name, or score name).
     Leaf `type` matches either the signal's declared `type` or the
     literal string `projection`.
   - Composites: `operator` is one of `AND`, `OR`, `NOT`. `NOT` has
     exactly one child; `AND`/`OR` have at least one.
6. **`projections.partitions[]`**: `name` and `members[]` (length >=1)
   are required; members reference declared signals.
7. **`projections.scores[]`**: `name` required, `method: weighted_sum`,
   `inputs[]` non-empty, each input references a declared signal.
8. **`projections.mappings[]`**: `name` required, `source` references a
   declared score, each `outputs[]` has at least one of
   `lt`/`lte`/`gt`/`gte`.
9. **Plugins**: `type` is one of the 13 registered plugin types.
   `configuration` keys are NOT deep-validated by the JS shape
   validator.

## Output shape

```ts
{
  ok: boolean,
  errors: [{ path: string, message: string, code: string }],
  warnings: [{ path: string, message: string, code: string }],
}
```

`path` is a JSON-pointer-ish string like `decisions[2].rules.conditions[1].name`.
`code` is a short identifier the agent can branch on, e.g.:

- `unknown_signal_type` - `signals[i].type` not in the registry.
- `unresolved_leaf` - rule leaf `name` doesn't match any signal or
  projection output.
- `model_xor` - decision has both `model` and `modelRefs`, or neither.
- `not_arity` - `NOT` composite has zero or 2+ children.
- `bad_operator` - composite `operator` not in `{AND, OR, NOT}`.
- `unknown_plugin_type` - plugin `type` not in the registry.
- `unknown_top_key` - top-level key not in the allowed set.

## Common pitfalls (from ROUTER_YAML.md Sec. 13)

| Symptom | Cause / fix |
|---|---|
| `keyword_match: 'method' must be one of ('regex','bm25','ngram')` | Optional, defaults to 'regex'. Make sure you wrote one of regex/bm25/ngram. |
| `decision '...' must specify either 'model' or 'modelRefs'` | The decision has neither (or both). Exactly one is required. |
| `Extra inputs are not permitted` | A stray/typo'd key -- every block is `extra="forbid"`. Remove the unknown key. |
| `rule leaf references unknown signal name '...'` | The leaf `name` isn't a declared signal or projection output. Add the signal, or fix the typo. |
| `unknown type '...'` for a signal | The `type` isn't registered (one of the 22). Check spelling against `signal-reference`. |
| Signal silently always `False` | Its ML dependency isn't installed in the deployment -- install `.[ml]`, or the signal genuinely didn't fire. Not a config error. |
| Decision never selected | Another decision with higher `priority` matches first, or the rule tree never evaluates true. Drop priorities, or test the inputs. |

## Fix recipes

### model_xor
- A decision has both `model:` and `modelRefs:`. Pick one. If you want
  weighted selection across several models, drop the bare `model:` and
  keep `modelRefs:`. If you want a single fixed model, drop
  `modelRefs:` and keep `model:`.
- A decision has neither. Add `model: <name>` or a `modelRefs:` list.

### unresolved_leaf
- The leaf's `name` doesn't match any declared signal. Either add the
  signal under `signals:`, or change the leaf's `name` to one that
  exists.
- The leaf is `{type: projection, name: foo}` but `foo` is not a
  partition member, mapping band, or score. Declare `foo` under
  `projections` or rename the leaf.

### unknown_signal_type
- The `type` field is misspelled. Check `signal-reference` for the
  canonical 22 names.

### unknown_plugin_type
- The plugin `type` is misspelled. The 13 registered names are
  `fast_response`, `hallucination`, `header_mutation`, `image_gen`,
  `memory`, `rag`, `request_params`, `response_jailbreak`,
  `router_replay`, `semantic_cache`, `system_prompt`, `tool_selection`,
  `tools`.

### not_arity
- A `NOT` composite needs exactly one child in `conditions`. If you're
  excluding more than one signal, nest an `OR` inside the `NOT`:
  ```yaml
  operator: NOT
  conditions:
    - operator: OR
      conditions:
        - { type: jailbreak, name: jailbreak_attempt }
        - { type: pii,       name: restricted_pii }
  ```

## Iteration loop

1. Make a change with the smallest possible tool call (`update_decision`
   or `add_signal`, not `set_router_yaml`).
2. Call `validate_router` immediately.
3. If `ok: false`, branch on `errors[].code` and apply the matching
   fix recipe above.
4. Repeat. Don't pile up edits; validate after each one.

## Warnings

Warnings don't block deployment but are worth surfacing to the user:

- `unreferenced_signal` - a signal is declared but no decision rule or
  projection input references it. Either delete it or wire it up.
- `unreachable_decision` - a lower-priority decision has the same rule
  tree as a higher-priority one and will never be selected.

## Known limitations

- Comments in YAML are NOT preserved across agent edits. Any tool that mutates
  the router (add_signal, add_decision, update_decision, delete_node,
  set_router_yaml) re-emits the YAML without comments. If the user adds
  comments via the Monaco editor, warn them that the next agent edit will
  drop them.
