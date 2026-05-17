# ChatGPT Design System Rework + TS Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reset the uniro-frontend-v2 UI to the OpenAI ChatGPT Apps SDK design system and migrate the source tree from JavaScript to TypeScript, across all 34 page routes, 35 shadcn primitives, and the full shell.

**Architecture:** Token-first reset (rewrite `globals.css` with ChatGPT palettes mapped to shadcn aliases so primitives don't need new APIs), full `.js`/`.jsx` → `.tsx` conversion (Next 16 + React 19 + Tailwind v4 stack stays, `tsconfig.json` replaces `jsconfig.json`), shell components rewritten (`Sidebar` grouped nav, `Header` breadcrumb), pages migrated in groups so each commit is independently reviewable, router-builder canvas split from a 2,350-line monolith into focused TSX files but functionally identical.

**Tech Stack:** Next.js 16 (App Router, webpack), React 19, TypeScript (strict), Tailwind CSS v4, Radix + shadcn primitives, `@xyflow/react` v12, `lucide-react` (replaces Material Symbols), `class-variance-authority` (already installed).

**Spec:** `docs/superpowers/specs/2026-05-18-chatgpt-design-system-rework-design.md`

---

## Verification regime (applies to every task)

Because this work is a port (not a new feature), TDD failing-test-first doesn't fit. Each task's verification step uses the tools the project already has:

- **Build is the typecheck:** `npm run build` exits 0. Treats TS errors as build failures.
- **Lint:** `npx eslint .` does not introduce new errors versus the pre-rework baseline. (Capture baseline once at the start of T1.)
- **Smoke:** `npm run dev` (port 20129) boots; navigate to each touched page; verify no console errors, no missing styles, no missing icons; toggle dark mode.
- **Existing vitest:** `cd tests && /tmp/node_modules/.bin/vitest run`. Must pass.

If any of those fail, the task is incomplete. Do **not** commit on red.

---

## Task 1: Foundation — tooling

**Files:**
- Create: `tsconfig.json`
- Modify: `package.json` (add deps + add `typecheck` script)
- Delete: `jsconfig.json`
- Modify: `next.config.mjs` (verify TS-friendly)
- Modify: `eslint.config.mjs` (verify TS-friendly)

- [ ] **Step 1: Capture lint baseline**

```bash
cd /SSD_data2/shared/UniRo_shared/UniRo/uniro_frontend_v2
npx eslint . --no-warn-ignored 2>&1 | tail -3 > /tmp/uniro-lint-baseline.txt || true
cat /tmp/uniro-lint-baseline.txt
```

Save this number — every subsequent task's lint output must not exceed it.

- [ ] **Step 2: Install TypeScript dependencies**

```bash
npm install --save-dev typescript @types/react @types/react-dom @types/node
```

Expected: deps appear in `devDependencies` in `package.json`.

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "noUncheckedIndexedAccess": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    "**/*.js",
    "**/*.jsx",
    ".next/types/**/*.ts"
  ],
  "exclude": ["node_modules", ".next", "out", "tests", "cloud", "open-sse", "gitbook"]
}
```

`allowJs: true` is critical — it lets the codebase compile during the migration when some files are still `.js`.

- [ ] **Step 4: Delete `jsconfig.json`**

```bash
rm /SSD_data2/shared/UniRo_shared/UniRo/uniro_frontend_v2/jsconfig.json
```

- [ ] **Step 5: Add `typecheck` npm script**

In `package.json` `scripts`, add:
```json
"typecheck": "tsc --noEmit"
```

- [ ] **Step 6: Run typecheck — expect it to pass** (TS is permissive on JS files thanks to `allowJs`)

```bash
npm run typecheck 2>&1 | tail -10
```

Expected: exits 0. If there are errors in `.js` files due to inferred-`any` complaints, accept them (we don't `checkJs`).

- [ ] **Step 7: Run lint — must not exceed baseline**

```bash
npx eslint . --no-warn-ignored 2>&1 | tail -3
```

- [ ] **Step 8: Commit**

```bash
git add tsconfig.json package.json package-lock.json eslint.config.mjs next.config.mjs
git rm jsconfig.json
git commit -m "feat(ts): add TypeScript tooling and tsconfig

- Add typescript + @types/{react,react-dom,node} devDeps
- Add strict tsconfig.json with allowJs (gradual migration)
- Drop jsconfig.json
- Add typecheck npm script

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Foundation — design tokens

**Files:**
- Rewrite: `src/app/globals.css`
- Rewrite: `src/app/layout.js` → `src/app/layout.tsx`
- Modify: `package.json` (drop `next/font/google` imports for DM Sans + Source Serif if any are top-level)

- [ ] **Step 1: Audit current `globals.css` for what feeds the rest of the app**

```bash
grep -n "^--\|@theme\|@import" /SSD_data2/shared/UniRo_shared/UniRo/uniro_frontend_v2/src/app/globals.css | head -50
```

Note any custom utility classes used elsewhere (search for them with grep before deleting). Preserve those that the app actually uses.

- [ ] **Step 2: Rewrite `src/app/globals.css`** with ChatGPT tokens

