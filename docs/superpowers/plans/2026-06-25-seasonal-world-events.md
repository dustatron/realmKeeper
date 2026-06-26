# Seasonal World Events (Slice A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A generated world has a recurring seasonal calendar of celebrations (festivals/markets/ceremonies) at settlements — every season has a few at different locations — and those events activate + log to the timeline when the GM advances onto their date.

**Architecture:** No new entity — a celebration is a recurring `POIEvent` (`year:null`). A new pure builder `buildEvents` produces them at worldgen, composed into `generateWorld`. A pure `isEventActiveOn` date-window helper drives activation/expiry in `executeAdvanceDay` (replacing the broken activate-only + no-op-expiry block), and the calendar finally passes `poiEventRepo` so events fire. Event types get icons/colors in the calendar.

**Tech Stack:** TypeScript (strict), Dexie/IndexedDB, vitest + fake-indexeddb, React 19, Tailwind, lucide-react. Build: `pnpm build`. Test: `pnpm test`.

## Global Constraints

- **Determinism:** worldgen is pure — one `SeededRandom`, never `Date.now()`/`Math.random()` for generation choices. `createdAt`/`updatedAt` use `Date.now()` (matches `buildDoom`).
- **Package manager:** pnpm only (no npm; `package-lock.json` is gitignored).
- **Never commit to main** — this work is on branch `feature/seasonal-world-events`.
- **Commit trailer (required):** every `git commit` message ends with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` (repo + global convention). The plan's commit steps use a two-`-m` form to include it.
- **Watches are 1-based.** `advanceDay` (`WorldDate.ts`) resets `watch` to **1** on every day advance, and watches run `1..watchesPerDay`. All date math here is 1-based: see `isEventActiveOn` (Task 5).
- **POIEventType** values available: `festival, market, ceremony, disaster, siege, weather, migration, political, supernatural, custom` (`src/shared/constants.ts`).
- **Locked tunables:** festival/market/ceremony `durationWatches` = a full day (= `watchesPerDay`); markets recur annually; per-season target = `min(n, max(2, min(4, round(n/4))))` where `n` = settlement count (the `min(n, …)` guard keeps it reachable when there are few settlements).

---

### Task 1: Settlement-size classifier (shared)

`buildSettlement.ts` has private `LARGE`/`SMALL` sets. Extract a shared, tested classifier so `buildEvents` and `buildSettlement` agree on size.

**Files:**
- Create: `src/domain/data/worldgen/settlementSize.ts`
- Test: `src/domain/data/worldgen/settlementSize.test.ts`
- Modify: `src/domain/services/worldgen/buildSettlement.ts:28-35` (use the shared classifier)

**Interfaces:**
- Produces: `type SettlementSize = 'small' | 'medium' | 'large'`; `settlementSize(subtype: string | null): SettlementSize`

- [ ] **Step 1: Write the failing test**

```typescript
// settlementSize.test.ts
import { describe, it, expect } from 'vitest'
import { settlementSize } from './settlementSize'

describe('settlementSize', () => {
  it('classifies Cairn settlement subtypes by size', () => {
    expect(settlementSize('City')).toBe('large')
    expect(settlementSize('Citadel')).toBe('large')
    expect(settlementSize('Hamlet')).toBe('small')
    expect(settlementSize('Outpost')).toBe('small')
    expect(settlementSize('Village')).toBe('medium')
    expect(settlementSize(null)).toBe('medium')
  })
})
```

- [ ] **Step 2: Run test, verify it fails**

Run: `pnpm exec vitest run src/domain/data/worldgen/settlementSize.test.ts`
Expected: FAIL — cannot find module `./settlementSize`.

- [ ] **Step 3: Implement**

```typescript
// settlementSize.ts
export type SettlementSize = 'small' | 'medium' | 'large'

const LARGE = new Set(['City', 'Citadel', 'Fortress', 'Stronghold'])
const SMALL = new Set(['Hamlet', 'Outpost', 'Farmstead', 'Caravan', 'Commune', 'Villa', 'Prison'])

export function settlementSize(subtype: string | null): SettlementSize {
  if (subtype && LARGE.has(subtype)) return 'large'
  if (subtype && SMALL.has(subtype)) return 'small'
  return 'medium'
}
```

- [ ] **Step 4: Refactor `buildSettlement.ts` to use it**

Replace the `LARGE`/`SMALL` sets and `buildingCount` body (lines 28-35) with:

```typescript
import { settlementSize } from '@domain/data/worldgen/settlementSize'

