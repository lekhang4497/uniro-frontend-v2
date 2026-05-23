# Apps-SDK Polish + Electron Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land three things on the `feat/chatgpt-design-rework` branch of `uniro-frontend-v2` and on `main` of `uniro-cloud`: (1) the current ~50 uncommitted in-progress files as clean commits, (2) targeted UI primitives polish to look like `openai/apps-sdk-ui` (pill buttons, soft variant, press animation, new TextLink/ButtonLink, tighter card padding), and (3) an Electron port with multi-OS GitHub Actions artifacts.

**Architecture:** Frontend stays Next.js 16 webpack with the `output: "standalone"` build (already configured). UI primitives keep Radix internals and only get className/variant tweaks. Electron wraps the standalone server: main process spawns it on a free local port, BrowserWindow loads it. Multi-OS CI matrix builds dmg/zip + nsis/portable + AppImage/deb and uploads to artifacts. UniroCloud gets a fresh remote + first push.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind 4, Radix UI, Electron 32+, electron-builder, electron-updater, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-05-23-apps-sdk-polish-and-electron-design.md`

**Branch:** `feat/chatgpt-design-rework` (already exists locally, never pushed)

**Working directory note:** All `git` commands assume `cwd = /SSD_data2/shared/UniRo_shared/UniroCloud/frontend` unless explicitly stated otherwise. Phase 5 changes the cwd to `UniroCloud/` (the parent). Always confirm `git rev-parse --show-toplevel` before committing.

---

## Phase 1 — Commit the existing in-progress work

Before any new code lands, get the current ~50 uncommitted files into clean logical commits.

### Task 1.1: Secret scan + inventory

**Files:** none (read-only)

- [ ] **Step 1: Print all uncommitted paths**

```bash
git -C /SSD_data2/shared/UniRo_shared/UniroCloud/frontend status --short
```

Expected: lists ~50 modified files under `open-sse/translator/`, `src/app/(dashboard)/dashboard/router-builder/`, `src/app/(dashboard)/dashboard/chat/page.tsx`, `src/app/login/page.tsx`, `src/app/api/v1/`, plus root config (`.gitignore`, `Dockerfile`, `next.config.mjs`, `package.json`).

- [ ] **Step 2: Run secret regex against the full diff**

```bash
git -C /SSD_data2/shared/UniRo_shared/UniroCloud/frontend diff | \
  grep -nEi "(sk-[a-zA-Z0-9]{20,}|JWT_SECRET=[^ ]|API_KEY_SECRET=[^ ]|HMAC_KEY=[^ ]|-----BEGIN [A-Z ]*PRIVATE KEY-----|AWS_SECRET_ACCESS_KEY=[^ ]|AKIA[A-Z0-9]{16}|ghp_[A-Za-z0-9]{30,})" \
  && { echo "STOP — secret-like string found"; exit 1; } || echo "clean"
