# Region View Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the region detail page for at-the-table use: a region problem (with reroll), a richer overview header, a linked "What's Here", and sortable data tables for Locations / NPCs / Factions.

**Architecture:** Additive schema (`Region.problem`, `TreasureItem.guardianNpcId`). A reusable lightweight `DataTable` (built on `ui/table.tsx`, no new dep) powers the three list tabs. Pure helpers (`summarizeRegionContents`, `regionDangerTier`, `REGION_PROBLEMS`) stay testable; the route wires them in.

**Tech Stack:** TypeScript (strict), React 19, TanStack Router/Start, Dexie, Vitest, Tailwind + Radix, `SeededRandom`.

## Global Constraints

- **pnpm only.** Focused test: `pnpm test <path>`. Build gate: `pnpm build` (= `vite build && tsc --noEmit`). **Run `pnpm build` BEFORE every commit** — vitest does not typecheck.
- **Branch:** `feature/region-view-overhaul` (checked out). Never commit to `main`.
- **TDD** for pure logic (helpers, use-cases). UI/route tasks are gated by `pnpm build` (no component-render harness in this repo) — they still get a failing→passing cycle where a pure helper backs them.
- **No Dexie migration needed:** both new fields are additive/optional; reads guard with `?? ''` / `?? null`. Do NOT add `@tanstack/react-table`.
- Aliases: `@domain/*`, `@application/*`, `@infrastructure/*`, `@shared/*`, `~/* → src/*`.
- `Link` from `@tanstack/react-router`. Routes: POI `/realms/pois/$poiId` `{poiId}`, NPC `/realms/npcs/$npcId` `{npcId}`, Faction `/realms/factions/$factionId` `{factionId}`.

---

## File Structure

- `src/domain/entities/Region.ts` — add `problem`.
- `src/domain/value-objects/TreasureItem.ts` — add `guardianNpcId`.
- `src/application/use-cases/CreateRegion.ts` — default `problem`.
- `src/domain/services/worldgen/regionFlavor.ts` — `REGION_PROBLEMS`, `buildRegionFlavor` returns `problem`, `regionDangerTier`.
- `src/domain/services/worldgen/generateWorld.ts` — set `problem` on generated regions.
- `src/application/use-cases/RerollRegionProblem.ts` (new) — reroll use-case.
- `src/components/shared/DataTable.tsx` (new) — `sortRows` + `DataTable`.
- `src/components/regions/regionContents.ts` — redesigned summary (ids, 3 groups, magicItemRefs, guardian).
- `src/components/regions/RegionContentsPanel.tsx` — three linked lists + notable toggle.
- `src/routes/_app/realms/regions_.$regionId.tsx` — overview header (problem+reroll+chips+tier), Locations/NPCs/Factions tables.
- `src/components/shared/TreasureSection.tsx` — guardian-NPC picker.

---

### Task 1: Additive schema fields

**Files:**
- Modify: `src/domain/entities/Region.ts`, `src/domain/value-objects/TreasureItem.ts`, `src/application/use-cases/CreateRegion.ts`
- Test: `src/application/use-cases/CreateRegion.test.ts` (create if absent)

**Interfaces:**
- Produces: `Region.problem: string`; `TreasureItem.guardianNpcId?: string | null`. `executeCreateRegion` defaults `problem: ''`.

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect } from 'vitest'
import { db } from '@infrastructure/dexie/db'
import { createContainer } from '@infrastructure/container'
import { executeCreateRegion } from './CreateRegion'