function buildingCount(subtype: string | null, rng: SeededRandom): number {
  const size = settlementSize(subtype)
  if (size === 'large') return rng.between(7, 10)
  if (size === 'small') return rng.between(2, 3)
  return rng.between(4, 6)
}
```

- [ ] **Step 5: Run tests + typecheck**

Run: `pnpm exec vitest run src/domain/data/worldgen/ && pnpm exec tsc --noEmit`
Expected: PASS, no type errors. (buildSettlement tests still green — same numeric behavior.)

- [ ] **Step 6: Commit**

```bash
git add src/domain/data/worldgen/settlementSize.ts src/domain/data/worldgen/settlementSize.test.ts src/domain/services/worldgen/buildSettlement.ts
git commit -m "refactor: shared settlement-size classifier" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Civic event flavor tables

Cairn-style flavor pools for celebration names/descriptions (static data + a pure helper). Self-contained — celebration names aren't in the Cairn tables, so this is a new small pool module.

**Files:**
- Create: `src/domain/data/worldgen/eventFlavor.ts`
- Test: `src/domain/data/worldgen/eventFlavor.test.ts`

**Interfaces:**
- Consumes: `SeededRandom` (`~/lib/dungeon/SeededRandom`), `Season` (`@shared/constants`)
- Produces: `type CivicType = 'festival' | 'market' | 'ceremony'`; `buildCivicFlavor(type: CivicType, season: Season, settlementName: string, rng: SeededRandom): { name: string; description: string }`

- [ ] **Step 1: Write the failing test**

```typescript
// eventFlavor.test.ts
import { describe, it, expect } from 'vitest'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { buildCivicFlavor } from './eventFlavor'

describe('buildCivicFlavor', () => {
  it('is deterministic for a seed and names the settlement', () => {
    const a = buildCivicFlavor('festival', 'summer', 'Briar', new SeededRandom('s'))
    const b = buildCivicFlavor('festival', 'summer', 'Briar', new SeededRandom('s'))
    expect(a).toEqual(b)
    expect(a.name.length).toBeGreaterThan(0)
    expect(a.description).toContain('Briar')
  })

  it('produces a market with the settlement name', () => {
    const m = buildCivicFlavor('market', 'spring', 'Oakford', new SeededRandom('m'))
    expect(m.name.length).toBeGreaterThan(0)
    expect(m.description).toContain('Oakford')
  })
})
```

- [ ] **Step 2: Run test, verify it fails**

Run: `pnpm exec vitest run src/domain/data/worldgen/eventFlavor.test.ts`
Expected: FAIL — cannot find module `./eventFlavor`.

- [ ] **Step 3: Implement**

```typescript
// eventFlavor.ts
import type { SeededRandom } from '~/lib/dungeon/SeededRandom'
import type { Season } from '@shared/constants'

export type CivicType = 'festival' | 'market' | 'ceremony'

const FESTIVAL_NAMES: Record<Season, string[]> = {
  spring: ['the Greening', 'the Blossom Fair', 'the Thawing Revel', 'Maying'],
  summer: ['the Sun’s Height', 'the Long Day Feast', 'the Midsummer Fair', 'the Bonfire Nights'],
  fall: ['the Harvest Home', 'the Reaping Feast', 'the Last Sheaf', 'the Cider Days'],
  winter: ['the Long Night', 'the Hearth Feast', 'the Frost Vigil', 'the Wassail'],
}
const CEREMONY_NAMES = ['the Rite of Founding', 'the Naming', 'the Oathtaking', 'the Remembrance', 'the Blessing of the Fields']
const MARKET_NAMES: Record<Season, string[]> = {
  spring: ['the Spring Market', 'the Seed Market'],
  summer: ['the High Market', 'the Wool Fair'],
  fall: ['the Harvest Market', 'the Cattle Fair'],
  winter: ['the Winter Market', 'the Salt Fair'],
}

export function buildCivicFlavor(
  type: CivicType,
  season: Season,
  settlementName: string,
  rng: SeededRandom,
): { name: string; description: string } {
  if (type === 'festival') {
    const n = rng.pick(FESTIVAL_NAMES[season])
    return { name: `${n} at ${settlementName}`, description: `${settlementName} keeps ${n}, a ${season} festival drawing folk from the surrounding lands.` }
  }
  if (type === 'market') {
    const n = rng.pick(MARKET_NAMES[season])
    return { name: `${n} at ${settlementName}`, description: `Traders and farmers crowd into ${settlementName} for ${n}.` }
  }
  const n = rng.pick(CEREMONY_NAMES)
  return { name: `${n} at ${settlementName}`, description: `${settlementName} observes ${n}, a solemn ${season} rite.` }
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `pnpm exec vitest run src/domain/data/worldgen/eventFlavor.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/data/worldgen/eventFlavor.ts src/domain/data/worldgen/eventFlavor.test.ts
git commit -m "feat: civic event flavor tables" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: `buildEvents` — seasonal civic POIEvents

