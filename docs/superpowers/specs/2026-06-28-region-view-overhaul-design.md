# Region View Overhaul — Design

**Date:** 2026-06-28
**Branch:** `feature/region-view-overhaul`
**Status:** Approved decisions (Q&A + GM review), pending spec sign-off

## Problem

The region detail page is not built for at-the-table use. The "What's Here"
summary is comma-joined plain text with no links and miscounts treasure/magic;
the Locations, NPCs, and Factions tabs are thin card lists that can't be scanned
or sorted; and authored region data (`dangers`, `features`, `resources`) plus a
derivable danger tier are never shown. A GM review confirmed these gaps.

## Decisions (locked)

1. **Shared lightweight `DataTable`** built on existing `ui/table.tsx` — no new
   dependency (no `@tanstack/react-table`). Click-to-sort headers; column defs.
2. **Scope = core 4 + cheap wins:** the contents redesign + Locations/NPCs/
   Factions data tables, PLUS rendering region `dangers`/`features`/`resources`,
   a derived danger tier in the overview, and fixing the What's-Here double-count
   (including `poi.magicItemRefs`). **Rumors surface is OUT of scope** this round.
3. **Add `guardianNpcId` to `TreasureItem`** so any POI treasure can name a
   guardian NPC (full treasure→NPC vision), not only NPC-held items.

## Data model

```ts
// TreasureItem (src/domain/value-objects/TreasureItem.ts) gains:
guardianNpcId?: string | null   // NPC guarding this item, if any

// Region (src/domain/entities/Region.ts) gains:
problem: string                 // the region's central problem/tension (e.g.
                                // "A blight creeps out of the marsh, fouling wells")
```
- Both are additive. `guardianNpcId` is an optional nested field (no index). For
  `Region.problem`, reads guard with `region.problem ?? ''` for pre-existing rows;
  `CreateRegion` defaults it to `''`, world-gen fills it. **No migration required**
  (confirm in plan; a no-op version bump is fine for hygiene).
- `guardianNpcId`: a picker in the POI treasure editor (choose a guardian NPC).
  World generation MAY set it where a guardian guards a notable item — generator
  wiring is a follow-up; the field + manual UI ships now.

## Region problem

Every region gets a **central problem** — a one-line tension/crisis that gives the
GM an immediate "why does this region matter right now" hook.

- **Table:** `REGION_PROBLEMS: string[]` in `src/domain/services/worldgen/regionFlavor.ts`
  — ~30 evocative sandbox problems (feuds, blights, missing persons, monster
  encroachment, failing resources, cult activity, succession disputes, etc.).
  Picked with the seeded `rng`.
- **Generation:** `buildRegionFlavor(biome, rng)` (called at `generateWorld.ts:118`)
  also returns `problem` (a `rng.pick(REGION_PROBLEMS)`), set on each region. May
  bias by biome later; flat pick for now.
- **Display:** the overview header shows the problem prominently (its own labeled
  line/callout), with a **Reroll** button beside it.
- **Reroll:** `executeRerollRegionProblem(regionId, deps)` picks a NEW problem and
  persists via `regionRepo.update`. Uses a fresh `SeededRandom(newId())` so each
  click varies (variety over reproducibility — this is a GM convenience, not
  deterministic world-gen). The route wires a handler + button.

## Components

### A. `src/components/shared/DataTable.tsx` (new)
Generic, reusable:
```ts
interface DataTableColumn<T> {
  key: string
  header: string
  sortable?: boolean
  render: (row: T) => React.ReactNode
  sortValue?: (row: T) => string | number   // defaults to render text when omitted
  className?: string
}
function DataTable<T>(props: {
  columns: DataTableColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string
  empty?: React.ReactNode
}): JSX.Element
```
- Local sort state (`{ key, dir: 'asc'|'desc' }`); clicking a sortable header
  cycles asc→desc; arrow indicator. Built on `Table/TableHeader/TableRow/...`.
- No pagination/virtualization (region-scale data: dozens of rows).

