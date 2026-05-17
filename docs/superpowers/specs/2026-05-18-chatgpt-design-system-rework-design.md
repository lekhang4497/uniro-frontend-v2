# ChatGPT Design System Rework + TS Migration

**Date:** 2026-05-18
**Status:** Approved (brainstorming complete)
**Project:** uniro-frontend-v2

## Goal

Replace the current Anthropic-warm UI of the uniro-frontend-v2 dashboard with a faithful application of the OpenAI ChatGPT Apps SDK design system, and migrate the codebase from JavaScript to TypeScript in the same pass. All 31 pages reskinned; no page logic changes.

## Non-goals

- No new features. No router/auth/data-model changes.
- No Tailwind v3 rollback (project is already v4).
- No replacement of `@xyflow/react` for the router-builder canvas.
- No replacement of Radix-based shadcn primitives (they get restyled + retyped, not swapped).
- No removal of dark mode.
- No re-architecture of the dashboard layout, route group, or auth flow.

## Design decisions (locked)

| # | Decision | Choice |
|---|----------|--------|
| 1 | Visual identity | Full ChatGPT reset. Drop Anthropic warm cream + Uniro orange chrome. |
| 2 | Scope | All 31 pages (22 dashboard + 4 admin + 4 auth/public + 1 pricing). |
| 3 | Language | Full JS→TS migration. New `tsconfig.json` (strict), TypeScript dep, `@types/*` for React/Node. Every `.js`/`.jsx` becomes `.ts`/`.tsx`. |
| 4 | Page shell | Grouped left sidebar (232px) + breadcrumb header (56px) + main content. Preserves current navigation muscle memory. |
| 5 | Primitive layer | Keep Radix. Rewrite all 25 shadcn primitives under `src/shared/components/ui/*` in TSX against new tokens. |
| 6 | Dark mode | Keep light + dark. Both reset to ChatGPT palettes. `ThemeProvider` and `ThemeToggle` retained. |
| 7 | Router-builder canvas | Re-skin + extract internals. Convert `page.js` → `page.tsx` and split 2,350 lines into focused files (`nodes/`, `edges/`, `sidebar/`, `toolbar/`). Keep xyflow, keep 5-layer architecture, keep yaml/catalog/templates intact. |
| 8 | Icons | Lucide only. Drop Material Symbols (remove font load from `layout.js`). |
| 9 | Density | ChatGPT-default spacious (16–20px card padding, generous vertical rhythm). |
| 10 | Brand mark | Keep the multi-path `UniroMark`. Render in `--tx-1` (neutral). Orange retired from chrome. |
| 11 | Migration order | Foundation → primitives → shell → pages by group. Each group is its own commit. |

## Token system

`src/app/globals.css` is the single source of truth. Uses Tailwind v4 `@theme` syntax. Existing custom Uniro tokens (`--uniro-orange`, etc.) and Anthropic-mode tokens are removed.

### Light mode (`:root`)

```css
--bg-primary:   #FFFFFF;
--bg-secondary: #E8E8E8;
--bg-tertiary:  #F3F3F3;

--text-primary:   #0D0D0D;
--text-secondary: #5D5D5D;
--text-tertiary:  #8F8F8F;
--text-inverted:  #FFFFFF;

--icon-primary:   #0D0D0D;
--icon-secondary: #5D5D5D;
--icon-tertiary:  #8F8F8F;
--icon-inverted:  #FFFFFF;

--accent-blue:   #0285FF;
--accent-red:    #E02E2A;
--accent-orange: #E25507;
--accent-green:  #008635;
```

### Dark mode (`.dark`)

```css
--bg-primary:   #212121;
--bg-secondary: #303030;
--bg-tertiary:  #414141;

--text-primary:   #FFFFFF;
--text-secondary: #CDCDCD;
--text-tertiary:  #AFAFAF;
--text-inverted:  #0D0D0D;

--icon-primary:   #FFFFFF;
--icon-secondary: #CDCDCD;
--icon-tertiary:  #AFAFAF;
--icon-inverted:  #0D0D0D;

--accent-blue:   #0285FF;
--accent-red:    #FF8583;
--accent-orange: #FF9E6C;
--accent-green:  #40C977;
```

### Aliases (back-compat for shadcn primitives)

Map shadcn's named tokens onto the new ones so primitives don't need invasive refactors:

