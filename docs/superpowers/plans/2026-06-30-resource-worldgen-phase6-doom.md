# Resource-Driven Worldgen — Phase 6: Doom v2 — Implementation Plan

> **For agentic workers:** implement task-by-task, TDD, commit per task. Steps use `- [ ]`. Build/test with `node_modules/.bin/vitest run` + `node_modules/.bin/tsc --noEmit` (pnpm wrapper broken in this env). Branch: `feature/resource-worldgen-p6-doom`.

**Goal:** Promote the one-shot `buildDoom` bundle into a first-class, clock-driven `Doom` entity with a detail page that advances on GM-confirmed time and acts on the world (cuts trade, fouls water, spawns problems), reported in a session digest.

**Architecture:** New `Doom` domain entity + Dexie `dooms` table (v45) + repository. `buildDoom` refactors to emit a `Doom` (plus its existing event/rumor/notice/hook bundle). A pure `rollDoomTick` reads the trade graph (`connections` where `kind:'supplies'` + `POI.trade`) and proposes stage effects; `AdvanceClock` ticks the doom on day advance and auto-applies (matching faction-turn flow). A detail route mirrors the faction detail page and reuses `ProgressClock`.

**Tech Stack:** TanStack Start file routes, Dexie, Zustand, `useLiveQuery`, existing `ProgressClock` SVG, `SeededRandom`/`rollDice`.

## Global constraints

- **One doom per realm** for v1 (entity model allows N later; queries key on `worldId`).
- Worldgen changes affect **newly generated realms only** (local-first). Existing realms have no `dooms` row — every read path handles absence.
- Dexie **v44 → v45**; new table only, no index change to existing stores, no destructive backfill.
- System-agnostic. No Cairn/Shadowdark-specific rules in doom logic.
- Deterministic: all generation/roll paths take `SeededRandom` or injected `rollDice`.
- Follow existing repo/port/container patterns exactly (see `FactionRepository` + `container.ts`).

## Shared contracts

**`src/domain/entities/Doom.ts`** (new):
```ts
import type { Season } from '@shared/constants'

export type DoomStatus = 'looming' | 'averted' | 'reckoned'
export type DoomVector = 'roads' | 'water' | 'blight' | 'resource'

export interface DoomStage {
  threshold: number   // clock progress at/after which this grim portent fires
  portent: string     // grim-portent text
  fired: boolean
}

export interface Doom {
  id: string
  worldId: string
  name: string                 // "The Reckoning of the <faction>" or themed name
  theme: string                // selected create-realm doom label, or '' for random
  description: string
  doomFactionId: string | null
  status: DoomStatus
  progress: number             // current clock fill (0..segments)
  segments: number             // ticks to reckoning (default 6)
  stages: DoomStage[]          // grim portents keyed to thresholds, ascending
  vector: DoomVector           // how it spreads / what its effects target
  keyedResource: string | null
  keyedBiome: string | null
  reckoningDate: { year: number; season: Season; day: number; watch: number }
  hookId: string | null        // the avert quest
  createdAt: number
  updatedAt: number
}
```

**`src/domain/services/doom/rollDoomTick.ts`** (new, pure):
```ts
export type DoomEffectKind = 'cut_trade' | 'foul_water' | 'spawn_problem'
export interface DoomEffect {
  kind: DoomEffectKind
  targetId: string        // connectionId (cut_trade) | poiId (foul_water / spawn_problem)
  description: string      // GM-facing summary
}
export interface DoomTickSuggestion {
  doomId: string
  previousProgress: number
  newProgress: number
  firedStages: DoomStage[]   // stages newly crossed this tick
  effects: DoomEffect[]
  reckoned: boolean          // newProgress >= segments
}
export interface DoomGraph {
  connections: Connection[]  // filter kind==='supplies' internally
  pois: POI[]
}
export function rollDoomTick(
  doom: Doom,
  graph: DoomGraph,
  rng: SeededRandom,
): DoomTickSuggestion | null   // null when doom.status !== 'looming'
```
- +1 progress per call. Effects fire only on newly-crossed stage thresholds.
- Effect chosen by `vector`: `roads` → pick a `supplies` connection → `cut_trade`; `water` → pick a POI whose `trade.needs` includes `'water'` (or `trade.produces==='water'`) → `foul_water`; `blight`/`resource` → pick a road-linked POI → `spawn_problem` themed on `keyedResource`/`keyedBiome`.

