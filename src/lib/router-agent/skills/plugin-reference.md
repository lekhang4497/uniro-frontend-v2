---
name: plugin-reference
description: All 13 plugin types with configuration shapes
version: 1
---

# Plugin Reference

Plugins run on the chosen decision (Layer 5). Pre-plugins may rewrite,
reject, or short-circuit a request before dispatch; post-plugins run on
the caller side after the provider responds.

Two forms are valid:

```yaml
plugins:
  - router_replay                          # bare string
  - type: system_prompt                    # object with configuration
    configuration:
      prompt: "You are a careful banking assistant."
```

A bare string is shorthand for `{type: <string>, configuration: {}}`.

The **same plugin type may appear on different decisions with different
`configuration`** -- plugin config is per-decision.

## Registered plugin types (13)

### fast_response
Short-circuit the request with a canned reply. Use it on safety blocks.
```yaml
- type: fast_response
  configuration:
    message: "Sorry, this request is not allowed."
    status_code: 200
```

### system_prompt
Inject (or replace) the system prompt for the chosen decision.
```yaml
- type: system_prompt
  configuration:
    prompt: "You are a senior staff architect. Surface tradeoffs explicitly."
```

### semantic_cache
Cache responses by semantic similarity to recent prompts.
```yaml
- type: semantic_cache
  configuration:
    ttl_seconds: 1800
    similarity_threshold: 0.92
```

### router_replay
Record the request/response for postmortem replay. Common on premium
lanes that touch incidents, fraud, or legal work.
```yaml
- type: router_replay
  configuration:
    capture_request_body: true
    capture_response_body: true
    enabled: true
    max_body_bytes: 4096
    max_records: 100000
```

### hallucination
Post-response hallucination/quality check.
```yaml
- hallucination
```

### response_jailbreak
Post-response jailbreak detector -- flags model output that complied with
an injected directive.
```yaml
- response_jailbreak
```

### tool_selection
Cap or re-rank the tool list passed to the model. Use on agentic lanes.
```yaml
- type: tool_selection
  configuration:
    max_tools: 12
    strategy: relevance
```

### tools
Inject a fixed tool set into the request. See ROUTER_YAML.md Sec. 8 for
the full configuration shape.

### rag
Retrieval-augmented generation against a configured KB collection.
```yaml
- type: rag
  configuration:
    collection: bank_policy_vn
    top_k: 6
    score_threshold: 0.55
```

### memory
Conversation-memory plugin (read/write a persistent memory store).
See ROUTER_YAML.md Sec. 8.

### image_gen
Image-generation overlay -- route diagram/illustration requests through
an image plugin. Use with the `modality` signal or a keyword backstop.
```yaml
- type: image_gen
  configuration:
    style: educational_diagram
    max_images: 2
```

### header_mutation
Mutate request/response headers before/after dispatch. See ROUTER_YAML.md
Sec. 8.

### request_params
Override request parameters (temperature, top_p, max_tokens, etc.) for
this decision's lane. See ROUTER_YAML.md Sec. 8.

## Picking plugins

- **Block lanes** (jailbreak / PII / secret_leak): always include
  `fast_response` so the request never reaches a model.
- **Premium / incident lanes**: pair with `router_replay` (capture
  request + response) so you can postmortem.
- **Cache-eligible lanes** (FAQ, transfer how-to): add `semantic_cache`
  with a high threshold (0.9+) so semantically-similar prompts hit.
- **Agentic lanes** (`has_tools_defined` true): add `tool_selection`
  with a `max_tools` cap so the model doesn't drown in tool defs.
- **Policy / legal / regulated lanes**: add `rag` over the policy
  collection plus `hallucination` post-check.
- **Voice / persona overlays**: add `system_prompt` with the persona
  text. Keep it short -- long system prompts dilute the agent.
- **Diagram / illustration lanes**: add `image_gen` triggered by the
  `modality` signal OR a Vietnamese/non-English keyword backstop.

## PII safety constraint

If `guardrails.pii_block_outbound: true`, every decision routing to a
cloud model MUST include the `pii_redact` plugin. (See `guardrails`
skill.)
