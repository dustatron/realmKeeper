# Procedural World Generation — Design

**Date:** 2026-06-24
**Status:** Draft for review
**Branch:** `feature/dev-api-map-generation`

## Goal

One-click generation of a living sandbox world: a hex-grid map of biome regions
populated with settlements, ruins, dungeons, factions, and NPCs — wired together
into a **live web of conflicts and quest hooks**. The GM picks a size (and
optionally tunes knobs), clicks generate, and lands in a populated,
internally-consistent realm they can immediately run or edit.

The output is not flavor text. NPC problems point at real records. A "missing
daughter" is an actual NPC placed in an actual dungeon. A faction's goal, blocker,
and plan are structured data the existing faction-turn engine can act on later.

## Pivotal decisions (locked during brainstorming)

1. **Engine: pure local procedural.** Random tables + algorithms only. No LLM, no
   network. Seedable and deterministic. Honors local-first/offline.
2. **Two map models, one data model.** Image maps (existing maplibre stack) stay
   for manual/uploaded worlds. **Auto-generated worlds default to a procedural
   hex-grid map** rendered in-browser — no map image, no hand-authored art. Both
   are `GameMap` records distinguished by a `kind` field; POIs keep `position
   {x,y}` (a hex's pixel center is just an `{x,y}`).
3. **Hex map is view-first in v1.** Render biome fill + POI pins + click-through +
   pan/zoom. In-hex editing (drag-place, region painting, path drawing) is
   **deferred**; editing happens on the existing POI/Region detail pages.
4. **World size = density.** Small/Med/Large scale the grid size and how much fills
   it (factions, POIs, NPCs). Advanced knobs override individual dials.
5. **Conflicts are a live, linked web on a unified graph.** Inter-entity ties
   create real records and edges in **one polymorphic `Connection` table** (NPC↔NPC,
   NPC↔POI, NPC↔faction-narrative, NPC↔item). This mirrors the existing
   `EntityNote` polymorphic-owner pattern. "Everything connected to X" is one query
   for any entity type. Structural membership (`NPC.factionIds`, leader/agent) and
   the scored `FactionRelationship` matrix stay as-is — `Connection` carries only
   **narrative/quest** edges, so there is no dual source of truth.
6. **Quests are a first-class `Hook` aggregate** (source of truth), split into a
   **public surface** + a hidden **structured secret** (the hexroll pattern). The
   `Hook` owns type, status, contact, reward, and a **queryable `secret`**
   (`{kind, targetType, targetId, detail}`) — *not* prose in `gmNotes`. `Notice`
   and `Rumor` become **public projections** of a `Hook` (gain a `hookId`
   back-ref). Quest lifecycle lives in one place.
7. **Looming threat reuses `WorldEvent`** — a future-dated event on the existing
   clock, tied to a faction agenda.
8. **Commit flow: just commit.** Generation is creative scaffolding, not "world
   state change." One click writes the realm in a single transaction; the GM edits
   afterward like any manual entry. No preview/draft layer.

## Prior art: hexroll3

[hexroll3](https://github.com/hexroll/hexroll3) (OSR sandbox generator) was
reviewed. It's Rust + Bevy with a custom content-DSL (`.scroll` files), so **no
code is portable**, and it is **AGPL-3.0** (dual commercial license). We borrow
**architecture, taxonomy, and algorithms only, and re-author all content tables
ourselves** — copying their `.scroll` content verbatim would make this repo a
derivative work.

Validated borrowings:

- **Hex-grid sandbox model.** `hexmap.rs` lays a hex grid, groups contiguous hexes
  into biome regions, and allocates **0–1 of {dungeon, settlement, inn, encounter,
  feature}** per hex. This is the model we adopt for generated worlds (decision 2).
- **Watabou hand-off.** hexroll generates settlement/dungeon battlemaps via
  Watabou MFCG/village generators. **We already have Watabou import** — generated
  settlements/dungeons can lazily get a Watabou map later.
- **Quest = linked records + secret.** Their `missing_person` quest weights a
  relative type (`son`/`daughter`/`nephew`/`*(x3) spouse`), creates a **real NPC**,
  and places them "held captive in {dungeon}." The public rumor says only that
  something's wrong; the **secret** names the location. We adopt this split.
- **Quest taxonomy:** `missing_person`, `lost_item`, `delivery`, `escort`,
  `relation`, `revenge`, `artifacts`.
- **Relationship verb tables:** grudge / dispute / bad blood / vendetta / affair /
  fallen in love / special interest — seeds `Connection` kind + label.
- **Faction archetypes** (Cult / Militia / Syndicate), each with member NPCs and
  auto "association rumors" ("the Cult is up to something").
- **Realm archetypes** (Kingdom / Empire / Duchy / Lands), each with a ruler NPC.
- **Biome region types** (Forest / Desert / Plains / Jungle / Tundra / Swamp /
  Mountain) and **wilderness feature tables** (watchtower, altar, graveyard, dead
  adventurers, portal, sacrificial site, …) for landmark POIs.

## What already exists (reused, not rebuilt)

| Need | Existing asset |
| --- | --- |
| Seeded RNG | `src/lib/dungeon/SeededRandom.ts` |
| Dungeon contents | `src/lib/dungeon/DungeonGenerator.ts` (+ traps, key-locks, ecology) |
| Random tables | `src/domain/services/RandomTableEngine.ts`, `TableChainRunner.ts` |
| Faction structure | `Faction` (`agendaGoals`, `advantages`, `obstacles`) |
| Faction relations | `FactionRelationship` (−6..+6) |
| NPC core | `NPC` (`motivation`, `want`, `traits`, `systemBlock`) |
| Quest public projections | `Notice` (bounty/job/warning/announcement/request), `Rumor` (`isQuestHook`) — gain `hookId` |
| Hook UI components | `RumorList`, `NoticeBoard` (shared) |
| Polymorphic-link precedent | `EntityNote` (`ownerType`/`ownerId`) — pattern the `Connection` table follows |
| Doom event | `WorldEvent` (year/season/day/watch + `relatedEntityIds`) |
| Map records (many per realm) | `GameMap` (`ownerRealmId`), `POI.position`, `Region.boundary` |
| Image map renderer | `InteractiveMap` (maplibre, ~905 lines) — manual worlds |
| Settlement/dungeon maps | Watabou import (`WatabouImportDialog`, renderers) |
| System rules | `SystemConfig` (Cairn 2e + Shadowdark), `SystemBlock` |

POI types available: `settlement`, `dungeon`, `ruin`, `camp`, `shrine`,
`landmark`, `natural`, `fortification`, etc.

## New structures (the actual build)

### 1. Hex map: `GameMap.kind` + a view-first renderer

- Extend `GameMap` with `kind: 'image' | 'hex'` and optional hex params
  (`cols`, `rows`, `hexSize`, orientation). Image maps keep `imageUrl`; hex maps
  ignore it. Schema migration defaults existing maps to `'image'`.
- New **`HexMapRenderer`** component (`src/components/map/HexMapRenderer.tsx`):
  SVG/canvas, biome-colored hex fill, POI pins at hex centers, pan/zoom, click a
  hex → navigate to its POI(s). **View + navigate only in v1.**
- Hex math helper (`src/lib/hexmap/`): axial/offset coords, pixel↔hex, neighbors.
  Standard, ~100 lines, well-tested.
- POIs keep `position {x,y}` = their hex's pixel center. `Region.boundary` = the
  outline polygon of its hex cluster (computed at generation time).
- The map route picks the renderer by `kind`: `InteractiveMap` for `'image'`,
  `HexMapRenderer` for `'hex'`.

### 2. `Connection` entity — unified polymorphic edge table

The single graph table for all **narrative** ties. Follows `EntityNote`'s
`ownerType`/`ownerId` idiom.

```ts
type EntityRef = 'npc' | 'faction' | 'poi' | 'item'

interface Connection {
  id: string
  worldId: string
  fromType: EntityRef
  fromId: string
  toType: EntityRef
  toId: string
  kind: 'parent' | 'child' | 'spouse' | 'sibling' | 'lover' | 'rival' | 'enemy' |
        'ally' | 'debtor' | 'creditor' | 'thief' | 'victim' | 'captive_in' |
        'hides' | 'wants'              // open set; new kinds need no migration
  label: string                        // "ran away with the caravan master"
  status: 'active' | 'missing' | 'estranged' | 'dead' | 'resolved'
  hookId: string | null                // edge born from a Hook
  createdAt: number
  updatedAt: number
}
```

Indexed on `[worldId+fromId]` and `[worldId+toId]` so **"everything connected to
entity X"** is one query regardless of type. On entity delete, orphan cleanup is
`delete where fromId = X or toId = X`.

Requires: Dexie table + migration, repository, container wiring, and a read-only
**"Connections"** panel on the NPC (and POI) detail page — resolves edges to their
target records and links through. Editing can follow.

**Boundaries:** `Connection` does **not** duplicate structural membership
(`NPC.factionIds`, `Faction.leaderNpcId`/`agentNpcIds`) or the scored
`FactionRelationship` matrix. Those keep their existing homes; `Connection` is
narrative edges only.

### 2b. `Hook` entity — quest aggregate (source of truth)

```ts
interface HookSecret {
  kind: 'captive' | 'hidden_item' | 'culprit' | 'destination' | 'truth'
  targetType: 'poi' | 'npc' | 'faction'
  targetId: string
  detail: string                       // GM-facing answer text
}

interface Hook {
  id: string
  worldId: string
  type: 'missing_person' | 'lost_item' | 'theft' | 'relation' |
        'revenge' | 'delivery' | 'escort' | 'artifact'
  title: string
  status: 'open' | 'active' | 'resolved' | 'abandoned'
  contactNpcId: string | null          // who offers it
  rewardText: string
  secret: HookSecret                   // structured + queryable (NOT gmNotes)
  createdAt: number
  updatedAt: number
}
```

`Notice`/`Rumor` are generated **from** a `Hook` and carry its `hookId` back-ref —
they are the player-facing surface; the `Hook` is the truth. Because `secret` is
structured, a future feature can ask "which Hook does this POI resolve?" and
auto-offer resolution when the party reaches `secret.targetId`.

Requires: Dexie table + migration, repository, container wiring; `hookId` added to
`Notice` and `Rumor`; a GM-only Hook view (can reuse `NoticeBoard`/`RumorList`
surfaces plus a secret reveal).

### 3. Procedural content data (`src/domain/data/worldgen/`)

System-agnostic weighted tables, **re-authored** (not copied from hexroll), keyed
where useful by biome or archetype:

- Biome → region flavor (features, dangers, resources, people).
- Wilderness feature/landmark tables (watchtower, altar, graveyard, portal, …).
- Settlement / dungeon / ruin name + descriptor tables.
- NPC tables: given/family names, traits, motivations, wants, appearance, voice.
- **Faction archetype tables** (cult / militia / syndicate / noble house / bandit
  crew …): goal × obstacle × plan.
- **Realm archetype tables** (Kingdom / Empire / Duchy / Lands) + ruler.
- **Conflict templates** (see Conflict Web): missing_person, lost_item, delivery,
  escort, relation, revenge, artifact.
- Per-system `SystemBlock` defaults pulled from `SystemConfig`.

### 4. `WorldGenerator` domain service (pure, seeded)

A composition of stage functions, each pure (`(input, rng) => partialWorld`). No
Dexie, no IO. Output is an in-memory `GeneratedWorld` bundle of plain entities
(realm, hex map, regions, POIs, paths, factions, faction-rels, NPCs, connections,
hooks, notices, rumors, world-events).

### 5. `GenerateWorldUseCase` (application layer)

Orchestrates the stages, then persists the whole bundle in **one Dexie
transaction** via the existing repositories. Sets the new realm active and returns
its id for navigation.

### 6. Generation UI

A "Generate World" entry (dialog or `/realms` route action):

- **Size preset:** Small / Medium / Large (sets all knob defaults + grid size).
- **System dropdown:** pre-selected from active realm's system, else Cairn.
- **Advanced (accordion, overrides):** Factions count, Danger level, NPC density,
  POI/dungeon density.
- **Looming threat:** on/off toggle.
- **Seed:** optional text field (blank = random); enables reproducible worlds.
- Submit → run use-case → navigate into the new realm's hex map.

### 7. Hooks on POIs (gap fix)

`RumorList` + `NoticeBoard` already render on **SettlementTemplate** and
**GenericTemplate** — but **DungeonTemplate, BuildingTemplate, and
DungeonRoomTemplate show no hooks**, which is exactly where missing-person captives
and lost items live. Add the hook list (rumors + notices for that POI) to those
three templates so generated hooks surface at their target locations.

## Generation pipeline (ordered stages)

```
seed → RNG
  1. Realm        create world record (clock defaults, chosen SystemConfig,
                    realm archetype + ruler)
  2. Hex grid     size grid (S 8x8 / M 12x12 / L 16x16); seed biome centers; grow
                    contiguous biome clusters; scatter occasional lake/water hexes
  3. Regions      one Region per biome cluster; boundary = cluster outline;
                    fill flavor from biome tables (forest/mountain/grassland/
                    desert/marsh/frozen/blighted/hills/jungle)
  4. POIs         per-hex allocation by biome + density + danger:
                    settlements, dungeons (lazy DungeonGenerator), ruins, shrines,
                    camps, landmark features; position = hex center; cap to knobs
  4b. Paths       connect each settlement to nearest 1-2 settlements; travel time
                    from hex distance → Path records
  5. Factions     N from knob; archetype each (cult/militia/syndicate/…);
                    agendaGoal (goal) + obstacle (blocker) + advantage (plan);
                    assign HQ poi + region
  6. FactionRels  pairwise relationship scores (−6..+6), skewed by danger
  7. NPCs         density per region/settlement; faction membership, leaders,
                    agents; universal fields + SystemBlock per system
  8. Conflict web NEW: family + conflict ties → Connection edges, some spanning
                    hexes (missing daughter placed at a dungeon via captive_in)
  9. Quests       each conflict → a Hook (structured secret) + its public
                    projections (Notice/Rumor with hookId, at the contact's POI)
 10. Doom event   if toggled: escalate a faction agenda → future-dated WorldEvent
                    + foreshadowing Rumors
 11. Commit       single transaction write; set realm active
```

### The conflict web (stage 8–9 detail)

Each conflict template is a small pure function: given the current NPC/POI/faction
pool + RNG, it emits **Connection edges** + a **Hook** (with structured secret) +
the Hook's **public projections** (Notice/Rumor).

- **missing_person:** pick aggrieved NPC A; weight a relative type
  (son/daughter/nephew/spouse); create real NPC B; set B
  `lifeStatus`/`movementStatus` = missing and place B at a dangerous dungeon POI;
  edges `Connection(npc A → npc B, parent/spouse, status: missing)` and
  `Connection(npc B → poi D, captive_in)`; `Hook{type: missing_person,
  contactNpcId: A, secret:{kind: captive, targetType: poi, targetId: D}}`;
  **public:** `Notice{type: request, contactNpcId: A, hookId}`.
- **lost_item:** A lost a notable item; it's in a dungeon area; `Connection(item →
  poi, hides)`; `Hook{type: lost_item, secret:{kind: hidden_item, targetType: poi}}`;
  **public:** Rumor/advert with `hookId`.
- **runaway spouse / relation:** A's spouse B left with C; `Connection(A→B, spouse,
  estranged)` + `(B→C, lover, active)`; `Hook{type: relation}`; **public:** Rumor.
- **theft:** A's heirloom taken by faction agent B; `Connection(B→A, thief)` +
  `(item → faction, hides)`; `Hook{type: theft, secret:{kind: culprit,
  targetType: faction}}`; **public:** `Notice{type: bounty, hookId}`.
- **delivery / escort:** A needs something/someone moved to a distant POI;
  `Hook{type: delivery/escort, secret:{kind: destination, targetType: poi}}`;
  **public:** `Notice{type: job, hookId}`.

Conflicts run **after** factions/POIs/NPCs so every referenced record exists. Items
referenced by `Connection` (`fromType: 'item'`) are lightweight — modeled as
`TreasureItem` on the holding POI or a tagged record; the edge just points at them.

## Architecture / layering

Follows the existing clean/hexagonal structure:

- `src/domain/services/WorldGenerator.ts` + `src/domain/services/worldgen/*`
  (pure stage functions) and `src/domain/data/worldgen/*` (tables).
- `src/domain/entities/Connection.ts`, `src/domain/entities/Hook.ts`;
  `hookId` added to `Notice` and `Rumor`.
- `src/lib/hexmap/*` (pure hex math) and `src/components/map/HexMapRenderer.tsx`.
- `src/application/use-cases/GenerateWorldUseCase.ts` + a batch-write port.
- `src/infrastructure/dexie/repositories/ConnectionRepository.ts`,
  `HookRepository.ts` + schema migration (`connections`, `hooks` tables;
  `GameMap.kind`; `Notice.hookId`/`Rumor.hookId`) + container wiring.
- `src/components/worldgen/*` for the generation UI; new action on `/realms`.
- Hook lists added to Dungeon/Building/DungeonRoom POI templates; Connections panel
  on NPC/POI detail pages.

Determinism: every stage takes the shared seeded RNG, so the world is
**structurally identical** per (seed, knobs) — same regions, links, and hooks.
Record **IDs are not byte-identical** across runs: ULIDs embed a timestamp +
randomness. If seed-reproducible IDs are ever required, derive them from the seeded
PRNG instead of `newId()`; v1 does not.

## Testing strategy

- **Pure stage unit tests** (fixed seed): counts match knobs; every faction has
  goal+obstacle+plan; every Connection endpoint resolves to a real record; every
  Hook's `contactNpcId` and `secret.targetId` resolve; every Notice/Rumor has a
  valid `hookId`.
- **Hex math tests:** pixel↔hex round-trips, neighbor correctness, cluster outline.
- **Web integrity:** no dangling `Connection` endpoints (from/to both exist); no
  Hook references a missing target; missing-person targets are placed and actually
  missing; `Connection` carries no structural-membership duplication.
- **Determinism:** same seed twice → structurally identical bundle (compare with
  IDs normalized).
- **Use-case test** (fake Dexie): one transaction, realm becomes active, ids
  consistent.
- **Smoke:** generate Small + Large, render the hex map, click a hex → POI, click a
  quest hook through to its NPC and to the secret location.

## Scope boundaries (explicit non-goals for v1)

- **Hex map editing** (drag-place, region paint, path draw on hex) — deferred;
  edit via detail pages.
- No procedural terrain *art* (hex biome fill only).
- No LLM enrichment (Phase 2, optional, later).
- No preview/regenerate-section UI (just commit; re-roll by deleting +
  regenerating).
- No auto Watabou battlemaps at generation time (settlements/dungeons can get one
  later via existing import).
- `Connection` and `Hook` editing UI is read-only in v1 (view + navigate).

## Phasing (single spec, staged build)

1. **Foundation:** `Connection` + `Hook` entities + tables + repos + migration
   (incl. `Notice.hookId`/`Rumor.hookId`, `GameMap.kind`) + wiring;
   `src/lib/hexmap` math; worldgen data-table scaffolding.
2. **Hex map render:** `HexMapRenderer` (view + navigate) + route wiring.
3. **Core pipeline:** stages 1–7 (realm → hex grid → regions → POIs → paths →
   factions → rels → NPCs), pure + tested, behind `GenerateWorldUseCase`.
4. **The web:** stages 8–10 (Connection edges, Hooks + projections, doom event);
   add hook lists to Dungeon/Building/DungeonRoom templates; Connections panel on
   NPC/POI detail.
5. **UI:** generation menu (preset + system + advanced + seed + threat).

## Resolved

- **Map model (was decision 3 / Q1):** Dual — image map for manual worlds,
  procedural **hex map** default for generated worlds; view-first in v1; full hex
  editing deferred. Drops the earlier templated-image + zone-authoring approach.
- **Graph + quest model (data-engineer pass):** Replaced the bespoke
  `NPCRelationship` table with **one polymorphic `Connection` edge table** (follows
  `EntityNote`'s pattern) and introduced a first-class **`Hook` aggregate** with a
  **structured secret** (not `gmNotes`). `Notice`/`Rumor` become public projections
  via `hookId`. `FactionRelationship` (scored matrix) and membership FK fields stay
  as-is; `Connection` is narrative edges only — no dual source of truth.
- **System pick (was Q5):** Dropdown in the generation menu, pre-selected from the
  active realm's system, else Cairn.

- **Towns/population (Q2):** folded into the **POI density** knob — no separate
  population dial. Town count = density × biome weighting.
- **Paths/travel (Q3):** **generate `Path` records.** After POIs are placed, build
  a simple settlement network — connect each settlement to its nearest 1–2
  settlement neighbors; travel time derived from hex distance. (Hex adjacency still
  gives implicit distance; Paths make routes explicit and feed the dashboard.)
- **NPC count (Q4):** **settlements × NPC-density**, plus faction members
  (leaders/agents) and a small number of region-roaming NPCs. No absolute target.
  (hexroll allocates "folk" per settlement type; we follow the same shape.)
- **Party faction in conflicts (Q6):** **yes** — generated conflicts may target the
  party faction.
- **Hex grid size per preset (no clean hexroll value to copy):** proposed defaults,
  tunable — **Small ≈ 8×8, Medium ≈ 12×12, Large ≈ 16×16** hexes.
- **Biomes for v1 (9 land + water):** **forest, mountains, grasslands, desert,
  marsh/swamp, frozen (tundra/glacier), blighted (death lands/cursed wastes),
  hills, jungle**; **occasional lake (water) hexes**; **no ocean**. Blighted is a
  high-danger biome tied to the danger knob + looming-threat event. **Rivers**
  rendered as a polyline overlay — deferred to a visual fast-follow (not blocking
  v1). **No Cairn map tables exist in-repo**; author biome tables ourselves,
  optionally referencing the Cairn 2e SRD (CC-BY).

## Open questions

_None blocking. Remaining tuning (exact density curves, biome weights, travel-time
scale) is settled during implementation._