describe('executeCreateRegion', () => {
  it('defaults problem to empty string', async () => {
    await db.open()
    const c = createContainer()
    const r = await executeCreateRegion({ worldId: 'w', name: 'R' }, { regionRepo: c.regionRepo })
    expect(r.problem).toBe('')
  })
})
```

- [ ] **Step 2: Run → fails** (`pnpm test src/application/use-cases/CreateRegion.test.ts`) — `problem` missing on type/object.

- [ ] **Step 3: Implement**
  - `Region.ts`: add after `people: string[]`:
    ```ts
      problem: string
    ```
  - `TreasureItem.ts`: add after `notable?: boolean`:
    ```ts
      guardianNpcId?: string | null   // NPC guarding this item, if any
    ```
  - `CreateRegion.ts`: in the `region` object literal add `problem: '',` (e.g. after `people: [],`).

- [ ] **Step 4: Run → passes** + `pnpm build`. Build will surface other Region/TreasureItem construction sites that now need `problem` — fix each obvious one (e.g. world-gen region literal gets its value in Task 2; if build fails before Task 2, temporarily add `problem: '',` there and Task 2 replaces it with the generated value). Treasure construction sites need no change (`guardianNpcId` optional).

- [ ] **Step 5: Commit** — `feat: add Region.problem + TreasureItem.guardianNpcId`

---

### Task 2: Region problems table + flavor + world-gen wiring

**Files:**
- Modify: `src/domain/services/worldgen/regionFlavor.ts`, `src/domain/services/worldgen/generateWorld.ts`
- Test: `src/domain/services/worldgen/regionFlavor.problem.test.ts`

**Interfaces:**
- Consumes: `Region.problem` (Task 1).
- Produces: `REGION_PROBLEMS: string[]`; `RegionFlavor` gains `problem: string`; `buildRegionFlavor` sets it via `rng.pick(REGION_PROBLEMS)`.

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect } from 'vitest'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { buildRegionFlavor, REGION_PROBLEMS } from './regionFlavor'

describe('region problem', () => {
  it('buildRegionFlavor returns a problem from the table, deterministic per seed', () => {
    const a = buildRegionFlavor('forest', new SeededRandom('s'))
    const b = buildRegionFlavor('forest', new SeededRandom('s'))
    expect(a.problem).toBe(b.problem)
    expect(REGION_PROBLEMS).toContain(a.problem)
    expect(REGION_PROBLEMS.length).toBeGreaterThanOrEqual(20)
  })
})
```

- [ ] **Step 2: Run → fails** — `REGION_PROBLEMS`/`problem` not exported.

- [ ] **Step 3: Implement** in `regionFlavor.ts`:
  - Add the table (near the top, exported):
    ```ts
    export const REGION_PROBLEMS = [
      'A blight creeps out of the wilds, fouling wells and crops',
      'Two settlements feud over the only reliable water source',
      'Children have gone missing on the road after dark',
      'A monster has driven hunters from the best game lands',
      'A failing mine or harvest threatens the coming winter',
      'A cult has taken root and recruits the desperate',
      'Bandits have closed the main trade road',
      'A disputed succession splits the local powers',
      'An old pact with something in the dark is coming due',
      'Strange weather is ruining the season and frightening folk',
      'A plague spreads faster than the healers can manage',
      'A relic was stolen and rival parties race to recover it',
      'Refugees arrive faster than the region can feed them',
      'A bridge or pass collapsed, cutting off a community',
      'The dead will not rest in one corner of the region',
      'A tax or tithe has turned the common folk to unrest',
      'A predator beast has learned to hunt people',
      'A border dispute is sliding toward open conflict',
      'A spring or shrine has gone foul and the faithful are afraid',
      'Someone powerful has vanished, and their holdings are up for grabs',
      'A creeping curse marks those who linger too long',
      'Smugglers move something dangerous through the region',
      'A drought (or flood) is reshaping who holds power',
      'An outsider arrived with coin and unsettling questions',
      'Wild magic or a planar leak warps a stretch of land',
      'A long-buried grievance has erupted into vendetta',
      'The local lord demands an impossible levy',
      'A famine-driven raid threatens the harvest stores',
      'A sickness afflicts the livestock the region depends on',
      'A prophecy has the population either fleeing or fortifying',
    ]
    ```
  - Add `problem: string` to the `RegionFlavor` interface.
  - In `buildRegionFlavor`, add `const problem = rng.pick(REGION_PROBLEMS)` and include `problem` in the returned object.
  - In `generateWorld.ts` region literal, replace the temporary/absent field with `problem: flavor.problem,`.

- [ ] **Step 4: Run → passes** + `pnpm test` (full, ensures world-gen tests still pass) + `pnpm build`.

- [ ] **Step 5: Commit** — `feat: generate a per-region problem at world-gen`