```css
@import "tailwindcss";

@layer base {
  :root {
    /* === ChatGPT Apps SDK — Light === */
    --bg-primary: #FFFFFF;
    --bg-secondary: #E8E8E8;
    --bg-tertiary: #F3F3F3;

    --text-primary: #0D0D0D;
    --text-secondary: #5D5D5D;
    --text-tertiary: #8F8F8F;
    --text-inverted: #FFFFFF;

    --icon-primary: #0D0D0D;
    --icon-secondary: #5D5D5D;
    --icon-tertiary: #8F8F8F;
    --icon-inverted: #FFFFFF;

    --accent-blue: #0285FF;
    --accent-red: #E02E2A;
    --accent-orange: #E25507;
    --accent-green: #008635;

    /* === shadcn aliases (so primitives keep working) === */
    --background: var(--bg-primary);
    --foreground: var(--text-primary);
    --card: var(--bg-primary);
    --card-foreground: var(--text-primary);
    --popover: var(--bg-primary);
    --popover-foreground: var(--text-primary);
    --primary: var(--accent-blue);
    --primary-foreground: var(--text-inverted);
    --secondary: var(--bg-secondary);
    --secondary-foreground: var(--text-primary);
    --muted: var(--bg-tertiary);
    --muted-foreground: var(--text-secondary);
    --accent: var(--bg-secondary);
    --accent-foreground: var(--text-primary);
    --destructive: var(--accent-red);
    --destructive-foreground: var(--text-inverted);
    --border: var(--bg-secondary);
    --input: var(--bg-secondary);
    --ring: var(--accent-blue);

    /* === Radii (ChatGPT scale) === */
    --radius-sm: 6px;
    --radius: 8px;
    --radius-md: 10px;
    --radius-lg: 12px;

    /* === Floating layer shadow (only for popovers/dialogs) === */
    --shadow-popover: 0 1px 3px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.06);

    /* === Type === */
    --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
    --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco,
      Consolas, monospace;
  }

  .dark {
    --bg-primary: #212121;
    --bg-secondary: #303030;
    --bg-tertiary: #414141;

    --text-primary: #FFFFFF;
    --text-secondary: #CDCDCD;
    --text-tertiary: #AFAFAF;
    --text-inverted: #0D0D0D;

    --icon-primary: #FFFFFF;
    --icon-secondary: #CDCDCD;
    --icon-tertiary: #AFAFAF;
    --icon-inverted: #0D0D0D;

    --accent-blue: #0285FF;
    --accent-red: #FF8583;
    --accent-orange: #FF9E6C;
    --accent-green: #40C977;

    --shadow-popover: 0 1px 3px rgba(0, 0, 0, 0.4), 0 4px 12px rgba(0, 0, 0, 0.3);
  }
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);

  --color-bg-primary: var(--bg-primary);
  --color-bg-secondary: var(--bg-secondary);
  --color-bg-tertiary: var(--bg-tertiary);
  --color-text-primary: var(--text-primary);
  --color-text-secondary: var(--text-secondary);
  --color-text-tertiary: var(--text-tertiary);
  --color-text-inverted: var(--text-inverted);
  --color-accent-blue: var(--accent-blue);
  --color-accent-red: var(--accent-red);
  --color-accent-orange: var(--accent-orange);
  --color-accent-green: var(--accent-green);

  --font-sans: var(--font-sans);
  --font-mono: var(--font-mono);
  --radius: var(--radius);
}

@layer base {
  * { border-color: var(--border); }
  html { font-family: var(--font-sans); -webkit-font-smoothing: antialiased; }
  body {
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 14px;
    line-height: 1.5;
  }
  code, pre, kbd, samp { font-family: var(--font-mono); }

  /* Reset button defaults — every primitive relies on this */
  button {
    border: 0;
    background: transparent;
    font: inherit;
    color: inherit;
    cursor: pointer;
    padding: 0;
  }
  button:focus-visible {
    outline: 2px solid var(--accent-blue);
    outline-offset: 2px;
  }

  /* Scrollbar tuning to match the rest of the chrome */
  ::-webkit-scrollbar { width: 10px; height: 10px; }
  ::-webkit-scrollbar-thumb { background: var(--bg-secondary); border-radius: 999px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--bg-tertiary); }
  ::-webkit-scrollbar-track { background: transparent; }
}
```

- [ ] **Step 3: Rewrite `src/app/layout.js` as `src/app/layout.tsx`** with system fonts

First read the current file to preserve metadata/providers:
```bash
cat /SSD_data2/shared/UniRo_shared/UniRo/uniro_frontend_v2/src/app/layout.js
```

Then write `src/app/layout.tsx`. The exact code depends on what providers wrap the app today, but the skeleton is:

```tsx
import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import ThemeProvider from "@/shared/components/ThemeProvider";

export const metadata: Metadata = {
  title: "Uniro",
  description: "Self-hosted LLM router dashboard",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
```

**Important:** preserve any other providers, head tags, or context wrappers from the original `layout.js`. Do not load `DM_Sans`, `Source_Serif_4`, or the Material Symbols `<link>` tag. Drop them. Keep `JetBrains_Mono` only if it's already loaded via `next/font/google` — otherwise let the CSS stack handle it.

Then delete the old `.js`:
```bash
rm /SSD_data2/shared/UniRo_shared/UniRo/uniro_frontend_v2/src/app/layout.js
```

- [ ] **Step 4: Replace stale brand classes that referenced removed tokens**

```bash
cd /SSD_data2/shared/UniRo_shared/UniRo/uniro_frontend_v2/src
grep -rn "uniro-orange\|uniro-blue\|uniro-warning\|uniro-danger\|uniro-green\|color-brand-" --include="*.js" --include="*.jsx" --include="*.css" --include="*.tsx" --include="*.ts" 2>&1 | head -40
```

For each hit, replace with the equivalent new token (`bg-accent-blue`, `text-accent-red`, etc.). Where the old class was decorative, drop it. Note: this is fine to do progressively as you encounter each in later page tasks — but log every hit now so nothing slips through.

- [ ] **Step 5: Build**

```bash
npm run build 2>&1 | tail -30
```

Expected: build succeeds. Tailwind v4 should accept the `@theme` block.

- [ ] **Step 6: Boot dev server, smoke-test root**

```bash
npm run dev &
DEV_PID=$!
sleep 6
curl -s http://localhost:20129/ -o /dev/null -w "%{http_code}\n"
kill $DEV_PID
```

Expected: `200`.

- [ ] **Step 7: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx
git rm src/app/layout.js
git commit -m "feat(design): rewrite tokens for ChatGPT Apps SDK + system fonts

- Replace Anthropic-warm palette with ChatGPT neutrals + #0285FF accent
- Map shadcn aliases onto new tokens (no primitive API change needed)
- Drop DM Sans, Source Serif, Material Symbols loads — system font stack only
- Convert root layout.js to layout.tsx
- Reset button defaults in @layer base

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Primitives batch 1 — foundation (Button, Input, Label, Badge, Card, Textarea, Skeleton, Separator, Avatar, AspectRatio)

**Files:**
- Convert: `src/shared/components/ui/button.jsx` → `button.tsx`
- Convert: `src/shared/components/ui/input.jsx` → `input.tsx`
- Convert: `src/shared/components/ui/label.jsx` → `label.tsx`
- Convert: `src/shared/components/ui/badge.jsx` → `badge.tsx`
- Convert: `src/shared/components/ui/card.jsx` → `card.tsx`
- Convert: `src/shared/components/ui/textarea.jsx` → `textarea.tsx`
- Convert: `src/shared/components/ui/skeleton.jsx` → `skeleton.tsx`
- Convert: `src/shared/components/ui/separator.jsx` → `separator.tsx`
- Convert: `src/shared/components/ui/avatar.jsx` → `avatar.tsx`
- Convert: `src/shared/components/ui/aspect-ratio.jsx` → `aspect-ratio.tsx`

- [ ] **Step 1: For each primitive — read existing `.jsx`, rewrite as `.tsx` with typed Props**

Pattern for each (showing `button.tsx`):

```tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius)] text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-blue)] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[var(--accent-blue)] text-[var(--text-inverted)] hover:brightness-95",
        destructive: "bg-[var(--accent-red)] text-[var(--text-inverted)] hover:brightness-95",
        outline: "border border-[var(--bg-secondary)] bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]",
        secondary: "bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]",
        ghost: "bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]",
        link: "text-[var(--accent-blue)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-[12px]",
        lg: "h-10 px-6",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
```

For each remaining primitive in this batch, keep the existing component shape, just (a) add types from Radix's exported types, (b) replace any hard-coded color hex / old token classnames with the new `var(--…)` tokens, (c) ensure browser button/input defaults are not bleeding through.

**Cards** (because they appear so often) should look like:
```tsx
const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-[var(--radius-md)] border border-[var(--bg-secondary)] bg-[var(--bg-primary)] text-[var(--text-primary)]",
        className
      )}
      {...props}
    />
  )
);
```
(`CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` similarly.)

