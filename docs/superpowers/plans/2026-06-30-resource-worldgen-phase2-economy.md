# Resource-Driven Worldgen — Phase 2: Economic Core — Implementation Plan

> Implement task-by-task. `- [ ]` steps. Build/test gate + conventional commit per task.

**Goal:** Turn the resource terrain from Phase 1 into a living economy. Settlements **produce** and **need** goods; a **trade graph** links suppliers to consumers along roads **and rivers**, gated by good value (bulk = local, luxury = far); unmet needs seed **settlement problems**; and a new **natural site** POI kind gives the wilderness named, dangerous, treasure-bearing places that can also host **unclaimed resource deposits**.

**Spec:** `docs/superpowers/specs/2026-06-30-resource-driven-worldgen-design.md` (Phase 2 of 6). Builds on Phase 1 (merged): resource catalog, `Region.definingResource`, elevation, rivers, `GameMap` cell `river`/`chokepoint`.

**Architecture:** Pure, seeded worldgen. New trade logic is a pure module over an abstract `SettlementNode` (decoupled from the catalog so it can be built/tested in isolation). `Connection` already supports POI↔POI; add a `'supplies'` kind. Natural sites reuse the existing `'natural'` `PoiType` (tile support exists) via a new `PoiKind`.

## Global constraints
- **Branch:** `feature/resource-worldgen-p2-economy` off `main`.
- **pnpm wrapper is broken in this env** — use `node_modules/.bin/vitest run <files>` and `node_modules/.bin/tsc --noEmit`.
- **Dexie:** current **v42**; add exactly **`db.version(43)`**; never edit released blocks; additive + null backfill.
- `worldId` not `realmId`; `newId()` ULID; `Date.now()` timestamps; child rngs for new mid-pipeline picks; tables system-agnostic, voice "grounded + light whimsy", original text.
- Commit per task.

## Shared contracts (agents build against these)
```ts
// catalog additions (ResourceDef)
weightClass: 'bulk' | 'luxury'      // trade range: bulk = adjacent only, luxury = map-wide
inputs?: string[]                    // finished goods only: the raws they refine

// economy helper
deriveNeeds(produces: string, size: 'small'|'medium'|'large'): string[]
// extractor (raw produce): food (grain/livestock) + a finished good; refiner (finished): its inputs;
// large settlements always += 'water' (special good). De-duped; never needs what it produces.

// POI field
trade: { produces: string; needs: string[] } | null

// connections
ConnectionKind += 'supplies'         // supplier POI → consumer POI, label "supplies <good> to"

// trade graph (pure, catalog-agnostic)
interface SettlementNode {
  id: string; regionId: string
  produces: { name: string; weightClass: 'bulk' | 'luxury' } | null
  needs: string[]
  neighbors: string[]                // road/river-connected settlement ids (undirected)
}
buildTradeConnections(nodes: SettlementNode[], worldId: string):
  { connections: Connection[]; unmetNeeds: { settlementId: string; good: string }[] }
// bulk good: satisfies a need only within 1–2 graph hops; luxury: any reachable node.

// natural sites
PoiKind += 'natural_site'            // poiKindToType -> 'natural'
buildNaturalSite(...) => POI         // type 'natural'; name + hazard + treasure + monsters + hook + optional hosted resource
```

## Files

**Created:**
- `src/domain/services/worldgen/economy.ts` + `.test.ts` — `deriveNeeds`, `WATER` const, refiner/extractor role helper.
- `src/domain/services/worldgen/buildTradeConnections.ts` + `.test.ts` — `WorldGraph` reachability + trade matching by tier + unmet-need detection.
- `src/domain/services/worldgen/buildNaturalSite.ts` + `.test.ts` — natural-site POI builder.
- `src/domain/data/worldgen/naturalSites.tables.ts` + `.test.ts` — evocative name + hazard/mood tables (system-agnostic, original).
- `src/infrastructure/dexie/migrations/v43-trade-defaults.ts` + `.test.ts` — backfill `POI.trade = null`.

**Modified:**
- `src/domain/data/worldgen/resources.catalog.ts` — add `weightClass` to every entry; add `inputs` to finished goods.
- `src/domain/entities/POI.ts` — add `trade: { produces: string; needs: string[] } | null`.
- `src/domain/entities/Connection.ts` — add `'supplies'` to `ConnectionKind`.
- `src/domain/data/worldgen/poiKinds.ts` — add `'natural_site'` kind + `poiKindToType` case → `'natural'`.
- `src/domain/services/worldgen/buildPoi.ts` — `buildPOI` accepts optional `trade`, defaults `null`.
- `src/domain/services/worldgen/generateWorld.ts` — assign produces/needs to settlements; generate natural sites; build trade connections; emit unmet-need problems.
- `src/infrastructure/dexie/db.ts` — `db.version(43)`.
- `src/shared/constants.ts` — (optional) add `'natural'` to `EXPLORABLE_POI_TYPES` so sites with monsters/treasure use the explore→clear lifecycle.

## Parallel build (4 agents, then integrate)

Agents edit **disjoint files** and **do not commit**. To avoid shared-tree type races, agents **A/C/D verify with vitest only** (esbuild — no project-wide typecheck); **agent B** (which changes the central `POI` type) runs the full `tsc`. The integrator runs the final project-wide `tsc` + suite.