---

### Task 3: Reroll region problem use-case

**Files:**
- Create: `src/application/use-cases/RerollRegionProblem.ts`
- Test: `src/application/use-cases/RerollRegionProblem.test.ts`

**Interfaces:**
- Consumes: `REGION_PROBLEMS` (Task 2), `IRegionRepository`.
- Produces: `executeRerollRegionProblem(regionId: string, deps: { regionRepo: IRegionRepository }): Promise<string>` — picks a new problem (different from current when possible), persists via `regionRepo.update`, returns it.

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect } from 'vitest'
import { db } from '@infrastructure/dexie/db'
import { createContainer } from '@infrastructure/container'
import { executeRerollRegionProblem } from './RerollRegionProblem'
import { REGION_PROBLEMS } from '@domain/services/worldgen/regionFlavor'

describe('executeRerollRegionProblem', () => {
  it('sets a new problem from the table and persists it', async () => {
    await db.open(); await db.regions.clear()
    const c = createContainer()
    await db.regions.put({ id: 'r1', worldId: 'w', name: 'R', description: '', terrain: 'forest', features: [], dangers: [], settlements: [], resources: [], people: [], problem: 'old', boundary: null, color: null, imageUrl: null, createdAt: 0, updatedAt: 0 } as any)
    const next = await executeRerollRegionProblem('r1', { regionRepo: c.regionRepo })
    expect(REGION_PROBLEMS).toContain(next)
    const fromDb = await db.regions.get('r1')
    expect(fromDb?.problem).toBe(next)
  })
})
```

- [ ] **Step 2: Run → fails** — module missing.

- [ ] **Step 3: Implement**

```ts
import type { IRegionRepository } from '@application/ports/IRegionRepository'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { newId } from '@shared/ulid'
import { REGION_PROBLEMS } from '@domain/services/worldgen/regionFlavor'

export async function executeRerollRegionProblem(
  regionId: string,
  deps: { regionRepo: IRegionRepository },
): Promise<string> {
  const region = await deps.regionRepo.getById(regionId)
  if (!region) throw new Error('Region not found')
  // Fresh seed each call → variety over reproducibility (GM convenience).
  const rng = new SeededRandom(newId())
  let problem = rng.pick(REGION_PROBLEMS)
  if (problem === region.problem && REGION_PROBLEMS.length > 1) {
    problem = rng.pick(REGION_PROBLEMS.filter((p) => p !== region.problem))
  }
  await deps.regionRepo.update({ ...region, problem, updatedAt: Date.now() })
  return problem
}
```

- [ ] **Step 4: Run → passes** + `pnpm build`.

- [ ] **Step 5: Commit** — `feat: executeRerollRegionProblem use-case`

---

### Task 4: `regionDangerTier` helper

**Files:**
- Modify: `src/components/regions/regionContents.ts` (add export)
- Test: `src/components/regions/regionDangerTier.test.ts`

**Interfaces:**
- Consumes: `getCompendiumById`, `monsterThreat`, `tierForTerrain`.
- Produces: `regionDangerTier(pois: POI[], terrain: string): Tier` — `'easy'|'tough'|'perilous'` from max region monster threat; `tierForTerrain(terrain)` when no monsters.

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect } from 'vitest'
import { regionDangerTier } from './regionContents'
import { buildPOI } from '@domain/services/worldgen/buildPoi'
import { getMonstersBySystemId, getCompendiumById } from '@domain/data/compendium'
import { monsterThreat } from '~/lib/worldgen/compendium-utils'

describe('regionDangerTier', () => {
  it('falls back to terrain tier with no monsters', () => {
    expect(regionDangerTier([], 'mountains')).toBe('perilous')
    expect(regionDangerTier([], 'plains')).toBe('easy')
  })
  it('uses max monster threat when monsters present', () => {
    // pick a high-threat monster so the tier rises above the (forest=tough) terrain floor
    const mons = getMonstersBySystemId('system-cairn-2e').filter((m) => monsterThreat(m) >= 5)
    if (mons.length === 0) return // compendium-dependent; skip if none
    const p = buildPOI({ regionId: 'r', name: 'Lair', type: 'dungeon' })
    p.monsterRefs = [{ id: mons[0].id, quantity: 1 }]
    expect(regionDangerTier([p], 'plains')).toBe('perilous')
  })
})
```