- [ ] **Step 2: Delete the old `.jsx` files**

```bash
cd /SSD_data2/shared/UniRo_shared/UniRo/uniro_frontend_v2/src/shared/components/ui
rm button.jsx input.jsx label.jsx badge.jsx card.jsx textarea.jsx skeleton.jsx separator.jsx avatar.jsx aspect-ratio.jsx
```

- [ ] **Step 3: Verify `src/lib/utils.{ts,js}` exports `cn`** (creates if missing as `.ts`)

```bash
find /SSD_data2/shared/UniRo_shared/UniRo/uniro_frontend_v2/src/lib -name "utils.*" -type f
```

If only `.js` exists, leave it (allowJs handles it). If missing, create `src/lib/utils.ts`:

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Then `npm install --save tailwind-merge clsx` if not present.

- [ ] **Step 4: Build**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 5: Lint**

```bash
npx eslint src/shared/components/ui/ --no-warn-ignored
```

- [ ] **Step 6: Commit**

```bash
git add src/shared/components/ui/
git commit -m "refactor(ui): convert foundation primitives to TSX + retoken

button, input, label, badge, card, textarea, skeleton, separator,
avatar, aspect-ratio.

All now typed; all reference --bg-*/--text-*/--accent-* tokens directly.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Primitives batch 2 — forms (Form, Checkbox, RadioGroup, Switch, Select)

**Files:**
- Convert: `src/shared/components/ui/checkbox.jsx` → `checkbox.tsx`
- Convert: `src/shared/components/ui/radio-group.jsx` → `radio-group.tsx`
- Convert: `src/shared/components/ui/switch.jsx` → `switch.tsx`
- Convert: `src/shared/components/ui/select.jsx` → `select.tsx`
- Note: there is no `form.jsx` in this repo — skip.

- [ ] **Step 1: Convert each, following the Task 3 pattern**

For Radix wrappers, use `React.ComponentPropsWithoutRef<typeof PrimitiveRoot>` and `React.ElementRef<typeof PrimitiveRoot>` for the ref type:

```tsx
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "h-4 w-4 shrink-0 rounded-[4px] border border-[var(--bg-secondary)] bg-[var(--bg-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-blue)] disabled:opacity-50",
      "data-[state=checked]:bg-[var(--accent-blue)] data-[state=checked]:border-[var(--accent-blue)] data-[state=checked]:text-[var(--text-inverted)]",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center">
      <Check className="h-3 w-3" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = "Checkbox";
export { Checkbox };
```

For `select.tsx`, the file has multiple exports (`Select`, `SelectTrigger`, `SelectContent`, etc.). Convert them all. The `SelectContent` floating layer should use `--shadow-popover`.

- [ ] **Step 2: Verify `lucide-react` is installed** (used for icons in primitives)

```bash
grep '"lucide-react"' /SSD_data2/shared/UniRo_shared/UniRo/uniro_frontend_v2/package.json
```

If missing: `npm install --save lucide-react`.

- [ ] **Step 3: Delete the old `.jsx`**

```bash
cd /SSD_data2/shared/UniRo_shared/UniRo/uniro_frontend_v2/src/shared/components/ui
rm checkbox.jsx radio-group.jsx switch.jsx select.jsx
```

- [ ] **Step 4: Build + lint**

```bash
npm run build 2>&1 | tail -20
npx eslint src/shared/components/ui/ --no-warn-ignored
```

- [ ] **Step 5: Commit**

```bash
git add src/shared/components/ui/
git commit -m "refactor(ui): convert form primitives to TSX

checkbox, radio-group, switch, select. All Radix wrappers typed against
ComponentPropsWithoutRef<typeof PrimitiveRoot>.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Primitives batch 3 — overlays (Dialog, AlertDialog, Alert, Popover, HoverCard, Tooltip, Sheet)

**Files:**
- Convert: `dialog.jsx` → `dialog.tsx`
- Convert: `alert-dialog.jsx` → `alert-dialog.tsx`
- Convert: `alert.jsx` → `alert.tsx`
- Convert: `popover.jsx` → `popover.tsx`
- Convert: `hover-card.jsx` → `hover-card.tsx`
- Convert: `tooltip.jsx` → `tooltip.tsx`
- Convert: `sheet.jsx` → `sheet.tsx`

- [ ] **Step 1: Convert each**

Floating-layer classnames must use `--shadow-popover` and respect dark mode:

```tsx
// DialogContent / PopoverContent / HoverCardContent / etc.
className={cn(
  "z-50 rounded-[var(--radius-md)] border border-[var(--bg-secondary)] bg-[var(--bg-primary)] p-4 text-[var(--text-primary)]",
  "shadow-[var(--shadow-popover)]",
  // animations: keep whatever shadcn used (slide-in/fade-in)
  "data-[state=open]:animate-in data-[state=closed]:animate-out",
  className
)}
```

`DialogOverlay` and `AlertDialogOverlay`: `bg-black/40 backdrop-blur-sm`.

`Sheet` (slide-in drawer): set side-aware classes (left/right/top/bottom) using Tailwind's `data-[side=…]` selectors.

- [ ] **Step 2: Delete the old `.jsx`**

```bash
cd /SSD_data2/shared/UniRo_shared/UniRo/uniro_frontend_v2/src/shared/components/ui
rm dialog.jsx alert-dialog.jsx alert.jsx popover.jsx hover-card.jsx tooltip.jsx sheet.jsx
```

- [ ] **Step 3: Build + lint**

```bash
npm run build 2>&1 | tail -20
```

- [ ] **Step 4: Commit**

```bash
git add src/shared/components/ui/
git commit -m "refactor(ui): convert overlay primitives to TSX

dialog, alert-dialog, alert, popover, hover-card, tooltip, sheet.
All floating layers use --shadow-popover.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Primitives batch 4 — menus (DropdownMenu, ContextMenu, Command, Menubar, NavigationMenu)

**Files:**
- Convert: `dropdown-menu.jsx` → `dropdown-menu.tsx`
- Convert: `context-menu.jsx` → `context-menu.tsx`
- Convert: `command.jsx` → `command.tsx`
- Convert: `menubar.jsx` → `menubar.tsx`
- Convert: `navigation-menu.jsx` → `navigation-menu.tsx`

- [ ] **Step 1: Convert each, same pattern as Task 5**

`command.tsx` uses `cmdk` — type its props as `React.ComponentPropsWithoutRef<typeof CommandPrimitive>`.

Menu items selected state:
```
data-[highlighted]:bg-[var(--bg-secondary)] data-[highlighted]:text-[var(--text-primary)]
```

- [ ] **Step 2: Delete old `.jsx`**

```bash
cd /SSD_data2/shared/UniRo_shared/UniRo/uniro_frontend_v2/src/shared/components/ui
rm dropdown-menu.jsx context-menu.jsx command.jsx menubar.jsx navigation-menu.jsx
```

- [ ] **Step 3: Build + lint + commit**

```bash
npm run build 2>&1 | tail -20
git add src/shared/components/ui/
git commit -m "refactor(ui): convert menu primitives to TSX

