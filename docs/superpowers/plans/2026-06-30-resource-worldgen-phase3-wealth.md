# Resource-Driven Worldgen — Phase 3: Wealth + Story — Implementation Plan

> One branch → one PR (plan + building blocks + integration). `- [ ]` steps, build/test gate per task.

**Goal:** Make wealth the spine that visibly shapes the world, and turn the economic graph into plot. Settlements get a **wealth band** (from trade); buildings, NPCs, and treasure scale with it; **StorySeeder** emits wealth-band hooks + contested-resource plots + cross-map rumors; each region gets a **front** (a mini progress-clock threat) so the world moves when ignored. Faction wealth aggregates territory.

**Spec:** `docs/superpowers/specs/2026-06-30-resource-driven-worldgen-design.md` (Phase 3 of 6). Builds on P1 (terrain) + P2 (economy/trade graph) — both merged.

**Architecture:** Pure, seeded. `computeWealth` is a pure fn over the trade graph; the **band** is snapshotted at gen (content anchor), the live score recomputes lazily (no stored score). No new entities/repos — fronts ride on a `Region.front` field, NPC wealth on `NPC.wealthTier`, settlement wealth on `POI.wealthBand`. StorySeeder is a pure pass emitting existing `Hook`/`Notice`/`Rumor` shapes.

## Global constraints
- **Branch:** `feature/resource-worldgen-p3-wealth` off `main`. One PR.
- pnpm wrapper broken → `node_modules/.bin/vitest run` / `node_modules/.bin/tsc --noEmit`.
- **Dexie:** current **v43**; add exactly **`db.version(44)`**; additive + null backfill; never edit released blocks.
- `worldId`; `newId()`; `Date.now()`; child rngs for new picks (keep the golden fingerprint stable); system-agnostic original tables.
- Commit per task.

## Shared contracts
```ts
// wealth (pure)
type WealthBand = 'destitute' | 'poor' | 'modest' | 'prosperous' | 'rich'
interface WealthNode { id: string; produces: { weightClass: 'bulk'|'luxury' } | null; role: 'extractor'|'refiner'; tradeDegree: number; hasWater: boolean; monopoly: boolean }
computeWealthScore(node: WealthNode): number
wealthBand(score: number): WealthBand
// NPC wealth distribution: given a settlement band, return a tier for an NPC
type NpcWealthTier = 'destitute' | 'poor' | 'middling' | 'wealthy'
npcWealthTier(settlementBand: WealthBand, rng: SeededRandom): NpcWealthTier   // rich town => wide spread incl. underclass
// faction wealth: aggregate of controlled settlement bands + monopoly
factionWealth(controlledBands: WealthBand[], hasMonopoly: boolean): WealthBand

// fields
POI.wealthBand: WealthBand | null      // settlements only
NPC.wealthTier: NpcWealthTier | null
Region.front: { title: string; description: string; progress: number; segments: number } | null

// story seeder (pure pass over the world)
interface StoryWorld { settlements: {id; regionId; wealthBand; produces; needs; trouble}[]; regions: {id; definingResource}[]; npcs: NPC[]; ... }
seedStories(world, worldId, rng): { hooks: Hook[]; notices: Notice[]; rumors: Rumor[] }
// wealth-band hooks (rob-the-rich, secure-debt, fix-trade-route, protect-vault),
// contested-resource plots (>=1 per region), cross-map rumors (poor town rumors rich town's vault).
```

## Files
**Created:** `src/domain/services/worldgen/wealth.ts` + test; `src/domain/services/worldgen/seedStories.ts` + test; `src/domain/services/worldgen/regionFronts.ts` (+ tables) + test; `src/infrastructure/dexie/migrations/v44-wealth-defaults.ts` + test.
**Modified:** `POI.ts` (+wealthBand), `NPC.ts` (+wealthTier), `Region.ts` (+front); `buildPoi.ts`/`buildNpc.ts` (defaults); `db.ts` (v44); `generateWorld.ts` (snapshot bands, assign NPC tiers, faction wealth, fronts, StorySeeder); `buildSettlement.ts` (buildings scale with band); literal-fix sites.

## Parallel build (3 agents, then integrate)
Agents A/C verify with **vitest**; agent B (central types) runs full **tsc**. No commits.

### Agent A — wealth model (pure)
- [ ] `wealth.ts`: `WealthBand`, `computeWealthScore`, `wealthBand`, `npcWealthTier` (rich band → wide spread, incl. an underclass; poor band → narrow/poor), `factionWealth`. Pure, deterministic.
- [ ] Tests: more trade degree/luxury/water/monopoly → higher score/band; rich settlement yields a spread of NPC tiers incl. some poor; faction wealth aggregates.
- [ ] Verify: vitest on `wealth.test.ts`.

### Agent B — schema (POI.wealthBand, NPC.wealthTier, Region.front) + v44
- [ ] Add the three fields (nullable). `buildPOI`/`buildNpc` default them null. `Region` constructors backfilled.
- [ ] `v44-wealth-defaults.ts` (pure backfill) + `db.version(44)` (reuse stores; upgrade backfills the three to null on pois/npcs/regions). Fix all literal sites.
- [ ] Verify: full `tsc` clean + vitest on the v44 migration + db.schema tests.

### Agent C — StorySeeder + regional fronts (pure)
- [ ] `regionFronts.ts`: original front tables (title + escalating description) + `buildRegionFront(regionContext, rng)` → `{ title, description, progress: 0, segments: 4|6 }`. System-agnostic.
- [ ] `seedStories.ts`: pure `seedStories(world, worldId, rng)` → wealth-band hooks + contested-resource plots (guarantee ≥1 contested resource per region) + cross-map rumors, using existing `Hook`/`Notice`/`Rumor` shapes (mirror buildHooks/buildDoom construction). Operate on an abstract `StoryWorld` (no Dexie).
- [ ] Tests: rich settlements yield acquisitive hooks, poor yield desperation hooks; every region gets a front + a contested resource; deterministic.
- [ ] Verify: vitest on both test files.

### Integration (me)
- [ ] In `generateWorld`: build `WealthNode`s from the trade graph (tradeDegree = neighbor count; monopoly = sole producer of its good in the world); snapshot `poi.wealthBand`.
- [ ] `buildSettlement`: scale building count/quality by `wealthBand` (rich → more + finer types; poor → fewer/rougher).
- [ ] Assign each settlement NPC a `wealthTier` via `npcWealthTier(band)`; modulate the existing `sprinkleRealmContent` treasure/magic density by band (rich settlements/their NPCs carry more).
- [ ] Compute `factionWealth` per faction (controlled settlement bands).
- [ ] Generate a `Region.front` per region; append StorySeeder hooks/notices/rumors to the world's quest projections.
- [ ] Re-baseline golden snapshot only if it shifts; final `tsc` + full suite + `vite build`.

## Acceptance
- Settlements carry a wealth band; rich vs poor settlements visibly differ (building count/quality, NPC tiers, treasure).
- Hooks reference real wealth/trade/contested resources; each region has a front + a contested resource.
- Faction wealth reflects controlled territory. Tests pass; tsc clean; build succeeds.

## Notes
- **Scope guard:** map rendering of any of this is **Phase 4**. P3 is data + generation only.
- Keep new picks on child rngs to avoid churning the golden fingerprint.
- NPC has no structured inventory; `wealthTier` drives flavor + sprinkle density, not a new item system.