- [ ] **Step 2: Run → fails** — `regionDangerTier` not exported.

- [ ] **Step 3: Implement** — add to `regionContents.ts` (imports: `tierForTerrain, type Tier` from `@domain/services/worldgen/regionFlavor`; `monsterThreat` from `~/lib/worldgen/compendium-utils`; `getCompendiumById` already imported; `CompendiumMonster` type from `@domain/entities/Compendium`):

```ts
export function regionDangerTier(pois: POI[], terrain: string): Tier {
  let max = 0
  for (const p of pois) {
    for (const ref of p.monsterRefs ?? []) {
      const e = getCompendiumById(ref.id)
      if (e?.kind === 'monster') max = Math.max(max, monsterThreat(e as CompendiumMonster))
    }
  }
  if (max === 0) return tierForTerrain(terrain)
  return max >= 5 ? 'perilous' : max >= 3 ? 'tough' : 'easy'
}
```

- [ ] **Step 4: Run → passes** + `pnpm build`.

- [ ] **Step 5: Commit** — `feat: regionDangerTier helper`

---

### Task 5: Redesign `summarizeRegionContents`

**Files:**
- Modify: `src/components/regions/regionContents.ts`
- Test: `src/components/regions/regionContents.test.ts` (replace/extend existing)

**Interfaces:**
- Consumes: `POI`, `NPC`, `getCompendiumById`, `monsterThreat`.
- Produces:
```ts
export interface RegionTreasure { name: string; value: string; notable: boolean; collected: boolean; poiId: string | null; npcId: string | null; guardianNpcId: string | null }
export interface RegionMagicItem { name: string; collected: boolean; poiId: string | null; npcId: string | null }
export interface RegionMonsterRow { name: string; count: number; poiId: string | null; threat: number; big: boolean }
export interface RegionContents {
  treasures: RegionTreasure[]
  magic: RegionMagicItem[]
  monsters: RegionMonsterRow[]
  treasureCount: number
  magicCount: number
  monsterCount: number
}
export function summarizeRegionContents(pois: POI[], npcs: NPC[]): RegionContents
```

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect } from 'vitest'
import { summarizeRegionContents } from './regionContents'
import { buildPOI } from '@domain/services/worldgen/buildPoi'

describe('summarizeRegionContents', () => {
  it('splits treasures vs magic, retains ids, no double-count', () => {
    const poi = buildPOI({ regionId: 'r', name: 'Vault', type: 'dungeon' })
    poi.treasure = [
      { id: 't1', name: 'Gold Crown', description: '', value: '500 gp', quantity: 1, collected: false, notable: true, guardianNpcId: 'npc-9' },
      { id: 't2', name: 'Sun Blade', description: '', value: 'priceless', quantity: 1, collected: false, isMagic: true },
    ]
    const c = summarizeRegionContents([poi], [])
    expect(c.treasures.map((t) => t.name)).toEqual(['Gold Crown'])
    expect(c.treasures[0].poiId).toBe(poi.id)
    expect(c.treasures[0].guardianNpcId).toBe('npc-9')
    expect(c.magic.map((m) => m.name)).toEqual(['Sun Blade'])
    expect(c.treasureCount).toBe(1)        // non-magic only — no double-count
    expect(c.magicCount).toBe(1)
  })
})
```

- [ ] **Step 2: Run → fails** — shape changed.

- [ ] **Step 3: Implement** — rewrite the summary body. Treasures = POI `treasure` where `!isMagic` (`poiId: p.id`, `guardianNpcId: t.guardianNpcId ?? null`) + NPC inventory items with `source === 'treasure'` and `compendiumKind !== 'magicItem'` (`npcId: n.id`, `value: it.value ?? ''`, `notable: !!it.notable`). Magic = POI `treasure` where `isMagic` + each `poi.magicItemRefs` resolved via `getCompendiumById(ref.id)?.name` + NPC inventory where `compendiumKind === 'magicItem'`. Monsters = one row per (poi, ref): name via `getCompendiumById`, `count: ref.quantity ?? 1`, `threat` via `monsterThreat` (when `kind==='monster'`), `big: threat >= 4`. Counts: `treasureCount = treasures.length`, `magicCount = magic.length`, `monsterCount = Σ count`. Keep `regionDangerTier` (Task 4) in this file.

- [ ] **Step 4: Run → passes** + `pnpm build` (RegionContentsPanel will break against the new shape — Task 7 fixes it; if build must stay green between tasks, Task 7 follows immediately).

- [ ] **Step 5: Commit** — `feat: region contents summary retains ids + honest counts`

---

### Task 6: Shared `DataTable` (+ pure `sortRows`)

**Files:**
- Create: `src/components/shared/DataTable.tsx`
- Test: `src/components/shared/DataTable.test.ts`

**Interfaces:**
- Produces: `DataTableColumn<T>`, `sortRows<T>(rows, col, dir)`, `DataTable<T>` component.

- [ ] **Step 1: Failing test** (pure sort core only — no render harness)

```ts
import { describe, it, expect } from 'vitest'
import { sortRows, type DataTableColumn } from './DataTable'

