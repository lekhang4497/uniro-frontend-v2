# Apps-SDK polish + Electron port — design

**Date:** 2026-05-23
**Author:** brainstorming session with user (lekhang4497@gmail.com)
**Status:** approved by user; ready for implementation planning

---

## Context

The `uniro-frontend-v2` Next.js dashboard sits on the `feat/chatgpt-design-rework` branch with ~30 commits already adopting ChatGPT Apps SDK design tokens (color scale, system fonts) and reskinning every dashboard, auth, and router-builder page. Visual chrome is close to ChatGPT, but the primitives still carry shadcn/ui conventions (square buttons, default 8px radius, no soft/ghost split, no press-scale animation) and a few page-level layouts use slightly heavier spacing than `apps-sdk-ui` (https://github.com/openai/apps-sdk-ui).

At the same time the user wants to ship a desktop binary so the local `/v1` gateway, MITM proxy, and dashboard can run as one process that survives reboots and updates itself.

This spec covers three pieces of work executed in sequence:

- **A. UI polish** — restyle primitives + tighten layouts to feel like `apps-sdk-ui`
- **B. Electron port** — wrap the Next.js standalone server in Electron with multi-OS CI artifacts
- **C. Commit & push** — bracket A and B with safe commits to GitHub for both `uniro-frontend-v2` and the (newly remoted) `uniro-cloud` repos

---

## Goals

**A. UI polish**
- Primitives (Button, Badge, Input, Textarea, Tooltip, Dialog, Sheet, Popover, Select, DropdownMenu, Tabs, SegmentedControl) visually match `apps-sdk-ui` at default size (pill shape where appropriate, soft variant, press-scale, `--shadow-popover`).
- Add the two primitives `apps-sdk-ui` ships that this repo lacks: `TextLink` and `ButtonLink`.
- Page-level density matches `apps-sdk-ui` patterns: 14px body, tighter card padding (`p-5`), 32px list rows, 12px gutters, dividers via `border-t var(--bg-secondary)`.

**B. Electron port**
- One desktop binary per OS (mac dmg + zip, win nsis + portable, linux AppImage + deb) downloadable from GitHub Actions artifacts on every push.
- Embeds the unchanged Next.js standalone server — no feature regression (dashboard, `/v1` gateway, MITM, DB driver chain all keep working).
- Auto-update from GitHub Releases on tag push; system tray with minimize-to-tray.

**C. Commit & push**
- All work landed in remote `feat/chatgpt-design-rework` for frontend.
- UniroCloud (`mgmt_service` + `router_service` + ops) initialized against `https://github.com/lekhang4497/uniro-cloud.git` and pushed to `main`.
- No `.env`, no `*.pem`, no `*.key`, no `data/`, no secrets in commits.

## Non-goals

- Adding `@openai/apps-sdk-ui` as a real npm dependency — keep Radix + Tailwind + custom CSS.
- Re-skinning the xyflow router-builder canvas — already done in the existing branch.
- Token rewrites — light/dark palette already aligned with the ChatGPT Apps SDK swatches.
- Code signing for Electron (no Apple Developer cert / Windows cert yet); v1 artifacts ship unsigned.
- Porting the Cloudflare Worker companion in `frontend/cloud/` to Electron — out of scope.
- Touching `router_service` or `mgmt_service` runtime code — only committing existing on-disk changes.

---

## Sub-project A: UI polish

### Primitive restyle (in-place; keep Radix internals)

Each restyle is a contained edit to the file under `src/shared/components/ui/`. No new dependencies. Use existing CSS variables in `src/app/globals.css` — do not add new tokens.

| File | Change |
|---|---|
| `button.tsx` | Add `pill?: boolean` (default `true`) wired to `rounded-full` vs `rounded-[var(--radius-md)]`. Add `variant: "soft"` — bg `color-mix(in srgb, var(--accent-blue) 12%, transparent)`, text `var(--accent-blue)`. Add `active:scale-[0.97] transition-transform`. Keep `cva` API. Existing call-sites work unchanged because all current variants stay.|
| `badge.tsx` | Default `rounded-full`, `h-[20px]`, `px-2`, `text-[11px]`. Variants: `default` (bg-secondary), `accent` (accent-blue soft), `success/danger/warning` (existing colors soft). |
| `input.tsx` / `textarea.tsx` | 1px `var(--bg-secondary)` border, `focus-visible:outline-2 outline-offset-2 outline-[var(--accent-blue)]`, no inner ring. Pill-radius for `input`, `rounded-[var(--radius-md)]` for `textarea`. |
| `tooltip.tsx` | `bg-[var(--bg-primary)]`, `shadow-[var(--shadow-popover)]`, `border border-[var(--bg-secondary)]`, `text-[12px]`, `px-2 py-1`, `rounded-[var(--radius-sm)]`. |
| `dialog.tsx`, `sheet.tsx`, `popover.tsx` | Replace shadcn default `shadow-lg` with `shadow-[var(--shadow-popover)]`, radii to `var(--radius-lg)`. |
| `select.tsx`, `dropdown-menu.tsx` | Menu rows `h-8` (32px), `px-3`, hover `bg-[var(--bg-tertiary)]`, separators `bg-[var(--bg-secondary)]`. |
| `tabs.tsx` | Pill segmented background `bg-[var(--bg-secondary)] rounded-full p-[2px]`. Selected: `bg-[var(--bg-primary)] shadow-sm rounded-full`. |
| `SegmentedControl.tsx` | Same treatment, deduplicate with Tabs primitive style if practical. |

### New primitives

Two files under `src/shared/components/ui/`:

```
text-link.tsx     # <a> with accent-blue color, no underline by default, underline on hover
button-link.tsx   # ButtonLink, same variants as Button, renders next/link or external <a>
```

Both follow shadcn's `cva` pattern. `ButtonLink` reuses `buttonVariants` from `button.tsx` — no duplication.

### Layout polish

Cross-cutting page-level changes — most live in `src/shared/components/Card.tsx`, `Sidebar.tsx`, dashboard page bodies:

- `Card.tsx` — drop padding from `p-6` to `p-5`; replace `rounded-[var(--radius-lg)]` border with `rounded-[var(--radius-lg)] border border-[var(--bg-secondary)] bg-[var(--bg-primary)]`.
- Lists (providers, combos, cli-tools, media-providers, etc.) — row height `h-8`, gutter `gap-3`, hover bg `var(--bg-tertiary)`, dividers `border-t border-[var(--bg-secondary)]` between sections.
- Page headings — keep `text-[15px] font-semibold`. Body remains 14px.

### Out of scope (UI)

- Markdown rendering tweaks in chat — already redone on this branch.
- xyflow node aesthetics — restyled in commits `e228cbb` and `c24d561`.
- Theme toggle behavior — keep current.

### Success criteria (UI)

1. `npx eslint .` passes.
2. `npm run typecheck` passes.
3. `npm run build` produces a Next standalone bundle with no console errors.
4. Visual check on these surfaces (manual, `npm run dev`):
   - `/login` — input + button look apps-sdk-ui-like (pill button, soft input border).
   - `/dashboard` (Endpoint) — cards have 20px padding, hover behavior on copy buttons matches.
   - `/dashboard/providers` — list rows 32px, dividers visible.
   - `/dashboard/chat` — composer button is pill, message bubbles unchanged.
   - `/dashboard/router-builder` — canvas + inspector unaffected.

---

## Sub-project B: Electron port

### Directory layout

```
frontend/
├─ electron/
│   ├─ main.js              # main process; spawns next standalone server, opens BrowserWindow
│   ├─ tray.js              # system tray icon + menu
│   ├─ preload.js           # contextBridge: app version, restart, quit, openExternal
│   ├─ updater.js           # electron-updater wired to GitHub Releases
│   ├─ builder.json         # electron-builder config
│   ├─ icons/               # mac.icns, win.ico, linux.png (placeholders, sourced from existing UniroMark)
│   └─ scripts/
│       └─ rebuild-native.js  # post-install: electron-rebuild for better-sqlite3
├─ package.json             # +scripts, +devDependencies
└─ .github/workflows/
    └─ electron-build.yml    # matrix mac/win/linux build
```

### Runtime model

`main.js`:

1. On `app.whenReady()`, set `process.env.DATA_DIR = app.getPath('userData')`. The DB driver chain in `src/lib/db/driver.js` writes there automatically.
2. Pick a free port via `get-port` (don't hardcode 20128 — collides with manually-running dev server).
3. Spawn the standalone server: `require('./resources/standalone/server.js')` in-process (no child fork; lets us share `process.env` and trap exits cleanly).
4. Create `BrowserWindow` (width 1280, height 800, minWidth 900, minHeight 600). Load `http://127.0.0.1:<port>`. Save bounds via `electron-window-state`.
5. On `before-quit`, gracefully close the Next server (`server.close()`), then `app.exit()`.

### electron-builder config (key flags)

```jsonc
{
  "appId": "tech.uniro.app",
  "productName": "Uniro",
  "directories": { "output": "release", "buildResources": "electron/icons" },
  "files": [
    "electron/**/*",
    ".next/standalone/**/*",
    ".next/static/**/*",
    "public/**/*",
    "open-sse/**/*",
    "src/mitm/**/*",      // explicit — file tracing doesn't see it
    "package.json"
  ],
  "asarUnpack": [
    "node_modules/better-sqlite3/**/*",
    "src/mitm/cert/**/*"  // CA cert needs to be writable
  ],
  "mac":   { "target": ["dmg", "zip"], "category": "public.app-category.developer-tools", "icon": "electron/icons/mac.icns" },
  "win":   { "target": ["nsis", "portable"], "icon": "electron/icons/win.ico" },
  "linux": { "target": ["AppImage", "deb"], "category": "Development", "icon": "electron/icons/linux.png" },
  "publish": { "provider": "github", "owner": "lekhang4497", "repo": "uniro-frontend-v2" }
}
```

### package.json additions

```jsonc
"main": "electron/main.js",   // only honored when packaged
"scripts": {
  "electron:dev":   "concurrently \"npm run dev\" \"wait-on http://localhost:20129 && electron electron/main.js\"",
  "electron:build": "npm run build && electron-builder",
  "electron:pack":  "npm run build && electron-builder --dir",   // unpacked, for CI to upload
  "postinstall":    "node electron/scripts/rebuild-native.js"
}
```

Adding `"main"` could break the npm `uniro` CLI bin entry — verify `package.json` `"bin"` still wins for `npx uniro`. If it conflicts, gate `"main"` behind a separate sub-package or only set it during the Electron build (via `prepack`/`postpack` mirroring the existing publish-pkg.js trim pattern).

devDependencies to add: `electron`, `electron-builder`, `electron-updater`, `electron-window-state`, `concurrently`, `wait-on`, `get-port` (`@types/get-port` if available), `@electron/rebuild`.

### Native deps

`better-sqlite3` ships C++ that's compiled for Node, not Electron. `electron-builder` runs `@electron/rebuild` automatically when `npmRebuild: true` (default). The driver chain (`src/lib/db/driver.js`) already falls back to `sql.js` if `better-sqlite3` fails to load — so an unrebuilt build still boots, just slower.

### Tray + auto-launch + auto-update

- **Tray** (`tray.js`): icon at app startup, menu `[Show Uniro, Open Dashboard, Quit]`. Window close `event.preventDefault()` + `win.hide()` (true exit goes through tray menu).
- **Auto-launch**: `app.setLoginItemSettings({ openAtLogin: true, openAsHidden: true })` opt-in via dashboard setting (out of scope for v1 — ship the API in main.js, wire the toggle later).
- **Auto-update** (`updater.js`): `autoUpdater.checkForUpdatesAndNotify()` on `ready`, repeat every 6h. Only enabled in packaged builds (`app.isPackaged`).

### CI workflow

`.github/workflows/electron-build.yml`:

```yaml
name: Electron build
on:
  push:
    branches: [feat/chatgpt-design-rework, main]
  workflow_dispatch:
  release: { types: [created] }
jobs:
  build:
    strategy:
      matrix:
        os: [macos-14, windows-latest, ubuntu-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run build              # next standalone
      - run: npm run electron:pack      # unpacked binary per OS
      - if: github.event_name == 'release'
        run: npx electron-builder --publish always
        env: { GH_TOKEN: ${{ secrets.GITHUB_TOKEN }} }
      - uses: actions/upload-artifact@v4
        with:
          name: uniro-${{ matrix.os }}
          path: release/**/*
          retention-days: 14
```

### Success criteria (Electron)

1. `npm run electron:dev` launches a BrowserWindow that shows `/login` against `http://127.0.0.1:20129` locally.
2. `npm run electron:pack` produces an unpacked binary under `release/` on the host OS.
3. CI workflow uploads at least one artifact per OS on push.
4. Tray icon appears, "Show window" works, "Quit" terminates the process cleanly (no orphan Next server).
5. `DATA_DIR` env is set to the OS-native userData path on first boot.

### Risks & mitigations

| Risk | Mitigation |
|---|---|
| `better-sqlite3` ABI mismatch | Driver chain falls back to `sql.js`; rebuild step in `postinstall`. |
| Bundle size 250-400 MB | Acceptable for v1. Long-term: prune `node_modules` via `electron-builder` `files` glob. |
| MITM cert generation requires fs writes inside asar | `asarUnpack: ["src/mitm/cert/**/*"]` already in config. |
| `package.json "main"` conflicts with npm `bin` | Use `prepack` hook to temporarily strip `"main"` for npm publish, same pattern as existing `scripts/publish-pkg.js`. |
| Unsigned macOS .dmg shows scary warning | Documented in README; acceptable for early access. |
| Cold start ~2-3 s | Document in README; show loading state in BrowserWindow until `did-finish-load`. |

---

## Sub-project C: Commit & push

### Pre-flight (both repos)

Run a secret scan before any `git push`:

```bash
git diff --cached | grep -nEi "(sk-[a-z0-9]{20,}|JWT_SECRET=|API_KEY_SECRET=|PASSWORD=|AWS_SECRET|HMAC_KEY=|-----BEGIN .*PRIVATE KEY-----)" || echo "clean"
```

Confirm `.gitignore` lists are honored:
- Frontend already covers `.env*`, `data/`, `*.pem`, `dist/`, `.next/`, `node_modules/`.
- UniroCloud covers `**/.env`, `/frontend/`, `**/node_modules/`, `**/.next/`, `**/dist/`, `**/__pycache__/`.

### Frontend commits

Branch is already `feat/chatgpt-design-rework` with 30+ committed commits + ~50 uncommitted modified files + 1 deleted file (`WhenEditor.tsx`).

Commit plan (multiple logical commits, not one):

1. **`feat(router-builder): inspector + canvas refinements`** — `src/app/(dashboard)/dashboard/router-builder/**` (40+ files).
2. **`feat(open-sse): translator robustness across providers`** — `open-sse/translator/**` (24 files).
3. **`fix(chat): page surface polish`** — `src/app/(dashboard)/dashboard/chat/page.tsx`.
4. **`fix(login): page surface polish`** — `src/app/login/page.tsx`.
5. **`fix(api): v1 chat/models route updates`** — `src/app/api/v1/**`.
6. **`chore: config + dockerfile updates`** — `.gitignore`, `Dockerfile`, `next.config.mjs`, `package.json`.

Then for sub-project A:
7. **`feat(ui): pill buttons + soft variant + press scale`**
8. **`feat(ui): apps-sdk badge/input/textarea/tooltip`**
9. **`feat(ui): apps-sdk dialog/popover shadow + menu rows`**
10. **`feat(ui): add TextLink + ButtonLink primitives`**
11. **`feat(ui): layout polish — card padding, list rows, dividers`**

Then for sub-project B:
12. **`feat(electron): main process embedding Next.js server`**
13. **`feat(electron): tray + auto-update + electron-builder config`**
14. **`ci(electron): multi-OS build workflow`**

Push at the end: `git push -u origin feat/chatgpt-design-rework`.

### UniroCloud setup

1. `git remote add origin https://github.com/lekhang4497/uniro-cloud.git`
2. Verify remote: `git remote -v`
3. Commit current modified files in two groups:
   - `chore(infra): docker-compose + Makefile updates` (Makefile, docker-compose.yml)
   - `docs: add frontend deploy + router yaml notes` (infra/DEPLOY_FRONTEND.md, router_service/ROUTER_YAML.md)
4. `git push -u origin main`

### Success criteria (Commit & push)

1. `git status` shows clean working tree in both repos after final commits.
2. `gh repo view lekhang4497/uniro-frontend-v2 --json defaultBranchRef` returns the branch is reachable; same for `uniro-cloud`.
3. No file in any commit contains a secret per the regex scan above.
4. Frontend's `feat/chatgpt-design-rework` is pushed and visible on GitHub.
5. UniroCloud's `main` is pushed and visible on GitHub.
6. CI workflow runs at least once on the pushed commits.

---

## Open questions (none blocking)

- None — user has answered all blocking questions (UI scope = polish, UniroCloud remote = `lekhang4497/uniro-cloud`, Electron = embed Next.js, v1 features = tray + auto-update, branch = single feature branch).

## Future work (out of scope, noted for tracking)

- Code signing for Electron (Apple Developer cert + Windows cert).
- Apps-SDK Dialog presence in `apps-sdk-ui` future versions — re-evaluate when that ships.
- Adopting `@openai/apps-sdk-ui` as a real dep once it stabilizes more components (DataTable, Chart, etc.).
- Auto-launch toggle in the dashboard settings page (API already exposed in `preload.js`).
- An "Open in browser" affordance in the tray menu (opens default browser to the embedded server URL — useful for CLI tool config copy-paste).