**`src/application/use-cases/ConfirmDoomTick.ts`** (new):
```ts
export interface ConfirmDoomTickDeps {
  doomRepo: IDoomRepository
  connectionRepo: IConnectionRepository
  poiRepo: IPOIRepository
  poiEventRepo: IPOIEventRepository
  worldEventRepo: IWorldEventRepository
  eventBus: IEventBus
}
export async function executeConfirmDoomTick(
  worldId: string,
  suggestion: DoomTickSuggestion,
  dt: WorldDateTime,
  deps: ConfirmDoomTickDeps,
): Promise<void>
```
- Applies each effect: `cut_trade` → delete the `Connection`; `foul_water` → patch `POI.trade` (drop `'water'` from produces / flag need unmet); `spawn_problem` → create a `POIEvent` (`type:'disaster'`, `tags:['doom']`, `isActive:true`).
- Marks crossed `stages[].fired = true`, sets `doom.progress = newProgress`, `status = reckoned ? 'reckoned' : 'looming'`.
- Writes one `WorldEvent` per fired stage: `type:'doom_stage'`, `relatedEntityIds:[doomId, ...targetIds]`. (Digest + detail log read these.)

**`IDoomRepository`** (port, mirrors `IFactionRepository`): `getById`, `getByRealmId`, `create`, `update`, `delete`.

**`AdvanceDayResult`** gains `doomTick?: DoomTickSuggestion`.

## Files

- Create: `src/domain/entities/Doom.ts`, `src/domain/services/doom/doomThemes.ts` (themed names/stages/vectors by pack), `src/domain/services/doom/rollDoomTick.ts` (+ `.test.ts`), `src/application/use-cases/ConfirmDoomTick.ts` (+ `.test.ts`), `src/application/ports/IDoomRepository.ts`, `src/infrastructure/dexie/repositories/DoomRepository.ts`, `src/infrastructure/dexie/migrations/v45-dooms.ts`, `src/routes/_app/realms/dooms_.$doomId.tsx`, `src/ui/hooks/useDooms.ts`.
- Modify: `src/domain/services/worldgen/buildDoom.ts` (emit `Doom`), `src/domain/services/worldgen/generateWorld.ts:924` (return `doom`), `src/application/use-cases/GenerateWorld.ts:104,118,157` (add `db.dooms` to txn + `bulkPut`; thread `input.doom` theme), `src/infrastructure/dexie/db.ts` (v45 store), `src/infrastructure/container.ts` (register `doomRepo`), `src/application/use-cases/AdvanceClock.ts` (tick doom in `executeAdvanceDay`/`executeFactionTurns` path; extend deps + result), `src/ui/hooks/useDayLog.ts` (aggregate `doom_stage`), `src/application/use-cases/ExportRealm.ts` + import counterpart (dooms in/out).

## Parallel build (3 agents, then integrate)

### Agent A — Doom entity + themes + buildDoom refactor (pure)
- [ ] `Doom.ts` types (per Shared contracts).
- [ ] `doomThemes.ts`: per-pack themed doom names (reuse the existing `new.tsx` lists as source of truth), and for each theme a `vector`, a `keyedResource`/`keyedBiome`, and an ascending `stages` (grim-portent) table. Original copy; system-agnostic. `resolveDoomTheme(label, pack, rng)` → `{ name, vector, keyedResource, keyedBiome, stages }`; `label==='random'`/`''` picks one.
- [ ] Refactor `buildDoom` → returns `{ doom: Doom, bundle: DoomBundle }` where `bundle` is today's `{ event, poiEvents, rumors, notices, hooks }`. Doom's `reckoningDate` = existing `addDays(45..120)` result; `hookId` = the avert hook; `doomFactionId` = chosen faction; `progress:0`, `segments:6`, `status:'looming'`; stages from `resolveDoomTheme`. Accept a new `theme?: string` param.
- [ ] Tests: `buildDoom` yields a `looming` doom with 6 segments, ≥3 stages ascending, a vector, a linked faction + hook; a given theme label produces its themed name/vector; deterministic under fixed seed. Keep existing bundle assertions.
- [ ] Verify: vitest on `buildDoom.test.ts` + new theme test; `tsc` clean for these files.

### Agent B — schema + repo + v45 + container + export/import
- [ ] `db.ts`: add `dooms: 'id, worldId, status'` to `stores`; `db.version(45).stores(storesV45).upgrade(...)` — new table, **no backfill** (empty for existing realms). Add `v45-dooms.ts` only if a helper is needed (likely a no-op note); keep the migration list pattern consistent with v43/v44.
- [ ] `IDoomRepository.ts` port + `DoomRepository.ts` (copy `FactionRepository` shape: `getById`, `getByRealmId`(where `worldId`), `create`, `update`, `delete`). Register `doomRepo: new DoomRepository()` in `container.ts`.
- [ ] `ExportRealm`/import: include `dooms` (query by `worldId`, bulkPut on import inside the existing realm transaction). Add `db.dooms` to any import transaction table list.
- [ ] Tests: repo CRUD round-trips; `ExportImportRealm.roundtrip.test.ts` extended so a realm with a doom exports+imports with the doom intact; db-schema/version test asserts v45 + `dooms` store.
- [ ] Verify: vitest on repo + roundtrip + schema tests; `tsc` clean.