type Row = { name: string; n: number }
const rows: Row[] = [{ name: 'b', n: 2 }, { name: 'a', n: 3 }, { name: 'c', n: 1 }]
const col: DataTableColumn<Row> = { key: 'n', header: 'N', render: (r) => r.n, sortValue: (r) => r.n }

describe('sortRows', () => {
  it('sorts asc/desc by sortValue', () => {
    expect(sortRows(rows, col, 'asc').map((r) => r.n)).toEqual([1, 2, 3])
    expect(sortRows(rows, col, 'desc').map((r) => r.n)).toEqual([3, 2, 1])
  })
  it('returns input order when column has no sortValue', () => {
    const noSort: DataTableColumn<Row> = { key: 'name', header: 'Name', render: (r) => r.name }
    expect(sortRows(rows, noSort, 'asc')).toEqual(rows)
  })
})
```

- [ ] **Step 2: Run → fails** — module missing.

- [ ] **Step 3: Implement** (`.tsx`, exports both):

```tsx
import * as React from 'react'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '~/components/ui/table'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

export interface DataTableColumn<T> {
  key: string
  header: string
  sortable?: boolean
  render: (row: T) => React.ReactNode
  sortValue?: (row: T) => string | number
  className?: string
}

export function sortRows<T>(rows: T[], col: DataTableColumn<T>, dir: 'asc' | 'desc'): T[] {
  if (!col.sortValue) return rows
  const sv = col.sortValue
  const arr = [...rows].sort((a, b) => {
    const av = sv(a), bv = sv(b)
    return av < bv ? -1 : av > bv ? 1 : 0
  })
  return dir === 'desc' ? arr.reverse() : arr
}