**Files:**
- Create: `src/domain/services/worldgen/buildEvents.ts`
- Test: `src/domain/services/worldgen/buildEvents.test.ts`

**Interfaces:**
- Consumes: `POI` (`@domain/entities/POI`), `POIEvent` (`@domain/entities/POIEvent`), `Season`+`SEASONS` (`@shared/constants`), `SeededRandom`, `settlementSize` (Task 1), `buildCivicFlavor`/`CivicType` (Task 2), `newId` (`@shared/ulid`).
- Produces: `buildEvents(settlements: POI[], worldId: string, daysPerSeason: number, watchesPerDay: number, rng: SeededRandom): POIEvent[]`

Rules: per-settlement by size — small → `[market]`, medium → `[market, festival]`, large → `[market, festival, ceremony]`. Each event gets a random season + day in `[1, daysPerSeason]`, `trigger.year=null`, `trigger.watch=null`, `recurring:true`, `isActive:false`, `durationWatches=watchesPerDay`, `tags:['civic']`. Then seasonal coverage: `target = min(n, max(2, min(4, round(n/4))))`; for each season, while fewer than `target` distinct settlements have an event that season, add a `festival` at a settlement not yet celebrating that season. (A settlement can host events in multiple different seasons.)

- [ ] **Step 1: Write the failing tests**

```typescript
// buildEvents.test.ts
import { describe, it, expect } from 'vitest'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import type { POI } from '@domain/entities/POI'
import { SEASONS } from '@shared/constants'
import { buildEvents } from './buildEvents'

const settlement = (id: string, subtype: string): POI =>
  ({ id, regionId: 'r1', type: 'settlement', subtypeLabel: subtype, name: `Town-${id}` } as POI)

describe('buildEvents', () => {
  it('returns no events when there are no settlements', () => {
    expect(buildEvents([], 'w1', 30, 3, new SeededRandom('x'))).toEqual([])
  })

  it('gives a small settlement exactly one own market (size-scaled)', () => {
    const small = buildEvents([settlement('a', 'Hamlet')], 'w1', 30, 3, new SeededRandom('s'))
    expect(small.filter((e) => e.poiId === 'a' && e.type === 'market')).toHaveLength(1)
  })

  it('every event is a recurring annual POIEvent located at a settlement', () => {
    const events = buildEvents(
      [settlement('a', 'City'), settlement('b', 'Village'), settlement('c', 'Hamlet')],
      'w1', 30, 4, new SeededRandom('seed'),
    )
    expect(events.length).toBeGreaterThan(0)
    for (const e of events) {
      expect(e.recurring).toBe(true)
      expect(e.trigger.year).toBeNull()
      expect(e.trigger.watch).toBeNull()
      expect(e.trigger.day).toBeGreaterThanOrEqual(1)
      expect(e.trigger.day).toBeLessThanOrEqual(30)
      expect(e.durationWatches).toBe(4)
      expect(e.isActive).toBe(false)
      expect(['a', 'b', 'c']).toContain(e.poiId)
      expect(['festival', 'market', 'ceremony']).toContain(e.type)
    }
  })

  it('gives every season the floor of celebrations at distinct settlements', () => {
    const settlements = Array.from({ length: 8 }, (_, i) => settlement(`s${i}`, 'Village'))
    const events = buildEvents(settlements, 'w1', 30, 3, new SeededRandom('cover'))
    const n = 8
    const target = Math.min(n, Math.max(2, Math.min(4, Math.round(n / 4)))) // 2
    for (const season of SEASONS) {
      const distinct = new Set(events.filter((e) => e.trigger.season === season).map((e) => e.poiId))
      expect(distinct.size, `season ${season}`).toBeGreaterThanOrEqual(target)
    }
  })

  it('is deterministic for a seed', () => {
    const mk = () => buildEvents([settlement('a', 'City'), settlement('b', 'Hamlet')], 'w1', 30, 3, new SeededRandom('det'))
    expect(mk()).toEqual(mk())
  })
})
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `pnpm exec vitest run src/domain/services/worldgen/buildEvents.test.ts`
Expected: FAIL — cannot find module `./buildEvents`.

- [ ] **Step 3: Implement (single clean pass — no duplicated loop)**

```typescript
// buildEvents.ts
import type { SeededRandom } from '~/lib/dungeon/SeededRandom'
import type { POI } from '@domain/entities/POI'
import type { POIEvent } from '@domain/entities/POIEvent'
import { SEASONS, type Season } from '@shared/constants'
import { settlementSize } from '@domain/data/worldgen/settlementSize'
import { buildCivicFlavor, type CivicType } from '@domain/data/worldgen/eventFlavor'
import { newId } from '@shared/ulid'

