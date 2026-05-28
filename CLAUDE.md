# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## What this is

**Uniro** (`uniro-app`) — a self-hosted LLM router dashboard. Next.js 16
(App Router) + React 19, **TypeScript** (uses `tsconfig.json`, strict mode).
All UI code under `src/app/**`, `src/shared/components/**`, and the rest of
the React tree is `.ts`/`.tsx`. Backend-facing modules (DB driver chain,
MITM, OAuth services, SSE handlers, app stores) are still plain `.js` —
they have no JSX and TS conversion is out of scope. Exposes an
**OpenAI-compatible API** at `:20128/v1` so CLI tools (Claude Code, Codex,
Cursor, Cline, OpenClaw...) can use it as a drop-in endpoint while it does
multi-provider routing, format translation, token refresh, quota tracking,
and "RTK" token compression.

This is the published npm package `uniro`. The dashboard, API gateway, MITM cert proxy, and Cloudflare Worker companion all live in this single repo.

---

## Common commands

```bash
# Dev — Next.js with webpack on port 20128 (NOT the default 3000)
npm run dev
npm run dev:bun                       # same, run under Bun

# Production
npm run build                         # webpack + Next standalone output
npm run start                         # serves the .next/standalone server
npm run build:bun && npm run start:bun

# Tests live in ./tests and depend on a globally-installed vitest at /tmp/node_modules
# (workspace hoisting hack — DO NOT run `npm i vitest` in the root package)
cd /tmp && npm install vitest         # one-time setup
cd tests && npm test                  # runs all *.test.js under tests/unit
cd tests && NODE_PATH=/tmp/node_modules /tmp/node_modules/.bin/vitest run tests/unit/rtk.test.js   # single file

# Lint (eslint flat config extending next/core-web-vitals)
npx eslint .

# Docker
./start.sh                            # stops/removes old container, rebuilds, runs with .env

# Cloudflare Worker companion (separate package in ./cloud)
cd cloud && npm run dev               # wrangler dev
cd cloud && npm run deploy            # wrangler deploy
```

`.env` is required — copy from `.env.example`. Minimum: `JWT_SECRET`, `INITIAL_PASSWORD`, `DATA_DIR`. Default port is **20128**.

---

## Architecture

The system has four cooperating layers. Understanding the boundary between `src/` (Next.js app, app-state, dashboard, HTTP entry) and `open-sse/` (provider engine, no Next dependency) is the most important thing.

### 1. Next.js app shell — `src/app/`

- `src/app/api/v1/**` — OpenAI-compatible HTTP surface (`chat/completions`, `messages`, `responses`, `embeddings`, `images`, `audio`, `models`, `search`, `web`). `next.config.mjs` rewrites `/v1/*` → `/api/v1/*` and `/codex/*` → `/api/v1/responses` so external clients can use the canonical `/v1` paths.
- `src/app/(dashboard)/dashboard/**` — the admin UI (providers, combos, MITM, usage, quota, proxy-pools, cli-tools, translator, basic-chat, console-log, skills...). The `(dashboard)` route group shares one layout.
- `src/app/api/**` (non-`v1`) — internal management endpoints (settings, keys, providers, combos, oauth, tags, etc.) used by the dashboard, gated by `src/proxy.js` / `src/dashboardGuard.js` (Next middleware via the `matcher` config).
- `src/server-init.js` — runs at server startup via `src/shared/services/initializeApp.js` (DB migrate, MITM bootstrap, cloud sync, etc.).

### 2. Provider engine — `open-sse/` (self-contained, no Next imports)

This is the routing core, designed to be reusable (the Cloudflare Worker in `cloud/` imports it via `"open-sse": "file:../open-sse"`).

