---
name: examples
description: Pointers to the four worked example routers
version: 1
---

# Example Routers

Four worked examples live in `router_service/` (and the source folder
they were authored in). Each demonstrates a different point along the
complexity curve. Use them as starting templates when the user's
description maps to one of these audiences. Do NOT paste the full
example YAML into the router -- copy the structural ideas and adapt.

## minimal_example

**Use when:** the user wants the smallest viable router -- split traffic
by one signal, fall through for the rest.

**Demonstrates:**
- Top-level structure with only `name`, `defaults`, `signals`,
  `decisions`, `guardrails`.
- One `language` signal (`is_vietnamese`, `language: vi`).
- One decision routing Vi traffic to `claude-haiku-4-5`; everything
  else falls through to `defaults.on_no_match: route_to_default`.
- One `guardrails.daily_cost_cap_usd` for safety.

About 40 lines of YAML. The right starting point when the user's first
ask is "route X to model A, everything else to model B".

## banking_vn_example

**Use when:** the user is building a customer-service-style router with
safety blocks, role-gated VIP/escalation lanes, an embedding-based
intent taxonomy, and tiered cost control.

**Demonstrates:**
- Six embedding-based intent clusters
  (`complaint_intent`, `transfer_request`, `loan_inquiry`,
  `card_issue`, `account_inquiry`, `fraud_report`) with
  `enable_soft_matching: false` to avoid cross-firing.
- bm25 keyword backstops (`urgent_markers`, `fraud_markers`,
  `legal_markers`).
- Safety stack: `pii`, `jailbreak`, `fact_check` signals plus the
  matching tier-0 block decisions.
- Role gates: `authz` for VIP customers, `time_of_day` for after-hours.
- A `risk_score` + `risk_band` projection driving a composite
  high-risk block decision.
- Tiered priorities (`tier` 0..6) with safety lanes at `priority: 1000`
  down to `english_passthrough` at `priority: 90`.

About 650 lines. The right starting point for a multi-tier
customer-service router on a single model family.

## coding_agent_example

**Use when:** the user is building a coding-agent router that gates on
agentic vs one-shot, seniority, and incident severity.

**Demonstrates:**
- Six embedding intents covering coding workflows
  (`code_review`, `architecture_design`, `bug_fix`, `refactor`,
  `test_generation`, `documentation`).
- `domain` signals for MMLU-style domain gates
  (`domain_computer_science`, `domain_engineering`, `domain_math`).
- `conversation` signals (`has_tools_defined`, `long_agentic_loop`)
  for agentic detection.
- `authz` for senior / oncall engineer gating.
- `complexity` for hard-engineering escalation.
- A premium incident lane using `router_replay` + `tool_selection`.
- A senior-engineer lane using a `modelRefs` list with a
  `confidence` algorithm (per-model `signals:` weighting).

About 725 lines. The right starting point for a developer-tooling
router.

## education_vn_example

**Use when:** the user is building a tutoring router with kid-safe
guardrails, role-based escalation (student vs teacher vs parent),
diagram generation, and an "auto" hybrid pattern.

**Demonstrates:**
- Six embedding intents
  (`homework_help`, `concept_explanation`, `essay_review`,
  `practice_questions`, `exam_prep`, `parent_inquiry`).
- `modality: image_generation_intent` paired with a Vi keyword
  backstop (`image_keyword_vi`) for diagram requests, routed via the
  `image_gen` plugin.
- `authz` for teacher and young-student segmentation.
- A school-hours `time_of_day` signal driving a "history during
  school hours" hybrid decision.
- The "Auto (Gemini 2.5)" pattern: a `modelRefs` list with
  `algorithm: confidence` picking between `gemini-2.5-pro` and
  `gemini-2.5-flash` per task.

About 640 lines. The right starting point for an ed-tech tutoring
router with strong safety + role gating.

## When in doubt

- Don't start from `full_example.yaml` (~2500 lines, 68 signals, 14
  decisions). It's a translation reference, not a template.
- Start from the example whose audience most closely matches the
  user's description, copy the structural ideas (which signals to add,
  how to tier priorities, which plugins to pair), and write your own
  values.
- Always validate after adapting.