### B. Locations tab → `DataTable`
Columns (sortable): **Name** (link `/realms/pois/$poiId`), **Type**, **Danger**
(derived: max `monsterThreat` over `poi.monsterRefs` → tier label/number),
**Treasure** (count of uncollected notable items; icon), **Encounter**
(`encounterChance` set or `wanderingMonsters.length > 0`), **Faction**
(controlling/contesting from `FactionPresence` for that POI → faction name),
**Visited** (`poi.visited`). Starred POIs sort to top.
- Needs region `FactionPresence[]` loaded (by the POIs' ids) + factions for names.

### C. NPCs tab → `DataTable`
Columns: **Name** (link `/realms/npcs/$npcId`), **Location** (`poiId` → POI link),
**Faction** (`factionIds[0]` → faction link; flag "leader" when
`faction.leaderNpcId === npc.id`), **Disposition** (`disposition`, color-coded),
**Movement** (`movementStatus`), **Want** (`want` || `motivation`, truncated).
Life-status (dead/undead) shown as a badge on the name.

### D. Factions tab → `DataTable`
Columns: **Name** (link), **Stance** (relationship score toward the party faction
→ ally/neutral/hostile, color-coded), **HQ** (`headquartersPoiId` → POI link),
**Leader** (`leaderNpcId` → NPC link), **Agenda** (top `agendaGoals` preferring
`timeframe:'immediate'`, with `progress/segments` as a small clock), **Status**
(small badge). Party faction pinned/labeled.
- Stance: find the `isParty` faction, read each faction's `FactionRelationship`
  score toward it (resolve the relationship pair in the plan).

### E. "What's Here" redesign (`RegionContentsPanel` + `regionContents.ts`)
`summarizeRegionContents(pois, npcs)` now **retains ids** and splits honestly:
```ts
interface RegionContents {
  treasures: { name; value; notable; collected; poiId; npcId?; guardianNpcId? }[]
  magic:     { name; collected; poiId?; npcId? }[]   // POI treasure isMagic + poi.magicItemRefs + NPC inventory magicItem
  monsters:  { name; count; poiId; threat; big }[]
  treasureCount; magicCount; monsterCount            // honest, non-overlapping
}
```
Panel renders **three grouped lists** (not chips):
- **Treasures** — name, value, notable badge, `collected` (struck/"looted"),
  **location link** (POI) + **guardian NPC link** (`guardianNpcId`, or the holding
  NPC for inventory items).
- **Magic items** — name, **location link**, collected. Pulls from
  `treasure[].isMagic`, `poi.magicItemRefs`, and NPC inventory `magicItem`.
- **Monsters** — name, count, **location link**, threat tier (big-monster
  highlighted).
- **Notable-only by default** with a "show mundane" toggle.
Every name links to its POI/NPC route. Counts are separate and correct.

### F. Overview header (cheap wins + region problem)
Render the region **problem** as a prominent callout with a **Reroll** button,
plus region `dangers[]`, `features[]`, `resources[]`, `settlements[]` (people
already shown) as labeled chip groups, and a **danger tier** badge (derive from
max region monster threat, fallback `tierForTerrain(region.terrain)`).

## Testing

- Pure `summarizeRegionContents` (extended): retains poiId/npcId/guardianNpcId;
  honest non-overlapping counts; magic pulled from all three sources; big-monster
  flag via `monsterThreat`. Determinism not relevant (pure mapping).
- `DataTable`: sorts asc/desc by a column's `sortValue`; renders empty state;
  stable `rowKey`.
- Danger-tier helper: max-threat → tier; terrain fallback.
- `buildRegionFlavor` returns a non-empty `problem` from `REGION_PROBLEMS`
  (deterministic for a fixed seed); `executeRerollRegionProblem` persists a new
  problem string via the repo.
- Build (`tsc`) gates the JSX/route wiring (no component-render harness).

## Out of scope

- Rumors-in-region surface (deferred).
- Generator wiring to auto-set `guardianNpcId` (manual UI ships; seeding later).
- Travel-times / weather / events-in-overview (GM suggestions; future).
- `@tanstack/react-table`.
