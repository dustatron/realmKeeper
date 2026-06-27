# Ruin & Landmark Generation — Design (Spec A)

**Date:** 2026-06-27
**Branch:** `update-ruin-generation`
**Status:** Finalized after two adversarial reviews (GM + architect). Pending user sign-off.
**Related:** Spec B — *Treasure-leads / discovery web* (separate, built next). This
spec only provides the **seam** B consumes: notable items with world-stable ids.

## Problem

Dungeons run a 10-stage generator (layered history, ecology, rooms, discoveries,
monsters, loot). Ruins and landmarks get only `buildPoiFlavor`: two Cairn table
rolls and two templated sentences — no history, no hook, no occupants, no reason
to visit. Give them GM-ready depth via **two separate generators**.

- **Ruin** = a fallen site with a story AND a small explorable structure: history
  → fall → current state, a **2–4 area mini-crawl** with *ordered* areas, each
  holding occupants, loot, and findable discoveries; a hook that points at a
  **notable prize** planted in a specific area.
- **Landmark** = a wonder/curiosity: legend vs. truth, a triggered interaction
  effect (narrative), a discoverable secret, a quest hook. No creatures, no loot.

## Decisions (locked)

1. Two separate generators (ruin vs. landmark).
2. Ruin = mini-crawl: 2–4 **ordered** inline areas (NOT child POIs, NOT a grid).
   Occupants and loot live in areas; areas have an entry and a sequence.
3. Landmark payoff = legend/truth + triggered interaction (narrative only) +
   secret + quest hook.
4. Ruin occupants resolved from the compendium, multiple creatures, **both Cairn
   and Shadowdark**, created as real NPC entities linked to the ruin POI.
5. Creature selection = **state → creature-slug pools** (no category field
   exists; see Constraints).
6. Regenerate = in-place re-roll, new seed, button-triggered, no wizard, no
   auto-on-open.
7. **Loot is single-source**: all items live in `poi.treasure`, tagged with the
   owning area; areas do NOT store copies (avoids the collect-toggle desync).
8. Shared generator logic is **extracted to a neutral module**, not imported
   from `src/lib/dungeon/` (avoids ruin→dungeon coupling).
9. Each ruin flags **one notable prize** (a `TreasureItem` with `notable:true`)
   that the hook points at — the seam for Spec B. Landmarks' "prize" is their
   `secret` (no loot).

## Constraints discovered (drove the design)

- **No creature-category field.** `CompendiumMonster` has no beast/undead/
  humanoid tag (`src/domain/entities/Compendium.ts`). Use curated slug pools.