### Agent C — doom advance engine (pure) + confirm
- [ ] `rollDoomTick.ts` (per Shared contracts): +1 progress; effect selection by `vector` reading `connections` (`kind:'supplies'`) + `POI.trade`; returns `null` unless `status==='looming'`; deterministic via injected `rng`. Fired stages = thresholds in `(previousProgress, newProgress]`.
- [ ] `ConfirmDoomTick.ts`: apply effects (delete connection / patch `POI.trade` / create `POIEvent` problem), mark stages fired, bump progress, flip `status` at reckoning, write one `doom_stage` `WorldEvent` per fired stage.
- [ ] Tests: roads vector cuts exactly one supplies connection at a stage; water vector fouls a water-needing POI; blight/resource spawns a themed `POIEvent`; crossing the last segment sets `reckoned`; no stage crossed → no effects; confirm actually mutates repos (fakes/in-memory). Deterministic.
- [ ] Verify: vitest on `rollDoomTick.test.ts` + `ConfirmDoomTick.test.ts`; `tsc` clean.

### Integration (me)
- [ ] `generateWorld.ts`: capture `{ doom, bundle }` from `buildDoom`, push `bundle.*` as today, return `doom` in the result object. Thread `opts.doom` theme through.
- [ ] `GenerateWorld.ts`: add `db.dooms` to the `db.transaction` table list; `if (doom) await db.dooms.put(doom)`; pass `input.doom` into worldgen opts. Re-baseline `GenerateWorld.golden.test.ts` snapshot only if it legitimately shifts.
- [ ] `AdvanceClock.ts`: after faction turns in `executeAdvanceDay` (and the week path via `executeFactionTurns`), load the realm's doom; if `status==='looming'`, `rollDoomTick` → `executeConfirmDoomTick` (auto-apply, mirroring faction-turn auto-apply); include `doomTick` in `AdvanceDayResult`. Extend `AdvanceDayDeps` with `doomRepo`, `connectionRepo` (wire from container at call sites).
- [ ] Detail route `dooms_.$doomId.tsx` + `useDoom(id)` hook (mirror `useFaction` + faction detail): header, `ProgressClock` (progress/segments), stages list (fired ✓ / pending), vector + keyed resource/biome, reckoning date, linked faction (link) + avert hook, and an effects log from `worldEvents` `type:'doom_stage'` whose `relatedEntityIds` include the doom id. Add a link to it wherever the doom surfaces (e.g. dashboard/realm nav — minimal).
- [ ] Digest: `useDayLog.ts` maps `WorldEvent` `type:'doom_stage'` into a `doomEvents` array on `DayLogEntry`; surface a compact "What moved this turn" line in the day-log/calendar UI (grim portent + effect summaries).
- [ ] Full `tsc --noEmit` clean + full `vitest run` green + `vite build`.

## Acceptance

- A newly generated realm (doom ≠ None) persists a `looming` `Doom` (v45) with a clock + stages + vector + avert hook.
- The doom has a detail page showing its `ProgressClock`, grim portents, vector, reckoning date, linked faction/hook, and an effects log.
- GM-confirmed day advance ticks the clock; at stage thresholds it fires a grim portent that cuts a trade edge / fouls water / spawns a settlement problem, per vector; reaching the last segment sets `status:'reckoned'`.
- The day log / session digest reports what the doom moved that turn.
- Export→import preserves the doom. Existing (pre-v45) realms load with no doom and no errors.
- `None` at creation → no `Doom` row; nothing ticks.

## Notes / open decisions

1. **Avert flips status?** When the party resolves the avert `Hook`, should doom → `averted` and stop ticking? Propose: yes, but wiring hook-resolution→doom is a small follow-up, not blocking. Confirm scope.
2. **Tick cadence** = one progress per day-advance that runs faction turns. Alt: only on `factionTurnTrigger` cadence, or a slower N-days-per-segment. Default: per faction-turn tick. OK?
3. **Reckoning effect** — at `reckoned`, fire the existing dated doom `WorldEvent`/`POIEvent` (already scheduled by buildDoom) or a bigger cascade? v1: let the existing scheduled event stand; no extra cascade. OK?