### Agent A — catalog economics (pure)
- [ ] Add `weightClass: 'bulk' | 'luxury'` to every `ResourceDef` (gems/silver/mithril/adamant/dragonbone/star-metal/mana crystal/soulstone/void shard/exotic spice/walrus-ivory/rare-earth ore/uranium ore + all finished arms/cybernetics/enchanted = **luxury**; the rest **bulk**).
- [ ] Add `inputs?: string[]` to finished goods (weapons←[iron ore, coal]; tools←[iron ore]; textiles←[wool]; enchanted arms←[weapons, mana crystal]; potions←[medicinal herbs]; cybernetics←[plasteel, energy cells]; plasteel←[titanium]; energy cells←[uranium ore]; etc. — only reference goods that exist in the catalog).
- [ ] `economy.ts`: `WATER` const; `deriveNeeds(produces, size)`; a `roleForSettlement(producesTier)` helper. Pure.
- [ ] Tests: every resource has a weightClass; finished goods' inputs all resolve to catalog names; `deriveNeeds` — extractor needs food+finished, refiner needs its inputs, large adds water, never needs what it produces.
- [ ] Verify: `node_modules/.bin/vitest run src/domain/services/worldgen/economy.test.ts src/domain/data/worldgen/resources.catalog.test.ts`.

### Agent B — POI.trade field + v43 migration (touches central type → full tsc)
- [ ] `POI.ts`: add `trade: { produces: string; needs: string[] } | null`.
- [ ] `buildPoi.ts`: `BuildPOIInput` gains optional `trade`; default `null` in `buildPOI`.
- [ ] Fix ALL POI constructor breakages (literals in devApi + tests) with `trade: null`.
- [ ] `v43-trade-defaults.ts` (pure backfill, mirror v42) + `db.version(43)` (reuse latest stores, upgrade backfills `trade: null`).
- [ ] Verify: `node_modules/.bin/tsc --noEmit` clean + `node_modules/.bin/vitest run src/infrastructure/dexie/migrations/v43-trade-defaults.test.ts src/infrastructure/dexie/db.schema.test.ts`.

### Agent C — natural sites (kind + builder + tables)
- [ ] `poiKinds.ts`: add `'natural_site'` to `PoiKind`; `poiKindToType` returns `'natural'`. (Do NOT add it to `POI_KIND_TABLE` — natural sites generate via their own step, not the per-cell POI roll.)
- [ ] `naturalSites.tables.ts`: original evocative **name** table (e.g. "The Hollow Wood", "Mournmere", "The Singing Caverns") + **hazard/mood** table; system-agnostic.
- [ ] `buildNaturalSite.ts`: pure builder → `buildPOI({ type: 'natural', ... })` with name, description/mood/trouble from tables, optional `hostedResource` recorded on `trade.produces` (when present), and tags `['natural-site']`. Seeded. (Monsters/treasure density is applied later by the existing sprinkle pass — keep this builder focused on identity + optional resource.)
- [ ] Tests: builder is deterministic; type is `'natural'`; hosted resource lands on `trade.produces` when provided; names/hazards come from the tables.
- [ ] Verify: `node_modules/.bin/vitest run src/domain/services/worldgen/buildNaturalSite.test.ts src/domain/data/worldgen/naturalSites.tables.test.ts`.

### Agent D — trade graph (pure, catalog-agnostic)
- [ ] `Connection.ts`: add `'supplies'` to `ConnectionKind`.
- [ ] `buildTradeConnections.ts`: build an undirected reachability graph from `SettlementNode.neighbors`; for each node need, find a producer of that good — **bulk** within ≤2 hops, **luxury** any reachable node — pick the nearest; emit a `Connection` (`fromType/toType: 'poi'`, `kind: 'supplies'`, `label: "supplies <good> to"`, supplier→consumer). Needs with no in-range producer → `unmetNeeds`.
- [ ] Tests: bulk good only satisfies adjacent (assert a far bulk producer does NOT connect); luxury connects across the graph; unmet need reported when no producer; deterministic ordering; self-supply excluded.
- [ ] Verify: `node_modules/.bin/vitest run src/domain/services/worldgen/buildTradeConnections.test.ts`.

### Integration (me, after A–D)
- [ ] `generateWorld.ts`: after settlements + roads exist —
  - assign each settlement `trade.produces`: small/medium = region `definingResource` (extractor); large = a finished good whose inputs are satisfiable from nearby raws (refiner); `trade.needs = deriveNeeds(produces, size)`.
  - build `SettlementNode[]` (neighbors from the existing road network `paths` + river adjacency from P1 cell `river` flags), call `buildTradeConnections`, append `'supplies'` connections.
  - unmet needs → chance-gated settlement **problem** (set `trouble` / append via the existing `settlementProblems` path) — most settlements have ≥1 road so most needs resolve.
  - generate a few **natural sites** on wild cells far from settlements/roads (scaled by size); when `opts.unclaimedDeposits`, attach a hosted resource (a region raw not already extracted) to some of them.
- [ ] `GenerateWorld.ts`: pass `unclaimedDeposits` into `generateWorld` opts (already on input).
- [ ] Re-baseline the golden determinism snapshot (deterministic output change).
- [ ] Final `node_modules/.bin/tsc --noEmit` + `node_modules/.bin/vitest run` all green; `vite build`.

## Acceptance
- Settlements have `produces`/`needs`; refiners differ from extractors; large towns need water.
- Trade `'supplies'` connections exist only between road/river-connected settlements; bulk stays local, luxury reaches far.
- A settlement with an unsatisfiable need sometimes shows a supply-shortage problem.
- Natural sites render (type `natural`) as named wild places; with the toggle on, some host an unclaimed resource.
- All tests pass; tsc clean; build succeeds.

## Notes / risks
- **Determinism:** insert new picks via child rngs; expect the golden snapshot to change once.
- **Trade direction:** `Connection` is supplier→consumer; the detail UI reads both ends, so no schema change beyond the new kind.
- **Scope guard:** wealth, NPC/faction wealth, StorySeeder, regional fronts are **Phase 3** — do not start them here. P2 stops at produces/needs/trade/natural-sites/unmet-need.