dropdown-menu, context-menu, command, menubar, navigation-menu.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Primitives batch 5 — layout & misc (Accordion, Tabs, ScrollArea, Toggle, ToggleGroup, Progress, Table, Collapsible, Sonner)

**Files:**
- Convert: `accordion.jsx` → `accordion.tsx`
- Convert: `tabs.jsx` → `tabs.tsx`
- Convert: `scroll-area.jsx` → `scroll-area.tsx`
- Convert: `toggle.jsx` → `toggle.tsx`
- Convert: `toggle-group.jsx` → `toggle-group.tsx`
- Convert: `progress.jsx` → `progress.tsx`
- Convert: `table.jsx` → `table.tsx`
- Convert: `collapsible.jsx` → `collapsible.tsx`
- Convert: `sonner.jsx` → `sonner.tsx`

- [ ] **Step 1: Convert each**

`Tabs` active tab indicator: bottom border `--accent-blue`, text `--text-primary`.

`Table`: `tr:hover` → `bg-[var(--bg-tertiary)]`. Header row text `--text-tertiary` with `text-label` style.

`Progress`: track `--bg-secondary`, fill `--accent-blue`.

`Sonner` (toast notifications) — verify the project actually uses it (`grep -r "sonner\|Toaster" src/`). If not used anywhere, mark for deletion in Task 20.

- [ ] **Step 2: Delete old `.jsx`**

```bash
cd /SSD_data2/shared/UniRo_shared/UniRo/uniro_frontend_v2/src/shared/components/ui
rm accordion.jsx tabs.jsx scroll-area.jsx toggle.jsx toggle-group.jsx progress.jsx table.jsx collapsible.jsx sonner.jsx
ls   # should now show only .tsx files
```

- [ ] **Step 3: Build + lint + commit**

```bash
npm run build 2>&1 | tail -20
git add src/shared/components/ui/
git commit -m "refactor(ui): convert remaining primitives to TSX

accordion, tabs, scroll-area, toggle, toggle-group, progress, table,
collapsible, sonner. All 35 shadcn primitives now TSX.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Shell — Sidebar

**Files:**
- Convert: `src/shared/components/Sidebar.js` → `Sidebar.tsx`
- Create: `src/shared/components/sidebar/navItems.ts` (data file separated from view)

- [ ] **Step 1: Read the existing `Sidebar.js`** to capture current item list, click behavior, and any pinned/conditional groups (admin-only, etc.)

```bash
cat /SSD_data2/shared/UniRo_shared/UniRo/uniro_frontend_v2/src/shared/components/Sidebar.js
```

- [ ] **Step 2: Extract nav data to `src/shared/components/sidebar/navItems.ts`**

```ts
import {
  LayoutGrid, Plug2, Combine, Activity, Gauge,
  Workflow, Languages, ShieldCheck, MessageSquare,
  TerminalSquare, Wrench, Settings, UserRound,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
  visibleWhen?: (ctx: { isAdmin: boolean; pathname: string }) => boolean;
};

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
      { href: "/dashboard/providers", label: "Providers", icon: Plug2 },
      { href: "/dashboard/combos", label: "Combos", icon: Combine },
      { href: "/dashboard/usage", label: "Usage", icon: Activity },
      { href: "/dashboard/quota", label: "Quota", icon: Gauge },
    ],
  },
  {
    label: "Build",
    items: [
      { href: "/dashboard/router-builder", label: "Router builder", icon: Workflow },
      { href: "/dashboard/translator", label: "Translator", icon: Languages },
      { href: "/dashboard/mitm", label: "MITM", icon: ShieldCheck },
      { href: "/dashboard/chat", label: "Chat", icon: MessageSquare },
      { href: "/dashboard/cli-tools", label: "CLI tools", icon: TerminalSquare },
    ],
  },
  {
    label: "Operate",
    items: [
      { href: "/dashboard/proxy-pools", label: "Proxy pools", icon: Wrench },
      { href: "/dashboard/console-log", label: "Console log", icon: TerminalSquare },
      { href: "/dashboard/endpoint", label: "Endpoint", icon: Plug2 },
      { href: "/dashboard/skills", label: "Skills", icon: Wrench },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/dashboard/settings", label: "Settings", icon: Settings },
      { href: "/dashboard/profile", label: "Profile", icon: UserRound },
    ],
  },
  {
    label: "Admin",
    visibleWhen: ({ isAdmin }) => isAdmin,
    items: [
      { href: "/admin", label: "Admin", icon: ShieldCheck },
      { href: "/admin/users", label: "Users", icon: UserRound },
      { href: "/admin/plans", label: "Plans", icon: Gauge },
    ],
  },
];
```

- [ ] **Step 3: Write `Sidebar.tsx`**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV_GROUPS } from "./sidebar/navItems";
import UniroMark from "./UniroMark";
import { cn } from "@/lib/utils";

export default function Sidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname() ?? "/";

  return (
    <aside className="flex h-screen w-[232px] flex-col gap-1 border-r border-[var(--bg-tertiary)] bg-[var(--bg-secondary)] p-[10px] pt-[14px]">
      <Link
        href="/dashboard"
        className="mb-2 flex items-center gap-[10px] border-b border-[var(--bg-tertiary)] px-2 pb-3 pt-1"
      >
        <UniroMark className="h-6 w-6 text-[var(--text-primary)]" />
        <span className="text-[14px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
          Uniro
        </span>
      </Link>

      {NAV_GROUPS.filter((g) => !g.visibleWhen || g.visibleWhen({ isAdmin, pathname })).map(
        (group) => (
          <div key={group.label} className="flex flex-col gap-[2px]">
            <div className="px-2 pb-[6px] pt-[14px] text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-tertiary)]">
              {group.label}
            </div>
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-[10px] rounded-[6px] px-2 py-[7px] text-[13px] transition-colors",
                    active
                      ? "bg-[var(--bg-tertiary)] font-medium text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <Icon className={cn("h-4 w-4", active && "text-[var(--accent-blue)]")} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        )
      )}
    </aside>
  );
}
```

- [ ] **Step 4: Delete the old `Sidebar.js`**

```bash
rm /SSD_data2/shared/UniRo_shared/UniRo/uniro_frontend_v2/src/shared/components/Sidebar.js
```

- [ ] **Step 5: Build**

```bash
npm run build 2>&1 | tail -20
```

If build fails because callers were passing props that don't exist on the new Sidebar (e.g. `theme`, `userName`), accept what the dashboard layout passes today — read `src/app/(dashboard)/layout.js` and adjust the typed props accordingly. Don't invent props that no caller passes.

- [ ] **Step 6: Commit**

