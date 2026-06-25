# Procedural World Generation — Design

**Date:** 2026-06-24
**Status:** Draft for review
**Branch:** `feature/dev-api-map-generation`

## Goal

One-click generation of a living sandbox world: regions, settlements, ruins,
dungeons, factions, and NPCs — wired together into a **live web of conflicts and
quest hooks**. The GM picks a size (and optionally tunes knobs), clicks generate,
and lands in a populated, internally-consistent realm they can immediately run or
edit.

The output is not flavor text. NPC problems point at real records. A "missing
daughter" is an actual NPC placed somewhere in the world. A faction's goal,
blocker, and plan are structured data the existing faction-turn engine can act on
later.

## Pivotal decisions (locked during brainstorming)

1. **Engine: pure local procedural.** Random tables + algorithms only. No LLM, no
   network. Seedable and deterministic. Honors local-first/offline.
2. **Spatial model: image + pinned coordinates** (the app's existing grain).
   Content gets `{x,y}` positions; regions get boundary polygons. No procedural
   terrain art.
3. **Map: one shipped, *templated* map to start.** The map ships with hand-authored
   region zones (polygons) + terrain tags + placement slots. The generator fills
   the template, so a port lands on a coast and a ruin in the mountains.
4. **World size = density** (with a single map). Small/Med/Large scale how much
   fills the fixed zones; they do not change map size. (Future: size also selects
   among multiple map templates.)
5. **Conflicts are a live, linked web.** Inter-NPC ties create real NPC records and
   a new `NPCRelationship` entity. Quest hooks are navigable, not dead-end prose.
6. **Quest hooks reuse existing entities.** `Notice` (actionable, has
   `contactNpcId`/`reward`/`type`) + `Rumor` (`isQuestHook` ambient).
7. **Looming threat reuses `WorldEvent`** — a future-dated event on the existing
   clock.
8. **Commit flow: just commit.** Generation is creative scaffolding, not "world
   state change." One click writes the realm; the GM edits afterward like any
   manual entry. No preview/draft layer.

## What already exists (reused, not rebuilt)

| Need | Existing asset |
| --- | --- |
| Seeded RNG | `src/lib/dungeon/SeededRandom.ts` |
| Dungeon contents | `src/lib/dungeon/DungeonGenerator.ts` (+ traps, key-locks, ecology) |
| Random tables | `src/domain/services/RandomTableEngine.ts`, `TableChainRunner.ts` |
| Faction structure | `Faction` (`agendaGoals`, `advantages`, `obstacles`) |
| Faction relations | `FactionRelationship` (−6..+6) |
| NPC core | `NPC` (`motivation`, `want`, `traits`, `systemBlock`) |
| Quest hooks | `Notice` (bounty/job/warning/announcement/request), `Rumor` (`isQuestHook`) |
| Doom event | `WorldEvent` (year/season/day/watch + `relatedEntityIds`) |
| Map render | `InteractiveMap` (maplibre), `POI.position`, `Region.boundary` |
| System rules | `SystemConfig` (Cairn 2e + Shadowdark), `SystemBlock` |
| Map/render | `GameMap` (image + width/height) |

POI types available: `settlement`, `dungeon`, `ruin`, `camp`, `shrine`,
`landmark`, `natural`, `fortification`, etc. ("towns" = `settlement`).

## New structures (the actual build)

### 1. `NPCRelationship` entity (mirrors `FactionRelationship`)

```ts
interface NPCRelationship {
  id: string
  worldId: string
  fromNpcId: string
  toNpcId: string
  type: 'spouse' | 'parent' | 'child' | 'sibling' | 'rival' |
        'ally' | 'debtor' | 'creditor' | 'thief' | 'victim' | 'lover' | 'enemy'
  description: string        // "ran away with the caravan master"
  status: 'active' | 'missing' | 'estranged' | 'dead' | 'resolved'
  createdAt: number
  updatedAt: number
}
```

Requires: Dexie table + schema migration, a repository, container wiring, and a
small UI surface on the NPC detail page (a "Connections" list — clickable). The
relationship surface can be minimal in v1 (read-only list); editing can follow.

### 2. `MapTemplate` asset format

A JSON descriptor shipped alongside the one map image:

```ts
interface MapTemplate {
  id: string
  name: string
  imageAsset: string          // bundled image path
  width: number; height: number
  zones: {
    id: string
    name?: string             // optional suggested region name
    terrain: 'coast' | 'forest' | 'mountain' | 'plains' | 'swamp' | 'desert' | ...
    boundary: { x: number; y: number }[]   // becomes Region.boundary
    slots: { x: number; y: number; kind: PlacementKind }[]  // candidate POI spots
  }[]
}
type PlacementKind = 'settlement' | 'dungeon' | 'ruin' | 'wilds' | 'any'
```

The generator maps each `zone` → a `Region` and fills `slots` with POIs honoring
`kind` and `terrain`. v1 ships exactly one template.

### 3. Procedural content data (`src/domain/data/worldgen/`)

System-agnostic weighted tables, keyed where useful by terrain or faction type:

- Region flavor by terrain (features, dangers, resources, people).
- Settlement / dungeon / ruin name + descriptor tables.
- NPC tables: given/family names, traits, motivations, wants, appearance, voice.
- **Faction agenda tables:** goal × obstacle × plan, by faction type
  (cult, guild, noble house, bandit crew, etc.).
- **Conflict templates:** parameterized problem generators that emit linked
  records + a hook (see Conflict Web below).
- Per-system `SystemBlock` defaults pulled from `SystemConfig`.

### 4. `WorldGenerator` domain service (pure, seeded)

A composition of stage functions, each pure (`(input, rng) => partialWorld`). No
Dexie, no IO. Output is an in-memory `GeneratedWorld` bundle of plain entities.

### 5. `GenerateWorldUseCase` (application layer)

Orchestrates the stages, then persists the whole bundle in **one Dexie
transaction** via the existing repositories. Sets the new realm active and returns
its id for navigation.

### 6. Generation UI

A "Generate World" entry (dialog or `/realms` route action):

- **Size preset:** Small / Medium / Large (sets all knob defaults).
- **Advanced (accordion, overrides):** Factions count, Danger level, NPC density,
  POI/dungeon density.
- **Looming threat:** on/off toggle.
- **Seed:** optional text field (blank = random); enables reproducible worlds.
- Submit → run use-case → navigate into the new realm.

## Generation pipeline (ordered stages)

```
seed → RNG
  1. Realm        create world record (clock defaults, chosen SystemConfig)
  2. Regions      one per template zone; fill flavor from terrain tables
  3. POIs         fill zone slots by density+danger:
                    settlements, dungeons (lazy DungeonGenerator), ruins, shrines, camps
                    → each gets position from its slot
  4. Factions     N from knob; each: agendaGoal (goal) + obstacle (blocker)
                    + advantage (plan to get unblocked); assign HQ poi + region
  5. FactionRels  pairwise relationship scores (−6..+6), skewed by danger
  6. NPCs         density per region/settlement; assign faction membership,
                    leaders, agents; universal fields + SystemBlock per system
  7. Conflict web NEW: generate family + conflict ties → NPCRelationship records,
                    some spanning regions/POIs (missing daughter placed at a dungeon)
  8. Quest hooks  each conflict → a Notice (contact = aggrieved NPC, reward, type)
                    and/or a Rumor (isQuestHook) placed at the relevant POI/region
  9. Doom event   if toggled: pick a faction agenda to escalate → future-dated
                    WorldEvent + foreshadowing Rumors
 10. Commit       single transaction write; set realm active
```

### The conflict web (stage 7–8 detail)

Each conflict template is a small function that, given the current NPC pool and
RNG, produces: linked records + relationships + a hook. Examples:

- **Missing person:** pick aggrieved NPC A; create (or reuse) NPC B as their
  child/spouse; set B `lifeStatus`/`movementStatus` to missing and place B at a
  dangerous POI; `NPCRelationship(A→B, parent/spouse, status: missing)`; emit
  `Notice{type: request, contactNpcId: A, reward}`.
- **Runaway spouse:** A's spouse B left with C; `NPCRelationship(A→B, spouse,
  status: estranged)` + `(B→C, lover, active)`; emit a `Rumor` quest hook.
- **Theft:** A's heirloom taken by B (a faction agent); link B→A as `thief/victim`;
  the item ties to B's faction HQ POI; emit `Notice{type: bounty}`.

Templates respect existing geography (the thief's faction must exist; the
dangerous POI must exist) — hence conflicts run **after** factions/POIs/NPCs.

## Architecture / layering

Follows the existing clean/hexagonal structure:

- `src/domain/services/WorldGenerator.ts` + `src/domain/services/worldgen/*`
  (pure stage functions) and `src/domain/data/worldgen/*` (tables).
- `src/domain/entities/NPCRelationship.ts` + value objects as needed.
- `src/application/use-cases/GenerateWorldUseCase.ts` + a port for the batch write.
- `src/infrastructure/dexie/repositories/NpcRelationshipRepository.ts` + schema
  migration + container wiring.
- `src/components/worldgen/*` for the UI; a new action on `/realms`.
- Assets: one `MapTemplate` JSON + image under the appropriate assets/public path.

Determinism: every stage takes the shared seeded RNG; same seed + same knobs →
byte-identical world. Enables reproducible bug reports and "I liked seed X."

## Testing strategy

- **Pure stage unit tests:** feed a fixed seed, assert structural invariants
  (counts match knobs, every faction has goal+obstacle+plan, every conflict's
  links resolve to real records, every Notice `contactNpcId` exists).
- **Web integrity test:** no dangling `NPCRelationship` endpoints; missing-person
  targets are actually placed and actually missing.
- **Determinism test:** same seed twice → identical bundle.
- **Use-case test:** in-memory/fake Dexie — one transaction, realm becomes active,
  ids consistent.
- **Smoke:** generate Small + Large, render on the map, click a quest hook through
  to its NPC.

## Scope boundaries (explicit non-goals for v1)

- No procedural terrain art (separate future project).
- No multiple map templates (one ships; the format supports more later).
- No LLM enrichment (Phase 2, optional, later).
- No preview/regenerate-section UI (just commit; GM re-rolls by deleting +
  regenerating).
- No Path/travel-time auto-generation between POIs (could be a fast-follow).
- `NPCRelationship` editing UI is read-only/minimal in v1.

## Phasing (single spec, staged build)

1. **Foundation:** `NPCRelationship` entity + table + repo + migration + wiring;
   `MapTemplate` format + the one shipped map; worldgen data-table scaffolding.
2. **Core pipeline:** stages 1–6 (realm → regions → POIs → factions → rels → NPCs),
   pure + tested, behind `GenerateWorldUseCase`.
3. **The web:** stages 7–9 (conflicts, hooks, doom event).
4. **UI:** generation menu (preset + advanced + seed + threat toggle) and the NPC
   Connections surface.

## Open questions

1. New map image + zone polygons — author by hand, or trace from an existing
   bundled map? Who/what provides the source image?
2. Settlement "population"/"towns" knob — fold into POI density (count of
   `settlement` POIs), or expose separately?
3. Auto-generate `Path`s (travel times) between settlements in v1, or defer?
4. NPC count — derive from settlement count × density, or an absolute target?
5. SystemConfig for a generated realm — default to Cairn, prompt at generate-time,
   or inherit a global default?
6. Should conflicts be allowed to reference the **party faction**, or strictly
   NPC/non-party factions in v1?
7. `NPCRelationship` — embed as an array on `NPC` instead of a separate
   table/entity? (Separate mirrors `FactionRelationship`; embedded is simpler but
   harder to query bidirectionally.)
