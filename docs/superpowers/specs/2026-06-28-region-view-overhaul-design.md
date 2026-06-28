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
```
- Optional nested field → no Dexie index needed. A read-hook/default keeps it
  `undefined` for existing rows; **no migration required** (confirm in plan; if a
  version bump is wanted for hygiene, it's a no-op `.upgrade`).
- Setting it: a picker in the POI treasure editor (choose a guardian NPC). World
  generation MAY set it where a guardian monster/NPC guards a notable item — but
  generator wiring is a follow-up; the field + manual UI ships now.

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

### F. Overview header (cheap wins)
Render region `dangers[]`, `features[]`, `resources[]`, `settlements[]` (people
already shown) as labeled chip groups, plus a **danger tier** badge (derive from
max region monster threat, fallback `tierForTerrain(region.terrain)`).

## Testing

- Pure `summarizeRegionContents` (extended): retains poiId/npcId/guardianNpcId;
  honest non-overlapping counts; magic pulled from all three sources; big-monster
  flag via `monsterThreat`. Determinism not relevant (pure mapping).
- `DataTable`: sorts asc/desc by a column's `sortValue`; renders empty state;
  stable `rowKey`.
- Danger-tier helper: max-threat → tier; terrain fallback.
- Build (`tsc`) gates the JSX/route wiring (no component-render harness).

## Out of scope

- Rumors-in-region surface (deferred).
- Generator wiring to auto-set `guardianNpcId` (manual UI ships; seeding later).
- Travel-times / weather / events-in-overview (GM suggestions; future).
- `@tanstack/react-table`.