```bash
git add src/shared/components/Sidebar.tsx src/shared/components/sidebar/navItems.ts
git rm src/shared/components/Sidebar.js
git commit -m "feat(shell): rebuild Sidebar with grouped Lucide nav

- Extract nav data to navItems.ts (separated from view)
- Grouped sections: Workspace, Build, Operate, Account, Admin (conditional)
- Active item: --bg-tertiary background, --accent-blue icon
- Lucide icons throughout

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Shell — Header (breadcrumb)

**Files:**
- Convert: `src/shared/components/Header.js` → `Header.tsx`
- Create: `src/lib/breadcrumb.ts` (route → label resolver)

- [ ] **Step 1: Read existing `Header.js`** to capture current right-side actions (theme toggle, user menu, etc.)

- [ ] **Step 2: Create `src/lib/breadcrumb.ts`**

```ts
const LABEL_MAP: Record<string, string> = {
  dashboard: "Workspace",
  providers: "Providers",
  combos: "Combos",
  usage: "Usage",
  quota: "Quota",
  "router-builder": "Router builder",
  translator: "Translator",
  mitm: "MITM",
  chat: "Chat",
  "basic-chat": "Basic chat",
  "cli-tools": "CLI tools",
  "proxy-pools": "Proxy pools",
  "console-log": "Console log",
  endpoint: "Endpoint",
  skills: "Skills",
  settings: "Settings",
  profile: "Profile",
  "media-providers": "Media providers",
  admin: "Admin",
  users: "Users",
  plans: "Plans",
  new: "New",
};

export type Crumb = { label: string; href: string };

export function buildCrumbs(pathname: string): Crumb[] {
  const parts = pathname.split("/").filter(Boolean);
  const crumbs: Crumb[] = [];
  let acc = "";
  for (const part of parts) {
    acc += "/" + part;
    crumbs.push({
      href: acc,
      label: LABEL_MAP[part] ?? decodeURIComponent(part),
    });
  }
  return crumbs;
}
```

- [ ] **Step 3: Write `Header.tsx`**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Settings } from "lucide-react";
import { buildCrumbs } from "@/lib/breadcrumb";
import ThemeToggle from "./ThemeToggle";

export default function Header() {
  const pathname = usePathname() ?? "/";
  const crumbs = buildCrumbs(pathname);

  return (
    <header className="flex h-[56px] items-center gap-2 border-b border-[var(--bg-tertiary)] bg-[var(--bg-primary)] px-6 text-[13px] text-[var(--text-secondary)]">
      <nav className="flex items-center gap-2 min-w-0">
        {crumbs.map((crumb, idx) => {
          const last = idx === crumbs.length - 1;
          return (
            <span key={crumb.href} className="flex items-center gap-2 min-w-0">
              {idx > 0 && <span className="text-[var(--text-tertiary)]">/</span>}
              {last ? (
                <span className="font-medium text-[var(--text-primary)] truncate">{crumb.label}</span>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] truncate"
                >
                  {crumb.label}
                </Link>
              )}
            </span>
          );
        })}
      </nav>

      <div className="flex-1" />

      <button
        type="button"
        aria-label="Notifications"
        className="flex h-8 w-8 items-center justify-center rounded-[var(--radius)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
      >
        <Bell className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="Settings"
        className="flex h-8 w-8 items-center justify-center rounded-[var(--radius)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
      >
        <Settings className="h-4 w-4" />
      </button>
      <ThemeToggle />
    </header>
  );
}
```

- [ ] **Step 4: Delete `Header.js`**

```bash
rm /SSD_data2/shared/UniRo_shared/UniRo/uniro_frontend_v2/src/shared/components/Header.js
```

- [ ] **Step 5: Build + commit**

```bash
npm run build 2>&1 | tail -20
git add src/shared/components/Header.tsx src/lib/breadcrumb.ts
git rm src/shared/components/Header.js
git commit -m "feat(shell): rebuild Header with breadcrumb + icon-button row

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Shell — Theme, brand mark, icon shim

**Files:**
- Convert: `ThemeProvider.js` → `ThemeProvider.tsx`
- Convert: `ThemeToggle.js` → `ThemeToggle.tsx`
- Convert: `UniroMark.jsx` → `UniroMark.tsx`
- Convert: `Icon.jsx` → `Icon.tsx` (Lucide passthrough — drop Material Symbols fallback)

- [ ] **Step 1: ThemeProvider** — preserves dark/light state, syncs `.dark` class on `<html>`

```tsx
"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";

type Ctx = { theme: Theme; setTheme: (t: Theme) => void };

const ThemeCtx = createContext<Ctx>({ theme: "light", setTheme: () => {} });

export function useTheme() {
  return useContext(ThemeCtx);
}

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const stored = (typeof window !== "undefined" && (localStorage.getItem("uniro-theme") as Theme | null)) ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(stored);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try { localStorage.setItem("uniro-theme", theme); } catch {}
  }, [theme]);

  return <ThemeCtx.Provider value={{ theme, setTheme }}>{children}</ThemeCtx.Provider>;
}
```

- [ ] **Step 2: ThemeToggle**

```tsx
"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      aria-label={`Switch to ${next} mode`}
      onClick={() => setTheme(next)}
      className="flex h-8 w-8 items-center justify-center rounded-[var(--radius)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
```

- [ ] **Step 3: UniroMark** — preserves the multi-path glyph from `UniroMark.jsx`. Read first to copy exact path data, then re-write with `currentColor`:

```bash
cat /SSD_data2/shared/UniRo_shared/UniRo/uniro_frontend_v2/src/shared/components/UniroMark.jsx
```

```tsx
import type { SVGProps } from "react";

export default function UniroMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {/* Paste the original path data from UniroMark.jsx here.
          The only change: stroke="currentColor", fill="none" or "currentColor"
          (whichever matches the original). No hard-coded #d97757. */}
    </svg>
  );
}
```

- [ ] **Step 4: Icon shim**

If `src/shared/components/Icon.jsx` currently dispatches to Material Symbols, replace it with a thin Lucide passthrough so callers don't break:

```tsx
import * as LucideIcons from "lucide-react";
import type { LucideProps } from "lucide-react";

export type IconName = keyof typeof LucideIcons;

export default function Icon({ name, ...props }: { name: IconName } & LucideProps) {
  const C = LucideIcons[name] as React.ComponentType<LucideProps> | undefined;
  if (!C) return null;
  return <C {...props} />;
}
```

If any caller is using a Material Symbols glyph name that doesn't exist in Lucide, leave that callsite untouched but mark for fix in the page's group task.

- [ ] **Step 5: Delete old files**

```bash
cd /SSD_data2/shared/UniRo_shared/UniRo/uniro_frontend_v2/src/shared/components
rm ThemeProvider.js ThemeToggle.js UniroMark.jsx Icon.jsx
```

- [ ] **Step 6: Build + commit**

```bash
npm run build 2>&1 | tail -20
git add src/shared/components/
git commit -m "feat(shell): retype ThemeProvider/Toggle/UniroMark/Icon

- UniroMark uses currentColor (no hard-coded orange)
- Icon is a Lucide passthrough; Material Symbols dropped

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: Shell — dashboard layout + non-primitive shared components

**Files:**
- Convert: `src/app/(dashboard)/layout.js` → `layout.tsx`
- Convert: All `.js`/`.jsx` files under `src/shared/components/` not yet touched (Modal, Drawer, Card, Badge, Button JS-shim wrappers, ProviderIcon, ProviderInfoCard, NoAuthProxyCard, UsageStats, Pagination, Loading, RequestLogger, Avatar shim, OAuthModal and its variants, etc.)