const TYPES_BY_SIZE: Record<'small' | 'medium' | 'large', CivicType[]> = {
  small: ['market'],
  medium: ['market', 'festival'],
  large: ['market', 'festival', 'ceremony'],
}

export function buildEvents(
  settlements: POI[],
  worldId: string,
  daysPerSeason: number,
  watchesPerDay: number,
  rng: SeededRandom,
): POIEvent[] {
  if (settlements.length === 0) return []
  const now = Date.now()
  const events: POIEvent[] = []

  const make = (poi: POI, type: CivicType, season: Season): POIEvent => {
    const flavor = buildCivicFlavor(type, season, poi.name, rng)
    return {
      id: newId(),
      poiId: poi.id,
      worldId,
      name: flavor.name,
      description: flavor.description,
      type,
      trigger: { year: null, season, day: rng.between(1, daysPerSeason), watch: null },
      recurring: true,
      durationWatches: watchesPerDay,
      isActive: false,
      effects: '',
      tags: ['civic'],
      createdAt: now,
      updatedAt: now,
    }
  }

  // Step 1: per-settlement civic events, scaled by size.
  for (const poi of settlements) {
    for (const type of TYPES_BY_SIZE[settlementSize(poi.subtypeLabel)]) {
      events.push(make(poi, type, rng.pick(SEASONS as readonly Season[])))
    }
  }

  // Step 2: seasonal coverage — ensure each season has `target` distinct settlements.
  const n = settlements.length
  const target = Math.min(n, Math.max(2, Math.min(4, Math.round(n / 4))))
  for (const season of SEASONS) {
    const celebrating = new Set(events.filter((e) => e.trigger.season === season).map((e) => e.poiId))
    const candidates = settlements.filter((p) => !celebrating.has(p.id))
    let i = 0
    while (celebrating.size < target && i < candidates.length) {
      const poi = candidates[i++]
      events.push(make(poi, 'festival', season))
      celebrating.add(poi.id)
    }
  }

  return events
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `pnpm exec vitest run src/domain/services/worldgen/buildEvents.test.ts`
Expected: PASS (all 5).

- [ ] **Step 5: Commit**

```bash
git add src/domain/services/worldgen/buildEvents.ts src/domain/services/worldgen/buildEvents.test.ts
git commit -m "feat: buildEvents — recurring seasonal civic POIEvents" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Compose `buildEvents` into `generateWorld`

**Files:**
- Modify: `src/application/use-cases/GenerateWorld.ts` (pass `watchesPerDay` in the clock literal, ~line 88)
- Modify: `src/domain/services/worldgen/buildDoom.ts` (add optional `watchesPerDay` to `DoomClock`)
- Modify: `src/domain/services/worldgen/generateWorld.ts` (import + push civic events into the existing `poiEvents` array)
- Test: `src/application/use-cases/GenerateWorld.test.ts` (add a case)

**Interfaces:**
- Consumes: `buildEvents` (Task 3). `generateWorld` already returns `poiEvents` and `executeGenerateWorld` already persists `db.poiEvents.bulkPut(poiEvents)`.

Notes confirmed against the code:
- `generateWorld`'s `opts.clock` is optional and is a `DoomClock` (`buildDoom.ts`); it already carries `daysPerSeason`. We add an **optional** `watchesPerDay` so `opts.clock?.watchesPerDay` type-checks without breaking `buildDoom.test.ts` (which constructs a `DoomClock` literal without it).
- `const poiEvents: POIEvent[] = []` is already declared at `generateWorld.ts:536`, immediately before the doom `if` block (which pushes `...doom.poiEvents`). **Do not move it.** Insert the civic push between that declaration and the doom block; the `return` already includes `poiEvents`.
- `settlementNodes` (declared ~`:310`, shape `{ poi: POI; q: number; r: number }[]`) is in scope and populated regardless of `systemConfig`, so civic events generate even without NPCs.

- [ ] **Step 1: Add optional `watchesPerDay` to `DoomClock` and pass it from the use-case**

In `src/domain/services/worldgen/buildDoom.ts`, extend `DoomClock` (the new field is **optional**, so existing literals still compile):

```typescript
export interface DoomClock {
  year: number
  season: Season
  day: number
  watch: number
  daysPerSeason: number
  watchesPerDay?: number
}
```

In `src/application/use-cases/GenerateWorld.ts`, the `clock` object passed to `generateWorld` (~line 88) — add the `watchesPerDay` line:

```typescript
      clock: {
        year: realm.currentYear,
        season: realm.currentSeason,
        day: realm.currentDay,
        watch: realm.currentWatch,
        daysPerSeason: realm.daysPerSeason,
        watchesPerDay: realm.watchesPerDay,
      },
```

- [ ] **Step 2: Write the failing test (in GenerateWorld.test.ts)**

```typescript
  it('seeds recurring civic events covering every season', async () => {
    const { realmId } = await executeGenerateWorld(
      { name: 'Civic', systemId: 'system-cairn-2e', seed: 'civic-1', size: 'small' },
      deps(),
    )
    const events = await db.poiEvents.where('worldId').equals(realmId).toArray()
    const civic = events.filter((e) => e.tags.includes('civic'))
    expect(civic.length).toBeGreaterThan(0)
    expect(civic.every((e) => e.recurring && e.trigger.year === null)).toBe(true)
    const seasons = new Set(civic.map((e) => e.trigger.season))
    expect(seasons.size).toBe(4) // every season represented
  })
```

- [ ] **Step 3: Run test, verify it fails**

Run: `pnpm exec vitest run src/application/use-cases/GenerateWorld.test.ts -t "civic"`
Expected: FAIL — `civic.length` is 0 (no civic events generated yet).

- [ ] **Step 4: Wire `buildEvents` into `generateWorld`**

In `generateWorld.ts`, add the import near the other worldgen builder imports:

```typescript
import { buildEvents } from './buildEvents'
```

Then insert, immediately **after** `const poiEvents: POIEvent[] = []` (line ~536) and **before** the `if (opts.loomingThreat && …)` doom block:

```typescript
  // Seasonal civic calendar — recurring festivals/markets/ceremonies at
  // settlements, with every season covered at distinct locations.
  poiEvents.push(
    ...buildEvents(
      settlementNodes.map((node) => node.poi),
      realmId,
      opts.clock?.daysPerSeason ?? 30,
      opts.clock?.watchesPerDay ?? 3,
      rng,
    ),
  )
```

Leave the doom block pushing into the same `poiEvents`; leave the `return` unchanged.

- [ ] **Step 5: Run test + full worldgen suite + typecheck**

Run: `pnpm exec vitest run src/application/use-cases/GenerateWorld.test.ts src/domain/services/worldgen/ && pnpm exec tsc --noEmit`
Expected: PASS (new civic case + existing region-sweep + buildDoom tests), no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/domain/services/worldgen/generateWorld.ts src/application/use-cases/GenerateWorld.ts src/domain/services/worldgen/buildDoom.ts src/application/use-cases/GenerateWorld.test.ts
git commit -m "feat: generate a seasonal civic calendar during worldgen" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: `isEventActiveOn` date-window helper (1-based watches)

The current expiry branch is a no-op (it can't tell when an event activated). A pure window helper makes activation + expiry + annual re-arm computable from the date alone.

**Files:**
- Create: `src/domain/services/poiEventSchedule.ts`
- Test: `src/domain/services/poiEventSchedule.test.ts`

**Interfaces:**
- Consumes: `POIEvent` (`@domain/entities/POIEvent`), `SEASONS`/`Season` (`@shared/constants`).
- Produces: `isEventActiveOn(evt: POIEvent, dt: { year: number; season: Season; day: number; watch: number }, daysPerSeason: number, watchesPerDay: number): boolean`

Logic (1-based watches — the engine resets watch to 1 each day and watches run 1..wpd): convert to absolute watches using `(watch − 1)` as the in-day offset. A null trigger watch anchors to watch **1** (start of day). For `trigger.year=null`, anchor the trigger to `dt.year`. `start = abs(triggerYear, trigger.season, trigger.day, triggerWatch)`; `end = start + max(1, durationWatches)`; active iff `start <= abs(dt) < end`. With `trigger.watch=null` + `durationWatches=watchesPerDay`, the window is the whole trigger day (watches 1..wpd).

- [ ] **Step 1: Write the failing tests**

```typescript
// poiEventSchedule.test.ts
import { describe, it, expect } from 'vitest'
import type { POIEvent } from '@domain/entities/POIEvent'
import { isEventActiveOn } from './poiEventSchedule'

const evt = (over: Partial<POIEvent>): POIEvent =>
  ({ trigger: { year: null, season: 'summer', day: 10, watch: null }, durationWatches: 3, recurring: true, ...over } as POIEvent)

describe('isEventActiveOn', () => {
  it('is active across the whole trigger day for a full-day (watch:null) recurring event', () => {
    expect(isEventActiveOn(evt({}), { year: 1, season: 'summer', day: 10, watch: 1 }, 30, 3)).toBe(true)
    expect(isEventActiveOn(evt({}), { year: 1, season: 'summer', day: 10, watch: 3 }, 30, 3)).toBe(true)
  })
  it('is inactive the day before and after', () => {
    expect(isEventActiveOn(evt({}), { year: 1, season: 'summer', day: 9, watch: 3 }, 30, 3)).toBe(false)
    expect(isEventActiveOn(evt({}), { year: 1, season: 'summer', day: 11, watch: 1 }, 30, 3)).toBe(false)
  })
  it('re-arms the next year for a recurring (year:null) event', () => {
    expect(isEventActiveOn(evt({}), { year: 2, season: 'summer', day: 10, watch: 1 }, 30, 3)).toBe(true)
  })
  it('a one-time (year set) event is active only that year', () => {
    const one = evt({ trigger: { year: 1, season: 'summer', day: 10, watch: null }, recurring: false })
    expect(isEventActiveOn(one, { year: 1, season: 'summer', day: 10, watch: 1 }, 30, 3)).toBe(true)
    expect(isEventActiveOn(one, { year: 2, season: 'summer', day: 10, watch: 1 }, 30, 3)).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `pnpm exec vitest run src/domain/services/poiEventSchedule.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement**

```typescript
// poiEventSchedule.ts
import type { POIEvent } from '@domain/entities/POIEvent'
import { SEASONS, type Season } from '@shared/constants'

interface DT { year: number; season: Season; day: number; watch: number }

// Absolute watch index. Watches are 1-based (1..watchesPerDay), so the in-day
// offset is (watch - 1).
const absWatch = (year: number, season: Season, day: number, watch: number, daysPerSeason: number, watchesPerDay: number): number =>
  ((((year - 1) * 4 + SEASONS.indexOf(season)) * daysPerSeason + (day - 1)) * watchesPerDay) + (watch - 1)

export function isEventActiveOn(evt: POIEvent, dt: DT, daysPerSeason: number, watchesPerDay: number): boolean {
  const t = evt.trigger
  const triggerYear = t.year ?? dt.year // recurring: anchor to the current year
  const triggerWatch = t.watch ?? 1 // null = start of day (1-based)
  const start = absWatch(triggerYear, t.season, t.day, triggerWatch, daysPerSeason, watchesPerDay)
  const end = start + Math.max(1, evt.durationWatches)
  const nowAbs = absWatch(dt.year, dt.season, dt.day, dt.watch, daysPerSeason, watchesPerDay)
  return nowAbs >= start && nowAbs < end
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `pnpm exec vitest run src/domain/services/poiEventSchedule.test.ts`
Expected: PASS (all 4).

- [ ] **Step 5: Commit**

```bash
git add src/domain/services/poiEventSchedule.ts src/domain/services/poiEventSchedule.test.ts
git commit -m "feat: pure POIEvent active-window helper (1-based watches)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Activation + expiry in `executeAdvanceDay`

Replace the activate-only loop + no-op expiry stub (`AdvanceClock.ts` ~lines 165-205) with window-driven transitions using `isEventActiveOn`.

**Files:**
- Modify: `src/application/use-cases/AdvanceClock.ts` (the `// Check POI events` block, ~165-205; add import)
- Test: `src/application/use-cases/AdvanceClock.events.test.ts` (new)

**Interfaces:**
- Consumes: `isEventActiveOn` (Task 5); existing `AdvanceDayDeps.poiEventRepo`, `worldEventRepo`, `realmRepo`. `rollDice` comes from `@shared/dice` (signature `(notation: string) => DiceResult`), the same source the calendar uses.

- [ ] **Step 1: Write the failing test**

```typescript
// AdvanceClock.events.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@infrastructure/dexie/db'
import { createContainer } from '@infrastructure/container'
import { executeAdvanceDay } from './AdvanceClock'
import { newId } from '@shared/ulid'
import { rollDice } from '@shared/dice'
import type { Realm } from '@domain/entities/Realm'

const container = createContainer()
beforeEach(async () => {
  await db.open()
  await Promise.all(db.tables.filter((t) => t.name !== 'systemConfigs').map((t) => t.clear()))
})

const realm = (over: Partial<Realm> = {}): Realm => ({
  id: newId(), name: 'R', systemId: 'system-cairn-2e', description: '',
  currentYear: 1, currentSeason: 'summer', currentDay: 9, currentWatch: 1,
  daysPerSeason: 30, daysPerWeek: 7, watchesPerDay: 3, factionTurnTrigger: 'manual',
  completedThroughDay: 0, customRaces: [], raceColors: {}, starredMonsterIds: [],
  starredSpellIds: [], starredMagicItemIds: [], hiddenCompendiumIds: [],
  createdAt: 0, updatedAt: 0, ...over,
})

const deps = () => ({
  realmRepo: container.realmRepo, weatherRepo: container.weatherRepo,
  factionRepo: container.factionRepo, relationshipRepo: container.factionRelationshipRepo,
  npcRepo: container.npcRepo, worldEventRepo: container.worldEventRepo,
  eventBus: container.eventBus, rollDice,
  poiEventRepo: container.poiEventRepo,
})

const civicEvent = (worldId: string, isActive: boolean) => ({
  id: newId(), poiId: 'p1', worldId, name: 'Festival', description: 'd',
  type: 'festival' as const, trigger: { year: null, season: 'summer' as const, day: 10, watch: null },
  recurring: true, durationWatches: 3, isActive, effects: '', tags: ['civic'],
  createdAt: 0, updatedAt: 0,
})

describe('executeAdvanceDay POIEvent activation', () => {
  it('activates a recurring civic event on its day and logs a WorldEvent', async () => {
    const r = realm()
    await container.realmRepo.create(r)
    await container.poiEventRepo.create(civicEvent(r.id, false))
    await executeAdvanceDay(r.id, deps()) // day 9 -> 10

    const evts = await container.poiEventRepo.getByRealmId(r.id)
    expect(evts[0].isActive).toBe(true)
    const logged = await db.worldEvents.where('worldId').equals(r.id).toArray()
    expect(logged.some((e) => e.type === 'poi_event' && e.title === 'Festival')).toBe(true)
  })

  it('deactivates the event once its day has passed', async () => {
    const r = realm({ currentDay: 10 })
    await container.realmRepo.create(r)
    await container.poiEventRepo.create(civicEvent(r.id, true))
    await executeAdvanceDay(r.id, deps()) // day 10 -> 11

    const evts = await container.poiEventRepo.getByRealmId(r.id)
    expect(evts[0].isActive).toBe(false)
  })
})
```

- [ ] **Step 2: Run test, verify it fails**

Run: `pnpm exec vitest run src/application/use-cases/AdvanceClock.events.test.ts`
Expected: FAIL — the deactivation test fails (no expiry today); the activation test may already pass.

- [ ] **Step 3: Replace the `// Check POI events` block**

Add at the top of `AdvanceClock.ts`: `import { isEventActiveOn } from '@domain/services/poiEventSchedule'`.

Replace the block from `// Check POI events` through the end of the `// Deactivate expired events` loop with:

```typescript
  // Activate/deactivate scheduled POI events by date window. A recurring
  // (year:null) event re-fires each year; a one-time event fires once. Logging
  // happens only on the inactive -> active transition.
  const poiEventRepo = deps.poiEventRepo
  if (poiEventRepo) {
    const allEvents = await poiEventRepo.getByRealmId(worldId)
    for (const evt of allEvents) {
      const shouldBeActive = isEventActiveOn(evt, newDateTime, realm.daysPerSeason, realm.watchesPerDay)
      if (shouldBeActive && !evt.isActive) {
        await poiEventRepo.update({ ...evt, isActive: true })
        await deps.worldEventRepo.create({
          id: newId(),
          worldId,
          year: newDateTime.year,
          season: newDateTime.season,
          day: newDateTime.day,
          watch: newDateTime.watch,
          type: 'poi_event',
          title: evt.name,
          description: evt.effects || evt.description,
          relatedEntityIds: [evt.id, evt.poiId],
          createdAt: Date.now(),
        })
      } else if (!shouldBeActive && evt.isActive) {
        await poiEventRepo.update({ ...evt, isActive: false })
      }
    }
  }
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `pnpm exec vitest run src/application/use-cases/AdvanceClock.events.test.ts`
Expected: PASS (both cases). (There is no pre-existing `AdvanceClock.test.ts` in the repo; this new file is the only AdvanceClock test.)

- [ ] **Step 5: Commit**

```bash
git add src/application/use-cases/AdvanceClock.ts src/application/use-cases/AdvanceClock.events.test.ts
git commit -m "fix: activate + expire scheduled POI events on advance" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Wire `poiEventRepo` into the calendar's advance deps

Without this, Task 6's logic never runs from the UI (the documented bug).

**Files:**
- Modify: `src/routes/_app/realms/calendar.tsx:170-179`

**Interfaces:**
- Consumes: `container.poiEventRepo` (already used elsewhere in this file).

- [ ] **Step 1: Add the repo to `advanceDeps`**

```typescript
  const advanceDeps: AdvanceDayDeps = {
    realmRepo: container.realmRepo,
    weatherRepo: container.weatherRepo,
    factionRepo: container.factionRepo,
    relationshipRepo: container.factionRelationshipRepo,
    npcRepo: container.npcRepo,
    worldEventRepo: container.worldEventRepo,
    eventBus: container.eventBus,
    rollDice,
    poiEventRepo: container.poiEventRepo,
  }
```

- [ ] **Step 2: Typecheck + build**

Run: `pnpm exec tsc --noEmit && pnpm build`
Expected: no errors; build exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/routes/_app/realms/calendar.tsx
git commit -m "fix: wire poiEventRepo so the calendar activates scheduled events" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: Event type icons + colors on the calendar

**Files:**
- Create: `src/components/calendar/eventTypeMeta.tsx`
- Modify: `src/routes/_app/realms/calendar.tsx:605` (the `<Badge>{event.type}</Badge>` render)

**Interfaces:**
- Produces: `EVENT_TYPE_META: Record<POIEventType, { icon: LucideIcon; className: string; label: string }>` and an `<EventTypeBadge type={...} />` component.

- [ ] **Step 1: Implement the meta map + badge**

```tsx
// eventTypeMeta.tsx
import {
  PartyPopper, Coins, Sparkles, Flame, Swords, CloudRain,
  Footprints, Landmark, Ghost, Tag, type LucideIcon,
} from 'lucide-react'
import type { POIEventType } from '@shared/constants'
import { Badge } from '~/components/ui/badge'

export const EVENT_TYPE_META: Record<POIEventType, { icon: LucideIcon; className: string; label: string }> = {
  festival: { icon: PartyPopper, className: 'bg-amber-100 text-amber-800', label: 'Festival' },
  market: { icon: Coins, className: 'bg-green-100 text-green-800', label: 'Market' },
  ceremony: { icon: Sparkles, className: 'bg-violet-100 text-violet-800', label: 'Ceremony' },
  disaster: { icon: Flame, className: 'bg-red-100 text-red-800', label: 'Disaster' },
  siege: { icon: Swords, className: 'bg-red-100 text-red-800', label: 'Siege' },
  weather: { icon: CloudRain, className: 'bg-sky-100 text-sky-800', label: 'Weather' },
  migration: { icon: Footprints, className: 'bg-teal-100 text-teal-800', label: 'Migration' },
  political: { icon: Landmark, className: 'bg-indigo-100 text-indigo-800', label: 'Political' },
  supernatural: { icon: Ghost, className: 'bg-fuchsia-100 text-fuchsia-800', label: 'Supernatural' },
  custom: { icon: Tag, className: 'bg-muted text-muted-foreground', label: 'Event' },
}

export function EventTypeBadge({ type }: { type: POIEventType }) {
  const meta = EVENT_TYPE_META[type] ?? EVENT_TYPE_META.custom
  const Icon = meta.icon
  return (
    <Badge variant="outline" className={`text-xs gap-1 ${meta.className}`}>
      <Icon className="size-3" />
      {meta.label}
    </Badge>
  )
}
```

- [ ] **Step 2: Use it in the Scheduled Events list**

In `calendar.tsx`, add `import { EventTypeBadge } from '~/components/calendar/eventTypeMeta'` and replace `<Badge variant="outline" className="text-xs">{event.type}</Badge>` (line ~605) with `<EventTypeBadge type={event.type} />`.

- [ ] **Step 3: Typecheck + build**

Run: `pnpm exec tsc --noEmit && pnpm build`
Expected: no errors; build exit 0. (`POIEventType` is a closed union, so the `Record` is exhaustive — a missing key fails the build.)

- [ ] **Step 4: Manual verification**

Generate a fresh world, open Calendar → Scheduled Events. Expect civic events listed across seasons with festival/market/ceremony icons + colors. Advance to a festival's day; it shows `active` and a timeline entry appears.

- [ ] **Step 5: Commit**

```bash
git add src/components/calendar/eventTypeMeta.tsx src/routes/_app/realms/calendar.tsx
git commit -m "feat: event-type icons + colors on the calendar" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Final verification

- [ ] `pnpm test` — all green (new: settlementSize, eventFlavor, buildEvents, poiEventSchedule, AdvanceClock.events, GenerateWorld civic).
- [ ] `pnpm exec tsc --noEmit` — clean.
- [ ] `pnpm build` — exit 0.
- [ ] Manual: fresh world → calendar shows seasonal celebrations at varied settlements; advancing onto a date activates + logs; recurring event re-fires next year.

## Self-review notes

- **Spec coverage:** civic generation (T2,T3,T4), seasonal coverage rule (T3), size scaling (T1,T3), auto-activation + expiry/re-arm fix (T5,T6,T7), icons/colors (T8). All spec sections mapped.
- **Type consistency:** `buildEvents(settlements, worldId, daysPerSeason, watchesPerDay, rng)` consumed with that exact arity in T4; `isEventActiveOn(evt, dt, daysPerSeason, watchesPerDay)` consumed in T6; `EVENT_TYPE_META` keyed by the full `POIEventType` union.
- **Watch arithmetic:** 1-based throughout (engine resets watch to 1 each day; watches run 1..wpd). `isEventActiveOn` uses `(watch − 1)` and anchors null trigger watch to 1, so a full-day civic window covers watches 1..wpd and the doom (watch=1, duration≥1) still fires.
- **Known follow-ups (Slice B/C):** threats/political/natural events, faction links, the events-density knob, ongoing spawn, GM-confirm consequences.