- **`resolveCreature(slug, systemId, rng, depth)` is system-aware** with a
  level-filtered fallback (`src/lib/dungeon/compendium-utils.ts:95`; Shadowdark
  uses `level`, Cairn parses HP from `stats`). Generic slug pools work for both
  systems for free. **It needs an optional level-cap override** so ruins can
  tighten Cairn bands (the default `maxLevel*6` HP proxy is near-inert for
  Cairn's low-HP bestiary).
- **POI has no `biome`.** Read it via `poi.regionId → Region.terrain`.
- **No persisted danger/tier.** Reuse `BIOME_TIER` (`easy|tough|perilous`,
  `regionFlavor.ts`) — currently module-private, must be **exported**.
- **`systemId` is threaded explicitly** from `realm.systemId` (as dungeon gen does).
- **Treasure is `TreasureItem[]`** rendered by `TreasureSection`; collect-toggle
  writes a new array to one POI record (`TreasureSection.tsx:93`) — so the same
  item stored in two places desyncs. Hence decision 7.
- **`treasure-gen` is `SpatialRoom`-coupled** (`generateRoomTreasure` reads
  `room.themeRoomType`/`isDeadEnd`). Must factor a room-independent core.
- **No bulk NPC create.** `INPCRepository` exposes only `create()`. Add a bulk
  method to avoid N sequential writes per ruin.
- **`buildHooks`/`Hook`/`Rumor`/`Notice` already exist** — the discovery web is
  Spec B's extension of them, out of scope here.

## Data model

New optional fields on `POI`:

```ts
ruinSite: RuinSite | null
landmarkLore: LandmarkLore | null
poiGenOptions: { seed: string } | null   // regenerate seed (ruin + landmark)
```

`TreasureItem` (`src/domain/value-objects/TreasureItem.ts`) gains two optional
fields (additive, no migration needed for existing items):

```ts
areaIndex?: number   // which ruin area holds this item (single-source loot tag)
notable?: boolean    // the hook prize; Spec B points leads at notable items
```

### Resolved (persisted) types

```ts
interface RuinSite {
  origin: string          // "Built by the {culture} ~{era} ago as a {purpose}."
  fall: string            // "Abandoned when {fate}."
  builderCulture: string
  era: string
  currentState: RuinState
  factionId: string | null      // set only when currentState === 'faction-held'
  hook: string                  // themed around the notable prize + its area
  notablePrizeItemId: string | null  // id into poi.treasure (notable:true)
  areas: RuinArea[]             // 2–4, ordered
}

type RuinState =
  | 'empty' | 'beast-claimed' | 'faction-held' | 'haunted' | 'cult-site'

interface RuinArea {
  name: string
  order: number               // 0 = entry/approach … last = heart
  isEntry: boolean            // exactly one area true
  readAloud: string           // sensory, GM-readable
  detail: string              // feature / structural hazard (system-agnostic text)
  discovery: string | null    // a concrete find: document, remains, clue
  occupants: OccupantGroup[]  // creatures in THIS area
}

interface OccupantGroup {
  npcIds: string[]            // link to NPC entities (all linked to poi.id)
  activity: string           // one-line behavior ("denning", "standing guard")
}

interface LandmarkLore {
  legend: string             // what locals believe
  truth: string              // the NATURE of the place (not a discoverable)
  secret: string             // a concrete DISCOVERABLE (cache, name, passage)
  interactionTrigger: string // "When you {touch the stone / sleep here / …}"
  interactionEffect: string  // narrative result: boon|curse|omen|vision|warning|nothing
  questHook: string          // points the party outward
  sensory: string
}
```

Notes addressing review:
- **Loot lives only in `poi.treasure`**, each item tagged `areaIndex`; the area
  view filters `poi.treasure` by index. No duplication (A1).
- **`OccupantGroup` stores only `npcIds` + `activity`.** Creature name/count are
  **derived at render** from the live NPC query, read defensively (filter to
  existing ids) — no denormalized drift, no dangling display (A7, G4).
- **`truth` vs `secret` disambiguated**: truth = nature; secret = discoverable (G7).
- **`interaction` split into trigger + effect** (G6).

### Pure plan types (concrete, not prose — A6)

```ts
interface RuinSitePlan {
  origin, fall, builderCulture, era: string
  currentState: RuinState
  factionId: string | null
  hook: string
  notablePrizeAreaIndex: number     // which area holds the notable prize
  areas: RuinAreaPlan[]
}

interface RuinAreaPlan {
  name: string
  order: number
  isEntry: boolean
  readAloud: string
  detail: string
  discovery: string | null
  occupantSpecs: OccupantSpec[]
  lootSpecs: LootSpec[]
}

interface OccupantSpec { slugs: string[]; count: number; activity: string }
interface LootSpec { magic: boolean; notable: boolean }
```

## Shared module (extraction — A2/A3/A8)

New neutral module `src/lib/worldgen/` consumed by both dungeon and ruin code:

- `siteHistory.ts` — builder/era/fate templates extracted from
  `DungeonHistoryGenerator` (`ORIGINAL_BUILDER_TEMPLATES`) and ecology activity
  templates from `DungeonEcologyGenerator`.
- `treasure.ts` — refactor `treasure-gen` into a room-independent core
  `generateTreasure(level, rng, opts)`; dungeon keeps a thin `SpatialRoom`
  wrapper that calls it. Ruin loot calls the core directly (A3).
- `compendium-utils.ts` — move `resolveCreature` here; dungeon imports update.
  Add optional `levelCap` override param for ruin Cairn tuning (G9).

Dungeon import-path updates are mechanical and covered by the existing dungeon
tests (which must stay green).

## Generators

### `generateRuinSite` (pure, deterministic plan)

`src/lib/ruin/RuinGenerator.ts`.
`generateRuinSite(seed, biome, tier, factions, usedHistory, rng) => RuinSitePlan`.

- Anchors on the Cairn **Lair type** roll (`table-cairn-lair`) → subtype label.
- Builds `origin`/`fall`/`builderCulture`/`era` from shared `siteHistory`
  templates. `usedHistory` (a per-realm Set of builder/fate keys) is consulted to
  **avoid repeats across ruins in the same realm** (G8); picks re-roll a bounded
  number of times to dodge collisions, then accept.
- Rolls `currentState` (weighted); binds `factionId` when `faction-held` and
  factions exist.
- Generates 2–4 areas with **explicit `order` + one `isEntry`** (G1). Content
  distribution mirrors dungeon rooms: the entry is lighter; a "lair" area
  concentrates occupants; the **deepest area holds the notable prize**, and the
  hook is themed around it (G2). At least one area carries a `discovery`; an
  `empty` ruin still gets ≥1 discovery — incl. a 30% "remains of a failed party"
  flavor borrowed from the dungeon history generator (G3).
- Per area, emits `occupantSpecs` (slugs from the state pool + counts + a
  one-line `activity`) and `lootSpecs` (magic flag; exactly one `notable:true`
  across the ruin).

#### State → creature-slug pools

`src/lib/ruin/ruinCreaturePools.ts`. Generic slugs (resolve for both systems via
fallback): `empty`→none; `beast-claimed`→wolves/bears/boars/giant spiders;
`haunted`→skeletons/zombies/ghosts/wraiths; `cult-site`→cultists/acolytes + one
summoned horror; `faction-held`→bandits/soldiers (humanoids), flavor-linked to
`factionId`.

#### Danger scaling (G9)

`ruinCreatureLevel(tier, systemId)`:
- Shadowdark: `easy→level≤2`, `tough→level≤4`, `perilous→level≤6`.
- Cairn (HP-tuned, tighter than the default proxy): `easy→HP≤8`,
  `tough→HP≤15`, `perilous→HP≤25`.
Passed to `resolveCreature` via the new `levelCap` override.

### `generateLandmark` (pure, fully deterministic)

`src/lib/landmark/LandmarkGenerator.ts`.
`generateLandmark(seed, biome, rng) => LandmarkLore`.
Anchors on the Cairn **Curiosity** roll. New tables for legend, truth (nature),
secret (discoverable), interaction trigger, interaction effect, quest hook. No
DB, no creatures, no loot. Fully reproducible.

### New content tables

Under `src/domain/data/`, `TableDef`/`entries()` pattern, sized for combinatorial
variety (G8): ruin purpose, fall-cause, area read-aloud, area detail/hazard,
discovery, loot flavor; landmark legend, truth, secret, interaction-trigger,
interaction-effect, quest-hook.

## Use cases

Both kinds go through a use case (single source of truth for gen logic), `(input,
deps)` DI shape with port interfaces, callable client-side via `useContainer()`
(verified pattern from `executeGenerateDungeon`).

### `executeGenerateRuin` (`src/application/use-cases/GenerateRuin.ts`)

`deps: { poiRepo, npcRepo, factionRepo?, regionRepo, poiEventRepo }`.

1. Load POI, its Region (`regionId → terrain` for biome → `tier`), factions.
   Receive `systemId`.
2. Wipe prior ruin NPCs (`poiId === ruinId`) for regen.
3. `generateRuinSite(...)` → `RuinSitePlan` (pass the per-realm `usedHistory`).
4. Resolve each `OccupantSpec`: `resolveCreature(slug, systemId, rng, {levelCap})`
   → build NPC entities (`poiId = ruinId`), **`npcRepo.bulkCreate(npcs)`**
   (new bulk method — A4); record ids into the area's `OccupantGroup.npcIds`.
5. Resolve each `LootSpec` via shared `generateTreasure(...)` → `TreasureItem`s,
   each tagged `areaIndex`; mark the single notable one `notable:true`.
6. Concatenate all items into `poi.treasure`; set `ruinSite.notablePrizeItemId`.
7. Save `ruinSite` + `poiGenOptions.seed` on the POI.

### `executeGenerateLandmark` (`src/application/use-cases/GenerateLandmark.ts`)

`deps: { poiRepo, regionRepo }`. Load POI + biome, `generateLandmark`, save
`landmarkLore` + seed. No NPCs/loot.

### World-gen pre-gen (capped — A5)

After the main transaction commits (factions exist), two passes:
`dungeonStubs`→existing; `ruinStubs.slice(0, PREGEN_RUIN_CAP)`→`executeGenerateRuin`;
`landmarkStubs.slice(0, PREGEN_LANDMARK_CAP)`→`executeGenerateLandmark`. A shared
per-realm `usedHistory` Set threads through the ruin loop (G8). Beyond caps,
POIs stay stubs and show a **Generate** button (no auto-on-open — G/A consistency).

### Regenerate (A8)

Client hooks `useRegenerateRuin` / `useRegenerateLandmark`: pull repos from
`useContainer()`, call the use case with a fresh seed, invalidate POI + NPC
queries. In-place; no navigation, no wizard.

## UI (`GenericTemplate` — the `default` case)

- **Overview "Lore" block**, mirroring dungeon "Dungeon Lore", **guarded by
  `poi.type`** (like the existing `poi.type === "ruin"` RumorList guard) so it
  never leaks to natural/district/zone/camp/shrine/other:
  - `ruin` → origin, fall, builder culture, current state, hook.
  - `landmark` → legend, truth, secret, interaction (trigger+effect), quest hook.
- **Ruin areas:** render `ruinSite.areas` **in `order`**, entry marked first.
  Each area: name, read-aloud, detail, discovery, its occupants (derived live
  from `npcIds` + `activity`), and its loot (`poi.treasure` filtered by
  `areaIndex`). The notable prize is badged.
- **At A Glance:** ruin `currentState` + total occupant count (summed across
  areas). Loot already surfaces via `poi.treasure`.
- **Denizens tab:** unchanged — already merges direct + child NPCs, so ruin
  occupants appear automatically.
- **Action bar** (`pois_.$poiId.tsx` `poiActionBar`): extend the dungeon button
  gate to show Generate/Regenerate for `ruin` + `landmark`; label flips on
  whether `ruinSite`/`landmarkLore` exists; calls the regenerate hook.

Existing ruin-only `RumorList` stays (Spec B will feed it).

## Persistence (Dexie — next version is 38)

1. `db.version(38).stores(storesV36)` (no index change) with an `upgrade`
   backfilling `ruinSite`, `landmarkLore`, `poiGenOptions` → `null` on existing
   POIs (mirrors the v35 `spatialDungeon` upgrade).
2. Add the same three defaults to the `db.pois.hook('reading')` normalizer.
3. `TreasureItem.areaIndex`/`notable` are additive optionals — no migration.
4. `INPCRepository.bulkCreate` + Dexie `bulkPut` impl (A4) — no schema change.

## Determinism

Pure **plans** (`RuinSitePlan`, `LandmarkLore`) are deterministic per seed.
Landmarks are fully reproducible. Ruin **resolution** is not — creature
resolution depends on the compendium snapshot, and entity ids are minted in the
impure use-case layer (consistent with existing dungeon precedent, which already
calls `newId()` inside generators). Same seed reproduces the same plan.

## Testing

- Unit (pure, fixed seed): `generateRuinSite` → 2–4 ordered areas, exactly one
  `isEntry`, exactly one notable loot spec, ≥1 discovery (incl. when `empty`),
  faction bound only when supplied, `usedHistory` reduces repeats; `generateLandmark`
  → all seven fields present, trigger/effect distinct, truth≠secret shape.
- Unit: new tables well-formed; creature pools non-empty per non-`empty` state;
  `ruinCreatureLevel` bands correct per system.
- Integration: `executeGenerateRuin` for BOTH `system-cairn-2e` and
  `system-shadowdark` — resolves creatures, `bulkCreate`s NPCs linked to the POI,
  fills area `npcIds`, tags loot with `areaIndex`, sets `notablePrizeItemId`,
  aggregates into `poi.treasure`; regen wipes prior NPCs (no orphans/dupes).
  `executeGenerateLandmark` saves and re-rolls.
- Loot single-source: collect-toggle on a ruin item mutates only `poi.treasure`;
  no second copy exists.
- Migration: existing POIs read back `null` for the three new fields.
- Regression: dungeon tests stay green after the shared-module extraction.

## Out of scope (this spec)

- The map-wide treasure-leads / discovery web → **Spec B** (extends Hook/Rumor/
  Notice; adds `HookSecret.targetType:'item'`; scatters leads across towns,
  overworld POIs, and NPCs pointing at `notable` items in ruins, dungeons, and
  landmarks). This spec only exposes the seam (notable items + stable ids).
- Spatial room maps for ruins (intentionally a mini-crawl).
- Mechanical/dice landmark effects (narrative only).
- Mechanical structural traps for ruins (`detail` hazard text only — system-agnostic).
- A regenerate wizard route.
- A persisted region difficulty/tier field (derived from biome at gen time).

## Known debt (named, not fixed)

`POI` is becoming a god-interface — each kind bolts on another nullable blob
(`spatialDungeon`, now `ruinSite`/`landmarkLore`/`poiGenOptions`). The eventual
correct shape is a discriminated union per POI kind; out of scope here, flagged
for a future refactor.