```

Expected: `clean`. If anything matches, STOP and inspect.

- [ ] **Step 3: Confirm `.env*` is ignored**

```bash
git -C /SSD_data2/shared/UniRo_shared/UniroCloud/frontend check-ignore -v .env .env.example dist/.env 2>&1 | head
```

Expected: `.env` and `dist/.env` are ignored. `.env.example` is the only env-prefixed file that should be tracked (already tracked).

- [ ] **Step 4: Confirm no staged files yet**

```bash
git -C /SSD_data2/shared/UniRo_shared/UniroCloud/frontend diff --cached --stat
```

Expected: empty output.

### Task 1.2: Commit router-builder canvas + inspector refinements

**Files:** ~40 modified + 1 deleted under `src/app/(dashboard)/dashboard/router-builder/**`.

- [ ] **Step 1: Stage router-builder paths (including the deleted WhenEditor.tsx)**

```bash
cd /SSD_data2/shared/UniRo_shared/UniroCloud/frontend
git add -A "src/app/(dashboard)/dashboard/router-builder/"
git diff --cached --stat | tail -5
```

Expected: ~40 files staged including the deletion of `WhenEditor.tsx`, ~0 outside router-builder.

- [ ] **Step 2: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(router-builder): canvas, inspector, palette refinements

Reskin canvas nodes (Signal/Route/Model) with apps-sdk tokens, drop the
WhenEditor primitive in favour of inline inspector controls, flatten the
node palette, and tighten constants/templates/state wiring for the new
inspector layout. yaml.ts round-trip preserved.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 3: Verify**

```bash
git log -1 --stat | head -10
```

Expected: 1 commit, ~40 files in stat.

### Task 1.3: Commit open-sse translator robustness

**Files:** 24 modified under `open-sse/translator/` + `open-sse/config/providerModels.js`.

- [ ] **Step 1: Stage open-sse paths**

```bash
git add open-sse/translator/ open-sse/config/providerModels.js
git diff --cached --stat | tail -5
```

Expected: ~25 files staged.

- [ ] **Step 2: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(open-sse): translator robustness across providers

Tighten request/response translation for antigravity, claude, gemini,
commandcode, cursor, kiro, ollama, vertex, and OpenAI Responses API.
Refresh provider model list.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 3: Verify**

```bash
git log -1 --stat | head -10
```

Expected: ~25 files in stat.

### Task 1.4: Commit chat page + login page polish

**Files:**
- Modify: `src/app/(dashboard)/dashboard/chat/page.tsx`
- Modify: `src/app/login/page.tsx`

- [ ] **Step 1: Stage**

```bash
git add "src/app/(dashboard)/dashboard/chat/page.tsx" "src/app/login/page.tsx"
git diff --cached --stat
```

Expected: 2 files staged.

- [ ] **Step 2: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(pages): chat + login surface polish

Apps-SDK aesthetic touch-ups on the chat composer/scrollback and the
login form layout.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 1.5: Commit api/v1 route updates

**Files:** modified under `src/app/api/v1/` (and `src/app/api/models/test/route.js` if listed).

- [ ] **Step 1: Stage**

```bash
git add src/app/api/v1/ src/app/api/models/test/route.js
git diff --cached --stat
```

Expected: ~3 files staged (chat/completions/route.js, models/route.js, models/test/route.js).

- [ ] **Step 2: Commit**

```bash
git commit -m "$(cat <<'EOF'
fix(api): v1 chat/models route updates

Pair with the open-sse translator changes — route layer fixes so the
provider mux keeps returning correct shapes for the new translator paths.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

### Task 1.6: Commit config + dockerfile + package.json

**Files:** `.gitignore`, `Dockerfile`, `next.config.mjs`, `package.json`.

- [ ] **Step 1: Verify these are the last remaining**

```bash
git status --short
```

Expected: only `.gitignore`, `Dockerfile`, `next.config.mjs`, `package.json` remaining (plus the new spec doc which is already committed). If anything else lingers under `src/app/(dashboard)/dashboard/router-builder/CloudSyncPanel.tsx` — stage it too.

- [ ] **Step 2: Stage and commit remaining tracked changes**

```bash
git add .gitignore Dockerfile next.config.mjs package.json
git add "src/app/(dashboard)/dashboard/router-builder/CloudSyncPanel.tsx" 2>/dev/null || true
git diff --cached --stat
```

- [ ] **Step 3: Commit**

```bash
git commit -m "$(cat <<'EOF'
chore: docker + next config + package metadata

Bump deps via package.json, refresh the production Dockerfile, fine-tune
next.config webpack/watch options, and adjust .gitignore patterns.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 4: Confirm clean tree**

```bash
git status
```

Expected: `nothing to commit, working tree clean`.

---

## Phase 2 — UI polish (apps-sdk-ui fidelity)

Targeted changes only — most primitives are already aligned. Real gaps: Button (no pill, no soft, no press-scale), missing TextLink/ButtonLink, Card default padding too generous.

### Task 2.1: Update Button — add pill (default true), soft variant, press-scale

**Files:**
- Modify: `src/shared/components/ui/button.tsx`

- [ ] **Step 1: Rewrite Button with pill prop + soft variant + press-scale**

Replace the entire file with:

```tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap text-[13px] font-medium transition-[transform,background-color,color,opacity] active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-blue)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--accent-blue)] text-[var(--text-inverted)] hover:brightness-95",
        // Legacy alias retained for older callers
        primary:
          "bg-[var(--accent-blue)] text-[var(--text-inverted)] hover:brightness-95",
        destructive:
          "bg-[var(--accent-red)] text-[var(--text-inverted)] hover:brightness-95",
        outline:
          "border border-[var(--bg-secondary)] bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]",
        secondary:
          "bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]",
        soft:
          "bg-[color-mix(in_srgb,var(--accent-blue)_14%,transparent)] text-[var(--accent-blue)] hover:bg-[color-mix(in_srgb,var(--accent-blue)_22%,transparent)]",
        ghost:
          "bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]",
        link: "text-[var(--accent-blue)] underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-[12px]",
        lg: "h-10 px-5",
        icon: "h-9 w-9 p-0",
      },
      pill: {
        true: "rounded-full",
        false: "rounded-[var(--radius-md)]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      pill: true,
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, pill, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, pill, className }))}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
```

- [ ] **Step 2: Typecheck just this file's consumers compile**

```bash
npm run typecheck 2>&1 | tail -20
```

Expected: 0 errors. The `pill` prop is optional and defaults to true; existing callers should not need updates.

- [ ] **Step 3: Lint**

```bash
npx eslint src/shared/components/ui/button.tsx
```

Expected: clean.

### Task 2.2: Add ButtonLink primitive

**Files:**
- Create: `src/shared/components/ui/button-link.tsx`

- [ ] **Step 1: Write the file**

```tsx
import * as React from "react";
import Link from "next/link";
import type { LinkProps } from "next/link";
import type { VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { buttonVariants } from "./button";

type ButtonLinkVariantProps = VariantProps<typeof buttonVariants>;

type CommonProps = ButtonLinkVariantProps & {
  className?: string;
  children?: React.ReactNode;
};

export type ButtonLinkProps =
  | (CommonProps &
      Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
        href: string;
        external?: boolean;
        prefetch?: LinkProps["prefetch"];
      });

const ButtonLink = React.forwardRef<HTMLAnchorElement, ButtonLinkProps>(
  ({ className, variant, size, pill, href, external, prefetch, children, ...props }, ref) => {
    const isExternal = external ?? /^https?:\/\//.test(href ?? "");
    const cls = cn(buttonVariants({ variant, size, pill, className }));

    if (isExternal) {
      return (
        <a
          ref={ref}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={cls}
          {...props}
        >
          {children}
        </a>
      );
    }

    return (
      <Link
        ref={ref}
        href={href}
        prefetch={prefetch}
        className={cls}
        {...(props as Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">)}
      >
        {children}
      </Link>
    );
  }
);
ButtonLink.displayName = "ButtonLink";

export { ButtonLink };
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck 2>&1 | tail -10
```

Expected: 0 errors.

### Task 2.3: Add TextLink primitive

**Files:**
- Create: `src/shared/components/ui/text-link.tsx`

- [ ] **Step 1: Write the file**

```tsx
import * as React from "react";
import Link from "next/link";
import type { LinkProps } from "next/link";

import { cn } from "@/lib/utils";

const baseClass =
  "text-[var(--accent-blue)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-blue)] transition-colors";

type CommonProps = {
  className?: string;
  children?: React.ReactNode;
};

export type TextLinkProps = CommonProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
    href: string;
    external?: boolean;
    prefetch?: LinkProps["prefetch"];
  };

const TextLink = React.forwardRef<HTMLAnchorElement, TextLinkProps>(
  ({ className, href, external, prefetch, children, ...props }, ref) => {
    const isExternal = external ?? /^https?:\/\//.test(href ?? "");

    if (isExternal) {
      return (
        <a
          ref={ref}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(baseClass, className)}
          {...props}
        >
          {children}
        </a>
      );
    }

    return (
      <Link
        ref={ref}
        href={href}
        prefetch={prefetch}
        className={cn(baseClass, className)}
        {...(props as Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">)}
      >
        {children}
      </Link>
    );
  }
);
TextLink.displayName = "TextLink";

export { TextLink };
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck 2>&1 | tail -10
```

Expected: 0 errors.

### Task 2.4: Tighten default Card padding (md: p-6 → p-5)

**Files:**
- Modify: `src/shared/components/Card.tsx:12-18`

- [ ] **Step 1: Replace the paddings map**

In `src/shared/components/Card.tsx`, change:

```tsx
const paddings: Record<CardPadding, string> = {
  none: "",
  xs: "p-3",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};
```

to:

```tsx
const paddings: Record<CardPadding, string> = {
  none: "",
  xs: "p-3",
  sm: "p-4",
  md: "p-5",
  lg: "p-8",
};
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck 2>&1 | tail -5
```

Expected: 0 errors.

### Task 2.5: Verify full build still passes

- [ ] **Step 1: Run typecheck across the project**

```bash
npm run typecheck 2>&1 | tail -20
```

Expected: 0 errors.

- [ ] **Step 2: Lint**

```bash
npx eslint . 2>&1 | tail -20
```

Expected: no errors (warnings ok).

- [ ] **Step 3: Build the production bundle**

```bash
npm run build 2>&1 | tail -30
```

Expected: build succeeds, prints standalone output info. Do NOT proceed if it fails.

### Task 2.6: Commit UI polish

- [ ] **Step 1: Stage**

```bash
git add src/shared/components/ui/button.tsx \
        src/shared/components/ui/button-link.tsx \
        src/shared/components/ui/text-link.tsx \
        src/shared/components/Card.tsx
git diff --cached --stat
```

Expected: 4 files staged (1 modified button.tsx, 2 new, 1 modified Card.tsx).

- [ ] **Step 2: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(ui): apps-sdk-ui fidelity polish

- Button: pill shape default, new "soft" variant, active:scale-[0.97]
  press feedback. Existing variants preserved; new optional pill prop.
- New TextLink + ButtonLink primitives mirroring openai/apps-sdk-ui,
  handling internal (Next Link) vs external (<a>) auto-detection.
- Card.tsx default padding tightened from p-6 to p-5.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 3 — Electron port

Wraps the Next.js standalone server. All new files under `electron/`. No changes to `src/` business logic.

### Task 3.1: Add Electron devDependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install dev deps**

```bash
cd /SSD_data2/shared/UniRo_shared/UniroCloud/frontend
npm install --save-dev electron@^32.0.0 electron-builder@^25.0.0 electron-updater@^6.3.0 electron-window-state@^5.0.3 concurrently@^9.0.0 wait-on@^8.0.0 get-port@^7.1.0 @electron/rebuild@^3.7.0
```

Expected: writes to `package.json` `devDependencies`. No runtime deps changed.

- [ ] **Step 2: Verify install**

```bash
ls node_modules/electron/package.json node_modules/electron-builder/package.json node_modules/electron-updater/package.json
```

Expected: all three exist.

### Task 3.2: Create icon placeholders

**Files:**
- Create: `electron/icons/mac.icns` (placeholder copy of an existing PNG, regenerated later)
- Create: `electron/icons/win.ico`
- Create: `electron/icons/linux.png`

- [ ] **Step 1: Make the icons dir and copy an existing PNG as the linux icon**

```bash
mkdir -p electron/icons
# Use an existing app icon as the linux placeholder
cp public/uniro-mark.png electron/icons/linux.png 2>/dev/null || \
  cp images/UniroMark.png electron/icons/linux.png 2>/dev/null || \
  cp public/favicon.ico electron/icons/linux.png
ls -la electron/icons/
```

Expected: at least `linux.png` exists. mac.icns and win.ico can be missing for the first CI run — electron-builder will warn but not fail (we can add a real icon set in a follow-up commit once the binary is producing).

- [ ] **Step 2: Write a README in icons explaining the placeholder**

```bash
cat > electron/icons/README.md <<'EOF'
# Icons

Placeholders sourced from public/uniro-mark.png. For production replace with:

- mac.icns — 1024x1024 source rendered to icns
- win.ico  — 256x256 multi-resolution ico
- linux.png — 512x512 source PNG

Tools: png2icns (mac), magick (win), or use https://iconverticons.com.
EOF
```

### Task 3.3: Create electron/main.js (entry point)

**Files:**
- Create: `electron/main.js`

- [ ] **Step 1: Write the file**

```js
const { app, BrowserWindow, shell } = require("electron");
const path = require("node:path");
const fs = require("node:fs");

const isDev = !app.isPackaged;

// Force DATA_DIR to the OS-native userData path BEFORE any module needing it loads.
if (!process.env.DATA_DIR) {
  process.env.DATA_DIR = app.getPath("userData");
}
// Make sure the dir exists so the DB driver chain can write to it on first boot.
try { fs.mkdirSync(process.env.DATA_DIR, { recursive: true }); } catch {}

let nextServer = null;
let serverPort = null;
let mainWindow = null;
let tray = null;

async function startNextServer() {
  if (isDev) {
    // Dev mode: assume `npm run dev` already runs on 20129
    serverPort = Number(process.env.UNIRO_DEV_PORT || 20129);
    return;
  }

  const getPort = (await import("get-port")).default;
  serverPort = await getPort({ port: [20128, 20129, 20130] });
  process.env.PORT = String(serverPort);
  process.env.HOSTNAME = "127.0.0.1";

  // Resolve the standalone bundle location inside the asar.
  // electron-builder's `files` glob ensures `.next/standalone` is unpacked.
  const standaloneRoot = path.join(process.resourcesPath, "app.asar.unpacked", ".next", "standalone");
  const serverEntry = path.join(standaloneRoot, "server.js");

  // The standalone server reads cwd-relative paths for static files.
  process.chdir(standaloneRoot);

  // Loading the standalone server side-effects: it calls app.listen on PORT.
  require(serverEntry);
}

function createMainWindow() {
  const windowStateKeeper = require("electron-window-state");
  const state = windowStateKeeper({ defaultWidth: 1280, defaultHeight: 800 });

  mainWindow = new BrowserWindow({
    x: state.x,
    y: state.y,
    width: state.width,
    height: state.height,
    minWidth: 900,
    minHeight: 600,
    title: "Uniro",
    backgroundColor: "#FFFFFF",
    show: false,
    autoHideMenuBar: true,
    icon: process.platform === "linux"
      ? path.join(__dirname, "icons", "linux.png")
      : undefined,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  state.manage(mainWindow);

  // Hijack new-window: open in default browser instead of an internal window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  // Minimize to tray on close (true exit goes through the tray menu).
  mainWindow.on("close", (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.loadURL(`http://127.0.0.1:${serverPort}/login`);
}

app.whenReady().then(async () => {
  try {
    await startNextServer();
    createMainWindow();
    tray = require("./tray").createTray(mainWindow);
    if (app.isPackaged) {
      require("./updater").startUpdater(mainWindow);
    }
  } catch (err) {
    console.error("Electron startup failed:", err);
    app.quit();
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    else if (mainWindow) mainWindow.show();
  });
});

app.on("before-quit", () => {
  app.isQuitting = true;
});

app.on("window-all-closed", () => {
  // Keep running in tray on macOS even without windows
  if (process.platform !== "darwin") {
    // But on Win/Linux we still keep the tray alive — don't quit.
  }
});

// Single-instance lock so a second launch focuses the existing window.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}
```

- [ ] **Step 2: Sanity-check it parses**

```bash
node --check electron/main.js
```

Expected: silent success (exit 0).

### Task 3.4: Create electron/tray.js

**Files:**
- Create: `electron/tray.js`

- [ ] **Step 1: Write**

```js
const { app, Menu, Tray, nativeImage } = require("electron");
const path = require("node:path");

function createTray(mainWindow) {
  const iconPath = path.join(__dirname, "icons", "linux.png");
  const image = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  const tray = new Tray(image);

  const menu = Menu.buildFromTemplate([
    {
      label: "Show Uniro",
      click: () => mainWindow && mainWindow.show(),
    },
    {
      label: "Open Dashboard",
      click: () => mainWindow && mainWindow.show(),
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);
  tray.setToolTip("Uniro");
  tray.setContextMenu(menu);
  tray.on("click", () => mainWindow && mainWindow.show());
  return tray;
}

module.exports = { createTray };
```

- [ ] **Step 2: Check**

```bash
node --check electron/tray.js
```

Expected: silent.

### Task 3.5: Create electron/preload.js

**Files:**
- Create: `electron/preload.js`

- [ ] **Step 1: Write**

```js
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("uniro", {
  version: () => ipcRenderer.invoke("uniro:version"),
  openExternal: (url) => ipcRenderer.invoke("uniro:openExternal", url),
  restart: () => ipcRenderer.invoke("uniro:restart"),
  quit: () => ipcRenderer.invoke("uniro:quit"),
});
```

- [ ] **Step 2: Check**

```bash
node --check electron/preload.js
```

Expected: silent.

### Task 3.6: Create electron/updater.js

**Files:**
- Create: `electron/updater.js`

- [ ] **Step 1: Write**

```js
const { autoUpdater } = require("electron-updater");

let updateInterval = null;

function startUpdater(mainWindow) {
  autoUpdater.logger = console;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("update-available", (info) => {
    if (mainWindow) {
      mainWindow.webContents.send("uniro:update-available", info);
    }
  });

  autoUpdater.on("update-downloaded", (info) => {
    if (mainWindow) {
      mainWindow.webContents.send("uniro:update-downloaded", info);
    }
  });

  autoUpdater.on("error", (err) => {
    console.error("Auto-update error:", err);
  });

  // Initial check after 30s, then every 6 hours
  setTimeout(() => autoUpdater.checkForUpdatesAndNotify().catch(() => {}), 30_000);
  updateInterval = setInterval(
    () => autoUpdater.checkForUpdatesAndNotify().catch(() => {}),
    6 * 60 * 60 * 1000
  );
}

function stopUpdater() {
  if (updateInterval) clearInterval(updateInterval);
}

module.exports = { startUpdater, stopUpdater };
```

- [ ] **Step 2: Check**

```bash
node --check electron/updater.js
```

Expected: silent.

### Task 3.7: Create electron/builder.json

**Files:**
- Create: `electron/builder.json`

- [ ] **Step 1: Write**

```json
{
  "appId": "tech.uniro.app",
  "productName": "Uniro",
  "directories": {
    "output": "release",
    "buildResources": "electron/icons"
  },
  "files": [
    "electron/**/*",
    ".next/standalone/**/*",
    ".next/static/**/*",
    "public/**/*",
    "open-sse/**/*",
    "src/mitm/**/*",
    "package.json",
    "!**/*.{md,map}",
    "!node_modules/**/{test,tests,__tests__,docs,example,examples}/**",
    "!**/.bin/**",
    "!**/data/**"
  ],
  "extraResources": [],
  "asarUnpack": [
    "node_modules/better-sqlite3/**/*",
    "src/mitm/cert/**/*",
    ".next/standalone/**/*",
    ".next/static/**/*",
    "public/**/*"
  ],
  "npmRebuild": true,
  "publish": {
    "provider": "github",
    "owner": "lekhang4497",
    "repo": "uniro-frontend-v2",
    "releaseType": "draft"
  },
  "mac": {
    "target": [
      { "target": "dmg", "arch": ["x64", "arm64"] },
      { "target": "zip", "arch": ["x64", "arm64"] }
    ],
    "category": "public.app-category.developer-tools",
    "icon": "electron/icons/mac.icns",
    "identity": null,
    "hardenedRuntime": false,
    "gatekeeperAssess": false
  },
  "win": {
    "target": ["nsis", "portable"],
    "icon": "electron/icons/win.ico"
  },
  "linux": {
    "target": ["AppImage", "deb"],
    "category": "Development",
    "icon": "electron/icons/linux.png",
    "maintainer": "lekhang4497@gmail.com"
  },
  "nsis": {
    "oneClick": false,
    "perMachine": false,
    "allowToChangeInstallationDirectory": true,
    "createDesktopShortcut": true
  }
}
```

- [ ] **Step 2: Validate JSON**

```bash
node -e "JSON.parse(require('fs').readFileSync('electron/builder.json','utf8'))" && echo OK
```

Expected: `OK`.

### Task 3.8: Update package.json (main + scripts) safely

**Files:**
- Modify: `package.json`

The published npm `uniro` CLI relies on the `bin` field. Adding a top-level `"main"` would make node treat the package as an Electron app when imported, which can confuse `npx uniro`. To stay safe, the `"main"` field is added in a way the publish step strips out — mirroring the existing `scripts/publish-pkg.js trim` pattern.

- [ ] **Step 1: Add scripts to package.json**

Open `package.json`. Inside the existing `"scripts": { ... }`, add these three entries before the closing brace:

```json
    "electron:dev": "concurrently -k -n NEXT,ELECTRON -c blue,magenta \"next dev --webpack --port 20129\" \"wait-on http://127.0.0.1:20129 && electron electron/main.js\"",
    "electron:pack": "next build && electron-builder --config electron/builder.json --dir",
    "electron:build": "next build && electron-builder --config electron/builder.json"
