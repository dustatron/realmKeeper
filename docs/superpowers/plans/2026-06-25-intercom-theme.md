# Intercom Theme (Slice 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reskin the whole app to the Intercom design system — cream canvas, charcoal ink, hairline borders, no drop shadows, Inter type, restrained orange accent — by editing the shared token layer plus a small component sweep.

**Architecture:** The theme is a shadcn-style CSS-variable system (`src/styles/theme.css`) surfaced to Tailwind v4 via `@theme inline`; components consume semantic tokens (`bg-background`, `bg-card`, `border`, `shadow-card`, …). Changing token *values* cascades app-wide. Depth is removed by redefining the `--shadow-*` tokens to a flat 1px hairline ring, so most components convert with no edits; a sweep then fixes components that bypass tokens with hardcoded `shadow-md`/grays.

**Tech Stack:** Tailwind CSS v4, CSS custom properties, self-hosted woff2 fonts, TanStack Start/React 19, TypeScript strict. Build: `pnpm build`. Typecheck: `pnpm exec tsc --noEmit`.

## Global Constraints

- **Package manager: pnpm only** (no npm; `package-lock.json` gitignored).
- **No unit tests for styling** — this is a CSS/config change (the TDD "configuration files" exception). Verify every task with `pnpm exec tsc --noEmit && pnpm build` (build exit 0) and a **visual check in the running app** (light + dark). The final task is a dedicated visual QA sweep.
- **Commit trailer (required):** every commit message ends with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` (use a second `-m`).
- **Palette (light):** canvas `#f5f1ec`, ink `#111111`, surface-1 `#ffffff`, surface-2 `#ebe7e1`, ink-muted `#626260`, hairline `#d3cec6`, error `#c41c1c`, fin-orange `#ff5600`.
- **Palette (dark):** canvas `#000000`, surface `#313130`, ink `#ffffff`, ink-muted `#9c9fa5`, hairline `rgba(255,255,255,0.12)`.
- **Radii:** sm 6 / md 8 / lg 12 / xl 16; base `--radius: 0.5rem` (8px). No pill-round CTAs.
- **Depth:** no drop shadows; `--shadow-border|card|elevated` all = `0 0 0 1px var(--border)`.
- **Charts:** report palette — `#65b5ff #0bdf50 #ff2067 #b3e01c #03b2cb`.
- **Orange restraint:** charcoal/ink is the primary everywhere; orange only on the Looming-Doom card + active/selected states.
- **Font:** Inter (self-hosted) for sans; keep Geist Mono for code.

---

### Task 1: Self-host Inter + typography

Add Inter Variable as the sans family (same self-host pattern as Geist), keep Geist Mono, and bump body to Intercom's 16px.

**Files:**
- Create: `public/fonts/Inter-Variable.woff2` (downloaded asset)
- Modify: `src/styles/theme.css` (the two `@font-face` blocks at top)
- Modify: `src/styles/app.css` (`html` font-family; `body` font-size)

- [ ] **Step 1: Download Inter Variable woff2**

```bash
cd /Users/dusty/Code/side-projects/realmKeeper
curl -fsSL "https://cdn.jsdelivr.net/fontsource/fonts/inter:vf@latest/latin-wght-normal.woff2" -o public/fonts/Inter-Variable.woff2
ls -l public/fonts/Inter-Variable.woff2   # expect a real woff2, > 50 KB
file public/fonts/Inter-Variable.woff2     # expect "Web Open Font Format (Version 2)"
```
If the size is tiny or `file` doesn't report WOFF2, the URL failed — stop and report; do not commit a broken asset.

- [ ] **Step 2: Replace the Geist sans `@font-face` with Inter in `theme.css`**

The top of `theme.css` currently declares `@font-face` for `'Geist'` and `'Geist Mono'`. Replace the **`'Geist'`** block with Inter; leave the `'Geist Mono'` block unchanged:

```css
@font-face {
  font-family: 'Inter';
  src: url('/fonts/Inter-Variable.woff2') format('woff2');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}
```

- [ ] **Step 3: Point the app at Inter + 16px body in `app.css`**

In `src/styles/app.css`, change the `html` font-family from `'Geist'` to `'Inter'`, and the `body` font-size from `0.9375rem` to `1rem`:

```css
  html {
    overflow-x: hidden;
    font-family: 'Inter', Arial, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', sans-serif;
    font-feature-settings: "liga" 1;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  body {
    min-height: 100svh;
    width: 100%;
    background-color: var(--color-background);
    color: var(--color-foreground);
    font-size: 1rem; /* 16px — Intercom body */
    line-height: 1.5;
  }
```
(Leave the `code, pre, kbd, samp` rule on `'Geist Mono'` as-is.)

- [ ] **Step 4: Verify**

```bash
pnpm exec tsc --noEmit && pnpm build
```
Expected: build exit 0. Then in the running app (http://localhost:3000) confirm text renders in Inter (not Geist) and the dev server has no font 404 for `/fonts/Inter-Variable.woff2`.

- [ ] **Step 5: Commit**

```bash
git add public/fonts/Inter-Variable.woff2 src/styles/theme.css src/styles/app.css
git commit -m "feat: self-host Inter as the app sans font" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Intercom color, depth, and radius tokens

Replace the Vercel palette in `theme.css` with the Intercom palette (light + dark), flatten depth to a hairline ring, set the Intercom radius scale, swap the chart palette, and add a `--warning` orange token. This is value-only; component markup is untouched.

**Files:**
- Modify: `src/styles/theme.css` (the `:root`, `.dark`, and `@theme inline` blocks — everything below the `@font-face` declarations)

- [ ] **Step 1: Replace `:root` through end of file with the Intercom tokens**

Replace everything from `:root {` to the end of `theme.css` (keep the two `@font-face` blocks above it) with:

```css
:root {
  /* Intercom design tokens (light) */
  --radius: 0.5rem; /* 8px — Intercom md (buttons, inputs) */

  --background: #f5f1ec;   /* canvas (cream) */
  --foreground: #111111;   /* ink */

  --card: #ffffff;
  --card-foreground: #111111;
  --popover: #ffffff;
  --popover-foreground: #111111;

  --primary: #111111;      /* ink */
  --primary-foreground: #ffffff;

  --secondary: #ebe7e1;    /* surface-2 */
  --secondary-foreground: #111111;

  --muted: #ebe7e1;
  --muted-foreground: #626260;  /* ink-muted */

  --accent: #ebe7e1;
  --accent-foreground: #111111;

  --destructive: #c41c1c;  /* semantic-error */
  --destructive-foreground: #ffffff;

  --warning: #ff5600;      /* fin-orange — rare accent only */
  --warning-foreground: #ffffff;

  --border: #d3cec6;       /* hairline */
  --input: #d3cec6;
  --ring: #111111;         /* visible ink focus */

  /* Depth: NO drop shadows — flat 1px hairline ring (white-on-cream contrast) */
  --shadow-border: 0 0 0 1px var(--border);
  --shadow-card: 0 0 0 1px var(--border);
  --shadow-elevated: 0 0 0 1px var(--border);

  /* Charts — Intercom report palette */
  --chart-1: #65b5ff;
  --chart-2: #0bdf50;
  --chart-3: #ff2067;
  --chart-4: #b3e01c;
  --chart-5: #03b2cb;

  /* Sidebar */
  --sidebar: #f5f1ec;
  --sidebar-foreground: #111111;
  --sidebar-primary: #111111;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #ebe7e1;
  --sidebar-accent-foreground: #111111;
  --sidebar-border: #d3cec6;
  --sidebar-ring: #111111;
}

.dark {
  /* Intercom design tokens (dark — inverse-canvas/inverse-surface) */
  --background: #000000;
  --foreground: #ffffff;

  --card: #313130;
  --card-foreground: #ffffff;
  --popover: #313130;
  --popover-foreground: #ffffff;

  --primary: #ffffff;
  --primary-foreground: #111111;

  --secondary: #313130;
  --secondary-foreground: #ffffff;

  --muted: #313130;
  --muted-foreground: #9c9fa5;  /* inverse-ink-muted */

  --accent: #313130;
  --accent-foreground: #ffffff;

  --destructive: #c41c1c;
  --destructive-foreground: #ffffff;

  --warning: #ff5600;
  --warning-foreground: #ffffff;

  --border: rgba(255, 255, 255, 0.12);
  --input: rgba(255, 255, 255, 0.12);
  --ring: #ffffff;

  --shadow-border: 0 0 0 1px var(--border);
  --shadow-card: 0 0 0 1px var(--border);
  --shadow-elevated: 0 0 0 1px var(--border);

  --chart-1: #65b5ff;
  --chart-2: #0bdf50;
  --chart-3: #ff2067;
  --chart-4: #b3e01c;
  --chart-5: #03b2cb;

  --sidebar: #000000;
  --sidebar-foreground: #ffffff;
  --sidebar-primary: #ffffff;
  --sidebar-primary-foreground: #111111;
  --sidebar-accent: #313130;
  --sidebar-accent-foreground: #ffffff;
  --sidebar-border: rgba(255, 255, 255, 0.12);
  --sidebar-ring: #ffffff;
}

@theme inline {
  /* Intercom radius scale (explicit, not derived) */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;

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
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
}
```

- [ ] **Step 2: Verify**

```bash
pnpm exec tsc --noEmit && pnpm build
```
Expected: build exit 0. Then in the running app: background is cream (not white), cards are white tiles with thin hairline borders and **no drop shadow**, primary buttons are charcoal, radii look modest (8–12px). Toggle dark mode → near-black canvas, `#313130` surfaces, white text. No element should still cast a blurred shadow that comes from these tokens.

- [ ] **Step 3: Commit**

```bash
git add src/styles/theme.css
git commit -m "feat: Intercom color/depth/radius tokens (light + dark)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Apply the orange accent (Looming Doom + selected states)

The `--warning`/`--color-warning` token now exists. Apply it to the one thematic place — the dashboard "Looming Doom" card — and confirm it reads as the single pop of color. (Active/selected nav states are handled in Slice 2's dashboard work; this task only does the doom card so the accent is exercised.)

**Files:**
- Modify: `src/components/realm/Dashboard.tsx` (the looming-doom / reckoning card)

- [ ] **Step 1: Find the doom card**

```bash
rg -n "Reckoning|loomingThreat|doom|Foretold" src/components/realm/Dashboard.tsx
```
Identify the card/alert that renders the doom (red/destructive-styled today).

- [ ] **Step 2: Restyle it to the warning accent**

Change its accent classes from destructive/red to the warning token: the left border / icon / title use `text-warning` and `border-warning` (Tailwind picks these up from `--color-warning`), on a `bg-card` tile with a hairline border. Example for the container + title:

```tsx
// container
<div className="rounded-lg border border-warning/40 bg-card p-6">
  {/* icon + title */}
  <div className="flex items-center gap-2 text-warning">
    <Skull className="size-4" />
    <span className="font-medium">{event.title}</span>
  </div>
  {/* ...date + description in foreground/muted... */}
</div>
```
Match the actual existing markup/icon in the file; only swap the red/destructive accent for `warning`, keep layout.

- [ ] **Step 3: Verify**

```bash
pnpm exec tsc --noEmit && pnpm build
```
Expected: exit 0. In the app, the dashboard doom card shows the orange accent; no other element on the dashboard uses orange.

- [ ] **Step 4: Commit**

```bash
git add src/components/realm/Dashboard.tsx
git commit -m "feat: orange accent on the Looming Doom card" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Component sweep — flatten elevation + remove token bypasses

With depth tokens flattened, components using the `shadow-card`/`shadow-elevated`/`shadow-border` utilities already convert. This task fixes components that bypass tokens: hardcoded Tailwind elevation (`shadow-md/lg/xl`, `drop-shadow`) on overlays, and hardcoded colors.

**Files (audit + edit as needed):**
- `src/components/ui/`: `popover.tsx`, `select.tsx`, `dropdown-menu.tsx`, `dialog.tsx`, `alert-dialog.tsx`, `sheet.tsx`, `card.tsx`, `tabs.tsx`, `sidebar.tsx`
- `src/routes/_app/realms/index.tsx`, `src/routes/_app/realms/locations/starred.tsx`, `src/routes/_app/realms/locations/paths.tsx`
- `src/components/map/MapViewer.tsx`, `src/components/shared/WysiwygEditor.tsx`
- `src/styles/app.css` (the `badge-pill` utility's hardcoded blue)

- [ ] **Step 1: Inventory the bypasses**

```bash
rg -n "shadow-(md|lg|xl|sm|2xl|\[)|drop-shadow" src --glob '*.tsx'
rg -n "bg-white|bg-black|text-gray-|bg-gray-|border-gray-|#fff|#000" src --glob '*.tsx'
```

- [ ] **Step 2: Overlays → hairline elevation**

For floating surfaces (`popover`, `select`, `dropdown-menu`, `dialog`, `alert-dialog`, `sheet` content), replace hardcoded `shadow-md`/`shadow-lg` with the token utility `shadow-elevated` (now a hairline ring) and ensure they sit on `bg-popover`/`bg-card`. Intercom uses surface contrast, not blur. Example (popover content):

```tsx
// before: "... rounded-md border bg-popover p-4 text-popover-foreground shadow-md ..."
// after:  "... rounded-md border bg-popover p-4 text-popover-foreground shadow-elevated ..."
```
Apply the same swap everywhere the inventory flagged `shadow-md/lg/xl` on an overlay/card.

- [ ] **Step 3: Hardcoded colors → tokens**

Replace token bypasses found in Step 1 with semantic equivalents: `bg-white`→`bg-card`, `bg-black`→`bg-foreground` (or `bg-card` in dark contexts), `text-gray-500/600`→`text-muted-foreground`, `border-gray-200`→`border-border`. Judge each in context; the goal is no component hardcodes a neutral that the theme should own.

- [ ] **Step 4: Fix the `badge-pill` utility in `app.css`**

The `badge-pill` utility hardcodes a blue (`#ebf5ff`/`#0068d6`, dark `#0a1929`/`#5baaf5`). Retheme to Intercom surface-2 + ink so it fits the cream system:

```css
@utility badge-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 9999px;
  padding: 0px 10px;
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1.33;
  background-color: var(--color-secondary);
  color: var(--color-foreground);
}
```
(Remove the `.dark .badge-pill` override — the token already adapts per mode.)

- [ ] **Step 5: Verify**

```bash
pnpm exec tsc --noEmit && pnpm build
```
Expected: exit 0. In the app, open a dropdown, a Select menu, a dialog, and a popover in **both** light and dark: each is a clean surface with a hairline edge, readable, no blurred shadow and no stray pure-white card on the cream canvas.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: flatten elevation to hairlines + remove token bypasses" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Visual QA sweep (light + dark)

A dedicated pass across the key pages to catch anything the token swap missed (contrast, stray colors, broken borders).

**Files:** none (QA); fix-forward small issues into the most relevant file and note them.

- [ ] **Step 1: Walk the app in both modes**

In the running app, view each of these in **light and dark**, checking: cream canvas, white/`#313130` cards with hairline borders, charcoal primary, Inter type, modest radii, orange only where intended, text contrast ≥ 4.5:1 for body:
- Dashboard (`/realms`)
- Realms list (switcher → Manage Realms)
- POI list (`/realms/locations/pois`)
- Settlement detail + Dungeon detail (open one of each)
- NPC detail (open an NPC)
- Calendar (`/realms/calendar`)
- Create-realm dialog (still a modal in this slice — just confirm it's themed)

- [ ] **Step 2: Fix any stragglers**

For each problem found, fix in place (a missed hardcoded color, an unreadable muted, a control still showing a shadow) using tokens. Keep changes minimal and token-based.

- [ ] **Step 3: Final verify + commit**

```bash
pnpm exec tsc --noEmit && pnpm build
git add -A
git commit -m "fix: theme QA stragglers across key pages" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```
(If Step 2 found nothing, skip the commit and note "QA clean" in the report.)

---

## Final verification

- [ ] `pnpm exec tsc --noEmit` — clean.
- [ ] `pnpm build` — exit 0.
- [ ] Visual: cream/charcoal Intercom look across all key pages, light + dark; no drop shadows; hairline card borders; Inter type; orange only on the doom card.

## Self-review notes

- **Spec coverage:** Inter + 16px body (T1); light+dark palette, no-shadow depth, radii, charts, warning token (T2); orange accent application (T3); component sweep incl. badge-pill + overlays (T4); visual QA (T5). All Slice-1 spec sections mapped.
- **Out of scope (Slice 2):** POI master–detail layout, Create-Realm → route, dashboard nav de-rainbow/consolidate. Active/selected-state orange is applied in Slice 2's dashboard work.
- **No-test rationale:** pure styling/config; verification is build + visual per the Global Constraints.