- [ ] **Step 1: List remaining shared components**

```bash
ls /SSD_data2/shared/UniRo_shared/UniRo/uniro_frontend_v2/src/shared/components/ | grep -E "\.(js|jsx)$"
```

For each: read, convert to `.tsx`, add typed Props, replace any `uniro-orange`/`uniro-blue` class with new tokens, delete the old file. Use `React.ComponentPropsWithoutRef<"div">` patterns for wrapper components.

- [ ] **Step 2: Convert `(dashboard)/layout.js`** to `layout.tsx`

The dashboard layout wraps every dashboard page with Sidebar + Header. Pattern:

```tsx
import type { ReactNode } from "react";
import Sidebar from "@/shared/components/Sidebar";
import Header from "@/shared/components/Header";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-primary)]">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
```

(If the current layout passes `isAdmin` to Sidebar via context/server-side auth, preserve that — see what the existing `layout.js` does first.)

- [ ] **Step 3: Build**

```bash
npm run build 2>&1 | tail -30
```

Expect some new failures from page files that imported a renamed/removed component. Don't fix every page here — fix only the imports that break the build (e.g., `import Sidebar from "@/shared/components/Sidebar"` will resolve correctly since the new file has the same default export). The actual page-level styling lives in later tasks.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/layout.tsx src/shared/components/
git rm src/app/\(dashboard\)/layout.js
git rm src/shared/components/*.js src/shared/components/*.jsx 2>/dev/null || true
git commit -m "feat(shell): convert dashboard layout + remaining shared components to TSX

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: Pages G4 — dashboard core

**Files (convert each `page.js` → `page.tsx`, re-skin with new tokens):**
- `src/app/(dashboard)/dashboard/page.js`
- `src/app/(dashboard)/dashboard/providers/page.js`
- `src/app/(dashboard)/dashboard/providers/[id]/page.js`
- `src/app/(dashboard)/dashboard/providers/new/page.js`
- `src/app/(dashboard)/dashboard/combos/page.js`
- `src/app/(dashboard)/dashboard/usage/page.js`
- `src/app/(dashboard)/dashboard/usage/components/ProviderTopology.js` (and other components/ subdir files)
- `src/app/(dashboard)/dashboard/quota/page.js`

- [ ] **Step 1: For each page — read existing, rewrite as `.tsx`**

Per-page checklist (apply to each):
1. Add typed `Props` if the page receives `params` or `searchParams` (Next.js 16 server components signature).
2. Replace any class beginning with `uniro-` or hard-coded brand hex with new tokens.
3. Cards use the new `Card`/`CardHeader`/`CardContent` from the rewritten primitive — semantics unchanged, only classes flow through.
4. Buttons: replace ad-hoc inline buttons with the `Button` primitive where straightforward.
5. Page top:
   ```tsx
   <div className="px-8 py-7">
     <h1 className="text-[26px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">Providers</h1>
     <p className="mt-1 text-[14px] text-[var(--text-secondary)] max-w-[540px]">…</p>
     {/* … */}
   </div>
   ```
6. Tables (Usage): use the rewritten `Table` primitive.
7. `ProviderTopology` (xyflow on Usage): only restyle node/edge classes; leave `useNodesState`/`useEdgesState` calls and topology logic untouched.

- [ ] **Step 2: Convert ProviderTopology subcomponents**

```bash
find /SSD_data2/shared/UniRo_shared/UniRo/uniro_frontend_v2/src/app/\(dashboard\)/dashboard/usage -name "*.js" -o -name "*.jsx"
```

Convert each to `.tsx` with typed props. The xyflow types we need:
```tsx
import type { Node, Edge, NodeProps, EdgeProps } from "@xyflow/react";
```

- [ ] **Step 3: Delete the old `.js`/`.jsx` files for this group**

```bash
cd /SSD_data2/shared/UniRo_shared/UniRo/uniro_frontend_v2/src/app/\(dashboard\)/dashboard
rm page.js providers/page.js providers/\[id\]/page.js providers/new/page.js \
   combos/page.js usage/page.js quota/page.js
# plus any .js/.jsx in usage/components/
find usage -name "*.js" -o -name "*.jsx" -delete
```

- [ ] **Step 4: Build + smoke test**

```bash
npm run build 2>&1 | tail -30

# Smoke
npm run dev &
DEV_PID=$!
sleep 6
for p in / /dashboard /dashboard/providers /dashboard/combos /dashboard/usage /dashboard/quota; do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:20129$p)
  echo "$p -> $code"