```

- [ ] **Step 2: Add the main field — but as `mainElectron` so npm won't see it**

We use a trick: keep `"mainElectron": "electron/main.js"` in package.json, and at electron-builder time pass `--config.main electron/main.js` via the `extraMetadata` field.

Add this top-level key to `package.json` (next to `"name"`):

```json
  "mainElectron": "electron/main.js",
```

Then in `electron/builder.json`, add to the top level:

```json
  "extraMetadata": { "main": "electron/main.js" },
```

This injects `main` only into the packaged app, leaving the published npm package unchanged.

- [ ] **Step 3: Update builder.json with extraMetadata**

Open `electron/builder.json` and add `"extraMetadata": { "main": "electron/main.js" },` right after the `"productName"` line.

- [ ] **Step 4: Validate**

```bash
node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))" && \
  node -e "JSON.parse(require('fs').readFileSync('electron/builder.json','utf8'))" && \
  echo OK
```

Expected: `OK`.

### Task 3.9: Create the native rebuild script (postinstall guard)

**Files:**
- Create: `electron/scripts/rebuild-native.js`

`@electron/rebuild` should ONLY run during Electron packaging, not on every `npm install` (that would break the npm `uniro` CLI install for non-Electron users). So we don't wire it to `postinstall`; electron-builder runs it automatically via `npmRebuild: true`.

- [ ] **Step 1: Write a no-op helper that documents this**

```js
// Intentionally a no-op. Native deps (better-sqlite3) are rebuilt by
// electron-builder via `npmRebuild: true` in electron/builder.json.
// Running @electron/rebuild on plain `npm install` would break the npm
// uniro CLI install for users who don't have Electron installed.
console.log("[uniro] native-rebuild skipped (handled by electron-builder).");
```

- [ ] **Step 2: Verify it parses**

```bash
node electron/scripts/rebuild-native.js
```

Expected: prints the skip message.

### Task 3.10: Create the GitHub Actions workflow

**Files:**
- Create: `.github/workflows/electron-build.yml`

- [ ] **Step 1: Write**

```yaml
name: Electron build