```css
--background: var(--bg-primary);
--foreground: var(--text-primary);
--card:       var(--bg-primary);
--card-foreground: var(--text-primary);
--popover:    var(--bg-primary);
--popover-foreground: var(--text-primary);
--primary:    var(--accent-blue);
--primary-foreground: var(--text-inverted);
--secondary:  var(--bg-secondary);
--secondary-foreground: var(--text-primary);
--muted:      var(--bg-tertiary);
--muted-foreground: var(--text-secondary);
--accent:     var(--bg-secondary);
--accent-foreground: var(--text-primary);
--destructive: var(--accent-red);
--destructive-foreground: var(--text-inverted);
--border:     var(--bg-secondary);
--input:      var(--bg-secondary);
--ring:       var(--accent-blue);
```

### Radius & elevation

```css
--radius-sm: 6px;
--radius:    8px;     /* default */
--radius-md: 10px;
--radius-lg: 12px;
```

Shadows stay `none` by default — the design system prefers borders over shadows for chrome. Use `--shadow-popover: 0 1px 3px rgba(0,0,0,.08)` only for floating layers (Popover, Dialog, DropdownMenu, Tooltip).

## Typography

System font stack only. Remove `next/font/google` calls for DM Sans + Source Serif 4. Keep JetBrains Mono (still useful for code blocks in router-builder and YAML preview).

```css
--font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
             "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji",
             "Segoe UI Emoji";
--font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo,
             Monaco, Consolas, monospace;
```

### Type scale

| Token | Size | Line | Usage |
|-------|------|------|-------|
| `text-display` | 26px / 600 | 1.2 | page H1 |
| `text-title`   | 18px / 600 | 1.3 | section H2 |
| `text-body`    | 14px / 400 | 1.5 | default |
| `text-body-sm` | 13px / 400 | 1.5 | secondary text, table rows |
| `text-caption` | 12px / 400 | 1.4 | metadata, tertiary |
| `text-label`   | 11px / 500 (uppercase, .06em tracking) | 1.4 | section labels |

Material Symbols font load is removed.

## File / directory plan

```
src/
├── app/
│   ├── globals.css                 # rewritten: new tokens, no Uniro warm vars
│   ├── layout.tsx                  # was .js — system fonts only, drop Material Symbols
│   ├── (dashboard)/
│   │   └── ... pages converted to .tsx in groups
│   ├── admin/
│   │   └── ... .tsx
│   ├── login/page.tsx
│   ├── cloud/.../page.tsx
│   ├── landing/page.tsx
│   ├── callback/page.tsx
│   └── api/                        # unchanged (server routes stay .js for this rework)
├── shared/
│   └── components/
│       ├── ui/                     # all 25 shadcn primitives → .tsx, typed Props
│       ├── Sidebar.tsx             # rewritten: grouped nav, ChatGPT chrome
│       ├── Header.tsx              # rewritten: breadcrumb + icon-button row
│       ├── ThemeProvider.tsx
│       ├── ThemeToggle.tsx
│       ├── UniroMark.tsx           # recolored to currentColor
│       └── ... other components retyped in place
├── components/                     # retyped in place
├── lib/                            # retyped in place
└── types/                          # NEW: shared types (Provider, Combo, RouterNode, ...)

tsconfig.json                       # NEW: strict, paths "@/*" → "src/*"
jsconfig.json                       # REMOVED
```

## Primitives (`src/shared/components/ui/*.tsx`)

All 25 shadcn primitives get the same treatment:

1. Rename `.jsx` → `.tsx`.
2. Add typed Props (`React.ComponentPropsWithoutRef`, `VariantProps<typeof cva(...)>`).
3. Reset browser defaults explicitly (border:0, outline:0 → focus-visible ring).
4. Map class names to new token aliases (already wired in CSS).
5. Verify keyboard / aria behavior unchanged.

Affected: Accordion, AlertDialog, Avatar, Badge, Button, Card, Checkbox, Command, ContextMenu, Dialog, DropdownMenu, Form, HoverCard, Input, Label, Popover, Progress, RadioGroup, ScrollArea, Select, Separator, Sheet, Switch, Tabs, Toggle, Tooltip.

## Shell

### `Sidebar.tsx`