done
kill $DEV_PID
```

All `/dashboard/*` should return 200 or 307 (redirect to login). Any 500 = stop and fix before commit.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/dashboard/
git rm $(git ls-files src/app/\(dashboard\)/dashboard/ | grep -E "\.(js|jsx)$") 2>/dev/null || true
git commit -m "feat(pages): rework dashboard core pages

dashboard home, providers (+ [id], +/new), combos, usage (+ topology),
quota. All converted to TSX, restyled with new tokens.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 13: Pages G5 — media-providers

**Files:**
- `src/app/(dashboard)/dashboard/media-providers/[kind]/page.js`
- `src/app/(dashboard)/dashboard/media-providers/[kind]/[id]/page.js`
- `src/app/(dashboard)/dashboard/media-providers/combo/[id]/page.js`
- `src/app/(dashboard)/dashboard/media-providers/web/page.js`
- Any local `components/` files in `media-providers/`

- [ ] **Step 1: Same per-page checklist as Task 12, apply to each**

- [ ] **Step 2: Delete old**

```bash
cd /SSD_data2/shared/UniRo_shared/UniRo/uniro_frontend_v2/src/app/\(dashboard\)/dashboard/media-providers
find . -name "*.js" -o -name "*.jsx" -delete
```

- [ ] **Step 3: Build + commit**

```bash
npm run build 2>&1 | tail -20
git add src/app/\(dashboard\)/dashboard/media-providers/
git commit -m "feat(pages): rework media-providers pages

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 14: Pages G6 — router-builder (split + reskin)

**Files (the big one):**
- Split `src/app/(dashboard)/dashboard/router-builder/page.js` (2,350 lines) into:
  - `page.tsx`
  - `components/CanvasShell.tsx`
  - `components/Toolbar.tsx`
  - `components/NodePalette.tsx`
  - `components/YamlPreview.tsx`
  - `components/nodes/{Signal,Projection,Route,Model,Plugin}Node.tsx`
  - `components/edges/RouterEdge.tsx`
  - `components/inspector/{Inspector,SignalInspector,RouteInspector,ModelInspector,PluginInspector}.tsx`
  - `hooks/useRouterGraph.ts`
  - `hooks/useRouterDeploy.ts`
- Convert: `catalog.js` → `catalog.ts`
- Convert: `templates.js` → `templates.ts`
- Convert: `yaml.js` → `yaml.ts`
- Convert: `WhenEditor.jsx` → `WhenEditor.tsx`
- Convert: `CloudSyncPanel.jsx` → `CloudSyncPanel.tsx`

- [ ] **Step 1: Mechanical split first — DO NOT re-style yet**

Read the existing `page.js` end-to-end. Identify the boundaries: where node components are defined, where the toolbar is, where inspector panels are, where state hooks are. For each identifiable boundary, cut-and-paste into the new file. Update imports.

This step MUST result in a working canvas before any restyling. Commit at the end of step 1 as a separate "no-op refactor" commit.

```bash
npm run build 2>&1 | tail -20
npm run dev &
DEV_PID=$!
sleep 6
curl -s -o /dev/null -w "router-builder: %{http_code}\n" http://localhost:20129/dashboard/router-builder
kill $DEV_PID

git add src/app/\(dashboard\)/dashboard/router-builder/
git commit -m "refactor(router-builder): extract 2350-line page into focused TSX files

No behavioral change. Components, hooks, helpers separated; canvas
still functions identically.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 2: Reskin canvas elements (separate commit)**

In `nodes/*.tsx`, every node component's outer div uses the card pattern:
```tsx
className={cn(
  "rounded-[var(--radius-md)] border border-[var(--bg-secondary)] bg-[var(--bg-primary)] p-3 text-[var(--text-primary)] shadow-[var(--shadow-popover)]",
  selected && "ring-2 ring-[var(--accent-blue)] ring-offset-2 ring-offset-[var(--bg-tertiary)]"
)}
```

In `RouterEdge.tsx`, edges use:
```tsx
style={{ stroke: "var(--text-tertiary)", strokeWidth: 1.5 }}
```

In `CanvasShell.tsx`, the xyflow `<Background />` uses `color="var(--text-tertiary)"` with `gap={20}` and `size={1}` for a subtle dot grid on `--bg-tertiary`.

The xyflow `Controls` and `MiniMap` get their CSS variables overridden via a local style block:
```css
.react-flow__controls { background: var(--bg-primary); border: 1px solid var(--bg-secondary); }
.react-flow__controls-button { background: var(--bg-primary); color: var(--text-secondary); }
.react-flow__minimap { background: var(--bg-primary); border: 1px solid var(--bg-secondary); }
```

- [ ] **Step 3: Build + smoke + commit**

```bash
npm run build 2>&1 | tail -20
npm run dev &
DEV_PID=$!
sleep 6
curl -s -o /dev/null -w "router-builder: %{http_code}\n" http://localhost:20129/dashboard/router-builder
kill $DEV_PID

git add src/app/\(dashboard\)/dashboard/router-builder/
git commit -m "feat(router-builder): reskin canvas nodes, edges, controls

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 15: Pages G7 — build tools

**Files (per-page checklist from Task 12):**
- `src/app/(dashboard)/dashboard/translator/page.js`
- `src/app/(dashboard)/dashboard/mitm/page.js`
- `src/app/(dashboard)/dashboard/cli-tools/page.js`
- `src/app/(dashboard)/dashboard/proxy-pools/page.js`
- `src/app/(dashboard)/dashboard/console-log/page.js`
- `src/app/(dashboard)/dashboard/endpoint/page.js`
- `src/app/(dashboard)/dashboard/skills/page.js`
- Any `components/` files under each

- [ ] **Step 1: Convert each (same checklist)**

- [ ] **Step 2: Delete old**

```bash
cd /SSD_data2/shared/UniRo_shared/UniRo/uniro_frontend_v2/src/app/\(dashboard\)/dashboard
for d in translator mitm cli-tools proxy-pools console-log endpoint skills; do
  find "$d" -name "*.js" -o -name "*.jsx" -delete
done
```

- [ ] **Step 3: Build + smoke + commit**

```bash
npm run build 2>&1 | tail -20
git add src/app/\(dashboard\)/dashboard/{translator,mitm,cli-tools,proxy-pools,console-log,endpoint,skills}
git commit -m "feat(pages): rework build-tools pages

translator, mitm, cli-tools, proxy-pools, console-log, endpoint, skills.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 16: Pages G8 — chat surfaces

**Files:**
- `src/app/(dashboard)/dashboard/chat/page.js`
- `src/app/(dashboard)/dashboard/basic-chat/page.js`
- Any `components/` files under each

- [ ] **Step 1: Convert each. Chat pages have streaming state — preserve all `useState`/`useEffect`/`useChat` logic exactly. Only swap classnames and add types.**

```bash
find /SSD_data2/shared/UniRo_shared/UniRo/uniro_frontend_v2/src/app/\(dashboard\)/dashboard/chat /SSD_data2/shared/UniRo_shared/UniRo/uniro_frontend_v2/src/app/\(dashboard\)/dashboard/basic-chat -name "*.js" -o -name "*.jsx"
```

Message bubbles:
```tsx
// User
className="ml-auto max-w-[80%] rounded-[var(--radius-md)] bg-[var(--accent-blue)] px-4 py-2 text-[14px] text-[var(--text-inverted)]"
// Assistant
className="max-w-[80%] rounded-[var(--radius-md)] border border-[var(--bg-secondary)] bg-[var(--bg-primary)] px-4 py-2 text-[14px] text-[var(--text-primary)]"
```

- [ ] **Step 2: Delete old + commit**

```bash
cd /SSD_data2/shared/UniRo_shared/UniRo/uniro_frontend_v2/src/app/\(dashboard\)/dashboard
for d in chat basic-chat; do find "$d" -name "*.js" -o -name "*.jsx" -delete; done

npm run build 2>&1 | tail -20
git add src/app/\(dashboard\)/dashboard/{chat,basic-chat}
git commit -m "feat(pages): rework chat surfaces

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 17: Pages G9 — settings, profile, pricing

**Files:**
- `src/app/(dashboard)/dashboard/settings/page.js`
- `src/app/(dashboard)/dashboard/profile/page.js`
- `src/app/dashboard/settings/pricing/page.js`  *(note: outside the route group)*
- Any subdirectories under settings/

- [ ] **Step 1: Convert each (per-page checklist from Task 12)**

- [ ] **Step 2: Delete + commit**

```bash
cd /SSD_data2/shared/UniRo_shared/UniRo/uniro_frontend_v2
find src/app/\(dashboard\)/dashboard/settings src/app/\(dashboard\)/dashboard/profile src/app/dashboard/settings -name "*.js" -o -name "*.jsx" -delete

npm run build 2>&1 | tail -20
git add src/app/\(dashboard\)/dashboard/settings src/app/\(dashboard\)/dashboard/profile src/app/dashboard/settings
git commit -m "feat(pages): rework settings, profile, pricing

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 18: Pages G10 — admin

**Files:**
- `src/app/admin/page.js`
- `src/app/admin/plans/page.js`
- `src/app/admin/users/page.js`
- `src/app/admin/users/[id]/page.js`
- Any `layout.js` under `/admin`

- [ ] **Step 1: Convert each. Admin pages may have their own layout — if `src/app/admin/layout.js` exists, mirror the dashboard layout shape (Sidebar receives `isAdmin={true}`).**

- [ ] **Step 2: Build + commit**

```bash
find /SSD_data2/shared/UniRo_shared/UniRo/uniro_frontend_v2/src/app/admin -name "*.js" -o -name "*.jsx" -delete

npm run build 2>&1 | tail -20
git add src/app/admin
git commit -m "feat(pages): rework admin pages

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 19: Pages G11 — auth & public

**Files:**
- `src/app/login/page.js`
- `src/app/cloud/login/page.js`
- `src/app/cloud/register/page.js`
- `src/app/callback/page.js`
- `src/app/landing/page.js`
- `src/app/page.js` (root)
- Any `layout.js` files at `src/app/login/`, `src/app/cloud/`, etc.

- [ ] **Step 1: Convert each. Auth pages don't use the dashboard shell — they typically have their own centered card layout. Pattern for login:**

```tsx
export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-tertiary)] p-6">
      <div className="w-full max-w-[400px] rounded-[var(--radius-lg)] border border-[var(--bg-secondary)] bg-[var(--bg-primary)] p-8">
        <h1 className="text-[22px] font-semibold text-[var(--text-primary)]">Sign in to Uniro</h1>
        {/* form */}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build + commit**