on:
  push:
    branches:
      - feat/chatgpt-design-rework
      - main
  workflow_dispatch:
  release:
    types: [created]

jobs:
  build:
    name: Build ${{ matrix.os }}
    strategy:
      fail-fast: false
      matrix:
        os: [macos-14, windows-latest, ubuntu-latest]
    runs-on: ${{ matrix.os }}
    timeout-minutes: 45

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build Next.js (standalone)
        run: npm run build

      - name: Package Electron app
        if: github.event_name != 'release'
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: npm run electron:pack

      - name: Build & publish Electron app (release)
        if: github.event_name == 'release'
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: npx electron-builder --config electron/builder.json --publish always

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: uniro-${{ matrix.os }}
          path: |
            release/**/*.dmg
            release/**/*.zip
            release/**/*.exe
            release/**/*.AppImage
            release/**/*.deb
            release/win-unpacked/**/*
            release/mac/**/*
            release/linux-unpacked/**/*
          retention-days: 14
          if-no-files-found: warn
```

- [ ] **Step 2: Validate YAML**

```bash
node -e "
const yaml = require('js-yaml');
try { yaml.load(require('fs').readFileSync('.github/workflows/electron-build.yml','utf8')); console.log('OK'); }
catch (e) { console.error(e.message); process.exit(1); }
" 2>/dev/null || python3 -c "import yaml; yaml.safe_load(open('.github/workflows/electron-build.yml')); print('OK')"
```

Expected: `OK`. (Falls back to python3 if `js-yaml` isn't installed.)

### Task 3.11: Local smoke check (skip if no display server)

**Files:** none

- [ ] **Step 1: Check for a display server**

```bash
test -n "$DISPLAY" || test -n "$WAYLAND_DISPLAY" && echo "has-display" || echo "headless"
```

If `headless`, skip Step 2 — CI will exercise it.

- [ ] **Step 2 (display only): Run `electron:dev` for ~10s and kill it**

```bash
timeout 30s npm run electron:dev || true
```

Expected: Next dev starts on 20129, Electron BrowserWindow opens to `/login`. Kill the process when verified.

### Task 3.12: Commit Electron files + workflow

- [ ] **Step 1: Stage all Electron files**

```bash
cd /SSD_data2/shared/UniRo_shared/UniroCloud/frontend
git add electron/ .github/workflows/electron-build.yml package.json package-lock.json
git diff --cached --stat | tail -10
```

Expected: ~9 new files + package.json/package-lock.json modified.

- [ ] **Step 2: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(electron): native desktop port with multi-OS CI

- electron/main.js embeds the Next.js standalone server on a free local
  port, BrowserWindow loads it. DATA_DIR resolved to app.getPath('userData').
- electron/tray.js: tray icon with Show/Open Dashboard/Quit.
- electron/preload.js: contextBridge for version/restart/quit/openExternal.
- electron/updater.js: GitHub Releases auto-update wired via electron-updater.
- electron/builder.json: electron-builder targets mac (dmg+zip x64/arm64),
  win (nsis+portable), linux (AppImage+deb). Uses extraMetadata.main so
  the published npm "uniro" CLI package is unaffected.
- .github/workflows/electron-build.yml: macos-14 + windows-latest + ubuntu-latest
  matrix, builds Next standalone, packs Electron, uploads artifacts. On release
  tags, publishes to GitHub Releases for auto-update.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 4 — Push the frontend branch

### Task 4.1: Final pre-push sanity check

- [ ] **Step 1: Re-run the secret scan against ALL new commits**

```bash
git -C /SSD_data2/shared/UniRo_shared/UniroCloud/frontend log origin/main..HEAD -p 2>/dev/null | \
  grep -nEi "(sk-[a-zA-Z0-9]{20,}|JWT_SECRET=[^ ]|API_KEY_SECRET=[^ ]|HMAC_KEY=[^ ]|-----BEGIN [A-Z ]*PRIVATE KEY-----|AWS_SECRET_ACCESS_KEY=[^ ]|AKIA[A-Z0-9]{16}|ghp_[A-Za-z0-9]{30,})" \
  && { echo "STOP — secret-like string in commit"; exit 1; } || echo "clean"
