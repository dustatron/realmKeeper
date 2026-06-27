# Ruin & Landmark Generation — Design

**Date:** 2026-06-27
**Branch:** `update-ruin-generation`
**Status:** Revised after adversarial review, pending re-review

## Problem

Dungeons run a 10-stage generator producing layered history, ecology, rooms,
discoveries, monsters, and loot. Ruins and landmarks get only `buildPoiFlavor`:
two Cairn table rolls (one type + one feature tag) and two templated sentences.
They have no history, no hook, no occupants, no reason to visit.

Goal: give ruins and landmarks GM-ready depth, with **separate generators**:

- **Ruin** = a fallen site with a story AND a small explorable structure.
  History → fall → current state, plus a **2–4 area mini-crawl** where each area
  holds its own occupants and loot (a true mini-dungeon, not a flat blurb).
- **Landmark** = a wonder/curiosity. Legend vs. truth → interaction effect →
  secret → quest hook. No decline narrative, no creatures, no loot.

## Decisions (locked)

1. Two separate generators (ruin vs. landmark).
2. Ruin is a **mini-crawl**: 2–4 named *areas* stored inline on the POI — NOT
   child POIs, NOT a spatial grid. **Occupants and loot are distributed into
   areas**, the way dungeon rooms hold their creatures and treasure.
3. Landmark payoff includes **all four**: legend/truth, interaction effect
   (narrative only), discovery/secret, quest hook.
4. Ruin occupants are **resolved from the compendium**, may be **multiple**
   creatures, and must work for **both Cairn and Shadowdark** systems — created
   as real NPC entities linked to the ruin POI.
5. Creature selection uses **state → creature-slug pools** (decision "b"), since
   the compendium has no creature-category tag to filter on (see Constraints).
6. Regenerate is an **in-place re-roll with a new seed**, button-triggered, no
   wizard, no auto-on-open.

## Constraints discovered (drove this revision)

- **No creature-category field.** `CompendiumMonster` has no beast/undead/
  humanoid tag (`src/domain/entities/Compendium.ts`). Category filtering is
  impossible; we use curated slug pools instead.
- **`resolveCreature` is system-aware with a level-filtered fallback.**
  `resolveCreature(slug, systemId, rng, depth)` (`src/lib/dungeon/compendium-utils.ts:95`)
  resolves a slug against the active system's compendium and, on a miss or
  over-level, falls back to a random system monster within
  `maxLevel = depth*2+1` (Shadowdark uses `level`; Cairn parses HP from stats).
  This means generic slug pools work for both systems for free.
- **POI has no `biome` field.** Biome lives only on the Region
  (`Region.terrain`). Generators that need biome must read it via
  `poi.regionId → Region.terrain`.
- **No persisted danger/tier.** The only tier concept is
  `regionFlavor.ts` `BIOME_TIER` (`easy | tough | perilous`, derived from
  biome). We reuse it to scale ruin creature levels.
- **`systemId` is threaded explicitly** into generation from `realm.systemId`
  (as `executeGenerateDungeon` already does).
- **Treasure is `TreasureItem[]`** (`src/domain/value-objects/TreasureItem.ts`),
  rendered by `TreasureSection`. Per-area loot reuses this exact type.

## Data model

New optional fields on `POI` (`src/domain/entities/POI.ts`), mirroring how
dungeons store `spatialDungeon` + `dungeonGenOptions`:

```ts
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
  currentState: RuinState
  factionId: string | null // set only when currentState === 'faction-held'
  hook: string            // the lure heard in town
  areas: RuinArea[]       // 2–4, inline; occupants + loot live HERE
}

type RuinState =
  | 'empty' | 'beast-claimed' | 'faction-held' | 'haunted' | 'cult-site'

interface RuinArea {
  name: string
  readAloud: string          // sensory, GM-readable
  detail: string             // a clue / feature / hazard in this area
  occupants: OccupantRef[]   // creatures present in THIS area
  loot: TreasureItem[]       // treasure in THIS area (reuses TreasureItem)
}

interface OccupantRef {
  name: string            // resolved compendium creature name
  count: number
  npcIds: string[]        // linked NPC entity ids (all link to poi.id)
}

interface LandmarkLore {
  legend: string          // what locals believe
  truth: string           // what is actually true
  interaction: string     // narrative: boon | curse | omen | vision | warning | nothing
  secret: string          // a hidden thing to find
  questHook: string       // points the party outward
  sensory: string
}
```