export function DataTable<T>({ columns, rows, rowKey, empty }: {
  columns: DataTableColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string
  empty?: React.ReactNode
}) {
  const [sort, setSort] = React.useState<{ key: string; dir: 'asc' | 'desc' } | null>(null)
  const sorted = React.useMemo(() => {
    if (!sort) return rows
    const col = columns.find((c) => c.key === sort.key)
    return col ? sortRows(rows, col, sort.dir) : rows
  }, [rows, sort, columns])

  if (rows.length === 0) {
    return <>{empty ?? <p className="text-sm text-muted-foreground">Nothing here.</p>}</>
  }
  const toggle = (key: string) =>
    setSort((s) => (s?.key === key ? (s.dir === 'asc' ? { key, dir: 'desc' } : null) : { key, dir: 'asc' }))

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((c) => (
            <TableHead key={c.key} className={c.className}>
              {c.sortable ? (
                <button type="button" onClick={() => toggle(c.key)} className="inline-flex items-center gap-1 hover:text-foreground">
                  {c.header}
                  {sort?.key === c.key ? (sort.dir === 'asc' ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />) : <ChevronsUpDown className="size-3 opacity-40" />}
                </button>
              ) : c.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((row) => (
          <TableRow key={rowKey(row)}>
            {columns.map((c) => (
              <TableCell key={c.key} className={c.className}>{c.render(row)}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

- [ ] **Step 4: Run → passes** + `pnpm build`.

- [ ] **Step 5: Commit** — `feat: shared sortable DataTable`

---

### Task 7: RegionContentsPanel — three linked lists

**Files:**
- Modify: `src/components/regions/RegionContentsPanel.tsx`

**Interfaces:**
- Consumes: `summarizeRegionContents` (Task 5), `Link`.

- [ ] **Step 1:** Rewrite the panel. New props: `{ pois: POI[]; npcs: NPC[] }` (unchanged signature). Build `const c = summarizeRegionContents(pois, npcs)`. Local `const [showMundane, setShowMundane] = useState(false)`. Render three sections, each with a header + count:
  - **Treasures** — rows filtered to `notable` unless `showMundane`; each: name, `value`, a "notable" badge, struck-through + "looted" when `collected`, a POI `Link` (`poiId`) labeled by the POI's name (build a `poiId→name` map from `pois`), and a guardian NPC `Link` when `guardianNpcId || npcId` (label from an `npcId→name` map built from `npcs`).
  - **Magic items** — each: name, POI/NPC `Link`, collected state.
  - **Monsters** — each: `name ×count`, POI `Link`, a "tier"/"big" badge when `big`.
  - A "Show mundane" toggle (Button/Switch) near the Treasures header.
  - Return `null` only when all three groups are empty.
  Use existing `Badge`, `Link`, lucide icons (`Coins`, `Sparkles`, `Skull`). Resolve names via maps (no extra queries).

- [ ] **Step 2:** `pnpm build` clean (this re-aligns the panel with Task 5's shape) + `pnpm test` green.

- [ ] **Step 3: Commit** — `feat: linked What's-Here panel (treasures/magic/monsters)`

---

### Task 8: Overview header — problem, reroll, region fields, danger tier

**Files:**
- Modify: `src/routes/_app/realms/regions_.$regionId.tsx`

**Interfaces:**
- Consumes: `executeRerollRegionProblem` (Task 3), `regionDangerTier` (Task 4).

- [ ] **Step 1:** In `<TabsContent value="overview">`, ABOVE the description, add:
  - A **Problem** callout: a bordered box showing `region.problem || 'No problem set.'` with a **Reroll** button (`RotateCcw`/`Dices` icon) calling a new handler:
    ```ts
    const handleRerollProblem = async () => {
      if (!region) return
      await executeRerollRegionProblem(region.id, { regionRepo: container.regionRepo })
    }
    ```
  - A **danger-tier** Badge: `regionDangerTier(pois, region.terrain)` (color by tier).
  - Chip groups (mirror the existing People block) for `region.dangers`, `region.features`, `region.resources`, `region.settlements` — each rendered only when non-empty, guarded with `?? []`.
  Keep the existing description + People + `<RegionContentsPanel>` below.

- [ ] **Step 2:** `pnpm build` clean + `pnpm test` green. Manual: overview shows problem + reroll changes it; chips + tier render.

- [ ] **Step 3: Commit** — `feat: region overview header (problem/reroll/fields/tier)`

---

### Task 9: Locations tab → DataTable

**Files:**
- Modify: `src/routes/_app/realms/regions_.$regionId.tsx`

**Interfaces:**
- Consumes: `DataTable` (Task 6), `regionDangerTier` (Task 4) per-POI threat, `getCompendiumById`/`monsterThreat`.

- [ ] **Step 1:** Add a `useLiveQuery` loading `FactionPresence` for the region's POIs and a `poiId → faction name` map:
  ```ts
  const presenceByPoi = useLiveQuery(async () => {
    if (poiIds.length === 0) return {} as Record<string, string>
    const pres = await db.factionPresences.where('poiId').anyOf(poiIds).toArray()
    const facs = await db.factions.where('id').anyOf([...new Set(pres.map(p => p.factionId))]).toArray()
    const name = new Map(facs.map(f => [f.id, f.name]))
    const out: Record<string, string> = {}
    for (const p of pres) if (!out[p.poiId]) out[p.poiId] = name.get(p.factionId) ?? ''
    return out
  }, [poiIds.join(',')]) ?? {}
  ```
  Replace the `<TabsContent value="locations">` card grid with a `<DataTable rows={topLevelPOIs} rowKey={p => p.id}>` (keep the "Add" button header). Columns (all sortable except Name's link is still sortable by name):
  - **Name** — `Link` to POI; `sortValue: p.name`.
  - **Type** — `p.type` badge; sortable.
  - **Danger** — compute per-POI max `monsterThreat` over `p.monsterRefs` → label (none/easy/tough/perilous); `sortValue` = that max number.
  - **Treasure** — count of `p.treasure.filter(t => t.notable && !t.collected)`; show a Coins icon + count; `sortValue` = count.
  - **Encounter** — `p.encounterChance != null || (p.wanderingMonsters?.length ?? 0) > 0` → a check/badge; `sortValue` = boolean→number.
  - **Faction** — `presenceByPoi[p.id]` (link optional); `sortValue` = that string.
  - **Visited** — `p.visited` check; `sortValue` boolean→number.
  Keep the empty-state when `topLevelPOIs.length === 0`.

- [ ] **Step 2:** `pnpm build` clean + `pnpm test` green.

- [ ] **Step 3: Commit** — `feat: Locations tab as sortable data table`

---

### Task 10: NPCs tab → DataTable

**Files:**
- Modify: `src/routes/_app/realms/regions_.$regionId.tsx`

**Interfaces:**
- Consumes: `DataTable`. Uses `pois` (poiId→name), `factions` (id→name + leader flag).

- [ ] **Step 1:** Replace `<TabsContent value="npcs">` list with a `DataTable rows={npcs}` (keep the Generate button). Build `poiName = new Map(pois.map(p=>[p.id,p.name]))` and `factionById = new Map(factions.map(f=>[f.id,f]))`. Columns:
  - **Name** — `Link` to NPC; dead/undead Badge appended when `npc.lifeStatus !== 'alive'`; `sortValue: npc.name`.
  - **Location** — `npc.poiId` → POI `Link` (label `poiName`), else '—'; sortable by name.
  - **Faction** — first `npc.factionIds[0]` → faction `Link`; append "leader" badge when that faction's `leaderNpcId === npc.id`; `sortValue` = faction name.
  - **Disposition** — `npc.disposition ?? '—'`, color-coded badge; sortable.
  - **Movement** — `npc.movementStatus`; sortable.
  - **Want** — `npc.want || npc.motivation`, truncated; not sortable.

- [ ] **Step 2:** `pnpm build` clean + `pnpm test` green.

- [ ] **Step 3: Commit** — `feat: NPCs tab as sortable data table`

---

### Task 11: Factions tab → DataTable (stance to party)

**Files:**
- Modify: `src/routes/_app/realms/regions_.$regionId.tsx`

**Interfaces:**
- Consumes: `DataTable`, `useRelationshipPair` is per-pair (not batch); use a batch query instead. Uses `pois`/`npcs` for HQ/leader names.

- [ ] **Step 1:** Load the party faction + relationships for the region factions and build a stance resolver:
  ```ts
  const partyFaction = useLiveQuery(async () =>
    region?.worldId ? (await db.factions.where('worldId').equals(region.worldId).toArray()).find(f => f.isParty) ?? null : null,
    [region?.worldId])
  const stanceByFaction = useLiveQuery(async () => {
    if (!partyFaction || factions.length === 0) return {} as Record<string, number>
    const rels = await db.factionRelationships.where('factionId').anyOf(factions.map(f => f.id)).toArray()
    const out: Record<string, number> = {}
    for (const r of rels) if (r.targetId === partyFaction.id) out[r.factionId] = r.score
    return out
  }, [partyFaction?.id, factions.map(f=>f.id).join(',')]) ?? {}
  ```
  Build `poiName`/`npcName` maps. Replace `<TabsContent value="factions">` list with a `DataTable rows={factions}` (keep the Add dropdown). Columns:
  - **Name** — `Link`; mark the party faction with a "Party" badge.
  - **Stance** — `stanceByFaction[f.id] ?? 0` → label ally (≥2) / friendly (1) / neutral (0) / wary (−1) / hostile (≤−2), color-coded; `sortValue` = the score.
  - **HQ** — `f.headquartersPoiId` → POI `Link` (`poiName`), else '—'.
  - **Leader** — `f.leaderNpcId` → NPC `Link` (`npcName`), else '—'.
  - **Agenda** — top of `f.agendaGoals` preferring `timeframe === 'immediate'`, show its `description`; if it has `segments`, append `progress/segments`; not sortable.
  - **Status** — small badge (existing color logic); sortable.

- [ ] **Step 2:** `pnpm build` clean + `pnpm test` green.

- [ ] **Step 3: Commit** — `feat: Factions tab as sortable data table with party stance`

---

### Task 12: Guardian-NPC picker in TreasureSection

**Files:**
- Modify: `src/components/shared/TreasureSection.tsx`, and its call sites in `src/routes/_app/realms/pois_.$poiId.tsx`

**Interfaces:**
- Consumes: `TreasureItem.guardianNpcId` (Task 1).
- Produces: `TreasureSection` accepts an optional `npcs?: NPC[]` prop and lets the GM set/clear `guardianNpcId` per item.

- [ ] **Step 1:** Add `npcs?: NPC[]` to `TreasureSectionProps`. In the per-item render row, when `npcs` provided, add a small `Select` (placeholder "No guardian") listing `npcs` by name; selecting sets `guardianNpcId` on that item via `onUpdate` (map over treasure, replace the item); a "clear" option sets it to `null`. When a guardian is set, show the NPC name with a link. Thread the region's NPCs from `pois_.$poiId.tsx` into both `<TreasureSection>` usages (load via the page's existing NPC data, or `useNPCsByRegion(poi.regionId)`); if no NPC list is readily available there, pass `npcs={[]}` (picker simply hidden) and note it — but prefer wiring real NPCs.

- [ ] **Step 2:** `pnpm build` clean + `pnpm test` green. Manual: on a POI, a treasure item can be assigned a guardian NPC; it then appears in the region "What's Here" treasure row as a guardian link (Task 7).

- [ ] **Step 3: Commit** — `feat: assign a guardian NPC to POI treasure`

---

### Task 13: Full verification

- [ ] **Step 1:** `pnpm test` → all pass.
- [ ] **Step 2:** `pnpm build` → clean.
- [ ] **Step 3:** Manual smoke on a generated realm's region: overview shows problem (+reroll works), danger tier, region chips; "What's Here" lists treasures (with location + guardian links), magic items, monsters; Locations/NPCs/Factions are sortable tables; a POI treasure can be given a guardian.
- [ ] **Step 4:** `git commit -m "test: region view overhaul green" --allow-empty`

---

## Self-Review

**Spec coverage:** DataTable → T6. Locations/NPCs/Factions tables → T9/T10/T11. Contents redesign (ids, 3 groups, magicItemRefs, guardian, notable toggle, honest counts) → T5/T7. Overview cheap wins (region fields + danger tier) → T4/T8. Region problem + reroll → T1/T2/T3/T8. `guardianNpcId` schema + picker → T1/T12. ✓

**Placeholder scan:** none — table content (REGION_PROBLEMS) and all column defs are concrete.

**Type consistency:** `Region.problem`/`TreasureItem.guardianNpcId` (T1) used by T2/T3/T5/T12. `RegionContents` shape (T5) consumed by T7. `DataTableColumn`/`sortRows`/`DataTable` (T6) used by T9/T10/T11. `regionDangerTier` (T4) used by T8/T9. `executeRerollRegionProblem` (T3) used by T8. `REGION_PROBLEMS` (T2) used by T3.

**Ordering note:** T5 changes `RegionContents`'s shape and T7 realigns the panel — keep them adjacent so `pnpm build` returns to green by T7. Same for T1→T2 (the world-gen region literal needs `problem`).

**Known follow-ups:** generator does not auto-set `guardianNpcId` (manual only); rumors-in-region surface deferred; faction "power" / travel-times not included.
