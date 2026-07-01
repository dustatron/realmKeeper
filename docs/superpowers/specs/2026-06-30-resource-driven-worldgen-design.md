# Resource-Driven World Generation — Design Spec

> **Author:** Design conversation, 2026-06-30.
> **Supersedes/extends:** `2026-06-24-procedural-world-generation-design.md` (the existing 5-phase worldgen). This builds on the shipped pipeline in `src/domain/services/worldgen/`.

## Progress (as of 2026-06-30)

| Phase | Status | Notes |
|-------|--------|-------|
| **1 — Terrain foundation** | ✅ **merged** | resource catalog + packs, `resourcesToBiomes`, elevation, rivers geometry, `Region.definingResource`, create-realm resource UI. Plan: `plans/2026-06-30-resource-worldgen-phase1-terrain.md` |
| **2 — Economic core** | ✅ **merged** | `POI.trade`, trade graph (`buildTradeConnections`, `'supplies'`), `natural_site` PoiKind + `buildNaturalSite`, unmet-need troubles, v43 migration. Plan: `...phase2-economy.md` |
| **3 — Wealth + story** | ✅ **merged** | `wealth.ts` (band/tier/faction), `seedStories`, `regionFronts`, `POI.wealthBand`/`NPC.wealthTier`/`Region.front`, v44 migration. Plan: `...phase3-wealth.md` |
| **4 — Map UX & layers** | 🔵 **in review (PR #66)** | render rivers/chokepoints/trade/treasure/resources + wealth tint, layer toggle control, wealth badges, region/settlement data lists. Plan: `...phase4-map-ux.md`. **Deferred:** discovery fog. |
| **5 — Arcane / ley-lines** | ⬜ not started | ley network through magical deposits + portals/standing-stones; blight cosmology. Create-realm ley toggle already ships (P1). |
| **6 — Doom v2** | ⬜ not started | promote one-shot `buildDoom` → `Doom` entity + clock + detail page + stage events + supply-chain coupling + session digest + create-realm doom selector. One doom per realm for v1. |

**Content & Tables track:** race-names legal fix ✅ merged. Still pending (parallel, independent): agnosticism re-authors for `treasure-tables`, `trap-tables`, `dungeon-event-tables`, `settlementProblems`, `travel.tables`, `wandering-monster-activities`; quality-cliff lifts (`npc.tables` motivations, `settlement.tables` known-for). See "Content & Tables track" section below.

**Current state to resume from:** `main` has P1–P3 + several map/UX bugfixes merged; Dexie at **v44**. Phase 4 is PR #66 (branch `feature/resource-worldgen-p4-map-ux`). Next: merge #66, then Phase 6 (recommended) or Phase 5. Build/test via `node_modules/.bin/vitest run` + `tsc --noEmit` (pnpm wrapper broken in this env). Worldgen changes only affect newly generated realms (local-first).

## Goal

Make **raw resources the spine of world generation.** A region's economy — what it extracts, refines, lacks, and fights over — should drive its biome, its settlements, its wealth, its people, its monsters, its hooks, and its doom. One source of truth, many derived layers, so the world feels causally coherent instead of a bag of independent random rolls.

A player picks resources (and theme packs) at realm creation; everything else falls out of that choice deterministically.

---

## The core idea: one spine, many derived layers

```
RESOURCES (chosen at creation)
   │
   ├─► elevation tendency ─► BIOMES ─► rivers / chokepoints
   │
   ├─► resource DEPOSITS placed on cells
   │        │
   │        └─► SETTLEMENTS placed around deposits (produces/needs)
   │                 │
   │                 ├─► ROADS (count scales with size) ─► TRADE GRAPH (range by tier)
   │                 │                                          │
   │                 │                                          └─► WEALTH (settlement → NPC → faction)
   │                 │
   │                 └─► buildings, NPCs, monsters, all modulated by wealth + role
   │
   └─► STORY SEEDER (reads the finished graph) ─► hooks, rumors, regional fronts, DOOM
```

Nothing downstream invents facts. It *reads* the spine and emits content.

---

## Design principles — the 6 laws of resource flow

These are the medieval-economics rules the whole system encodes:

1. **Value-to-weight sets trade range.** Bulk goods (grain, stone, timber) are heavy and travel *short* (and by water). Luxury goods (gems, silver, spice, fine arms) are light and travel *far* overland. → A trade edge's reach depends on the good's tier.
2. **Water is the highway.** River/coast transport is far cheaper than cart. The richest settlements sit on navigable water. Landlocked = poor unless roaded to water. Large towns **require** a water source.
3. **Refining captures wealth, not extraction.** The smith-city grows rich; the mining hamlet stays poor *though it owns the ore*. Guilds and **chokepoints** (the one bridge, mill, mint, pass) tax the flow.
4. **Monopoly = power + a target.** The sole gem vein or salt flat makes its holder rich *and* besieged.
5. **The resource sits in danger.** Frontiers are dangerous *because* the resource is in monster country. Deposit value ∝ nastiness nearby.
6. **Booms bust.** Veins run dry, blight creeps, plague rides the trade road. Wealth is fragile — this is the doom engine.

---

## Architecture

Follows existing clean/hexagonal layering: domain entities → application ports/use-cases → infrastructure Dexie repos → container. Worldgen stays **pure, staged, and seeded** (`SeededRandom`, mulberry32). Determinism is non-negotiable: same seed + same config (incl. chosen resources) → byte-identical world. The create-realm **biome preview must use the same derivation function** as generation.

### Key new abstractions

- **`WorldGraph` read-model** — a selector that builds one graph (settlement nodes + trade `Connection` edges + road `Path`s + rivers) from persisted entities. Wealth, hooks, doom, the treasure view, and the session digest all query *this*, never re-walking raw entities in five places.
- **`StorySeeder` stage** — a distinct generation pass that runs over the finished `WorldGraph` and *emits* `Hook`/`Notice`/`Rumor`/front content. Each seeder is a plug-in function `(graph) => Story[]` (wealth-band, monopoly-war, unclaimed-vein-race, chokepoint, unmet-need). Decouples "what's true about the world" from "what content we surface."
- **Packs as data, not code.** The resource catalog, doom list, and hook templates live in the existing **table registry** (`TableProvider` / `ResolvedTables`). Enabling a pack widens the table pool. Users can extend resources/dooms via the custom-table system already in the app.
- **Wealth = lazy score + snapshotted band.** A pure `computeWealth(settlement, graph)` recomputes a live score on demand (no stored column, no staleness). A coarse **band** enum (`destitute | poor | modest | prosperous | rich`) is *snapshotted at generation* as the stable anchor for content seeding (treasure, NPC distribution, hooks). Band = content anchor; score = live display.

### Determinism & config

The chosen resource list, enabled packs, unclaimed-deposit toggle, and selected doom become part of the realm's generation config (seed-adjacent). Re-generating with the same config reproduces the world. The form's biome preview calls the real `resourcesToBiomes()` derivation.

---

## Generation pipeline (new order)

Inserts/changes against the current `generateWorld.ts` stages:

```
1. Map dimensions (existing)
2. NEW: choose region defining resources from the config pool (weighted to keep biome variety)
3. DERIVE region biome from defining resource + FULL elevation field
   (mountains high … coast low; rain-shadow, lowland, highland all modeled)
4. Cells: biome + region assignment (existing Voronoi), refined by elevation
5. Lakes / coast (existing); rivers flow downhill from elevation + chokepoints (Phase 1)
6. GameMap tiles (existing)
7. NEW: scatter secondary DEPOSITS onto cells (constrained to region resource family)
8. MODIFY POI placement: bias settlements onto/near deposits, then fill remainder
   → settlement.produces = hosted deposit; settlement.needs = derived (see Wealth/Trade)
9. Roads (existing step 7) — MODIFY: link count scales with settlement size (Option A)
10. NEW: trade graph — match produces↔needs across road-connected settlements,
    range gated by good tier (bulk=adjacent, luxury=map-wide) → POI↔POI Connections
11. NEW: unmet-need → settlement problem (chance-gated)
12. Factions (existing) — archetype seeded by region's dominant resource
13. Settlement interiors (existing) — buildings/NPCs/monsters modulated by wealth band + role
14. NEW: StorySeeder pass over WorldGraph → wealth-band hooks, contested-resource plots,
    regional fronts, cross-map rumors
15. Doom (evolve buildDoom → Doom entity + clock, Phase 6)
```

**Decision recap — Option A (size → roads → trade):** settlement size is assigned at POI build (as today); road count scales with size; trade volume is emergent. Observable result: big settlements have many roads + much trade. Causal direction is size-first, which avoids a risky worldgen reorder.

---

## Data model changes (summary)

| Entity | Change |
|---|---|
| `POI` | add `trade: { produces: string; needs: string[] } \| null`; add `wealthBand` snapshot enum (settlements) |
| `Region` | populate existing `resources: string[]` from real deposits (defining + scattered); add `definingResource` |
| `Connection` | add `ConnectionKind` value `'supplies'` (POI↔POI; `EntityRef` already supports `'poi'`) |
| `Faction` | derived wealth (aggregate, lazy); archetype tag from dominant resource |
| `NPC` | wealth tier within settlement's band distribution (affects carried treasure/items + hooks) |
| **`Doom`** (new) | first-class entity: clock (`progress`/`segments`), stages, status, vector, detail page |
| `GameMap` / cell | elevation field; river flag; chokepoints; deposit marker (all P1 data; rendered P4) |
| Deposits | ephemeral during gen; unclaimed ones attach to **natural sites** when the toggle is on |
| **Natural site** (new) | new `PoiKind` `'natural_site'`; hosts NPCs, treasure, monsters, a resource, and optionally a faction HQ |
| `Faction` HQ | may now seat in a **natural site**, not only a settlement |

All schema changes follow the existing pattern: additive Dexie migrations (current version **41**), null backfill, never edit a released `version()` block. `worldId` everywhere (never `realmId`).

---

## Phase roadmap

Chain **1 → 2 → 3**. Then **4, 5, 6** sit on top, largely independent of each other. A parallel **Content & Tables track** runs alongside (see below).

### Phase 1 — Terrain foundation
**Goal:** resources become the source of truth for terrain (elevation, biomes, rivers); the create-realm form lets users choose them. Do the *whole* terrain layer once.
- Resource **catalog** + theme packs (Low Fantasy, High Fantasy [default], Sci-Fi, Doomed) as table-registry data; each entry: `name, packs[], tier (raw|finished), biome (raw only), rarityWeight, lore, cultureArchetype`.
- `resourcesToBiomes()` derivation (raw→biome map; finished goods excluded). Blighted/wastes → dark high-value resources (mana crystal, void shard / mutagen ore / cursed lode).
- **Full elevation field** up front (noise/distance-from-coast). Biomes are *determined* by elevation + resource — realistic placement (rain-shadow deserts, lowland marsh, highland forest) from day one.
- **Rivers (geometry) + chokepoints (data)** flow from elevation here, *with* the terrain — sources in highlands, downhill to lake/coast/edge via hex pathfinding; fords/passes/bridges emerge. Generated as data in P1 so the **economic core (P2) computes against real water highways** (law 2), not a lakes/coast proxy. P4 only *renders* them.
- Decision: do the hard terrain part — elevation + biomes + rivers — once, to avoid rework and the bugs that breed when later phases build on shifting terrain logic.
- Populate `Region.resources` + `definingResource` from chosen resources. Resource-themed region naming ("The Iron Marches").
- **Create-realm form:** resource multiselect (tag-like, editable, auto-proposed count **scaled by map size**), **live biome preview**, pack toggles, individual cross-pack tag adds, **unclaimed-deposit toggle**, **doom selector**, **ley-lines toggle** (default on; activates in P5). The latter three ship now and feed later phases.

**Acceptance:** generating with a chosen resource set produces matching biomes; elevation yields realistic biome placement; rivers flow downhill to water/edge and chokepoints exist as data; biome preview matches generated world; `Region.resources` reflects real resources.

### Phase 2 — Economic core
**Goal:** deposits, trade, and the graph abstraction.
- Scatter deposits; bias settlement placement onto/near them; set `POI.trade.produces`.
- Derive `needs` (refiners need raw inputs; extractors need food/finished; large towns need `water`).
- **`WorldGraph` read-model.**
- Trade matching with **range by tier** (law 1) → `'supplies'` `Connection`s along road- *and river-* connected settlements; **rivers act as cheap bulk highways + water access** (law 2), using the river geometry generated in P1.
- Unmet need → chance-gated settlement problem (law 6 seed).
- **Natural sites** (new POI kind — see below): generate a few per map, biased to wild cells far from roads.
- **Unclaimed-deposit toggle** (default on for large maps) → attach an extractable resource to some natural sites (the race-for-the-vein plot). Toggle off → natural sites still exist, just without the economy.

**Acceptance:** trade connections exist only between road-linked settlements; bulk goods stay local, luxury goods reach across map; a large town with no water supplier surfaces a problem.

### Phase 3 — Wealth spine + story seeding
**Goal:** wealth modulates the world; the StorySeeder turns the graph into plot.
- `computeWealth()` (lazy score) + snapshot `wealthBand`.
- Wealth → building count/quality + types by economic role (extractor / refiner / agri / port).
- **NPC wealth as a distribution** within the settlement band (rich town = a few rich + a visible underclass); affects carried treasure, magic items, and hook flavor.
- **Faction wealth** = aggregate of controlled territory + monopoly bonus → more agents/advantages, and a target.
- **`StorySeeder`:** wealth-band hooks (rob-the-rich, secure-debt, fix-trade-route, acquire-item, protect-vault), **contested-resource** plots (guarantee ≥1 contested resource per region), monopoly-war, cross-map rumors.
- **Regional fronts** (mini-clocks): each region gets a small front (the troll road, the failing mine, the cult) so the world moves when ignored.

**Acceptance:** rich settlements visibly differ (buildings/NPCs/treasure); hooks reference real wealth/trade/contested resources; each region has a contested resource and a front.

### Phase 4 — Map UX & layers
**Goal:** a legible, layered map that *renders* the terrain + economy generated in P1–P3. (River/chokepoint **geometry already exists from P1**; P4 visualizes it — no regeneration.)
- **Toggleable map-layer framework**: terrain · political · economic (routes + resources + wealth) · arcane · threat · **treasure**.
- Render **rivers** (blue highways) + **chokepoints** (fords/passes/bridges) as map features.
- **Treasure/magic-item layer** (user request): aggregate `POI.treasure` + `magicItemRefs` + NPC-carried items + positions + hook connections — a GM "loot & leverage" overlay.
- Resource **icons**, distinct **unclaimed-deposit marker**, **weighted/visible trade routes** (thick = high volume; rivers = blue), **discovery fog** (explored / rumored / unknown via existing POI `visited`/`status`).

**Acceptance:** rivers + chokepoints render; layers toggle; treasure layer shows loot with guardians + hook links. (Rivers already act as water+trade from P1–P2.)

### Phase 5 — Arcane layer (deferred to P5; toggleable at creation)
**Goal:** a second, mythic geography.
- **Ley lines** through magical/high-value deposits, tying existing **portals** + **Standing Stones** landmarks; portals cluster on ley nodes. **Create-realm toggle** (default on) ships with the P1 form but only activates once P5 lands (doom-selector pattern).
- **Blight cosmology:** the wastes = where a *previous* doom already won; existing **ruin POIs** = remnants of the last civilization that mined too deep. History rhymes.
- Arcane map layer; ley-node danger reinforces law 5.

**Acceptance:** ley layer renders; ruins/blight share a coherent origin myth surfaced in flavor.

### Phase 6 — Doom v2 (doom as a living antagonist)
**Goal:** evolve the one-shot `buildDoom` bundle into a first-class, clock-driven Front.
- **`Doom` entity** + repository + **detail route** (faction-detail pattern). Reuses existing progress-clock pattern (`AgendaGoal.progress`/`segments`) and the faction-turn-on-clock-advance + GM-confirm flow.
- Fields: clock (segments → reckoning), **stages** (grim portents), `status`, **vector** (how it spreads: roads / water / blight biome / named resource), keyed resource/biome.
- **Supply-chain coupling (v1):** on confirmed clock ticks, at stage thresholds the doom *reads the WorldGraph* and acts — disable a trade edge, foul a water source, spawn a themed settlement-problem along a road. Wealth recomputes lazily. (Full cascade sim = later.)
- **`AdvanceClock` integration** + **"what moved this turn" session digest**.
- **Create-realm doom selector** (pre-written list, filtered by enabled packs; Random / None options). Selector can ship in P1 feeding today's one-shot doom; entity/clock lands here.
- **One doom per realm** for v1 (entity model allows N later trivially).

**Acceptance:** doom has a detail page + clock; advancing time (GM-confirmed) fires stage events that cut trade/foul water/spawn problems; session digest reports changes.

---

## Subsystem detail

### Resource catalog + packs
Additive tag-sources, not exclusive. Standard examples by biome:
- **mountains:** iron, coal, stone, silver, **gems** (rare); **hills:** copper, marble, ore
- **forest:** timber, charcoal, furs; **grasslands:** grain, livestock, wool, horses
- **desert:** salt, glass-sand, spice; **jungle:** hardwood, dyes; **marsh:** peat, reeds, herbs; **frozen:** furs, ice, whale-oil
- **blighted/wastes:** ashen ore, cursed salt (Standard) → **mana crystal, void shard, soulstone** (High Fantasy) / **fallout glass, mutagen ore** (Sci-Fi) / **cursed lode** (Doomed)

**Finished goods** (derived, made by hub towns, biome-agnostic): weapons (← ore + coal), tools, textiles (← wool/timber); fantasy enchanted arms; sci-fi energy cells. Shown in the form as a read-only "this world can manufacture…" preview.

### Natural sites (new POI kind)
A **named, dangerous, characterful wild place** — the Hollow Wood, Mournmere, the Singing Caverns — that the party ventures *to*, not just through. Fills the current overworld gap (only settlements/dungeons/ruins/point-landmarks exist).
- **New `PoiKind` `'natural_site'`** (in `poiKinds.ts`; reuses `LandmarkLore` Legend→Truth→Secret→Hook machinery but is its own kind — landmarks are point curiosities, natural sites are dangerous *areas*).
- A full peer to settlements — can host its own **NPCs, treasure, monsters, a wild/foraged resource (or unclaimed deposit), and a faction HQ.** This extends faction seating beyond settlements (a bandit clan, druid circle, or monster warband can be HQ'd in the wild).
- Fields: `name`, defining **hazard/mood**, `treasure`, guardian **monsters** (scaled to danger), a **hook**, optional **hosted resource**.
- Generation: a few per map (scaled by size), biased to wild cells far from roads (the frontier). Feeds discovery + treasure map layers, rumors, and regional fronts. Why the frontier resource is dangerous to claim (law 5).
- Content: evocative **name + hazard tables** (Content track).

### Trade range by tier (law 1)
- **Bulk** (food, stone, timber, ore): satisfies needs of *adjacent* (1–2 road hops) or river/coast-connected settlements only.
- **Luxury** (gems, silver, spice, fine arms): satisfies needs map-wide along road/river. Long luxury routes are worth raiding → hooks.

### Wealth model
- **Settlement:** `refiner_bonus + (trade_degree × avg_good_value) + water_access + monopoly_bonus`.
- **NPC:** distribution seeded by settlement band + role. Rich town → wider spread (merchant-princes + underclass).
- **Faction:** aggregate of controlled settlements + monopoly resources.

### Doom selector themes (by pack)
- **Low Fantasy:** The Salt-Death (plague on trade roads); The Long Hunger (famine + revolt); War of the Silver Mine.
- **High Fantasy:** The Crystal Wakes; The Wyrm Claims the Peak; The Blight Spreads from the Waste.
- **Sci-Fi:** The Machine Below Stirs; Mutagen Bloom.
- **Doomed:** The Tide of Ash; The Cursed Lode; The Dead Walk the Roads.

---

## Content & Tables track (parallel)

From the DM/adventure-writer review of the existing ~7,500 lines of tables. The **curated tables are excellent** (npc-extra, world-flavor, biomeEncounters, dressing, ruins, mystery/side hooks). Fixes cluster in older/imported tables. **System rules tables (Cairn/Shadowdark stat blocks) are intentionally left untouched — they are sourcebook references.**

### Independent / ship-soon (content-only, low risk)
- 🚨 **Legal:** `race-names.ts` contains copyrighted names (Bruenor, Thorin, Flint, Keyleth). Re-author.
- 🚨 **Agnosticism:** `treasure-tables.ts` (gp + dice values) → re-author as story-bearing valuables or gate behind a system flag.
- `trap-tables.ts` + `dungeon-event-tables.ts` (bare Cairn SRD verbs, no voice) → re-author as trigger + telegraph + effect + escape, plus a "what the trap guarded" table.
- `settlementProblems.ts` D&D bestiary leakage (goblinoids, faerie dragons, trolls) → describe *effects*; dedupe trolls ×2 / bandits ×3 / plague ×4.
- `wandering-monster-activities.ts` (combat/dungeon-coded; filename) → rename + revoice as biome-neutral travel-activity verbs.
- `travel.tables.ts` (Dark Sun residue; slavery ×3; flat voice) → de-source, revoice.

### Quality cliff — lift weak to match strong
- `npc.tables.ts` MOTIVATIONS/PERSONALITIES → rewrite as wants-in-a-sentence.
- `settlement.tables.ts` KNOWN_FOR / STRUCTURE_QUIRKS → sharpen clichés to match the Secrets table.
- Retire `PHYSICAL_TRAITS` (dup of richer `APPEARANCES`).

### New tables — fold into epic phases
- **Natural-site** evocative **name** + **hazard/mood** tables (P2).
- Settlement **leadership** + **attitude-to-outsiders** (P3).
- NPC **connections** + **disposition** + neutral/positive secrets (P3).
- **Tracks/signs** + **mundane weather** travel tables (P4).
- **Contested faction goals** that target the same scarce resource (P3).
- **Escalating curses with cure hooks** + a **boons** table (P3/StorySeeder).
- Escalating **doom consequences/rumors** (replace flat all-or-nothing) (P6).
- Trim cross-biome motif repeats (drowned bell, under-ice feast, "asks the date" revenant).

Full per-domain reviews (with in-voice rewrite examples) captured from 5 reviewer agents; available to expand into issues.

---

## Global constraints

- **Branch:** never commit feature work to `main`; use `feature/…` per CLAUDE.md.
- **Package manager:** `pnpm` only.
- **`worldId`, never `realmId`** (reserved by dexie-cloud-addon).
- **Dexie:** current version **41**; add new `version()` blocks, never edit released ones; additive migrations + null backfill (pattern: `v36-defaults`, `v37-town-defaults`).
- **IDs:** `newId()` (ULID); `createdAt`/`updatedAt` = `Date.now()`.
- **Worldgen stays pure + seeded.** New derivations are pure functions, unit-tested with `SeededRandom`. Use child rngs to keep existing seeded output stable where inserting new picks.
- **Tables are system-agnostic** (no rules/dice/stat leakage); voice = "grounded + light whimsy"; all text original.
- **GM confirms everything** — doom ticks and faction turns are *suggested*, GM-confirmed; never auto-commit world state.

---

## Open decisions

1. ~~Elevation timing~~ — **RESOLVED: full elevation field in P1; P4 builds on it.**
2. ~~Arcane layer~~ — **RESOLVED: P5, with a create-realm ley-lines toggle (default on) shipping in P1.**
3. ~~Regional fronts~~ — **RESOLVED: adopt in P3 (mini-clocks per region, reusing the doom/agenda clock pattern).**
4. ~~Map layers~~ — **RESOLVED: build the toggleable-layer framework in P4; treasure is one layer (no standalone bolt-on).**
5. ~~Unclaimed deposits~~ — **RESOLVED: toggle-gated (B). Also added: `natural_site` as a new POI kind — a full peer to settlements (own NPCs/treasure/monsters/resource/faction HQ); always generated; unclaimed deposits attach to them when the toggle is on.**
6. ~~Wealth band refresh~~ — **RESOLVED: freeze band at generation (B) for v1; live score still reflects decline. Revisit auto-recompute when P6 doom-coupling proves out.**
7. ~~Phase order~~ — **RESOLVED: river geometry moves to P1 (with elevation) so the economic core (P2) computes against real water highways; P4 keeps river/chokepoint *rendering*. P1 is now the full terrain layer.**
8. ~~Content track timing~~ — **RESOLVED: run in parallel (B) on its own branch/track, not blocking the epic. The legal fix (`race-names`) is urgent — do it now-ish.**