- `translator/` — bidirectional format conversion between OpenAI / Anthropic Messages / Gemini / Responses API. Registered per format; entry points are `translateRequest`, `translateResponse`, `detectFormat`.
- `executors/` — **one file per upstream**: `antigravity`, `azure`, `codex`, `commandcode`, `cursor`, `gemini-cli`, `github`, `grok-web`, `iflow`, `kiro`, `ollama-local`, `opencode`, `opencode-go`, `perplexity-web`, `qoder`, `qwen`, `vertex`, plus `default`. Adding a new provider means adding an executor here, an entry in `config/providers.js` / `config/providerModels.js`, and (if it has its own auth flow) a refresh handler in `services/tokenRefresh.js`.
- `handlers/` — capability-shaped entry points (`chatCore`, `responsesHandler`, `embeddingsCore`, `imageGenerationCore`, `sttCore`, `ttsCore`, plus `search/` and `fetch/`). These pick an executor and run the request.
- `services/` — cross-cutting concerns: `accountFallback`, `tokenRefresh`, `combo` (multi-account round-robin), `compact` (context compaction), `usage` (token accounting), `model` (alias resolution).
- `rtk/` — **RTK ("token saver")**: rewrites `tool_result` content in-flight to cut prompt tokens by 20–40%. `autodetect.js` picks a filter, `applyFilter.js` runs it, registry/filters under `filters/`. This is one of the project's headline features and runs inside the request path before the executor.
- `transformer/` — converts between SSE streams and one-shot JSON for executors that don't speak SSE natively.

### 3. Persistence — `src/lib/db/`

SQLite with a **driver chain** (`driver.js`) that tries in order: `bun:sqlite` (under Bun) → `better-sqlite3` (native, optional dep) → `node:sqlite` (Node ≥22.5) → `sql.js` (pure-JS WASM fallback). `better-sqlite3` is in `optionalDependencies` so install never fails on machines without build tools.

- All schema/migrations live in `src/lib/db/migrations/` and run on boot via `migrate.js`.
- All reads/writes go through repository modules in `src/lib/db/repos/*Repo.js`, re-exported from `src/lib/db/index.js`. **Never query the DB directly from app code** — go through a repo.
- `next.config.mjs` lists `better-sqlite3`, `sql.js`, `node:sqlite`, `bun:sqlite` in `serverExternalPackages` so webpack doesn't try to bundle them.

There are additional standalone DB files for hot/append-heavy data (`src/lib/usageDb.js`, `requestDetailsDb.js`, `disabledModelsDb.js`, `localDb.js`) — these use the same driver chain but separate files.

### 4. MITM proxy — `src/mitm/`

A **separate Node process** (not part of Next) that intercepts HTTPS traffic from CLI tools that don't accept a custom endpoint (`copilot`, `cursor`, `antigravity`, `kiro`). It generates a CA cert (`cert/`), runs its own server (`server.js`), and is managed from the dashboard via `manager.js`. The Dockerfile explicitly copies `src/mitm` + `node-forge` into the runtime image because Next's file tracing doesn't see it.

`src/mitm/dev/` was a git submodule in the upstream repo (`your-org/uniro-dev`); it has been removed in this fork.

---

## Request flow (chat completion example)

1. Client hits `POST /v1/chat/completions` → rewritten to `/api/v1/chat/completions` (Next route).
2. Route resolves provider connection + model alias via `src/lib/db/repos/`.
3. Hands off to `open-sse/handlers/chatCore.js`.
4. `translator/` normalizes the request to the upstream's native format.
5. `rtk/` compresses `tool_result` blocks if enabled.
6. `executors/<provider>.js` makes the upstream call. On auth failure, `services/tokenRefresh.js` refreshes and retries. On rate-limit/quota errors, `services/accountFallback.js` and `services/combo.js` rotate to the next account.
7. Response is streamed back through the translator and recorded by `services/usage.js`.

---

## Things that will trip you up

- **Port is 20128, not 3000.** Both `npm run dev` and Docker bind to it.
- **Webpack, not Turbopack.** `package.json` scripts explicitly pass `--webpack` even though `turbopack` is configured in `next.config.mjs` (the config is there only to set `root`).
- **Tests don't share `node_modules` with the app.** `tests/package.json` expects vitest under `/tmp/node_modules` (see "Common commands"). Don't add vitest to the root package.
- **gitbook/ is excluded from Next file tracing** (`outputFileTracingExcludes`) — it's a docs subapp.
- **The cloud/ subdirectory is a Cloudflare Worker**, not part of the Next.js bundle. It depends on `open-sse` as a local file dep, so changes to `open-sse/` affect both runtimes.
- **`fs` is in `dependencies`** as the security-stub package because some transitive dep was importing it; don't remove it.
- **The dashboard middleware (`src/proxy.js`)** only matches a hand-picked set of paths — `/api/v1/*` is intentionally NOT guarded (it has its own API-key auth via `API_KEY_SECRET`).

