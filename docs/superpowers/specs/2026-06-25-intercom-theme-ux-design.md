# Intercom theme + UX restructure — design

**Status:** designed; ready for implementation plan(s).
**Date:** 2026-06-25.
**Branch:** `feature/intercom-theme-ux`.
**Source design:** Intercom design system (VoltAgent/awesome-design-md) — cream
canvas, charcoal ink, hairline borders, no drop shadows, Saans→Inter type, a
single restrained orange accent.

This work has **two slices**, each independently shippable. Slice 1 is a global
token reskin; Slice 2 is targeted UX restructuring surfaced by a critical review
of the live app. Build **Slice 1 → Slice 2** so the layout work happens on the
new visual baseline.

---

## Decisions (from brainstorming + live review)

- **Scope:** whole app (token-driven, cascades from `src/styles/theme.css`).
- **Dark mode:** keep the toggle; adapt the `.dark` block to a dark-Intercom palette.
- **Depth:** no drop shadows — white-on-cream surface contrast + 1px hairline borders.
- **Type:** switch to self-hosted **Inter** (Saans substitute); keep Geist Mono.
- **Accent:** charcoal/ink is the primary everywhere; orange `#ff5600` is a **rare**
  accent (Looming-Doom card, active/selected states) — never a generic primary CTA.
- **UX (Slice 2):** fix POI detail master–detail layout; convert Create-Realm modal
  to a route; de-rainbow the dashboard tab nav.

---

## Slice 1 — Theme (global token reskin)

The theme is a shadcn-style CSS-variable system consumed via Tailwind v4
`@theme inline` in `src/styles/theme.css`; components use semantic tokens
(`bg-background`, `bg-card`, `text-foreground`, `border`, `shadow-card`, …). So
the reskin is mostly editing token *values* in one file.

### Color tokens — light (Intercom)

| Token | New value | Intercom role |
|-------|-----------|---------------|
| `--background` | `#f5f1ec` | canvas (cream) |
| `--foreground` | `#111111` | ink |
| `--card` / `--popover` | `#ffffff` | surface-1 |
| `--card-foreground` / `--popover-foreground` | `#111111` | ink |
| `--primary` | `#111111` | ink |
| `--primary-foreground` | `#ffffff` | on-primary |
| `--secondary` | `#ebe7e1` | surface-2 |
| `--secondary-foreground` | `#111111` | ink |
| `--muted` | `#ebe7e1` | surface-2 |
| `--muted-foreground` | `#626260` | ink-muted |
| `--accent` | `#ebe7e1` | hover surface |
| `--accent-foreground` | `#111111` | ink |
| `--destructive` | `#c41c1c` | semantic-error |
| `--destructive-foreground` | `#ffffff` | on-primary |
| `--border` / `--input` | `#d3cec6` | hairline |
| `--ring` | `#111111` | ink (visible focus) |
| `--sidebar` | `#f5f1ec` | canvas |
| `--sidebar-foreground` | `#111111` | ink |
| `--sidebar-accent` | `#ebe7e1` | surface-2 |
| `--sidebar-border` | `#d3cec6` | hairline |
| `--sidebar-primary` / `-foreground` | `#111111` / `#ffffff` | ink / on-primary |

New accent tokens (sparingly used):
- `--warning` / doom accent: `#ff5600` (fin-orange), foreground `#ffffff`.

### Color tokens — dark (adapted Intercom)

| Token | New value |
|-------|-----------|
| `--background` | `#000000` (inverse-canvas) |
| `--foreground` | `#ffffff` (inverse-ink) |
| `--card` / `--popover` | `#313130` (inverse-surface-1) |
| `--card-foreground` / `--popover-foreground` | `#ffffff` |
| `--primary` | `#ffffff` |
| `--primary-foreground` | `#111111` |
| `--secondary` / `--muted` / `--accent` | `#313130` |
| `--muted-foreground` | `#9c9fa5` (inverse-ink-muted) |
| `--destructive` | `#c41c1c` |
| `--border` / `--input` | `rgba(255,255,255,0.12)` |
| `--ring` | `#ffffff` |
| sidebar.* | mirror card/border/ink values above |
| `--warning` | `#ff5600` |

### Depth — no shadows (the elegant lever)

Redefine the three depth tokens so existing usages convert automatically:
- `--shadow-border` → `0 0 0 1px var(--border)` (flat hairline ring).
- `--shadow-card` → `0 0 0 1px var(--border)` (no blur/offset, no double cream ring).
- `--shadow-elevated` → `0 0 0 1px var(--border)` (popovers/menus: hairline only).

Every component using `shadow-card`/`shadow-elevated`/`shadow-border` becomes
flat white-on-cream + hairline with no component edits. Then sweep for hardcoded
`shadow-[…]`, `shadow-md`, `drop-shadow`, and convert to a hairline `border`.

### Radius scale (Intercom)

Set explicit values in `@theme inline` (replace the `calc()` chain):
`--radius-sm: 6px; --radius-md: 8px; --radius-lg: 12px; --radius-xl: 16px;` and
base `--radius: 8px` (buttons, inputs = md; cards = lg; map/mockup tiles = xl).
No pill-round CTAs.

