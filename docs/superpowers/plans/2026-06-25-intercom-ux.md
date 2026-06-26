# Intercom UX Restructure (Slice 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the three worst usability problems found in the live-app review: the POI detail master–detail layout (empty left column, orphaned "select…" panel), the over-large Create-Realm modal, and the rainbow dashboard nav.

**Architecture:** POI detail layout lives in two template components (`SettlementTemplate`, `DungeonTemplate`) that already receive `selectedChildId`/`onSelectChild`; we restructure their list+detail grid to true master–detail (list left, detail right, map full-width above). Create-Realm moves from a `<Dialog>` in `realms/index.tsx` to a dedicated route `src/routes/_app/realms/new.tsx`, reusing the same `executeGenerateWorld`/`executeCreateRealm` use-cases. Dashboard chips are de-rainbowed in `QuickLinksBar.tsx`.

**Tech Stack:** TanStack Start (file-based routes), React 19, Tailwind v4, Radix, Dexie. Build: `pnpm build`. Typecheck: `pnpm exec tsc --noEmit`.

## Global Constraints

- **Package manager: pnpm only.** Verify each task with `pnpm exec tsc --noEmit && pnpm build` (exit 0) plus a **visual/behavioral check in the running app** (the controller drives the browser — subagents can't see the UI). No new unit tests for layout; the create-realm route reuses already-tested use-cases.
- **Commit trailer (required):** every commit ends with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` (second `-m`).
- **Theme tokens only** (Slice 1 landed): use semantic tokens (`bg-card`, `border`, `text-muted-foreground`, `bg-primary`/`text-primary-foreground`); no hardcoded grays, no new drop shadows (depth = hairline `border`).
- **Master–detail rule:** list on the LEFT, selected detail on the RIGHT; the "Select a … to see details" placeholder lives only in the right detail pane; the map (when present) renders full-width above the grid; no empty column when a POI has no map.
- **Preserve behavior:** selected item stays URL-driven via the `room` search param (`selectedChildId`/`onSelectChild`); the existing columns/stacked `layout` toggle and localStorage keys (`settlement-layout`, `dungeon-layout`) keep working; create-realm keeps generation toggle + all params and the post-create navigation.

---

### Task 1: Create-Realm route (`/realms/new`)

Move the create-realm modal to a full page so the large multi-section form has room.

**Files:**
- Create: `src/routes/_app/realms/new.tsx`
- Modify: `src/routes/_app/realms/index.tsx` (remove create state/dialog; point "New Realm" buttons at the route)
- Modify: `src/components/layout/realm-switcher.tsx` (New Realm → navigate to `/realms/new`)

**Interfaces:**
- Consumes: `useContainer()` (`~/ui/hooks/useContainer`), `useSystemConfigs()`, `useUIStore` `setActiveRealmId`, `executeCreateRealm` (`@application/use-cases/CreateRealm`), `executeGenerateWorld` (`@application/use-cases/GenerateWorld`), `newId` (`@shared/ulid`), constants `DEFAULT_WATCHES_PER_DAY`/`DEFAULT_DAYS_PER_SEASON` (`@shared/constants`).
- Produces: route `/_app/realms/new`.

- [ ] **Step 1: Scaffold the route**

Create `src/routes/_app/realms/new.tsx` exporting `export const Route = createFileRoute('/_app/realms/new')({ component: NewRealmPage })`. Model the file's repo/hook wiring on `factions.tsx`. Use `useNavigate()` from `@tanstack/react-router`.

- [ ] **Step 2: Move the create-realm logic into the route**

From `realms/index.tsx`, MOVE (cut) into `NewRealmPage`: the create/gen state vars (lines ~119-130 and ~151-161: `createName, createSystem, createDesc, calendarOpen, createWatchesPerDay, createDaysPerSeason, createDaysPerWeek, createFactionTurnTrigger, isCreating, genEnabled, genSize, genSeed, genAdvancedOpen, genFactions, genPoiDensity, genLoomingThreat`), the `calendarSettingsSection` and `generationSettingsSection` JSX (index.tsx ~406-635), and `handleCreateRealm` (~184-246). Keep `handleCreateRealm`'s two branches and deps EXACTLY (generate → `setActiveRealmId(realmId)` + `navigate({ to: "/realms/maps/$mapId", params: { mapId } })`; blank → `setActiveRealmId(newRealm.id)` + `navigate({ to: "/realms" })`). Replace `resetCreateForm()` calls with navigation away (the page unmounts, so no reset needed). On the generate/create deps, keep the same `container.*` repos.

- [ ] **Step 3: Render the form as a page (not a dialog)**

Render a real page: a `PageHeader` (title "Create New Realm"), then a single-column `max-w-2xl` body with sections — Basics (name, system, description), `{calendarSettingsSection}`, `{generationSettingsSection}` — and a footer action row with **Cancel** (`onClick={() => navigate({ to: "/realms" })}`) and the primary submit button (same label logic: Generating…/Creating…/Generate World/Create Realm; disabled unless `createName.trim() && createSystem`, or while `isCreating`). Use `bg-card` section tiles with hairline borders. No `<Dialog>`.

- [ ] **Step 4: Repoint entry points + delete the dialog from index.tsx**

In `realms/index.tsx`: remove the `showCreate` state, `resetCreateForm`, `handleCreateRealm`, `createRealmDialog`, `calendarSettingsSection`, `generationSettingsSection`, and the moved create/gen state. Change both `setShowCreate(true)` buttons (empty-state ~756 and header ~826) to `onClick={() => navigate({ to: "/realms/new" })}` (or `<Link to="/realms/new">`), and remove both `{createRealmDialog}` mounts (~779, ~945). Keep edit/delete/bulk-delete/import logic intact. In `realm-switcher.tsx`, change `handleNewRealm` (lines 40-43) to `navigate({ to: '/realms/new' })` (drop the `setActiveRealmId(null)` round-trip).

- [ ] **Step 5: Verify (build + behavior)**

```bash
pnpm exec tsc --noEmit && pnpm build
```
Expected: exit 0. Controller checks in the app: "New Realm" (header button, empty-state button, and switcher) all open `/realms/new`; generating a world creates it and lands on the map; "Create Realm" with generation off makes a blank realm; Cancel returns to `/realms`.

- [ ] **Step 6: Commit**

```bash
git add src/routes/_app/realms/new.tsx src/routes/_app/realms/index.tsx src/components/layout/realm-switcher.tsx
git commit -m "feat: Create-Realm is a full route, not a modal" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Settlement POI — true master–detail layout

Restructure the "Locations & NPCs" tab so the location list is the left column, the selected location detail is the right column, and the map (when present) spans full-width above — no empty column, no orphaned placeholder.

**Files:**
- Modify: `src/components/poi-templates/SettlementTemplate.tsx` (the `TabsContent value="locations"` block, ~418-553)

**Interfaces:**
- Consumes: existing props `selectedChildId`/`onSelectChild`, `childPois`, `mapSection`, `layout` state, `LocationDetailPanel` (same file).

- [ ] **Step 1: Restructure the locations tab JSX**

In `TabsContent value="locations"`, replace the current grid (left=`{mapSection}`, right=detail+list) with this structure:

```tsx
<TabsContent value="locations" className="space-y-4">
  {/* Map spans full width above the master-detail, only when one exists */}
  {mapSection && <div>{mapSection}</div>}

  <div className={`grid gap-4 ${layout === "columns" ? "md:grid-cols-2" : ""}`}>
    {/* LEFT: the list (master) */}
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Key Locations</h4>
        {/* keep the existing layout toggle + Add Location buttons here */}
      </div>
      <div className="space-y-1.5">
        {/* keep the existing childPois.map(...) clickable cards exactly */}
      </div>
    </div>

    {/* RIGHT: the selected detail (detail) */}
    <div className="space-y-3">
      <div ref={detailPanelRef} />
      {selectedLocation ? (
        <LocationDetailPanel location={selectedLocation} npcs={/* keep existing */} onUpdateNPC={onUpdateNPC} />
      ) : (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Select a location to see details
        </div>
      )}
    </div>
  </div>

  {/* keep the existing settlement-wide Available Services + NPCs sections below */}
</TabsContent>
```
Preserve the exact card markup, the `onSelectChild` toggle, the layout toggle button, Add Location, `detailPanelRef`, and the services/NPCs sections. Only the column assignment changes (list→left, detail→right, map→full-width-top). The placeholder now lives in the right pane and shows whenever nothing is selected (drop the `childPois.length > 0 ?` gate so the right pane isn't blank — if there are no child POIs, show an appropriate empty hint instead).

- [ ] **Step 2: Verify (build + visual)**

```bash
pnpm exec tsc --noEmit && pnpm build
```
Expected: exit 0. Controller checks a settlement POI: list on the left, detail on the right; selecting a location fills the right pane; with no map there is NO empty column; columns/stacked toggle still works; both light + dark.

- [ ] **Step 3: Commit**

```bash
git add src/components/poi-templates/SettlementTemplate.tsx
git commit -m "fix: settlement POI uses true list-left / detail-right layout" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Dungeon POI — true master–detail layout

Apply the same restructure to the dungeon "Rooms" tab (the map/WanderingMonsterTable currently occupy the left column; rooms list + detail are crammed right).

**Files:**
- Modify: `src/components/poi-templates/DungeonTemplate.tsx` (the `TabsContent value="rooms"` block, ~849-1043)

**Interfaces:**
- Consumes: props `selectedChildId`/`onSelectChild`, `activeTab`/`onTabChange`, `childPois`, `mapSection`, `layout`, `RoomDetailPanel`, `WanderingMonsterTable` (same file).

- [ ] **Step 1: Restructure the rooms tab JSX**

Mirror Task 2 for the rooms tab: map full-width above (it's the dungeon's most valuable visual — give it the full width), then a `md:grid-cols-2` grid with the **Rooms & Areas list on the left** (header with explored badge + Add Room, then the `childPois.map(...)` room cards exactly as-is, including the `border-l-green-500` visited accent) and the **`RoomDetailPanel` / "Select a room to see details" placeholder on the right** (with `detailPanelRef`). Keep the `WanderingMonsterTable` — render it below the map (full width) or under the list, not as a competing left-column tile. Preserve the room-card `onSelectChild` toggle and the layout toggle.

```tsx
<TabsContent value="rooms" className="space-y-4">
  {mapSection && <div>{mapSection}</div>}
  <div className={`grid gap-4 ${layout === "columns" ? "md:grid-cols-2" : ""}`}>
    <div className="space-y-3">
      {/* Rooms & Areas header (explored badge, Add Room) + room cards list */}
    </div>
    <div className="space-y-3">
      <div ref={detailPanelRef} />
      {selectedRoom ? (
        <RoomDetailPanel room={selectedRoom} index={selectedRoomIndex} /* keep existing props */ />
      ) : (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Select a room to see details
        </div>
      )}
    </div>
  </div>
  {/* WanderingMonsterTable full-width here (or keep where it reads best, not a left tile) */}
</TabsContent>
```
Keep all existing props on `RoomDetailPanel` and the room cards verbatim.

- [ ] **Step 2: Verify (build + visual)**

```bash
pnpm exec tsc --noEmit && pnpm build
```
Expected: exit 0. Controller checks a dungeon POI: map prominent on top, rooms list left, room detail right; selecting a room fills the right pane; no empty/cramped column; columns/stacked toggle works; light + dark.

- [ ] **Step 3: Commit**

```bash
git add src/components/poi-templates/DungeonTemplate.tsx
git commit -m "fix: dungeon POI uses true list-left / detail-right layout" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Dashboard nav de-rainbow

Make the QuickLinksBar chips uniform charcoal/ink so they stop competing with the Overview/Favorites/Settings sub-tabs.

**Files:**
- Modify: `src/components/realm/QuickLinksBar.tsx` (the 11 `<Button variant=...>` chips, ~20-85)

**Interfaces:**
- Consumes: `Button` (`~/components/ui/button`) — use a single uniform variant.

- [ ] **Step 1: Uniform variant on every chip**

Change all 11 chips' `variant` from the per-chip colors (`amber`, `sky`, `purple`, `outline`, `indigo`×3, `secondary`, `green`, `blue`) to a single uniform `variant="outline"` (hairline + ink, consistent with Intercom). Keep each chip's icon, label, `to`, and `search`. Do not touch `button.tsx`'s variant definitions (other code may use them) — only change what QuickLinksBar passes.

```tsx
// each chip becomes, e.g.:
<Button asChild variant="outline" size="sm" className="gap-1.5">
  <Link to="/realms/calendar"><Calendar className="size-4" /> Calendar</Link>
</Button>
```
(Match the existing per-chip `to`/`search`/icon exactly; only `variant` changes, uniformly.)

- [ ] **Step 2: Verify (build + visual)**

```bash
pnpm exec tsc --noEmit && pnpm build
```
Expected: exit 0. Controller checks the dashboard: the entity chips are one uniform hairline/ink treatment (no rainbow); the Overview/Favorites/Settings tabs below now read as the clear in-page sub-level; light + dark.

- [ ] **Step 3: Commit**

```bash
git add src/components/realm/QuickLinksBar.tsx
git commit -m "fix: de-rainbow dashboard nav chips (uniform outline)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Visual QA sweep

Controller-driven pass to confirm the three changes hold together and nothing regressed.

**Files:** none (QA); fix-forward small issues into the most relevant file.

- [ ] **Step 1: Walk the changed surfaces (light + dark)**

- Create-Realm: all three entry points → `/realms/new`; generate a world end-to-end; blank create; Cancel.
- Settlement POI detail: list-left/detail-right; select fills right; no empty column with no map; toggle.
- Dungeon POI detail: map prominent; rooms list-left/detail-right; select fills right; toggle.
- Dashboard: uniform chips; sub-tabs clear.

- [ ] **Step 2: Fix any stragglers** (token-based, minimal) and re-verify `pnpm exec tsc --noEmit && pnpm build`.

- [ ] **Step 3: Commit (only if Step 2 changed anything)**

```bash
git add -A
git commit -m "fix: Slice 2 UX QA stragglers" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Final verification
- [ ] `pnpm exec tsc --noEmit` clean; `pnpm build` exit 0.
- [ ] Create-Realm works as a route from every entry point (generate + blank + cancel).
- [ ] POI settlement + dungeon detail are true master–detail (list left, detail right), no empty column, light + dark.
- [ ] Dashboard chips uniform; no rainbow.

## Self-review notes
- **Spec coverage:** 2a POI master–detail (Tasks 2+3, both templates), 2b Create-Realm → route (Task 1), 2c dashboard de-rainbow (Task 4), QA (Task 5). All Slice-2 spec items mapped.
- **Consolidation note:** the spec's "consolidate the two competing tab rows" is achieved by de-rainbowing QuickLinksBar so it reads as navigation while Overview/Favorites/Settings reads as the in-page sub-level; they are genuinely different controls (route links vs. in-page tabs), so they are not merged into one tablist.
- **Out of scope (logged Slice-2 candidates from Slice-1 review, fold in opportunistically during Task 5 if trivial):** `DungeonTemplate hover:bg-white/5` invisible on cream; `sidebar.tsx` `hsl(var(--sidebar-border))` invalid ring; untokenized status grays; `.tiptap a` link blue.
- **No-test rationale:** layout/markup + route relocation of already-tested use-cases; verification is build + controller visual/behavioral checks per Global Constraints.
