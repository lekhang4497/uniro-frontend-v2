# Router Builder Agent — Design Spec

**Date:** 2026-05-27
**Status:** Draft, brainstorm phase
**Owner:** TBD
**Scope:** `uniro-frontend-v2` (this repo). No changes to `router_service/` for the agent-first MVP.

---

## 1. Problem

The router-builder canvas (`src/app/(dashboard)/dashboard/router-builder/page.js`) is a UI prototype: 7 simple node kinds, in-memory state only, no persistence, no YAML, no validation. Meanwhile the real router YAML schema (see `router_service/ROUTER_YAML.md`) is much richer — 22 signal types, projections (partitions/scores/mappings), recursive AND/OR/NOT rule trees, 13 plugin types, guardrails, decision tiers, weighted model refs. The gap means a non-expert user can't meaningfully author a router today, and even after the canvas is extended the cognitive load of the schema will be high.

This spec covers an **AI agent** embedded in the router-builder page that turns a natural-language description into a validated router YAML, asks clarifying questions, applies changes through a typed tool surface, and supports ongoing edits over a persistent per-router conversation thread.

## 2. Scope

### In scope
- A conversational agent in the right-side dock of the router-builder page.
- Authoring routers across the full router YAML schema as a YAML document.
- A hybrid tool surface (full-document `set_router_yaml` + discrete schema-level edits).
- Anthropic-style progressive-disclosure skills (markdown files in the repo, loaded on demand via a tool).
- Per-router conversation persistence (DB-backed).
- A shape-only JS validator that runs in the browser (top-level keys, required fields, signal/plugin/rule-leaf name/type resolution, `model` vs `modelRefs` xor).
- Minimal `routers` table so the agent has a stable router-id to anchor against.
- A Monaco YAML view alongside the canvas so users can read/edit YAML directly.
- Functional undo/redo (the canvas toolbar buttons are stubs today).
- Agent settings (which "reasoning model" alias the agent uses).

### Out of scope (follow-up projects)
- **Canvas extension** for the full YAML schema (React Flow nodes + property panels for all 22 signal types, all 13 plugins, projection blocks, rule-tree composites, guardrails). In this MVP the canvas renders what it can today and falls back to a generic placeholder card for unsupported node kinds — full schema rendering arrives later.
- **Canvas → YAML writeback** for structural changes (drag/drop/connect/delete). In this MVP structural changes happen through the agent or the Monaco YAML view; the properties panel patches scalar fields only.
- **Full-parity validator** matching `uniro_router/validator.py` (per-signal config-key validation, per-plugin config-key validation, cost cap, PII safety constraint, calibration math). Deferred to a separate spec.
- **Multi-router workspace** (list view, create/duplicate/delete UI, sharing, version history). The MVP assumes one implicit router per browser session; we provision a default `routers` row at first load and use it.
- **Agent observability dashboard** (per-conversation cost, token usage, tool-call traces) beyond basic console logging.
- **Router service changes.** No `/v1/validate` endpoint, no schema endpoint, no new dependency on the router service for the agent to function.

## 3. Key decisions (with rationale)

| # | Decision | Rationale |
|---|---|---|
| 1 | Agent-first scope; canvas extension is a follow-up. | Canvas extension is the largest chunk and is independent of the agent's value prop. The agent unlocks non-expert authoring even with a partial canvas. |
| 2 | Agent produces full router YAML schema. | The agent's value collapses if it can't express the things users will actually ask for (PII, fallback chains, language routing, etc.). Constraining output to canvas-only would gut it. |
| 3 | LLM is the user's own `/v1/chat/completions` ("dogfood"). | Zero new dependencies, works identically in self-hosted and connected modes, costs flow through the user's existing provider configuration. The user picks a "reasoning model" alias in agent settings. |
| 4 | Hybrid tool surface (`set_router_yaml` + discrete ops). | `set_router_yaml` handles "build from scratch" cleanly; discrete tools (`add_signal`, `update_decision`, etc.) keep iterative edits token-efficient and give per-call attribution for undo/redo. |
| 5 | Anthropic-style progressive-disclosure skills. | Skill index lives in the system prompt; skill bodies (one per topic) load on demand. Lets the skill catalog evolve without redeploys and keeps context lean. |
| 6 | Chat lives in a right-side dock panel. | Keeps the canvas visible. Three tabs in the dock (Chat / YAML / Properties) share one panel slot. |
| 7 | Persistent per-router conversation threads. | "Come back tomorrow and continue" works. Requires a `router_agent_threads` table keyed by `router_id`. |
| 8 | Shape-only JS validation now; full parity later. | Catches the agent's most common mistakes (missing required fields, bad refs, model xor) without committing to a full pydantic-to-JS port. Drift risk stays scoped to the shape surface, not the entire registry. |
| 9 | Auto-apply with undo. | Best feel for a conversational agent. Requires implementing the undo/redo stack the toolbar already promises. |
| 10 | Hybrid architecture: client-side agent loop + small server endpoints. | Client runs the loop and executes tools (which all touch canvas/YAML state). Server provides skill content, thread persistence, and router persistence. Avoids bidirectional state sync. |
| 11 | Canvas read-only structurally + property-panel scalar patches. | Until the round-trip follow-up ships, structural edits must go through agent or Monaco view. Property-panel scalar tweaks (model name, RPM, etc.) patch YAML targeted-mutation style. |

