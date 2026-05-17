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
  - id: lang
    type: language_detector

routing:
  routes:
    - name: vi_route
      when:
        signal: lang
        equals: vi
      priority: 100
      model: claude-haiku-4-5

    - name: default
      when:
        always: true
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
  Full 5-layer router:
  - Signals: language, complexity, domain (MMLU)
  - Projection: request_difficulty (weighted sum) -> balance_reasoning bands
  - Routes: math_route (math domain + high difficulty), reasoning_route, default
  - Models: qwen-math (pooled), claude-opus-3, gpt-4o-mini
  - Plugins: semantic-cache, hallucination on math/reasoning routes

defaults:
  on_no_match: route_to_default
  fallback_chain:
    - claude-sonnet-4-6
    - gemini-2.5-flash

signals:
  - id: lang
    type: language_detector

  - id: complexity
    type: complexity_classifier
    config:
      threshold: 0.35
      easy_examples:
        - Hello, how are you?
        - What's the weather?
      medium_examples:
        - Explain photosynthesis
        - How do I reset my password?
      hard_examples:
        - Prove that there are infinitely many primes
        - Implement a red-black tree in Python

  - id: domain
    type: domain_mmlu
    config:
      threshold: 0.4
      extra_examples:
        mathematics:
          - Solve for x: 2x + 5 = 15
          - What is the derivative of x^2?

routing:
  scores:
    - name: request_difficulty
      inputs:
        - type: complexity
          name: hard
          weight: 0.5
        - type: domain
          name: mathematics
          weight: 0.5

  mappings:
    - name: balance_reasoning
      source: request_difficulty
      outputs:
        - name: low
          lt: 0.4
        - name: medium
          gte: 0.4
          lt: 0.7
        - name: high
          gte: 0.7

  models:
    - name: qwen-math
      model: qwen-math-turbo
      config:
        max_tokens: 4096

    - name: claude-opus
      model: claude-opus-3-5

    - name: fast-default
      model: gpt-4o-mini
      config:
        max_tokens: 2048

  routes:
    - name: math_route
      when:
        all:
          - signal: domain
            equals: mathematics
          - projection: balance_reasoning
            gte: 0.6
      priority: 200
      model: qwen-math
      plugins:
        - semantic_cache
        - hallucination

    - name: reasoning_route
      when:
        any:
          - projection: balance_reasoning
            gte: 0.7
          - signal: complexity
            equals: hard
      priority: 150
      model: claude-opus
      plugins:
        - semantic_cache
        - hallucination

    - name: default
      when:
        always: true
      priority: 0
      model: fast-default
      plugins:
        - semantic_cache

  plugins:
    - name: my_cache
      type: semantic_cache
      config:
        ttl_seconds: 3600
        similarity_threshold: 0.95

    - name: hallu_guard
      type: hallucination
      enabled: true
      config:
        provider: openai
        threshold: 0.7

guardrails:
  daily_cost_cap_usd: 100
  forbidden_models:
    - gpt-4
    - claude-3-5-sonnet-20240208
  pii_block_outbound: true

observability:
  log_decisions: true
  shadow: false
`,
  },
];