- 232px wide, `--bg-secondary` background, right border `--bg-tertiary`.
- Brand row (UniroMark + "Uniro") at top with bottom border.
- Grouped sections with `text-label` headers: **Workspace**, **Build**, **Admin** (admin shown only when route is `/admin`), **Account**.
- Items use Lucide icons (`<LayoutGrid />`, `<Plug2 />`, `<Combine />`, `<Activity />`, `<Gauge />`, `<Workflow />`, `<Languages />`, `<ShieldCheck />`, `<MessageSquare />`, `<TerminalSquare />`, `<Wrench />`, `<Settings />`, `<UserRound />`).
- Active item: `--bg-tertiary` background, `--text-primary`, icon in `--accent-blue`.

### `Header.tsx`

- 56px tall, `--bg-primary` background, bottom border `--bg-tertiary`.
- Left: breadcrumb (`workspace / Providers`), `--text-tertiary` / `--text-primary` for final crumb.
- Right: `ThemeToggle`, contextual icon buttons (notifications, settings shortcut, user menu).
- Icon buttons: 32px square, `--radius`, transparent default, `--bg-secondary` hover.

## Router-builder extraction

`src/app/(dashboard)/dashboard/router-builder/` currently has `page.js` at 2,350 lines + sibling helper files. Split into:

```
router-builder/
├── page.tsx                       # composition shell (~200 LOC)
├── components/
│   ├── CanvasShell.tsx            # ReactFlowProvider, layout
│   ├── Toolbar.tsx                # save, reset, yaml preview, deploy
│   ├── NodePalette.tsx            # left rail of node types
│   ├── nodes/
│   │   ├── SignalNode.tsx
│   │   ├── ProjectionNode.tsx
│   │   ├── RouteNode.tsx
│   │   ├── ModelNode.tsx
│   │   └── PluginNode.tsx
│   ├── edges/
│   │   └── RouterEdge.tsx
│   ├── inspector/                  # right rail
│   │   ├── Inspector.tsx
│   │   ├── SignalInspector.tsx
│   │   ├── RouteInspector.tsx
│   │   ├── ModelInspector.tsx
│   │   └── PluginInspector.tsx
│   └── YamlPreview.tsx
├── hooks/
│   ├── useRouterGraph.ts
│   └── useRouterDeploy.ts
├── catalog.ts                      # was catalog.js, typed
├── templates.ts                    # was templates.js
├── yaml.ts                         # was yaml.js
├── WhenEditor.tsx                  # was WhenEditor.jsx
└── CloudSyncPanel.tsx              # was CloudSyncPanel.jsx
```

Re-skinning rules for canvas elements:
- Node card: `--bg-primary`, 1px border `--bg-tertiary`, `--radius-md`, soft shadow.
- Selected node: 2px ring `--accent-blue`, no extra shadow.
- Handles: 8px circle, `--bg-tertiary` border, fills on hover.
- Edge: 1.5px stroke `--text-tertiary`, animated dashes on hot edges.
- Canvas background: `--bg-tertiary` with subtle dot grid (`#0000` with `--text-tertiary` at .15 opacity).
- MiniMap, Controls, Background: themed via xyflow's CSS variables.

## Page migration groups

Each group ships as one commit so review/revert is granular.

### G1 — Foundation (no page changes)
- Add `tsconfig.json` (strict, `noUncheckedIndexedAccess`, `target: ES2022`, `paths { "@/*": ["src/*"] }`).
- Remove `jsconfig.json`.
- Add deps: `typescript`, `@types/react`, `@types/react-dom`, `@types/node`.
- Rewrite `src/app/globals.css` with new tokens.
- Rewrite `src/app/layout.js` → `layout.tsx` with system-font stack only.
- Update `next.config.mjs` if needed for TS.

### G2 — Primitives
- Rewrite all `src/shared/components/ui/*.{js,jsx}` → `.tsx` with proper Props types.
- Add `class-variance-authority` if not present.
- No page touches yet.

### G3 — Shell
- Rewrite `Sidebar.js` → `Sidebar.tsx` with grouped nav, Lucide icons.
- Rewrite `Header.js` → `Header.tsx` with breadcrumb chrome.
- Rewrite `ThemeProvider.js` and `ThemeToggle.js` → `.tsx`.
- Rewrite `UniroMark.jsx` → `UniroMark.tsx`, use `currentColor`.
- Rewrite `Icon.jsx` → `Icon.tsx` (just re-exports from Lucide; drop Material Symbols fallback).
- Convert `(dashboard)/layout.js` → `layout.tsx`.