## 4. Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│ Browser — /dashboard/router-builder                                 │
│                                                                     │
│  ┌──────────────┐    ┌──────────────────────┐    ┌──────────────┐  │
│  │   Canvas     │    │  Right dock          │    │ Agent loop   │  │
│  │ (React Flow) │◄──►│  ┌────────────────┐  │◄──►│ (client-side)│  │
│  │  renders     │    │  │ Chat / YAML /  │  │    │ ─ tool exec  │  │
│  │  from YAML   │    │  │ Properties     │  │    │ ─ skill load │  │
│  └──────────────┘    │  └────────────────┘  │    │ ─ validate   │  │
│         ▲            └──────────────────────┘    └──────┬───────┘  │
│         │                       ▲                       │           │
│         └──────── YAML state (zustand) ─────────────────┘           │
│                                  ▲                                  │
│                                  │ JS shape validator               │
│                                  ▼                                  │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ /api/v1/chat/completions  ◄── existing OpenAI-compatible gateway │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ /api/router-agent/manifest        — skill index               │   │
│  │ /api/router-agent/skills/[name]   — skill body               │   │
│  │ /api/router-agent/threads/[id]    — thread CRUD              │   │
│  │ /api/routers, /api/routers/[id]   — minimal router CRUD      │   │
│  │ /api/agent-settings               — reasoning model, etc.    │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                  │                                  │
│                                  ▼                                  │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ src/lib/db (existing driver chain: bun:sqlite/better/node/sql.js)│
│  │  + routers table                                              │   │
│  │  + router_agent_threads table                                 │   │
│  │  + agent_settings rows (in existing settings table or new)    │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  src/lib/router-agent/skills/*.md   — skill markdown on disk        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Source of truth.** YAML, held in a zustand store. The canvas is rendered from the YAML; the property panel patches YAML; the agent's tools mutate YAML; the Monaco view edits YAML directly. Persistence saves YAML.

**Why client-side agent loop.** Every tool (`set_router_yaml`, `add_signal`, `update_decision`, `validate_router`, `get_router`) operates on browser-side YAML state. A server-side loop would need bidirectional messaging on every tool call to read or mutate canvas state — pure overhead for no security gain (the LLM call already streams through the same browser-served `/v1` path).

**Why small server endpoints.** Skill bodies don't belong in the JS bundle (size + iteration speed). Threads and routers need durable storage. Agent settings need to persist across reloads.

## 5. Data model

Migrations live under `src/lib/db/migrations/`. Accessed through `src/lib/db/repos/` (one repo per table).

```sql
-- 0NN_routers.sql
CREATE TABLE IF NOT EXISTS routers (
  id TEXT PRIMARY KEY,                -- uuid
  name TEXT NOT NULL DEFAULT 'Untitled router',
  yaml TEXT NOT NULL DEFAULT '',      -- full YAML document
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 0NN_router_agent_threads.sql
CREATE TABLE IF NOT EXISTS router_agent_threads (
  router_id TEXT PRIMARY KEY REFERENCES routers(id) ON DELETE CASCADE,
  -- OpenAI-shaped message array: [{role, content, tool_calls?, tool_call_id?, ...}, ...]
  messages_json TEXT NOT NULL DEFAULT '[]',
  updated_at INTEGER NOT NULL
);
```

Agent settings reuse the existing settings repo if there is one; otherwise add a small table:

```sql
-- 0NN_agent_settings.sql
CREATE TABLE IF NOT EXISTS agent_settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
```

Implementation must check whether `src/lib/db/repos/settingsRepo.js` already exists and prefer reuse.

**Single implicit router for MVP.** On first load of `/dashboard/router-builder`, if no router exists for the active user, the server creates a default row and returns its id. The client treats that id as the active router. Multi-router workspace is the follow-up persistence project.

## 6. Agent loop and tools

### 6.1 Tool surface

8 tools, all executed in the browser, all OpenAI-compatible tool definitions:

| Tool | Signature | Purpose |
|---|---|---|
| `get_router` | `() → {yaml, summary, validation}` | Returns current YAML, a short structural summary, and the latest validation status. |
| `set_router_yaml` | `(yaml: string) → {ok, validation, summary}` | Replace the whole YAML. Runs the JS validator, applies on success (or applies with warnings + errors flagged on failure). Pushes an undo entry. |
| `add_signal` | `(name: string, type: string, config?: object) → {ok, validation}` | Append a signal block. |
| `add_decision` | `(name: string, priority?: number, rules: object, model?: string, modelRefs?: array, plugins?: array) → {ok, validation}` | Append a decision block. |
| `update_decision` | `(name: string, patch: object) → {ok, validation}` | Shallow-merge patch onto an existing decision (or rewrite rules/plugins explicitly). |
| `delete_node` | `(kind: "signal" \| "decision" \| "projection", name: string) → {ok}` | Remove a node by kind+name. Refuses if removal would orphan referenced rule leaves; returns a structured error the agent can act on. |
| `validate_router` | `(yaml?: string) → {ok, errors, warnings}` | Runs the JS shape validator (against current YAML by default). |
| `load_skill` | `(name: string) → {body}` | Returns the markdown body of a skill by name. |

Tool results are normal OpenAI tool messages (JSON-stringified `content`). On validator failure, the tool **still mutates state** (so undo can recover the failed state if the agent wants to fix in place) but flags `ok: false` with structured errors — the agent is expected to iterate.

### 6.2 Loop algorithm

```
while True:
  response = stream openai /v1/chat/completions with {messages, tools, model}
  push assistant message to thread
  if response has no tool_calls: break
  for each tool_call (up to MAX_TOOLS_PER_TURN = 8):
    execute tool, push tool result message to thread
  if loop iterations > MAX_TURNS_PER_USER_MSG (= 12): break with cautionary note
persist thread (incrementally)
```

Stream text to the UI as it arrives. Tool calls are not rendered partially — they appear as cards after the assistant message parses fully.

**Persistence timing.** The user message persists to `router_agent_threads` *before* the LLM call so a refresh mid-stream still shows the question. Each assistant turn (assistant message + its tool results) persists atomically once the turn completes. Partial mid-stream assistant text is held in memory only.

**Harness choice.** A hand-rolled loop (~150 lines), not Vercel AI SDK and not Claude Agent SDK. Rationale: the loop is small, talks the same OpenAI shape the rest of the app already speaks, and dropping a heavy SDK keeps the bundle lean and the surface easy to debug. The tradeoff is no built-in helpers for things like message normalization across providers — acceptable because the LLM call always goes through Uniro's own `/v1`, which normalizes upstream provider quirks already.

### 6.3 LLM call

The frontend calls its own `/api/v1/chat/completions` (the `/v1/*` rewrite is already in place). Request body:

```js
{
  model: agentSettings.reasoning_model,   // user-configured alias
  messages: [...threadMessages, {role: "user", content: userInput}],
  tools: TOOL_DEFINITIONS,                // OpenAI tool-call shape
  stream: true,
  // No other special params — we use the user's existing routing.
}
```

If `agentSettings.reasoning_model` is unset, the agent panel shows a banner: "Pick a reasoning model in Settings before chatting." No call is made.

### 6.4 Context discipline

System prompt structure (kept under ~1k tokens):

```
You are the UniRo Router Builder agent. You help users design routers from
plain-English descriptions of their routing needs.

CURRENT ROUTER STATE:
  router_id: {id}
  yaml_chars: {n}                       — full YAML available via get_router()
  yaml_summary: {n} signals, {n} decisions, {n} plugins, {n} projections
  validation: {ok | "N errors"}

AVAILABLE SKILLS (call load_skill(name) for the body):
  - understand-router
  - build-router-basics
  - signal-reference        — 22 signal types and their config shapes
  - plugin-reference        — 13 plugin types
  - rule-trees              — composing AND/OR/NOT trees and leaf references
  - projections             — partitions, scores, mappings
  - guardrails              — cost caps, PII safety, forbidden models
  - validate-and-iterate    — validator semantics, common errors, fix recipes
  - examples                — pointers to banking_vn / coding_agent / education_vn

TOOLS: get_router, set_router_yaml, validate_router, add_signal, add_decision,
  update_decision, delete_node, load_skill.

RULES:
  1. Validate the YAML before claiming the router is ready.
  2. Ask clarifying questions when intent is unclear. Examples: default model?
     target languages? failure behavior? cost ceiling?
  3. Prefer minimal additions — only add complexity (projections, plugins,
     guardrails) when the user describes a need that requires it.
  4. Load the relevant skill before authoring something you don't recognize.
  5. When you change the router, summarize what changed in one short sentence.
```

The full YAML is **not** auto-injected. The agent calls `get_router()` when it needs the current state. The system prompt contains a structural summary (counts only), which is cheap to recompute on every turn.

## 7. Skills system

### 7.1 File layout

```
src/lib/router-agent/skills/
  understand-router.md
  build-router-basics.md
  signal-reference.md
  plugin-reference.md
  rule-trees.md
  projections.md
  guardrails.md
  validate-and-iterate.md
  examples.md
```

### 7.2 Format

Frontmatter + body, ASCII-only Markdown:

```markdown
---
name: signal-reference
description: Catalog of all 22 signal types and their config shapes
version: 1
---

# Signal Reference

Each signal in `signals:` has `name`, `type`, optional `version` and `timeout_ms`,
and a `config` block whose shape depends on `type`.

## keyword
... (config keys, examples)

## language
...
```

The body is plain Markdown. The agent treats it as authoritative reference; rules in skill bodies override the system prompt rules where they conflict.

### 7.3 Initial catalog (v1)

| Skill | Contents (approx) |
|---|---|
| `understand-router` | How to read a router YAML, what each top-level block does, the 5-layer pipeline overview. |
| `build-router-basics` | Minimum viable router (1 signal + 1 decision). Step-by-step recipe + the minimal_example.yaml. |
| `signal-reference` | All 22 signal types, required config keys, common values. Mirrors §4.1–4.2 of ROUTER_YAML.md. |
| `plugin-reference` | All 13 plugin types, their `configuration` shapes, when to use each. Mirrors §8. |
| `rule-trees` | AND/OR/NOT composites, leaf references, what `type: projection` means in a leaf. Mirrors §7. |
| `projections` | Partitions, scores, mappings; how a mapping band becomes a referenceable leaf. Mirrors §5. |
| `guardrails` | Cost cap, forbidden models, PII outbound block, observability flags. Mirrors §9–10. |
| `validate-and-iterate` | Validator semantics, the §13 "common pitfalls" table, fix recipes. |
| `examples` | The four example routers in `router_service/`: `minimal_example.yaml`, `banking_vn_example.yaml`, `coding_agent_example.yaml`, `education_vn_example.yaml`. Short summary of each + when to use as a template. |

Skill content is **derived from `router_service/ROUTER_YAML.md` and the example YAMLs**. A skill must not invent things the schema doesn't support. When the router service grows a new signal type, the skill is updated (manual step; tracked as a follow-up item to automate).

### 7.4 Manifest endpoint

`GET /api/router-agent/manifest` returns:

```json
{
  "version": "2026-05-27",
  "skills": [
    {"name": "understand-router", "description": "...", "version": 1},
    ...
  ]
}
```

`GET /api/router-agent/skills/[name]` returns the markdown body as `text/markdown`.

Both endpoints read from `src/lib/router-agent/skills/` at request time (no bundling). Cache-busting is via the manifest `version` field.

## 8. JS shape validator

Location: `src/lib/router-agent/validator/` (pure functions, no DOM, no Next).

### 8.1 What it checks

1. Top-level keys are in the allowed set (`name`, `description`, `version`, `schema_version`, `created_at`, `created_by`, `created_by_method`, `defaults`, `signals`, `projections`, `decisions`, `guardrails`, `observability`). Unknown keys produce an error.
2. `name` is required and matches `^[a-zA-Z_][a-zA-Z0-9_-]*$`.
3. `signals[]` if present:
   - `name` (required, regex)
   - `type` (required, must be in REGISTERED_SIGNALS — a hand-maintained list of the 22 types from ROUTER_YAML.md §4.1)
   - Does not validate `config` keys (deferred to full parity).
4. `decisions[]` if present:
   - `name` (required, regex)
   - `rules` required (walks the tree, see (5))
   - Exactly one of `model` or `modelRefs` (xor)
5. Rule trees:
   - Leaves: `name` resolves to a declared signal or a projection output (partition member name or mapping band name); `type` matches either the signal's declared `type` or the literal string `projection`.
   - Composites: `operator` ∈ `{AND, OR, NOT}`; `NOT` has exactly one child; `AND`/`OR` have ≥1 children.
6. `projections.partitions[]`: required `name`, `members[]` (≥1), members reference declared signals.
7. `projections.scores[]`: required `name`, `method: weighted_sum`, `inputs[]` (≥1) referencing declared signals.
8. `projections.mappings[]`: required `name`, `source` references a declared score, `outputs[]` each have at least one of `lt`/`lte`/`gt`/`gte`.
9. Plugins: `type` is in REGISTERED_PLUGINS (the 13 types). Doesn't validate `configuration` keys.

### 8.2 Output

```ts
type ValidationResult = {
  ok: boolean,
  errors: Array<{path: string, message: string, code: string}>,
  warnings: Array<{path: string, message: string, code: string}>,
}
```

`path` is a JSON pointer ("decisions[2].rules.conditions[1].name"). `code` is a short identifier the agent can branch on (`unknown_signal_type`, `unresolved_leaf`, `model_xor`, etc.).

### 8.3 Drift management

`REGISTERED_SIGNALS` and `REGISTERED_PLUGINS` are hand-maintained constants in `src/lib/router-agent/validator/registries.js`, with a doc comment pointing at `router_service/uniro_router/signals/__init__.py` and `router_service/uniro_router/plugins/__init__.py`. A follow-up should add a CI check that diffs the JS constants against a generated list from the Python source.

## 9. UI

### 9.1 Layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ← Router name [Draft]                      Tools  Settings   [Publish]   │
├──────────┬───────────────────────────────┬───────────────────────────────┤
│ Palette  │                               │  ┌─ Chat | YAML | Props ──┐   │
│ (read-   │                               │  │                        │   │
│  only*)  │   React Flow canvas           │  │  active tab body       │   │
│          │   (renders from YAML;         │  │                        │   │
│          │    unsupported nodes show     │  │                        │   │
│          │    as generic placeholders)   │  │                        │   │
│          │                               │  │                        │   │
│          │                               │  │                        │   │
│          │                               │  └────────────────────────┘   │
├──────────┴───────────────────────────────┴───────────────────────────────┤
│                  pan  select   |   undo  redo   |   Last edit by Agent — Undo │
└──────────────────────────────────────────────────────────────────────────┘
```

*The palette stays visible but its items are not draggable in this MVP — they're an inventory of what the agent or YAML view can introduce.

### 9.2 Right dock

A single fixed-width panel (resizable in a later iteration) with three tabs:

- **Chat** — conversation thread. Streams assistant text token-by-token. Tool calls render as compact cards (`add_signal lang_vi`, with collapsible details for arguments and result). At the bottom: a single composer textarea. On first use with no router content, the panel shows 3-5 suggested prompts ("Build a fallback chain", "Route by language", "Add a PII guard to the cloud path", etc.).
- **YAML** — Monaco editor showing the current YAML. Editable; "Save" button writes to the YAML state (and through to persistence) and pushes an undo entry. Disabled (read-only) while a tool call is in flight.
- **Properties** — auto-selected when a canvas node is clicked. Read-only for unsupported node kinds; for supported kinds (model name, RPM, etc.) it patches YAML in place.

Tabs switch automatically: clicking a canvas node jumps to Properties; clicking in the chat composer jumps to Chat. Manual switching with tab labels also works.

### 9.3 Undo / redo

A stack of YAML snapshots (max 50 entries). Every YAML mutation — agent tool call, Monaco "Save", property-panel patch — pushes a snapshot with `{actor: "user"|"agent", description: string, timestamp}`. Cmd/Ctrl+Z and the toolbar buttons pop. A small toast "Last edit by Agent — Undo" appears for 5s after each agent edit.

Undo/redo state is in-page only (not persisted). On reload, the thread restores from DB and the YAML restores from the routers table, but undo history starts fresh.

### 9.4 Settings

Reachable from the existing `Settings` button in the header. Shows:

- **Reasoning model.** Dropdown of model aliases from the user's configured providers/combos. Empty list message: "Configure a provider first." Selecting one writes to `agent_settings`.
- **Reset thread for this router.** Destructive button under a confirm dialog. Deletes the row in `router_agent_threads` for this router.

## 10. Self-hosted vs connected mode

Both modes use the same code paths. Differences:

| Concern | Self-hosted | Connected |
|---|---|---|
| LLM call | Routes through user's own `/v1` → their configured providers. | Same. (`UNIRO_CONNECTED_MODE` flag doesn't change the agent's behavior.) |
| Persistence | SQLite via existing driver chain. | Same SQLite layer. Multi-tenant scoping is the follow-up persistence project's concern. |
| Validation | JS shape validator runs in-browser; no external call. | Same. |
| Skills | Served from local filesystem. | Same. |

There is no degraded mode: if the user has not configured a model, the agent shows a banner and refuses to call. If the LLM call returns a network error, the loop surfaces it in the chat as a system message and lets the user retry. If a tool execution throws, the agent gets a structured error message back and is expected to recover.

## 11. Error handling

| Failure | Behavior |
|---|---|
| `reasoning_model` not set | Chat panel shows a banner: "Pick a reasoning model in Settings before chatting." Composer disabled. |
| LLM call fails (network / 5xx) | System message in the chat: "Connection to your reasoning model failed: <reason>. Retry." Retry button re-runs the last user turn. |
| LLM returns malformed tool call | Loop pushes a `{role: "tool", content: "tool call malformed: <details>"}` and continues. Agent is expected to retry. |
| Tool execution throws | Tool result `{ok: false, error: {code, message}}` is pushed; agent sees structured error and is expected to recover. Never crashes the loop. |
| Validator finds errors | Result returned to agent; YAML state still updated so undo can recover. Chat shows an `errors` chip on the tool-call card. |
| Tool call count exceeds `MAX_TOOLS_PER_TURN` (8) | Loop stops, system message: "Agent exceeded tool call budget. Stopping." User can resume. |
| Turn count exceeds `MAX_TURNS_PER_USER_MSG` (12) | Same shape as above. |
| Thread persistence fails | Toast: "Couldn't save conversation: <reason>." Conversation stays in memory. |

## 12. Testing

### 12.1 Unit (vitest, under `tests/unit/`)

- **Validator** — fixture-driven: for each example YAML in `router_service/` (minimal, banking_vn, coding_agent, education_vn), JS validator returns `ok: true` modulo known-deferred semantic errors. For a corpus of synthesized bad YAMLs (unknown signal type, dangling rule leaf, both `model` and `modelRefs`, etc.), validator returns the expected `code`.
- **Tool execution** — given a starting YAML state and a tool call, the result matches the expected new state. Cover each tool's success path + at least one failure path.
- **Skill manifest** — manifest lists every file in `src/lib/router-agent/skills/` and the body endpoint returns each correctly.
- **Agent loop** — with a stub LLM that returns a fixed sequence of tool calls, the loop executes them in order, persists messages, respects budgets, and stops cleanly.

### 12.2 Manual end-to-end checklist

Live in the spec; copy into a PR checklist on implementation:

- [ ] Empty router → "Build a fallback chain for cheap-then-strong" → agent asks for the providers, then produces a valid YAML; canvas renders what it can.
- [ ] "Add a PII guard before any cloud model" — agent loads `plugin-reference`, edits decisions in place.
- [ ] "Route Vietnamese to gemini, English to gpt-4o-mini" — produces two-decision router with `language` signals; validator clean.
- [ ] Set an unknown signal type via YAML view → validator surfaces error; agent prompted to fix → fixes it.
- [ ] Refresh the page mid-conversation → thread restored, YAML restored, undo history cleared.
- [ ] No reasoning model set → banner appears; chat disabled.
- [ ] Click Undo after an agent edit → YAML rolls back; canvas re-renders.
- [ ] Reset thread → confirm dialog → thread cleared, YAML preserved.

## 13. Implementation plan

Six phases. Each is roughly 1–2 days of focused work.

### Phase 1 — Backend foundations
- Migrations: `routers`, `router_agent_threads`. Decide on agent settings reuse vs. new table.
- Repos: `routerRepo`, `routerAgentThreadRepo`, agent-settings access.
- API routes: `/api/routers`, `/api/routers/[id]`, `/api/router-agent/threads/[id]`, `/api/agent-settings`.
- Provision-default-router behavior on first visit.
- No UI yet.

### Phase 2 — Skills + manifest endpoint
- Create `src/lib/router-agent/skills/` with all 9 skill markdown files (content derived from `router_service/ROUTER_YAML.md` and the example YAMLs).
- `GET /api/router-agent/manifest`, `GET /api/router-agent/skills/[name]`.
- Unit tests: manifest enumerates every file; body endpoint returns text.

### Phase 3 — JS shape validator
- `src/lib/router-agent/validator/`: pure functions, `registries.js`, output type, JSON-pointer paths.
- Fixture tests against `router_service/` example YAMLs and a synthesized bad-YAML corpus.

### Phase 4 — Agent loop + tools
- `src/lib/router-agent/tools/`: one file per tool, each exporting `{definition, execute}`.
- `src/lib/router-agent/agent.js`: the loop. Streaming via `fetch` to `/api/v1/chat/completions`, response stream parsing.
- `src/hooks/useRouterAgent.js`: React hook that exposes `messages`, `send`, `cancel`, plus a YAML store.
- Unit tests with a stub LLM.

### Phase 5 — UI integration
- Refactor `router-builder/page.js` into smaller modules: `page.js` shell + `components/Builder.jsx`, `components/Palette.jsx`, `components/Canvas.jsx`, `components/RightDock.jsx`, `components/AgentChat.jsx`, `components/YamlView.jsx`, `components/PropertiesPanel.jsx`, `hooks/useRouterState.js`.
- Add right-side dock with three tabs.
- Wire YAML state via zustand: canvas renders from YAML, properties panel patches YAML, Monaco edits YAML, agent tools mutate YAML.
- Disable structural drag/drop/connect on canvas; remove "Publish" stub or wire it to save.
- Implement undo/redo stack.
- Empty-router suggested prompts.

### Phase 6 — Settings + polish + docs
- Settings dialog: reasoning model dropdown, reset-thread button.
- "Last edit by Agent — Undo" toast.
- Loading/streaming visual states.
- Update `CLAUDE.md` (frontend) with a short section on the agent (where skills live, how to add one, the tool surface).
- Manual E2E checklist run.

## 14. Open questions deferred / decisions punted

- **Skill versioning.** The manifest exposes a `version` per skill, but right now nothing in the agent reasons about it. A future iteration could let the agent prefer newer versions or cache aggressively. For v1, the version is informational.
- **Streaming tool-call rendering.** v1 renders tool calls atomically (after the assistant message parses). If users want to see "the agent is editing decision X right now" as it streams, we can revisit — likely needs OpenAI-compatible incremental tool-call deltas, which not every executor supports.
- **Auto-greeting.** On first open of an empty router, should the agent send a proactive "What kind of router are you building?" message? Recommendation: no — that costs tokens before the user has expressed intent. Instead, the chat panel renders suggested prompts. Easy to flip later.
- **Skill body cache.** v1 fetches skills on demand without caching. If load_skill is called repeatedly across turns, the agent pays for the body each turn. A simple in-page LRU could cache N most recent skills. Defer.
- **Cost telemetry.** v1 doesn't report cost or token usage in the UI. Existing usage logging in the gateway will already capture the agent's calls. A dedicated "agent observability" panel is a follow-up.
- **JS validator parity automation.** v1 relies on hand-maintained registries. A future improvement: a small Python script that emits a JSON registry from `router_service/uniro_router/signals/__init__.py` + `plugins/__init__.py`, plus a CI check that the JS registry matches.

## 15. Glossary

- **Router YAML** — the document the router service validates and executes. See `router_service/ROUTER_YAML.md`.
- **Signal / Projection / Decision / Plugin** — the four layers of the router pipeline. See ROUTER_YAML.md §4–8.
- **Skill** — a markdown reference doc the agent can load on demand. Not a Claude Code skill; a domain reference.
- **Tool** — an OpenAI-compatible function the agent calls. All tools execute in the browser in this design.
- **Thread** — the persistent conversation between the user and the agent for a single router.
