# Ruin & Landmark Generation — Design

**Date:** 2026-06-27
**Branch:** `update-ruin-generation`
**Status:** Approved design, pending spec review

## Problem

Dungeons run a 10-stage generator producing layered history, ecology, rooms,
discoveries, monsters, and loot. Ruins and landmarks get only `buildPoiFlavor`:
two Cairn table rolls (one type + one feature tag) and two templated sentences.
They have no history, no hook, no occupants, no reason to visit.

Goal: give ruins and landmarks GM-ready depth, with **separate generators**
tuned to each kind:

- **Ruin** = a fallen site with a story. History → fall → current occupant →
  hook → loot, plus a small **2–4 area mini-crawl** (inline, not a full room map).
- **Landmark** = a wonder/curiosity. Legend vs. truth → interaction effect →
  secret → quest hook. No decline narrative, no loot focus.

## Decisions (locked)

1. Two separate generators (ruin vs. landmark), not one shared one.
2. Ruin is a **mini-crawl**: 2–4 named *areas* stored inline on the POI — NOT
   child POIs and NOT a spatial grid.
3. Landmark payoff includes **all four**: legend/truth, interaction effect,
   discovery/secret, quest hook.
4. Ruin occupants are **resolved from the compendium** and may be **multiple
   creatures** — created as real NPC entities linked to the ruin POI, the same
   way dungeon creatures are.
5. Landmark interaction effects are **narrative text only** (system-agnostic) —
   no dice or mechanics.
6. Regenerate is an **in-place re-roll with a new seed** — no wizard route.

## Data model

New optional fields on `POI` (`src/domain/entities/POI.ts`), mirroring how
dungeons store `spatialDungeon` + `dungeonGenOptions`:

```ts
// POI gains:
ruinSite: RuinSite | null
landmarkLore: LandmarkLore | null
poiGenOptions: { seed: string } | null   // regenerate seed (ruin + landmark)
```

```ts
interface RuinSite {
  origin: string          // "Built by the {culture} ~{era} ago as a {purpose}."
  fall: string            // "Abandoned when {fate}."
  builderCulture: string
  era: string
  currentState: RuinState // 'empty' | 'beast-claimed' | 'faction-held'
                          // | 'haunted' | 'cult-site'
  occupants: OccupantRef[] // summary for display; backed by real NPC entities
  hook: string            // the lure heard in town
  loot: string            // what is worth taking
  areas: RuinArea[]       // 2–4, inline
}

interface OccupantRef {
  name: string            // compendium creature name
  count: number
  npcIds: string[]        // linked NPC entity ids
}

interface RuinArea {
  name: string
  readAloud: string       // sensory, GM-readable
  detail: string          // a danger, find, or clue in this area
}

type RuinState =
  | 'empty' | 'beast-claimed' | 'faction-held' | 'haunted' | 'cult-site'

interface LandmarkLore {
  legend: string          // what locals believe
  truth: string           // what is actually true
  interaction: string     // narrative: boon | curse | omen | vision | warning | nothing
  secret: string          // a hidden thing to find
  questHook: string       // points the party outward
  sensory: string
}
```

`buildPOI` (`src/domain/services/worldgen/buildPoi.ts`) defaults all three new
fields to `null`. Dexie schema: these are nested objects on the existing POI
record — no new table, but bump the Dexie version per existing migration pattern.

## Generators

### `generateRuinSite` (pure)

Location: `src/lib/ruin/RuinGenerator.ts` (new).
Signature: `generateRuinSite(seed, biome, factions, rng) => RuinSitePlan`.

- Anchors on the existing Cairn **Lair type** roll (`table-cairn-lair`) so the
  current flavor (Crumbling Fort, Sunken Grotto, …) is preserved as the subtype.
- Reuses the era/builder/fate concepts from
  `src/lib/dungeon/dungeon/DungeonHistoryGenerator.ts`
  (`ORIGINAL_BUILDER_TEMPLATES`) and the occupant logic from
  `src/lib/dungeon/dungeon/DungeonEcologyGenerator.ts`, scaled down to single
  strings (`origin`, `fall`, `builderCulture`, `era`).
- `currentState` rolls weighted; when `currentState === 'faction-held'` and
  factions exist, binds to a real faction.
- Rolls 2–4 `areas` from new ruin-area tables.
- Produces an **occupant spec** (creature type tags + counts driven by
  `currentState`), but does NOT resolve the compendium itself — that is the use
  case's job (pure generator stays DB-free and deterministic).
- Rolls `hook` and `loot`.

Returns a `RuinSitePlan` = `RuinSite` minus resolved `occupants`, plus an
`occupantSpec`.