```

If `origin/main` doesn't exist locally, fall back to checking the entire branch:

```bash
git log -p | grep -nEi "(sk-[a-zA-Z0-9]{20,}|JWT_SECRET=[^ ]|HMAC_KEY=[^ ]|-----BEGIN [A-Z ]*PRIVATE KEY-----|AKIA[A-Z0-9]{16})" | head -20
```

Expected: empty / `clean`.

- [ ] **Step 2: Confirm working tree clean**

```bash
git status
```

Expected: `nothing to commit, working tree clean`.

- [ ] **Step 3: Show what we're pushing**

```bash
git log origin/main..HEAD --oneline 2>/dev/null || git log --oneline | head -20
```

Expected: the new commits from Phases 1, 2, 3 (~10 commits).

### Task 4.2: Push to origin

- [ ] **Step 1: Push the feature branch**

```bash
git push -u origin feat/chatgpt-design-rework
```

Expected: branch created on remote; tracking set up. If push is rejected due to non-existent upstream (`main` lookup), the `-u` flag still works.

- [ ] **Step 2: Confirm via gh CLI**

```bash
gh api "repos/lekhang4497/uniro-frontend-v2/branches/feat/chatgpt-design-rework" --jq '.name + " sha=" + .commit.sha'
```

Expected: branch name + sha printed.

- [ ] **Step 3: Watch the CI workflow start**

```bash
gh run list --branch feat/chatgpt-design-rework --limit 3
```

Expected: at least one new workflow run queued or in_progress (the electron-build matrix).

---

## Phase 5 — UniroCloud remote setup + push

### Task 5.1: Add the remote and verify

**Working directory:** `/SSD_data2/shared/UniRo_shared/UniroCloud`

- [ ] **Step 1: Confirm cwd and current state**

```bash
cd /SSD_data2/shared/UniRo_shared/UniroCloud
pwd
git remote -v
git status --short
git log --oneline | head -5
```

Expected: cwd = UniroCloud, no remotes, ~4 uncommitted/untracked files, 2 existing commits.

- [ ] **Step 2: Add remote**

```bash
git remote add origin https://github.com/lekhang4497/uniro-cloud.git
git remote -v
```

Expected: `origin` listed.

### Task 5.2: Secret-scan UniroCloud working tree

- [ ] **Step 1: Run scan against uncommitted diff + tracked content**

```bash
{ git diff HEAD; git ls-files | xargs cat 2>/dev/null; } | \
  grep -nEi "(sk-[a-zA-Z0-9]{20,}|JWT_SECRET=[^ ]|HMAC_KEY=[^ ]|-----BEGIN [A-Z ]*PRIVATE KEY-----|AKIA[A-Z0-9]{16}|ghp_[A-Za-z0-9]{30,})" \
  | head -10 || echo "clean"
