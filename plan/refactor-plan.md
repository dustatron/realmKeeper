# Realm Keeper — Component Refactor Plan

## Background

The domain, application, and infrastructure layers are well-structured and should not change. The problem is in the component/route layer, which grew fast without structural boundaries. This plan addresses that debt in discrete, reviewable PRs ordered by risk and value.

---

## PR 1 — Error Boundaries

**Size:** Small (~1 hour)  
**Risk:** Very low  
**Blocks:** Nothing, but makes everything safer

### What

Add a `<RealmErrorBoundary>` component and wrap the main route outlet so unhandled errors produce a visible UI instead of a blank page. Currently a failed Dexie query or render error silently empties the screen.

### Files

- `src/components/shared/RealmErrorBoundary.tsx` — new component
- `src/routes/_app.tsx` — wrap `<Outlet />` with the boundary

### Acceptance criteria

- Uncaught render errors show a fallback UI with the error message and a "Reload" button
- No existing behaviour changes in the happy path

---

## PR 2 — Split WanderingMonsterTable

**Size:** Medium (~half day)  
**Risk:** Low  
**Blocks:** Nothing

### What

`WanderingMonsterTable.tsx` is 1,057 lines containing three distinct concerns crammed into one component: a monster search tab, an NPC denizens tab, and a custom stat override modal. Extract each into its own file.

### Files

- `src/components/shared/WanderingMonsterTable.tsx` — slim to an orchestrator (~100 lines)
- `src/components/shared/MonsterSearchTab.tsx` — new
- `src/components/shared/NpcDenizensTab.tsx` — new
- `src/components/shared/MonsterStatOverrideDialog.tsx` — new

### Acceptance criteria

- Existing wandering monster functionality unchanged
- Each extracted component has a single clear responsibility
- No new props added to the outer component's interface

---

## PR 3 — Break up `pois_.$poiId.tsx`

**Size:** Large (~2–3 sessions)  
**Risk:** Medium — lots of interleaved state; easy to break subtle interactions  
**Blocks:** Nothing, but is the highest-value cleanup

### What

The POI detail route is 1,352 lines with 14 `useState` hooks managing: run mode, map upload, child POI creation, world events, encounter tables, wandering monsters, faction presences, rumors, NPC creation, and POI editing. Each concern should become a focused panel component backed by a custom hook.

### Proposed decomposition

| Component | Responsibility | Hook |
|---|---|---|
| `POIDetailView` | Layout, title, description, star/visit | `usePOIDetail` |
| `POIChildrenPanel` | Sub-location list + create dialog | `usePOIChildren` |
| `POIEventsPanel` | Timed events list + create form | `usePOIEvents` |
| `POIEncounterPanel` | Encounter table + wandering monsters | (reuse `EncounterTableUI`) |
| `POIFactionsPanel` | Faction presences + add dialog | `usePOIFactions` |
| `POINotesPanel` | GM notes, Markdown editor | inline |
| `POIMapPanel` | Map viewer + upload | inline |

### Files

- `src/routes/_app/realms/pois_.$poiId.tsx` — reduces to ~150 lines (layout + data fetch)
- `src/components/poi/` — new directory, one file per panel above
- `src/ui/hooks/usePOIDetail.ts`, `usePOIChildren.ts`, `usePOIEvents.ts`, `usePOIFactions.ts` — new

### Strategy

Do this incrementally within one PR — extract one panel at a time, run the app after each extraction before moving to the next. Do not attempt a single large rewrite.

### Acceptance criteria

- All existing POI detail features work unchanged
- Route file is under 200 lines
- No panel component exceeds 250 lines
- Each custom hook encapsulates its own Dexie queries and mutations

---

## PR 4 — Use-Case Layer: Add Real Value or Remove

**Size:** Medium-large  
**Risk:** Low (mechanical — TypeScript guides the changes)  
**Blocks:** Nothing

### Problem

80+ use-case files are single-line passthroughs (`npcRepo.create(npc)`). The abstraction costs maintenance overhead but provides no validation, error handling, or side-effect coordination.

### Decision needed (pick one before starting)

**Option A — Commit to the layer:** Add a `Result<T, E>` return type, input validation, and structured error types to each use-case. Use-cases become the place for cross-cutting logic (e.g., creating an NPC also logs a WorldEvent).

**Option B — Remove the layer:** Delete `src/application/use-cases/`, move repo calls into hooks or route components. Keep `src/application/ports/` (interfaces) and `src/domain/` untouched.

Option B is lower effort. Option A is higher value if the app grows significantly.

### Files (Option B)

- Delete `src/application/use-cases/` (~80 files)
- Update all route/component imports to call repos directly via `useContainer()`
- Keep `src/application/ports/` intact

### Acceptance criteria

- All existing features work
- No remaining imports from `@application/use-cases`
- (If Option A) All use-cases return `Result<T, AppError>` and callers handle errors

---

## PR 5 — SystemBlock Discriminated Union

**Size:** Medium  
**Risk:** Low (compiler-guided)  
**Blocks:** Nothing

### Problem

`SystemBlock` has optional `level?`, `className?`, and other system-specific fields with no type enforcement. A Cairn NPC block and a Shadowdark NPC block have the same TypeScript type. `NPCEditSheet.tsx:34` uses `systemConfig: any`.

### What

Replace the flat `SystemBlock` interface with a discriminated union keyed on `systemId`:

```ts
type SystemBlock =
  | { systemId: 'cairn2e'; hp: number; maxHp: number; armor: number; str: number; dex: number; wil: number }
  | { systemId: 'shadowdark'; hp: number; maxHp: number; armor: number; className: string; level: number }
```

Replace `systemConfig: any` in `NPCEditSheet.tsx` with the proper `SystemConfig` type.

### Files

- `src/domain/value-objects/SystemBlock.ts` — redesign type
- `src/domain/entities/NPC.ts` — update reference
- `src/components/shared/NPCEditSheet.tsx` — remove `any`, narrow on `systemBlock.systemId`
- All components that read `npc.systemBlock.*` fields — add narrowing guards

### Acceptance criteria

- No `any` types in SystemBlock-related code
- TypeScript errors on invalid system field access at compile time
- Existing NPC edit/display behaviour unchanged

---

## Order of execution

```
PR 1 (Error Boundaries) → ship immediately
PR 2 (WanderingMonsterTable) → next
PR 3 (pois_.$poiId breakup) → dedicated effort, own branch
PR 4 (Use-case decision) → after team discussion on Option A vs B
PR 5 (SystemBlock types) → anytime, independent
```

PRs 2, 3, and 5 are independent and can be worked in parallel if needed.