### `generateLandmark` (pure)

Location: `src/lib/landmark/LandmarkGenerator.ts` (new).
Signature: `generateLandmark(seed, biome, rng) => LandmarkLore`.

- Anchors on the Cairn **Curiosity** roll (`table-cairn-curiosity`).
- New tables for legend, truth, interaction effect, secret, quest hook.
- Tone = wonder/mystery. No creatures, no loot, no decline.
- Fully pure — no DB needed.

### New content tables

Added to `src/domain/data/cairn-tables.ts` (or a new `worldgen` table module if
they are non-Cairn), following the existing `TableDef` / `entries()` pattern:

- Ruin: purpose, fall-cause, area-feature, area-detail (danger/find/clue), loot.
- Landmark: legend, truth, interaction-effect, secret, quest-hook.

## Where generation runs

### Ruin → use case (needs DB + compendium)

New use case `executeGenerateRuin` in
`src/application/use-cases/GenerateRuin.ts`, modeled on `executeGenerateDungeon`
but much lighter:

1. Wipe any prior ruin-linked NPCs (regen support).
2. Run `generateRuinSite` → `RuinSitePlan`.
3. Resolve `occupantSpec` against the compendium → create NPC entities linked to
   the ruin POI (`poiId = ruinId`), reusing the dungeon's creature-resolution
   helpers. Multiple creatures supported.
4. Assemble `RuinSite` (with resolved `occupants`) and save it plus
   `poiGenOptions.seed` onto the POI.

Called during world gen as a **pre-gen pass** (like the dungeon pre-gen in
`GenerateWorld.ts`), gated by a cap constant (`PREGEN_RUIN_CAP`) so large worlds
stay fast. Uncapped ruins remain stubs and generate on first open / regenerate.

### Landmark → inline (pure)

Landmarks have no DB dependency, so generate inline in the `makePoi` closure in
`src/domain/services/worldgen/generateWorld.ts` for `kind === 'landmark'`.
Store `landmarkLore` + `poiGenOptions.seed` directly. No use case, no pre-gen
pass.

### Regenerate (both kinds)

In-place re-roll with a fresh seed:

- Ruin: re-invoke `executeGenerateRuin` (wipes old NPCs, recreates).
- Landmark: re-run `generateLandmark` and overwrite `landmarkLore`.

No wizard route. Triggered from the action-bar button (below).

## UI (extend `GenericTemplate`)

`src/components/poi-templates/GenericTemplate.tsx` (ruins + landmarks share it):

- **Overview tab — new "Lore" block**, mirroring the dungeon "Dungeon Lore"
  sub-block:
  - Ruin: origin, fall, builder culture, current state, occupant summary, hook,
    loot.
  - Landmark: legend, truth, interaction, secret, quest hook.
- **Ruin areas:** render `ruinSite.areas` as a simple list (name + read-aloud +
  detail) — an "Areas" section in the Overview tab.
- **At A Glance:** surface ruin `currentState` and occupant count.
- **Denizens tab:** already rolls up linked NPCs — ruin occupants appear here
  automatically once they are real NPC entities.
- **Action bar:** extend the existing dungeon button gate in
  `src/routes/_app/realms/pois_.$poiId.tsx` (`poiActionBar`) to also show a
  Generate/Regenerate button for `ruin` and `landmark`. Label flips on whether
  `ruinSite` / `landmarkLore` already exists. Ruin button calls
  `executeGenerateRuin`; landmark button re-runs the pure generator. Re-roll is
  in-place (no navigation).

The existing ruin-only `RumorList` in `GenericTemplate` stays.

## Determinism

All generation uses `SeededRandom` seeded from `poiGenOptions.seed` (initialized
from the POI id at world gen, re-rolled on regenerate). Same seed → same output,
matching the dungeon pattern.

## Testing

- Unit: `generateRuinSite` and `generateLandmark` are pure and deterministic —
  snapshot/structure tests with fixed seeds; assert area count 2–4, all required
  fields populated, `currentState` binds a faction only when one is supplied.
- Unit: new tables are well-formed (`entries()` coverage, dice ranges).
- Integration: `executeGenerateRuin` resolves compendium creatures, creates the
  expected NPC entities linked to the POI, and regen wipes prior NPCs (no orphans
  or duplicates).
- Existing world-gen tests updated for the new pre-gen pass and the cap.

## Out of scope

- Spatial room maps for ruins (intentionally a mini-crawl).
- Mechanical/dice effects for landmarks (narrative only).
- A dedicated regenerate wizard route.
- Landmark creatures / loot.