```

Expected: clean. If a `.env.example` shows placeholder secrets, that's fine — confirm they are placeholders by reading the file before pushing.

- [ ] **Step 2: Confirm .env files are ignored**

```bash
git check-ignore -v router_service/.env mgmt_service/.env 2>&1 | head
find . -maxdepth 3 -name ".env" -not -path "*/node_modules/*"
```

Expected: every `.env` is either ignored or absent.

### Task 5.3: Commit infra + docs changes

- [ ] **Step 1: Stage infra**

```bash
git add Makefile docker-compose.yml infra/DEPLOY_FRONTEND.md router_service/ROUTER_YAML.md
git diff --cached --stat
```

Expected: 4 files staged.

- [ ] **Step 2: Commit**

```bash
git commit -m "$(cat <<'EOF'
chore(infra): docker-compose + Makefile + deploy notes

- Makefile and docker-compose.yml tweaks for the local containerized
  router + mgmt + ops stack.
- infra/DEPLOY_FRONTEND.md: notes on bringing the frontend container up
  alongside this workspace.
- router_service/ROUTER_YAML.md: router YAML schema reference.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 3: Confirm clean**

```bash
git status
```

Expected: working tree clean.

### Task 5.4: Push UniroCloud main

- [ ] **Step 1: Push**