There is no flat `occupants`/`loot` on `RuinSite` — both are distributed into
`areas` (true mini-crawl). At-A-Glance occupant count is summed across areas;
loot is surfaced via `poi.treasure` (see "Loot aggregation").

`buildPOI` defaults all three new fields to `null`. Existing POIs predate them →
handled by the Dexie read-hook + upgrade (see "Persistence").

## Generators

### `generateRuinSite` (pure, deterministic)

Location: `src/lib/ruin/RuinGenerator.ts` (new).
Signature: `generateRuinSite(seed, biome, tier, factions, rng) => RuinSitePlan`.

- Anchors on the existing Cairn **Lair type** roll (`table-cairn-lair`) → subtype.
- Reuses era/builder/fate concepts from `DungeonHistoryGenerator`
  (`ORIGINAL_BUILDER_TEMPLATES`) and occupant flavor from
  `DungeonEcologyGenerator`, scaled to single strings (`origin`, `fall`,
  `builderCulture`, `era`).
- Rolls `currentState` (weighted). When `faction-held` and factions exist, binds
  a real `factionId`.
- Rolls 2–4 areas. For each area, decides its content from area-content tables:
  read-aloud, detail, an **occupant spec** (creature slugs + counts), and a
  **loot spec** (count + magic flag). Distribution mirrors dungeon rooms — some
  areas empty, one "lair" area concentrates occupants, one holds the best loot.
- `currentState` selects which **creature-slug pool** an area draws from
  (see below). `tier` (from `BIOME_TIER`) sets the level depth used later.
- Pure: emits *specs* (slugs/counts), resolves nothing against the DB.

Returns `RuinSitePlan` = `RuinSite` with areas carrying `occupantSpec` /
`lootSpec` instead of resolved `occupants` / `loot`.

#### State → creature-slug pools

New table in `src/lib/ruin/ruinCreaturePools.ts`. Generic slugs (work for both
systems via `resolveCreature`'s level-filtered fallback):

- `empty` → none.
- `beast-claimed` → wolves, bears, boars, giant spiders, etc.
- `haunted` → skeletons, zombies, ghosts, wraiths.
- `cult-site` → cultists, acolytes + one summoned horror.
- `faction-held` → bandits / soldiers (humanoid pool); flavor-linked to
  `factionId`.

`tier → depth` for `resolveCreature`: `easy → 1`, `tough → 3`, `perilous → 5`.

### `generateLandmark` (pure, fully deterministic)

Location: `src/lib/landmark/LandmarkGenerator.ts` (new).
Signature: `generateLandmark(seed, biome, rng) => LandmarkLore`.

- Anchors on the Cairn **Curiosity** roll (`table-cairn-curiosity`).
- New tables: legend, truth, interaction effect, secret, quest hook.
- Tone = wonder/mystery. No creatures, no loot, no DB dependency.

### New content tables

Added under `src/domain/data/` following the `TableDef` / `entries()` pattern:
ruin purpose, fall-cause, area read-aloud, area detail, loot flavor; landmark
legend, truth, interaction-effect, secret, quest-hook.

## Use cases (both kinds go through a use case for a single source of truth)

To avoid generation logic drifting between world-gen and regenerate, **both**
kinds get a use case, called from the post-transaction pre-gen pass in
`GenerateWorld.ts` AND from the regenerate button.

### `executeGenerateRuin` (`src/application/use-cases/GenerateRuin.ts`)

Modeled on `executeGenerateDungeon`, much lighter:

1. Load the POI, its Region (`poi.regionId → Region.terrain` for biome), and
   `tier` via `BIOME_TIER`. Receive `systemId` from `realm.systemId`.
2. Wipe any prior ruin-linked NPCs (regen support — by `poiId = ruinId`).
3. Run `generateRuinSite` → `RuinSitePlan`.
4. For each area's `occupantSpec`: `resolveCreature(slug, systemId, rng, depth)`
   → create NPC entities with `poiId = ruinId`, record their ids in the area's
   `OccupantRef.npcIds`. Multiple creatures supported.
5. For each area's `lootSpec`: build `TreasureItem[]` (reuse dungeon treasure
   helpers; magic items resolved from compendium scaled by `tier`).
6. **Loot aggregation:** concatenate all areas' loot into `poi.treasure` so
   At-A-Glance and `TreasureSection` surface it; areas also keep their own copy
   for per-area display.
7. Save `ruinSite` + `poiGenOptions.seed` on the POI.