---

## Adding a provider

1. Add executor at `open-sse/executors/<provider>.js` (follow `executors/default.js` as a template; extend `executors/base.js` if useful).
2. Register the provider in `open-sse/config/providers.js` and its model list in `open-sse/config/providerModels.js`.
3. If OAuth-based, add a refresh function in `open-sse/services/tokenRefresh.js` and wire it into `refreshTokenByProvider`.
4. If the provider needs format translation, ensure `translator/` covers the request/response shape (most upstreams reuse OpenAI or Anthropic Messages format).
5. Add a unit test under `tests/unit/` mirroring an existing executor test.

---

## Router Builder agent

The `/dashboard/router-builder` page hosts a conversational agent that authors
router YAML from natural-language descriptions. Architecture (top-down):

- **UI** at `src/app/(dashboard)/dashboard/router-builder/` — Builder shell +
  Header / Palette / Canvas / RightDock with Chat/YAML/Properties tabs +
  BottomToolbar + Toast. Single YAML store as source of truth.
- **Agent loop** at `src/lib/router-agent/agent.js` — framework-agnostic,
  streams OpenAI-compatible SSE from same-origin `/api/v1/chat/completions`.
- **Tools** at `src/lib/router-agent/tools/` — 8 client-side tools
  (`get_router`, `set_router_yaml`, `add_signal`, `add_decision`,
  `update_decision`, `delete_node`, `validate_router`, `load_skill`).
  Each exports `{definition, makeExecute}`.
- **Validator** at `src/lib/router-agent/validator/` — pure JS shape validator
  (not full parity with router_service's pydantic validator — see
  REGISTERED_SIGNALS / REGISTERED_PLUGINS in `validator/registries.js`).
- **Skills** at `src/lib/router-agent/skills/*.md` — agent-accessible reference
  docs, loaded on demand via `load_skill` tool. Served from
  `GET /api/router-agent/skills/[name]` and listed via
  `GET /api/router-agent/manifest`. ASCII-only Markdown.
- **Persistence** — `routers` and `routerAgentThreads` tables (see
  `src/lib/db/migrations/002-router-agent.js`). Agent settings live in the
  shared `settings` row (`agentReasoningModel` key).
- **React hooks** — `src/hooks/useRouterAgent.js` (loop driver + thread
  persistence) and `src/hooks/useRouterYamlStore.js` (zustand YAML store with
  50-entry undo/redo).

### Adding a skill

1. Add `src/lib/router-agent/skills/your-skill.md` with frontmatter
   (`name`, `description`, `version`). ASCII-only body.
2. The manifest endpoint picks it up automatically (it reads the directory at
   request time). No code change required.
3. Update the agent's system prompt skill list at
   `src/lib/router-agent/systemPrompt.js` so the agent knows the skill exists.

### Adding a signal or plugin type to the validator

1. Add the type name to `REGISTERED_SIGNALS` or `REGISTERED_PLUGINS` in
   `src/lib/router-agent/validator/registries.js`.
2. Mirror the entry in the relevant skill (`signal-reference.md` or
   `plugin-reference.md`).
3. The router_service must also have a matching registration in its
   `signals/__init__.py` or `plugins/__init__.py` for the actual routing to
   work end-to-end. See `/SSD_data2/shared/UniRo_shared/UniroCloud/router_service`.

### Conventions

- All agent code is JavaScript (no TS) and ASCII-only in user-facing strings.
- The agent loop assumes `/api/v1/chat/completions` is reachable same-origin
  without `Authorization` (i.e., `settings.requireApiKey` is false). If a
  deployment enables API-key enforcement, the agent will need to attach a key.
- YAML is parsed and stringified via `confbox/yaml`. **Comments are not
  preserved across parse->stringify** — any tool that mutates the YAML wipes
  user-authored comments. Documented in `src/lib/router-agent/yaml.js`.
