// Pre-built router templates the user can scaffold from. Each template
// is the YAML source verbatim — the page imports it through the same
// parseRouterYaml() path the file-picker uses.

export const TEMPLATES = [
  {
    key: "minimal",
    name: "Minimal — language split",
    description:
      "Routes Vietnamese to a cheap model, everything else to a default, with a daily cost cap. One signal, two routes.",
    yaml: `name: minimal-router
description: |
  Smallest useful router: language-aware Vietnamese/default split with
  a cost guardrail.

defaults:
  on_no_match: route_to_default

signals:
  - {name: lang_vi, type: language, config: {language: vi}}
  - {name: any, type: always}

decisions:
  - name: vi_route
    rules: {type: language, name: lang_vi}
    priority: 100
    model: claude-haiku-4-5

  - name: default
    rules: {type: always, name: any}
    priority: 0
    model: gpt-4o-mini

guardrails:
  daily_cost_cap_usd: 50
`,
  },
  {
    key: "full-pipeline",
    name: "Full pipeline — signals, projections, routes, models, plugins",
    description:
      "Demonstrates all 5 layers: language + complexity signals, a partition projection, math/reasoning routes with a model pool and hallucination guard.",
    yaml: `name: full-pipeline-router
description: |
  Full 5-layer router (new schema):
  - Signals: vi-language, math keywords, code blocks, catch-all
  - Decisions: math, code, vi, default
  - Models routed inline; plugins attached per-decision

defaults:
  on_no_match: route_to_default

signals:
  - {name: lang_vi, type: language, config: {language: vi}}
  - name: math_keywords
    type: keyword
    config:
      method: bm25
      keywords: [prove, theorem, integral, derivative, "square root", proof]
  - name: code_block
    type: structure
    config:
      rules:
        - name: has_code
          feature: {type: exists, source: {type: regex, pattern: "\`\`\`[\\\\w]*\\\\n"}}
          predicate: {gte: 1}
  - {name: any, type: always}

decisions:
  - name: math_route
    rules: {type: keyword, name: math_keywords}
    priority: 200
    model: qwen-math-turbo
    plugins:
      - type: system_prompt
        configuration: {system_prompt: "Provide a rigorous mathematical proof."}

  - name: code_route
    rules: {type: structure, name: code_block}
    priority: 150
    model: claude-sonnet-4-6

  - name: vi_route
    rules: {type: language, name: lang_vi}
    priority: 100
    model: claude-haiku-4-5

  - name: default
    rules: {type: always, name: any}
    priority: 0
    model: gpt-4o-mini

guardrails:
  daily_cost_cap_usd: 100

observability:
  log_decisions: true
`,
  },
];