### Typography (Inter)

- Self-host **Inter Variable** (woff2) under `public/fonts/`, `@font-face` like
  Geist today; set it as the app sans family in `src/styles/app.css` (replace
  the Geist sans reference). **Keep Geist Mono** — it's already self-hosted, so
  reusing it adds zero new font work.
- Apply Intercom's type scale + **negative letter-spacing on display sizes**
  (≈ -0.5px to -2px scaling with size; 0 on body). Body 16px / line-height 1.5.
- Eyebrows/section labels: sentence case, never all-caps.

### Charts

Adopt Intercom's report palette: `--chart-1 #65b5ff` (blue), `--chart-2 #0bdf50`
(green), `--chart-3 #ff2067` (pink), `--chart-4 #b3e01c` (lime), `--chart-5
#03b2cb` (cyan). (report-orange `#fe4c02` available if a 6th is needed.)

### Component sweep (after token changes)

Audit and reconcile to tokens:
- `rg "shadow-(card|elevated|border|md|lg|xl|\[)"` → hairline borders.
- `rg "bg-white|bg-black|#fff|#000|bg-gray|text-gray|border-gray"` in components →
  replace bypasses with semantic tokens.
- Verify buttons/inputs/cards/tabs/badges/dialog match Intercom radii + hairline.

### Slice 1 verification

Visual, before/after across: dashboard, realms list, POI list, settlement detail,
dungeon detail, NPC detail, calendar, create-realm — both light and dark. `pnpm
build` + `pnpm exec tsc --noEmit` clean. No unit tests (pure styling).

---

## Slice 2 — UX restructure

### 2a. POI detail — master–detail layout (the worst offender)

**Problem:** the "Locations & NPCs" tab puts the list + detail + NPCs in the right
column while the **left half is empty**; the "Select a location to see details"
panel floats *above* the list it refers to. The dungeon tab has the same orphaned
"Select a room" panel and a cramped map.

**Fix (`src/routes/_app/realms/pois_.$poiId.tsx` + POI templates):**
- True two-pane master–detail: **list on the left**, **selected detail on the
  right** (detail pane shows the empty "select…" hint only until a row is picked).
- One consistent layout language for child collections (Key Locations and NPCs
  use the same list/card treatment, not two different ones).
- Dungeon: the map anchors the page (larger), with rooms list + room detail in the
  master–detail beside/below it — remove the orphaned "Select a room" floating panel.
- Header: label or drop ambiguous icon-only buttons (crosshair, sun); give every
  remaining icon button an `aria-label` and a tooltip.

### 2b. Create-Realm modal → route

**Problem:** the form (name, system, description, Calendar Settings collapsible,
Procedural generation block, nested Advanced collapsible) is too large for a modal
— it scrolls and nests disclosures inside a dialog.

**Fix:** new route **`/realms/new`** (`src/routes/_app/realms/new.tsx`) rendering
the existing `executeGenerateWorld`/`executeCreateRealm` flow as a full page:
- Sectioned layout (Basics → Calendar → Generation → Advanced) with breathing room
  and inline help text; sticky header + footer actions (Cancel / Generate World).
- Entry points (the "New Realm" buttons and the switcher "New Realm") navigate to
  the route instead of opening the dialog. Remove the dialog + its create-form
  state from `realms/index.tsx` (the shared `createRealmDialog`/`resetCreateForm`).
- Preserve current behavior: generation toggle + params, calendar settings,
  active-realm set + navigate-to-map on success.

### 2c. Dashboard nav de-rainbow + consolidate

**Problem:** the entity tab chips (World Map orange, Calendar blue, Factions pink,
Monsters/Spells/Magic purples, Tables green, Notes blue) are a rainbow that fights
the restrained Intercom aesthetic; plus two stacked tab rows compete.

**Fix (`src/components/realm/Dashboard.tsx`):** uniform charcoal/ink chips with a
single active state (ink fill / cream text), icons in ink-muted. **Consolidate the
two competing tab rows into one clear hierarchy** — a single primary navigation
treatment, with Overview/Favorites/Settings expressed as a clearly-subordinate
sub-level (not a second equal-weight row).

### Slice 2 verification

Visual before/after of the three areas (light + dark); the create-realm route must
generate a world end-to-end exactly as the modal did (verify in the running app).
`pnpm build` + `tsc` clean. Where logic moves (create-realm), keep/relocate any
existing tests; no new generation logic.

---

## Non-goals
- Intercom marketing-specific directives (product-screenshot-led sections,
  Fin-orange-only-on-AI) — N/A to this app.
- Restructuring pages beyond the three named in Slice 2.
- A second display font; JetBrains Mono swap (optional, deferred).

## Resolved decisions
1. **Dark-mode card surface:** `#313130` (Intercom literal, full fidelity).
2. **Mono font:** keep Geist Mono (already self-hosted; zero new work).
3. **Slice 2 sequencing:** all three sub-items (2a/2b/2c) ship in one PR.
4. **Dashboard tabs:** consolidate the two competing rows into one hierarchy.

## Build order
Two plans / two PRs: **Slice 1 (Theme) first**, then **Slice 2 (UX)** on the new
visual baseline.