Pre-gen in `GenerateWorld.ts` runs after the main transaction commits (where
factions already exist), gated by `PREGEN_RUIN_CAP`. Beyond the cap, ruins stay
stubs and show a **Generate** button (no auto-on-open).

### `executeGenerateLandmark` (`src/application/use-cases/GenerateLandmark.ts`)

Trivial: load POI + Region biome, run `generateLandmark`, save `landmarkLore` +
`poiGenOptions.seed`. No NPCs, no loot. Pre-gen pass is effectively uncapped
(pure + cheap). Same use case backs the regenerate button.

### Regenerate (both kinds)

Button in the action bar re-invokes the matching use case with a fresh seed
(in-place; ruin wipes + recreates NPCs). No wizard route. No navigation —
implemented as a mutation handler that calls the use case and invalidates the
POI/NPC queries (new plumbing vs. the dungeon button, which navigates).

## UI (extend `GenericTemplate`)

`src/components/poi-templates/GenericTemplate.tsx` (the `default` case rendering
ruin, landmark, natural, district, zone, camp, shrine, other):

- **Overview tab — new "Lore" block**, mirroring the dungeon "Dungeon Lore"
  sub-block, **guarded by `poi.type`** (like the existing
  `poi.type === "ruin"` RumorList guard at line 377) so it never leaks to
  natural/district/zone/camp/shrine/other:
  - `ruin` → origin, fall, builder culture, current state, hook.
  - `landmark` → legend, truth, interaction, secret, quest hook.
- **Ruin areas:** render `ruinSite.areas` as a section — each area shows name,
  read-aloud, detail, its occupants (by `npcIds`), and its loot
  (`TreasureItem[]`). This is the mini-crawl view.
- **At A Glance:** surface ruin `currentState` and total occupant count
  (summed across areas). Loot already shows via `poi.treasure`.
- **Denizens tab:** already merges direct NPCs (`useNPCsByPoi(poiId)`) + child
  NPCs (`GenericTemplate.tsx:125-134`), so ruin occupants appear automatically.
- **Action bar** (`pois_.$poiId.tsx` `poiActionBar`): extend the dungeon button
  gate to also show Generate/Regenerate for `ruin` + `landmark`. Label flips on
  whether `ruinSite` / `landmarkLore` exists. Re-roll is in-place.

Existing ruin-only `RumorList` stays.

## Persistence (Dexie)

Follow the established pattern for nested POI fields (as used for
`spatialDungeon`/`dungeonGenOptions`):

1. New `db.version(N).stores(storesV26)` (no index change — fields are unindexed
   blobs) with an `upgrade` callback backfilling `ruinSite`, `landmarkLore`,
   `poiGenOptions` to `null` on existing POIs (mirrors the v35 upgrade,
   `db.ts:605`).
2. Add the same three defaults to the `db.pois.hook('reading')` normalizer
   (`db.ts:687`) so already-loaded records read `null`, not `undefined`.

## Determinism

The **pure** generators are fully deterministic for a given seed. Landmark
output is therefore reproducible. **Ruin occupant resolution is NOT fully
reproducible** — it depends on the current compendium snapshot (slug resolution
+ level-filtered fallback). Same seed reproduces the same *plan* (slugs, counts,
areas); the resolved creatures can differ if the compendium changes.

## Testing

- Unit (pure, fixed seed): `generateRuinSite` → area count 2–4, required fields
  populated, `currentState` binds a faction only when supplied, occupant/loot
  specs match the state pool; `generateLandmark` → all five lore fields present.
- Unit: new tables well-formed (`entries()` coverage, dice ranges); creature
  pools non-empty per non-`empty` state.
- Integration: `executeGenerateRuin` resolves creatures for BOTH `system-cairn-2e`
  and `system-shadowdark`, creates NPC entities linked to the POI, distributes
  them into area `npcIds`, aggregates loot into `poi.treasure`, and regen wipes
  prior NPCs (no orphans/dupes). `executeGenerateLandmark` saves and re-rolls.
- Migration: existing POIs read back `null` for the three new fields.
- World-gen tests updated for the two new pre-gen passes and the ruin cap.

## Out of scope

- Spatial room maps for ruins (intentionally a mini-crawl).
- Mechanical/dice effects for landmarks (narrative only).
- A dedicated regenerate wizard route.
- Landmark creatures / loot.
- A persisted region difficulty/tier field (derived from biome at gen time).
