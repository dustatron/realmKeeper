# Encounter ↔ Region / Discovery Integration — Design (Spec B3)

**Date:** 2026-06-28
**Branch:** `feature/encounter-region-integration`
**Status:** Approved design, pending spec review
**Builds on:** B1 (region monsters seeded onto POI `monsterRefs`) + B2 (notable
finds / discovery locations). Depends on `tierForTerrain`, `pickTierMonster`,
`monsterThreat`.

## Problem

A region's encounter table is created empty and lazily, then falls back to
hardcoded generic entries. It has no connection to the region's own tier,
monsters, or discovery sites, so encounters feel generic and disconnected from
the seeded world. Make a region's encounter table reflect that region, and let
omens/discoveries point at real nearby locations.

## Decisions (locked)

1. **Scope: region encounter tables only.** POI/dungeon encounter tables
   (`ownerPoiId`) are untouched. This spec concerns tables with `ownerRegionId`.
2. **All six categories are region-flavored** by a pure builder; categories stay
   flat `string[]` (no `EncounterTable` schema change).
3. **Trigger:** auto-seed the table from region data on lazy creation (instead of
   empty), plus a **"Regenerate from region"** button. The GM can still hand-edit.
4. **Omens/discoveries → locations** via a post-hoc resolver
   (`matchRegionLocation`) mirroring the existing `matchCompendiumMonster` — no
   structured-entry change. Seeded entries embed real region-POI names; the
   resolver links a rolled entry to that POI.
5. Deterministic (seeded); compendium name resolution is static (no DB in the
   pure builder).

## Constraints discovered

- `EncounterTable` (`src/domain/entities/EncounterTable.ts`): `{ id, ownerPoiId,
  ownerRegionId, worldId, creature[], signOmen[], loss[], npc[], discovery[],
  treasure[], customSections[], disabledCategories[], lastResult? }`. Categories
  are flat `string[]`; `getActiveSections` falls back to
  `DEFAULT_ENCOUNTER_ENTRIES[cat]` when a category array is empty.
- `EncounterRollResult` (`src/domain/value-objects/EncounterRollResult.ts`) holds
  per-roll data incl. `monsterMatch?: { compendiumId; name } | null` (creature
  category) and `npc?` (npc category). No `locationMatch` yet.
- Cascade engine: `rollCascade(sections, fx)` in
  `src/domain/services/encounterCascade.ts`; effects bound in
  `src/application/use-cases/RollEncounterCascade.ts` `buildCascadeEffects`
  (`rollDie`, `rollReaction`, `generateNpc`, `matchMonster`, `now`).
  `buildResult` attaches `monsterMatch` for `creature` via `fx.matchMonster`.
- Tables are created **lazily/empty** by `executeCreateEncounterTable`
  (`CreateEncounterTable.ts`) in two spots: `usePOIActions.ensureEncounterTableForPoi`
  (POI) and the region route `regions_.$regionId.tsx` `handleEncounterCascade`
  (region). The region one is where B3 injects seeding.
- "Region's monsters" = union of `monsterRefs` (`CompendiumRef {id, quantity}`)
  across the region's POIs (`db.pois.where('regionId')` / `poiRepo.getByRegionId`).
  Region has no monster field; `Region.terrain` → tier via `tierForTerrain`.
- `matchCompendiumMonster(text, systemId)` (`src/domain/services/matchCompendiumMonster.ts`)
  is the substring-match pattern to mirror for locations.
- Omen/discovery defaults are hardcoded in
  `src/domain/data/default-encounter-tables.ts`.
- `EncounterCascade.tsx` hosts roll/edit UI; `EncounterResultCards.tsx` renders
  the monster-match/NPC payloads — the place to add a location link.

## Data model

One additive change (no `EncounterTable` change):

```ts
// EncounterRollResult gains (parallel to monsterMatch):
locationMatch?: { poiId: string; name: string } | null
```

## The builder

New pure module `src/domain/services/worldgen/regionEncounter.ts`:

```ts
export interface RegionEncounterContent {
  creature: string[]
  signOmen: string[]
  loss: string[]
  npc: string[]
  discovery: string[]
  treasure: string[]
}

export function buildRegionEncounterContent(input: {
  region: { terrain: string }
  pois: POI[]            // the region's POIs (for monsterRefs + discovery sites)
  factions?: Faction[]   // region factions (npc flavor)
  systemId: string
  rng: SeededRandom
}): RegionEncounterContent
```

Per category (tier = `tierForTerrain(region.terrain)`):
- **creature** — resolve each POI `monsterRefs` id to its compendium name
  (dedup); top up with `pickTierMonster(systemId, tier, rng)` names until ~6–8.
- **discovery** — the region's notable sites: POIs of type `dungeon`/`ruin`/
  `landmark`, plus any POI holding a `notable`/magic treasure item; entries name
  them (e.g. `"The Sunken Grotto"`). Generic discovery-table top-up if sparse.
- **signOmen** — a mix: location-pointing omens templated with a real discovery
  site name (`"Fresh tracks lead toward {site}"`, `"Smoke rises from the
  direction of {site}"`) + tier/biome ambient omens.
- **loss** — tier/biome-flavored hazards (harsher entries for `perilous`).
- **npc** — region-flavored prompts (a traveler / a faction agent, referencing a
  region faction name when available). The roll still generates a real region NPC
  via the existing `npc` cascade path.
- **treasure** — tier-scaled coin/valuables (reuse the treasure tables / a tier
  band). NOT the notable items (those surface via B2 leads + the `discovery`
  category here).

Deterministic; resolves names from the static compendium only.

## Location resolver

New `src/domain/services/matchRegionLocation.ts`:

```ts
export function matchRegionLocation(text: string, pois: POI[]): { poiId: string; name: string } | null
```
Substring-matches a region POI name within the entry text (longest-name-first to
avoid partial overlaps); returns the matched POI ref or null. Mirrors
`matchCompendiumMonster`.

Wire into the cascade: add `matchLocation?: (text: string) => { poiId; name } | null`
to `CascadeEffects`; in `buildResult`, for `section.category === 'signOmen' ||
'discovery'`, set `locationMatch = fx.matchLocation?.(entryText) ?? null`.
`buildCascadeEffects` provides it as `(text) => matchRegionLocation(text, regionPois)`
— so the use-case/UI must pass the region's POIs into the cascade context.

## Wiring & UI

- **Auto-seed on lazy region-table creation:** where the region route creates an
  empty region table, instead build content via `buildRegionEncounterContent` and
  create the table with those arrays. (POI/dungeon lazy creation unchanged.)
- **"Regenerate from region" button** on the region encounter UI: rebuilds the six
  arrays from current region data (overwrites them; clears `lastResult`). A new
  use-case `executeRegenerateRegionEncounter(regionId, …)` loads region POIs +
  factions, runs the builder, updates the table.
- **Result UI:** `EncounterResultCards`/`EncounterCascade` render `locationMatch`
  for omen/discovery rolls as a link to the POI (like the monster-match link),
  with a small GM peek (the POI name; optionally its notable finds via the B2
  region overview helper).
- Region detail page passes the region's POIs into the cascade context so
  `matchLocation` works.

## Testing

- Pure `buildRegionEncounterContent` (fixed seed): deterministic; `creature`
  includes the region's monster names + tier top-up to the min; `discovery`/
  `signOmen` reference real region-POI names; `loss`/`treasure` scale by tier;
  resolves for `system-cairn-2e` and `system-shadowdark`.
- `matchRegionLocation`: links an entry containing a region POI name; null when
  none; longest-match wins on overlap.
- Cascade: a `signOmen`/`discovery` roll attaches `locationMatch`; `creature`
  still attaches `monsterMatch`; other categories attach neither.
- Wiring: lazy creation auto-seeds (region table is non-empty on first open);
  regenerate rebuilds and clears `lastResult`.

## Out of scope

- POI/dungeon encounter tables (unchanged).
- Encounter balancing / CR math.
- Auto-marking a discovery "found" when its omen is rolled.
- Changing the cascade's reaction/NPC logic.