```bash
find /SSD_data2/shared/UniRo_shared/UniRo/uniro_frontend_v2/src/app/login /SSD_data2/shared/UniRo_shared/UniRo/uniro_frontend_v2/src/app/cloud /SSD_data2/shared/UniRo_shared/UniRo/uniro_frontend_v2/src/app/callback /SSD_data2/shared/UniRo_shared/UniRo/uniro_frontend_v2/src/app/landing -name "*.js" -o -name "*.jsx" -delete
[ -f /SSD_data2/shared/UniRo_shared/UniRo/uniro_frontend_v2/src/app/page.js ] && rm /SSD_data2/shared/UniRo_shared/UniRo/uniro_frontend_v2/src/app/page.js

npm run build 2>&1 | tail -20
git add src/app/{login,cloud,callback,landing,page.tsx}
git commit -m "feat(pages): rework auth and public pages

login, cloud/{login,register}, callback, landing, root.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 20: Cleanup & verification

**Files:**
- `CLAUDE.md` (project-level)
- Any remaining `.js`/`.jsx` files under `src/` outside `src/app/api/**`

- [ ] **Step 1: Final sweep for old tokens**

```bash
cd /SSD_data2/shared/UniRo_shared/UniRo/uniro_frontend_v2
grep -rn "uniro-orange\|uniro-blue\|uniro-warning\|uniro-danger\|uniro-green\|color-brand-\|material-symbols\|DM_Sans\|Source_Serif" src/ 2>&1 | head -30
```

Expected: empty (or only matches in `src/app/api/**`). Fix any remaining hits.

- [ ] **Step 2: Final sweep for stray `.js`/`.jsx` files**

```bash
find /SSD_data2/shared/UniRo_shared/UniRo/uniro_frontend_v2/src -name "*.js" -o -name "*.jsx" | grep -v "/app/api/" | sort
```

Expected output: empty. If anything appears, convert it.

- [ ] **Step 3: Drop the Material Symbols font load if any remains**

```bash
grep -rn "material-symbols\|Material Symbols" src/ public/ 2>&1
```

- [ ] **Step 4: Drop `tailwind-merge` / `clsx` from dev if duplicated** — usually they're production deps; skip if already correct.

- [ ] **Step 5: Update `CLAUDE.md`** (the project's `uniro_frontend_v2/CLAUDE.md`) — change "JavaScript only (no TypeScript; uses `jsconfig.json`)" to TypeScript-only. Replace the relevant paragraph with:

```
**Uniro** (`uniro-app`) — a self-hosted LLM router dashboard. Next.js 16
(App Router) + React 19, TypeScript-only (uses `tsconfig.json`, strict).
Exposes an OpenAI-compatible API at `:20128/v1` ...
```

- [ ] **Step 6: Run full verification**

```bash
cd /SSD_data2/shared/UniRo_shared/UniRo/uniro_frontend_v2

# Build
npm run build 2>&1 | tail -20

# Typecheck (redundant with build but explicit)
npm run typecheck 2>&1 | tail -10

# Lint
npx eslint . --no-warn-ignored 2>&1 | tail -3

# Existing unit tests
cd tests && NODE_PATH=/tmp/node_modules /tmp/node_modules/.bin/vitest run 2>&1 | tail -20
cd ..

# Dev smoke (light + dark)
npm run dev &
DEV_PID=$!
sleep 8
for p in / /dashboard /dashboard/providers /dashboard/combos /dashboard/usage /dashboard/quota /dashboard/router-builder /dashboard/translator /dashboard/mitm /dashboard/chat /dashboard/settings /dashboard/profile /login /landing; do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:20129$p)
  echo "$p -> $code"
done
kill $DEV_PID
```

Acceptance: every path returns a non-5xx code (200 or 307 redirect). `npm run build` is green. Lint count does not exceed baseline. Existing vitest tests pass.

- [ ] **Step 7: Commit**

```bash
git add CLAUDE.md
git add -u  # any final stragglers
git commit -m "chore: finalize ChatGPT design system rework + TS migration

- CLAUDE.md updated to reflect TypeScript-only
- All src/ outside src/app/api/** is TSX
- No remaining --uniro-* tokens, no Material Symbols

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Self-review (writing-plans skill, done inline)

**Spec coverage:**
- §Decisions 1 (full reset): T2 (tokens), T10 (mark recolor), T20 (sweep) ✓
- §Decisions 2 (all 31 pages): T12–T19 ✓
- §Decisions 3 (full TS): T1 (config), T3–T19 (conversions), T20 (sweep) ✓
- §Decisions 4 (Shell A): T8 (Sidebar), T9 (Header), T11 (dashboard layout) ✓
- §Decisions 5 (Radix primitives restyled): T3–T7 ✓
- §Decisions 6 (light+dark): T2 (`.dark` vars), T10 (ThemeProvider) ✓
- §Decisions 7 (router canvas re-skin + split): T14 ✓
- §Decisions 8 (Lucide only): T2, T10 ✓
- §Decisions 9 (spacious density): baked into class samples throughout ✓
- §Decisions 10 (brand mark neutral): T10 (UniroMark.tsx) ✓
- §Decisions 11 (foundation→primitives→shell→pages order): task order T1→T20 ✓

**Placeholder scan:** no "TODO" / "TBD". Code blocks present in every "implementation" step. `WhenEditor.tsx` and `CloudSyncPanel.tsx` conversions are bullet'd in T14's file list but not given explicit code — they're mechanical `.jsx`→`.tsx` ports following the same pattern as other primitives, which is now established by T3–T7. Add an inline note in T14 to clarify.

**Type consistency:** `cn` is defined in T3 step 3 and used in every later task. `NAV_GROUPS`/`NavItem`/`NavGroup` are defined in T8 only. `Crumb`/`buildCrumbs` in T9 only. `Theme`/`useTheme` in T10 only. `IconName` in T10 only. No naming drift detected.

Inline fix applied: T14 file list has been clarified; CloudSyncPanel/WhenEditor are part of the router-builder dir conversion using the same TSX-port pattern (no new types introduced; their props are local).