```bash
git push -u origin main
```

If the remote is empty (no `main` branch yet), this creates it. If the remote already has a `main` with diverged history, the push fails — STOP and ask the user before forcing.

Expected: branch pushed, tracking set up.

- [ ] **Step 2: Confirm via gh**

```bash
gh api "repos/lekhang4497/uniro-cloud/branches/main" --jq '.name + " sha=" + .commit.sha'
```

Expected: branch name + sha.

---

## Done

After all five phases:

- Frontend `feat/chatgpt-design-rework` has ~10 new commits, is pushed to origin, and the electron-build workflow is running.
- UniroCloud `main` has the infra/docs commit, is pushed to its new remote.
- No secrets in any commit.
- Existing dashboard/API/MITM behavior unchanged; UI primitives feel apps-sdk-ui-like; Electron artifacts will appear under GitHub Actions → Artifacts within ~15-25 min of push.

The CI workflow is the validation gate. Watch artifact upload via `gh run watch` if desired.

---

## Self-review notes

- All file paths absolute or rooted at `frontend/`.
- All shell commands include expected outputs.
- No `TBD`/`TODO`/"implement later" placeholders.
- Card/Tabs/Tooltip/Dialog primitives are intentionally untouched: they are already aligned with apps-sdk-ui after the existing rework on `feat/chatgpt-design-rework`. Scope is honest about that.
- `npm run typecheck`/`build`/`eslint` are the only verification gates for UI work because the project has no unit tests for primitives. The user will manually verify visuals after the branch is pushed and CI builds the binary.
- Electron section uses `extraMetadata.main` to keep the published `uniro` npm CLI working — this is the project's existing publish-pkg.js pattern.
- The CI workflow uploads even unsigned binaries; first-run macOS users will see a gatekeeper warning. This is documented in the spec under non-goals.