### G4 — Dashboard core pages (5)
- `/dashboard` (home)
- `/dashboard/providers` + `/dashboard/providers/[id]` + `/dashboard/providers/new`
- `/dashboard/combos`
- `/dashboard/usage` (incl. `ProviderTopology` re-skin, no logic change)
- `/dashboard/quota`

### G5 — Provider sub-pages
- `/dashboard/media-providers/[kind]`
- `/dashboard/media-providers/[kind]/[id]`
- `/dashboard/media-providers/combo/[id]`
- `/dashboard/media-providers/web`

### G6 — Router-builder canvas
- Full extraction per plan above.
- Re-skin nodes/edges/handles.
- Convert all helper files to TS.

### G7 — Build tools
- `/dashboard/translator`
- `/dashboard/mitm`
- `/dashboard/cli-tools`
- `/dashboard/proxy-pools`
- `/dashboard/console-log`
- `/dashboard/endpoint`
- `/dashboard/skills`

### G8 — Chat surfaces
- `/dashboard/chat`
- `/dashboard/basic-chat`

### G9 — Settings & profile
- `/dashboard/profile`
- `/dashboard/settings/*`
- `/dashboard/settings/pricing`

### G10 — Admin
- `/admin`
- `/admin/plans`
- `/admin/users`
- `/admin/users/[id]`

### G11 — Auth & public
- `/login`
- `/cloud/login`, `/cloud/register`
- `/callback`
- `/landing`

### G12 — Cleanup
- Delete unused: Material Symbols font config, any leftover `.js` files, old token vars.
- Update `CLAUDE.md` to say TypeScript instead of JavaScript-only.
- Run typecheck + dev server smoke test.

## Verification per group

After each group:
1. `npm run build` must succeed (this is the de facto typecheck; project has no separate `typecheck` script).
2. `npx eslint .` must not introduce new errors versus baseline.
3. Manually open the touched page(s) in `npm run dev` (port 20128) and verify: light renders, dark renders, primary action works, no console errors.
4. Existing tests in `tests/unit/` must pass (`cd tests && /tmp/node_modules/.bin/vitest run`).

## Risks & mitigations

| Risk | Mitigation |
|------|-----------|
| Tailwind v4 `@theme` block doesn't accept some of the alias mappings | Fall back to plain `:root` + `.dark` CSS vars; Tailwind v4 still reads them. |
| Some pages bypass primitives and inline raw classnames (`bg-uniro-orange`) | Pre-flight grep for `uniro-orange`, `uniro-blue`, etc. Replace before group migration. |
| `@xyflow/react` types disagree between v12 and what we infer | Pin to a version with shipped types; cast custom node/edge types narrowly. |
| `better-sqlite3` and other server externals fight the new TS config | These are server-only; tsconfig should set `moduleResolution: "bundler"`, `jsx: "preserve"`, and rely on Next's compiler for emit. No emit from `tsc`. |
| Material Symbols icons referenced in stale strings (`<span class="material-symbols-outlined">...</span>`) | Grep for `material-symbols`; replace each with a Lucide icon import per group. |
| Router-builder regressions from file split | Do the split mechanically first (move + import-fix only), verify it still works, then re-skin in a follow-up commit. |
| 31-page migration creates a huge net diff that's hard to review | Strict commit-per-group discipline keeps each commit reviewable (~5-8 pages each). |

## What "done" looks like

- Every page under `src/app/**` renders with new tokens, system fonts, Lucide icons.
- No reference to `--uniro-orange`, `--uniro-blue`, `--uniro-warning`, `--uniro-danger`, `--uniro-green` remains in src/.
- No `.js` or `.jsx` file remains under `src/` *except* `src/app/api/**` (server routes are explicitly out of scope) and any third-party-compatibility shim that must stay JS.
- `tsconfig.json` exists; `jsconfig.json` is gone.
- Material Symbols font load is removed from `layout.tsx`.
- Light + dark both render correctly across all groups.
- Router-builder canvas works exactly as before (drag, connect, save, deploy).
- `npm run build` succeeds; `npm run dev` boots on 20128; existing vitest tests pass.
- `CLAUDE.md` updated.

## Out of scope / explicit deferrals

- The `cloud/` Cloudflare Worker subdir: not touched.
- `gitbook/` docs subapp: not touched (excluded from Next file tracing already).
- The MITM Node process (`src/mitm/*`): server code, not UI.
- API route handlers (`src/app/api/**`): server logic, stays JS for this rework.
- New features, new pages, new components.
- Backend (`backend/`): out of scope by repo convention.
