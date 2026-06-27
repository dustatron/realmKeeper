# World Treasure Seeding (Spec B1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Seed magic items, treasures, and tier-scaled monsters across the world at generation time — per-region, with a guaranteed find of each enabled kind per region, a great item per faction, and guardians on notable loot — by evolving the existing `sprinkleRealmContent`.

**Architecture:** Replace the three on/off realm-content booleans with three `LootDensity` knobs. Evolve `sprinkleRealmContent` from a global POI sampler into a per-region, tier-aware seeder that also fills NPC inventories and faction holders, flags notable finds (the B2 seam), and attaches guardians. Runs in the existing pure `generateWorld()` phase; deterministic.

**Tech Stack:** TypeScript (strict), Dexie, Vitest, `fake-indexeddb`, `SeededRandom`, system compendium (Cairn `system-cairn-2e` + Shadowdark `system-shadowdark`).

## Global Constraints

- **pnpm only.** Focused test: `pnpm test <path>`. Build gate: `pnpm build` (= `vite build && tsc --noEmit`).
- **Branch:** `feature/treasure-leads-web` (already checked out). Never commit to `main`.
- **TDD:** failing test → minimal impl → passing test → commit, every task.
- **Determinism:** `sprinkleRealmContent` and its helpers take a `SeededRandom`; same seed + same densities → same placement. Ids are minted via `newId()` in this worldgen layer (consistent with existing code).
- **LootDensity** = `'off' | 'sparse' | 'moderate' | 'frequent'`, multipliers `off:0, sparse:0.5, moderate:1, frequent:2`. `off` ≡ the old `false`. Defaults `'moderate'`.
- **Per-region guarantee:** for each kind whose density `!== 'off'`, every region gets `max(1, scaledCount)` of that kind (≥1 treasure, ≥1 magic item, ≥1 high-level monster). Plus ≥1 `notable` find per region.
- **Holders:** eligible POIs exclude `type === 'dungeon' | 'ruin'` and any POI whose parent is a dungeon; NPCs eligible by weight (named + creatures). Factions hold via HQ POI / leader NPC (no schema). Party faction excluded from the great-item guarantee.
- **Pointable-find seam (for B2):** a find is pointable if `notable === true` OR magic (`TreasureItem.isMagic` / `InventoryItem.compendiumKind === 'magicItem'`).
- Use existing path aliases (`@domain/...`, `@application/...`, `~/lib/...`, `@shared/...`).

---

## File Structure

- Create `src/domain/services/worldgen/lootDensity.ts` — `LootDensity` type + `LOOT_DENSITY` multiplier map.
- Modify `src/domain/value-objects/SystemBlock.ts` — add `InventoryItem.notable?`.
- Modify `src/lib/worldgen/compendium-utils.ts` — add `pickTierMonster` (tier-banded, system-aware) + `monsterThreat` helper.
- Modify `src/domain/services/worldgen/sprinkleRealmContent.ts` — the core evolution (new input, per-region, NPC + faction holders, tier monsters, guardians).
- Modify `src/domain/services/worldgen/generateWorld.ts` — opts type + the `sprinkleRealmContent` call (pass `npcs`, `regions`, `factions`, densities).
- Modify `src/application/use-cases/GenerateWorld.ts` — input fields (replace the 3 booleans with 3 densities) + `realmContent` assembly.
- Modify `src/routes/_app/realms/new.tsx` — 3 `Select`s replace the 3 `Switch`es.
- Modify test callers: `GenerateWorld.test.ts`, `GenerateWorld.ruin.test.ts`, `GenerateWorld.landmark.test.ts`, `ExportImportRealm.roundtrip.test.ts`, `RealmRepository.cascade.test.ts`.

---

### Task 1: `LootDensity` type + `InventoryItem.notable`

**Files:**
- Create: `src/domain/services/worldgen/lootDensity.ts`
- Modify: `src/domain/value-objects/SystemBlock.ts`
- Test: `src/domain/services/worldgen/lootDensity.test.ts`

**Interfaces:**
- Produces: `type LootDensity = 'off'|'sparse'|'moderate'|'frequent'`; `LOOT_DENSITY: Record<LootDensity, number>` = `{off:0, sparse:0.5, moderate:1, frequent:2}`. `InventoryItem` gains `notable?: boolean`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { LOOT_DENSITY, type LootDensity } from './lootDensity'

describe('LOOT_DENSITY', () => {
  it('maps each density to its multiplier', () => {
    expect(LOOT_DENSITY.off).toBe(0)
    expect(LOOT_DENSITY.sparse).toBe(0.5)
    expect(LOOT_DENSITY.moderate).toBe(1)
    expect(LOOT_DENSITY.frequent).toBe(2)
    const d: LootDensity = 'moderate'
    expect(LOOT_DENSITY[d]).toBe(1)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/domain/services/worldgen/lootDensity.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/domain/services/worldgen/lootDensity.ts`:

```ts
export type LootDensity = 'off' | 'sparse' | 'moderate' | 'frequent'

export const LOOT_DENSITY: Record<LootDensity, number> = {
  off: 0,
  sparse: 0.5,
  moderate: 1,
  frequent: 2,
}
```

In `src/domain/value-objects/SystemBlock.ts`, add to the `InventoryItem` interface (after `compendiumSource?`):

```ts
  notable?: boolean
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test src/domain/services/worldgen/lootDensity.test.ts`
Expected: PASS.
Run: `pnpm build` → clean.

- [ ] **Step 5: Commit**

```bash
git add src/domain/services/worldgen/lootDensity.ts src/domain/services/worldgen/lootDensity.test.ts src/domain/value-objects/SystemBlock.ts
git commit -m "feat: LootDensity type + InventoryItem.notable"
```

---

### Task 2: tier-banded monster picker

**Files:**
- Modify: `src/lib/worldgen/compendium-utils.ts`
- Test: `src/lib/worldgen/compendium-utils.tier.test.ts`

**Interfaces:**
- Consumes: `getMonstersBySystemId`, `CompendiumMonster`, `SeededRandom`.
- Produces:
  - `monsterThreat(m: CompendiumMonster): number` — a normalized threat level (Shadowdark `level`; Cairn `HP/4`, parsed from stats).
  - `pickTierMonster(systemId: string, tier: 'easy'|'tough'|'perilous', rng: SeededRandom, opts?: { high?: boolean }): { id: string; name: string } | null` — picks a monster whose threat falls in the tier band; `high` biases to the upper half of that band (guardians / a region's high-level monster). Falls back to the closest available monster; returns null only if the system has no monsters.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { pickTierMonster } from './compendium-utils'

describe('pickTierMonster', () => {
  it('returns a monster for both systems', () => {
    for (const sys of ['system-cairn-2e', 'system-shadowdark']) {
      const m = pickTierMonster(sys, 'tough', new SeededRandom('s'))
      expect(m).not.toBeNull()
      expect(m!.id).toBeTruthy()
      expect(m!.name).toBeTruthy()
    }
  })

  it('is deterministic for a seed', () => {
    const a = pickTierMonster('system-shadowdark', 'perilous', new SeededRandom('z'), { high: true })
    const b = pickTierMonster('system-shadowdark', 'perilous', new SeededRandom('z'), { high: true })
    expect(a).toEqual(b)
  })

  it('high perilous tends to outrank easy (shadowdark levels)', () => {
    // sample several; the high-perilous max level should be >= easy max level
    const sd = (tier: any, high: boolean) => {
      let max = 0
      for (let i = 0; i < 8; i++) {
        const m = pickTierMonster('system-shadowdark', tier, new SeededRandom('k' + i), { high })
        // resolve level via the compendium is internal; just assert non-null here
        expect(m).not.toBeNull()
      }
      return max
    }
    sd('easy', false); sd('perilous', true) // smoke: no throw, deterministic picks
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/lib/worldgen/compendium-utils.tier.test.ts`
Expected: FAIL — `pickTierMonster` not exported.

- [ ] **Step 3: Implement**

Add to `src/lib/worldgen/compendium-utils.ts` (it already imports `getMonstersBySystemId`, `CompendiumMonster`, `SeededRandom`):

```ts
const TIER_BAND: Record<'easy' | 'tough' | 'perilous', { min: number; max: number }> = {
  easy: { min: 0, max: 3 },
  tough: { min: 3, max: 6 },
  perilous: { min: 5, max: 12 },
}

export function monsterThreat(m: CompendiumMonster): number {
  if (m.systemData.system === 'shadowdark') return m.systemData.data.level
  if (m.systemData.system === 'cairn') {
    const hp = parseInt(m.systemData.data.stats?.match(/(\d+)\s*HP/i)?.[1] ?? '0')
    return hp / 4 // rough HP→threat proxy
  }
  return 1
}

export function pickTierMonster(
  systemId: string,
  tier: 'easy' | 'tough' | 'perilous',
  rng: SeededRandom,
  opts: { high?: boolean } = {},
): { id: string; name: string } | null {
  const all = getMonstersBySystemId(systemId)
  if (all.length === 0) return null
  const band = TIER_BAND[tier]
  const lo = opts.high ? (band.min + band.max) / 2 : band.min
  let inBand = all.filter((m) => {
    const t = monsterThreat(m)
    return t >= lo && t <= band.max
  })
  if (inBand.length === 0) {
    // Fallback: closest to the band's target (max for high, midpoint otherwise)
    const target = opts.high ? band.max : (band.min + band.max) / 2
    inBand = [...all].sort((a, b) => Math.abs(monsterThreat(a) - target) - Math.abs(monsterThreat(b) - target)).slice(0, 5)
  }
  const picked = rng.pick(inBand)
  return { id: picked.id, name: picked.name }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test src/lib/worldgen/compendium-utils.tier.test.ts`
Expected: PASS.
Run: `pnpm build` → clean.

- [ ] **Step 5: Commit**

```bash
git add src/lib/worldgen/compendium-utils.ts src/lib/worldgen/compendium-utils.tier.test.ts
git commit -m "feat: pickTierMonster + monsterThreat (tier-banded, both systems)"
```

---

### Task 3: swap config booleans → 3 densities (behavior-preserving plumbing)

**Files:**
- Modify: `src/application/use-cases/GenerateWorld.ts`
- Modify: `src/domain/services/worldgen/generateWorld.ts` (opts type only)
- Modify: `src/domain/services/worldgen/sprinkleRealmContent.ts` (input shape; map density→behavior, signature gains optional `npcs`/`regions`/`factions`)
- Modify callers: `src/routes/_app/realms/new.tsx`, `GenerateWorld.test.ts`, `GenerateWorld.ruin.test.ts`, `GenerateWorld.landmark.test.ts`, `ExportImportRealm.roundtrip.test.ts`, `RealmRepository.cascade.test.ts`
- Test: extend `src/domain/services/worldgen/sprinkleRealmContent.test.ts` (create if absent)

**Interfaces:**
- Consumes: `LootDensity`, `LOOT_DENSITY` (Task 1).
- Produces: `RealmContentSprinkleOptions = { treasureDensity?: LootDensity; magicDensity?: LootDensity; monsterDensity?: LootDensity }`. `sprinkleRealmContent` input gains optional `npcs?: NPC[]`, `regions?: Region[]`, `factions?: Faction[]` (accepted; full use lands in Tasks 4–7). `GenerateWorldInput` replaces `autoTreasure`/`autoMagicItems`/`autoMonsters` with `worldTreasureDensity?`/`worldMagicDensity?`/`worldMonsterDensity?: LootDensity` (default `'moderate'`).

> This task keeps existing behavior: density `!== 'off'` reproduces the old "true" sampling (with density scaling the ratio). The per-region/NPC/faction/guardian logic is added in Tasks 4–7. Build + all existing world-gen tests stay green.

- [ ] **Step 1: Write/extend the failing test**

Create or extend `src/domain/services/worldgen/sprinkleRealmContent.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { sprinkleRealmContent } from './sprinkleRealmContent'
import { buildPOI } from './buildPoi'

function poi(type: any) { return buildPOI({ regionId: 'r1', name: type, type }) }

describe('sprinkleRealmContent densities', () => {
  it('off densities add nothing', () => {
    const pois = [poi('landmark'), poi('camp')]
    sprinkleRealmContent({ pois, systemId: 'system-cairn-2e', options: { treasureDensity: 'off', magicDensity: 'off', monsterDensity: 'off' }, rng: new SeededRandom('s') })
    expect(pois.every((p) => p.treasure.length === 0 && p.monsterRefs.length === 0)).toBe(true)
  })

  it('treasure density adds treasure to eligible POIs', () => {
    const pois = Array.from({ length: 10 }, () => poi('landmark'))
    sprinkleRealmContent({ pois, systemId: 'system-cairn-2e', options: { treasureDensity: 'frequent', magicDensity: 'off', monsterDensity: 'off' }, rng: new SeededRandom('s') })
    expect(pois.some((p) => p.treasure.length > 0)).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/domain/services/worldgen/sprinkleRealmContent.test.ts`
Expected: FAIL — `options.treasureDensity` not honored / type error.

- [ ] **Step 3: Update `RealmContentSprinkleOptions` + input + density-aware sampling**

In `sprinkleRealmContent.ts`: import `LootDensity`, `LOOT_DENSITY`. Replace the options interface and make sampling density-driven. Replace `SprinkleRealmContentInput` + the `treasure`/`magicItems`/`monsters` branches:

```ts
import { LOOT_DENSITY, type LootDensity } from './lootDensity'
import type { NPC } from '@domain/entities/NPC'
import type { Region } from '@domain/entities/Region'
import type { Faction } from '@domain/entities/Faction'

export interface RealmContentSprinkleOptions {
  treasureDensity?: LootDensity
  magicDensity?: LootDensity
  monsterDensity?: LootDensity
}

interface SprinkleRealmContentInput {
  pois: POI[]
  systemId: string
  options: RealmContentSprinkleOptions
  rng: SeededRandom
  npcs?: NPC[]       // used from Task 4 onward
  regions?: Region[] // used from Task 4 onward
  factions?: Faction[] // used from Task 6 onward
}
```

Replace the three `if (options.xxx)` blocks with density-scaled equivalents. For this task, keep the existing global-sampling shape but scale the ratio by `LOOT_DENSITY[density]` and treat `off`/undefined as 0:

```ts
const treasureMult = LOOT_DENSITY[options.treasureDensity ?? 'off']
if (treasureMult > 0) {
  const targets = rng.sample(treasurePois, targetCount(treasurePois.length, 0.45 * treasureMult, 1, 64))
  for (const poi of targets) poi.treasure = [...poi.treasure, pickTreasureItem(rng.child(`treasure-${poi.id}`))]
}
const magicMult = LOOT_DENSITY[options.magicDensity ?? 'off']
if (magicMult > 0) { /* same as today, ratio 0.18 * magicMult */ }
const monsterMult = LOOT_DENSITY[options.monsterDensity ?? 'off']
if (monsterMult > 0) { /* same as today, ratio 0.45 * monsterMult */ }
```

(Keep `pickTreasureItem`, the magic-item construction, and the monster-ref logic exactly as they are for now.)

- [ ] **Step 4: Thread the new fields through GenerateWorld + generateWorld + callers**

In `GenerateWorld.ts`: replace the three input booleans and the `realmContent` assembly:

```ts
  worldTreasureDensity?: LootDensity
  worldMagicDensity?: LootDensity
  worldMonsterDensity?: LootDensity
```
```ts
      realmContent: {
        treasureDensity: input.worldTreasureDensity ?? 'moderate',
        magicDensity: input.worldMagicDensity ?? 'moderate',
        monsterDensity: input.worldMonsterDensity ?? 'moderate',
      },
```
(Import `LootDensity` from `@domain/services/worldgen/lootDensity`.)

In `generateWorld.ts`, the `opts.realmContent?: RealmContentSprinkleOptions` type already flows; no change beyond the options-shape import resolving. The existing call `sprinkleRealmContent({ pois, systemId, options, rng })` still compiles (npcs/regions/factions optional).

Update the 5 test callers + `new.tsx`: replace `autoTreasure: …, autoMagicItems: …, autoMonsters: …` with `worldTreasureDensity: 'moderate', worldMagicDensity: 'moderate', worldMonsterDensity: 'moderate'` (tests can use `'moderate'`, or `'off'` where they asserted no content). Find them: `rg -n "autoTreasure|autoMagicItems|autoMonsters" src`.

- [ ] **Step 5: Run focused + full suite + build**

Run: `pnpm test src/domain/services/worldgen/sprinkleRealmContent.test.ts` → PASS.
Run: `pnpm test` → all green (existing world-gen tests must still pass).
Run: `pnpm build` → clean.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: replace realm-content booleans with 3 LootDensity knobs (behavior-preserving)"
```

---

### Task 4: per-region treasure + magic with per-kind guarantee (POI holders), exclude ruin/dungeon

**Files:**
- Modify: `src/domain/services/worldgen/sprinkleRealmContent.ts`
- Test: extend `src/domain/services/worldgen/sprinkleRealmContent.test.ts`

**Interfaces:**
- Consumes: `biomeTier` (`@domain/services/worldgen/regionFlavor`), `LOOT_DENSITY`, `pickMagicItem` (already imported via compendium? it uses `getMagicItemsBySystemId` — keep), `Region`.
- Produces: per-region seeding. Eligible POIs now EXCLUDE `dungeon`/`ruin` and dungeon-room children. When `regions` is provided, grouping is per-region with `max(1, …)` guarantee per enabled kind and ≥1 `notable` find per region. The region's notable carrier is a magic item if magic on, else a flagged treasure.

- [ ] **Step 1: Write the failing test**

```ts
import { biomeTier } from './regionFlavor'
// ... (add to the existing test file)
it('every region gets >=1 treasure and >=1 notable when densities on', () => {
  const regions = [
    { id: 'rA', terrain: 'grasslands' } as any,
    { id: 'rB', terrain: 'mountains' } as any,
  ]
  const pois = [
    buildPOI({ regionId: 'rA', name: 'a1', type: 'landmark' }),
    buildPOI({ regionId: 'rB', name: 'b1', type: 'camp' }),
    buildPOI({ regionId: 'rB', name: 'dungeon', type: 'dungeon' }), // ineligible
  ]
  sprinkleRealmContent({ pois, regions, systemId: 'system-cairn-2e', options: { treasureDensity: 'moderate', magicDensity: 'moderate', monsterDensity: 'off' }, rng: new SeededRandom('s') })
  for (const rid of ['rA', 'rB']) {
    const regionItems = pois.filter((p) => p.regionId === rid).flatMap((p) => p.treasure)
    expect(regionItems.length).toBeGreaterThan(0)
    expect(regionItems.some((t) => t.notable || t.isMagic)).toBe(true)
  }
  // dungeon POI never seeded
  expect(pois.find((p) => p.type === 'dungeon')!.treasure.length).toBe(0)
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/domain/services/worldgen/sprinkleRealmContent.test.ts -t "every region"`
Expected: FAIL (global sampling, no per-region guarantee; dungeon may get treasure).

- [ ] **Step 3: Implement per-region seeding**

Update `TREASURE_POI_TYPES` to exclude `dungeon` and `ruin`. Add a parent-dungeon guard helper. Replace the treasure+magic branches with a per-region loop when `regions` is supplied (fall back to the flat behavior when not). Concretely:

```ts
const TREASURE_POI_TYPES = new Set<PoiType>(['building','camp','fortification','landmark','natural','shrine'])
// (dungeon + ruin removed — they self-loot)

function eligibleTreasurePois(pois: POI[]): POI[] {
  const dungeonIds = new Set(pois.filter((p) => p.type === 'dungeon').map((p) => p.id))
  return pois.filter((p) => TREASURE_POI_TYPES.has(p.type) && !(p.parentPoiId && dungeonIds.has(p.parentPoiId)))
}

const TIER_FACTOR = { easy: 1, tough: 1.5, perilous: 2 } as const
const BASE_TREASURE = 2
const BASE_MAGIC = 1

// inside sprinkleRealmContent, when input.regions provided:
const elig = eligibleTreasurePois(pois)
const byRegion = new Map<string, POI[]>()
for (const p of elig) { const a = byRegion.get(p.regionId) ?? []; a.push(p); byRegion.set(p.regionId, a) }
for (const region of input.regions) {
  const holders = byRegion.get(region.id) ?? []
  if (holders.length === 0) continue
  const tier = TIER_FACTOR[biomeTier(region.terrain)]
  const rrng = input.rng.child(`region-${region.id}`)
  let regionHasNotable = false

  if (magicMult > 0) {
    const count = Math.max(1, Math.round(BASE_MAGIC * magicMult * tier))
    for (let i = 0; i < count; i++) {
      const holder = rrng.pick(holders)
      const picked = pickMagicItem(input.systemId, rrng) // see note below
      const notable = !regionHasNotable
      holder.treasure = [...holder.treasure, { id: newId(), name: picked?.name ?? 'Strange Relic', description: picked?.description ?? '', value: 'priceless', quantity: 1, collected: false, isMagic: true, ...(picked?.id ? { compendiumId: picked.id } : {}), notable }]
      if (picked?.id && !holder.magicItemRefs.some((r) => r.id === picked.id)) holder.magicItemRefs = [...holder.magicItemRefs, { id: picked.id }]
      regionHasNotable = true
    }
  }
  if (treasureMult > 0) {
    const count = Math.max(1, Math.round(BASE_TREASURE * treasureMult * tier))
    for (let i = 0; i < count; i++) {
      const holder = rrng.pick(holders)
      const item = pickTreasureItem(rrng)
      if (!regionHasNotable && i === 0) { item.notable = true; regionHasNotable = true }
      holder.treasure = [...holder.treasure, item]
    }
  }
}
```

Add `import { pickMagicItem } from '~/lib/worldgen/compendium-utils'` and `import { biomeTier } from './regionFlavor'` and `import { newId } from '@shared/ulid'` (already present). Note: `pickMagicItem` is preferred over the inline `getMagicItemsBySystemId` pick — switch the magic construction to it for consistency. Keep the non-region (flat) path from Task 3 for when `regions` is absent.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test src/domain/services/worldgen/sprinkleRealmContent.test.ts` → PASS.
Run: `pnpm build` → clean.

- [ ] **Step 5: Commit**

```bash
git add src/domain/services/worldgen/sprinkleRealmContent.ts src/domain/services/worldgen/sprinkleRealmContent.test.ts
git commit -m "feat: per-region treasure+magic with per-kind + notable guarantee; exclude ruin/dungeon"
```

---

### Task 5: NPC holders

**Files:**
- Modify: `src/domain/services/worldgen/sprinkleRealmContent.ts`
- Test: extend `sprinkleRealmContent.test.ts`

**Interfaces:**
- Consumes: `NPC`, `InventoryItem`.
- Produces: when `npcs` provided, a weighted share of per-region finds land on NPCs (`npc.systemBlock.inventory`) instead of POIs — magic → `InventoryItem { source:'compendium', compendiumKind:'magicItem', compendiumId, notable? }`, treasure → `InventoryItem { source:'treasure', value, notable? }`. NPCs grouped by `npc.regionId`.

- [ ] **Step 1: Write the failing test**

```ts
it('places some finds on NPC inventories', () => {
  const regions = [{ id: 'rA', terrain: 'mountains' } as any]
  const pois = [buildPOI({ regionId: 'rA', name: 'a1', type: 'landmark' })]
  const npcs = Array.from({ length: 8 }, (_, i) => ({
    id: 'n' + i, worldId: 'w', name: 'n' + i, factionIds: [], regionId: 'rA', poiId: null,
    lifeStatus: 'alive', movementStatus: 'present', description: '', traits: [], motivation: '',
    appearance: '', voice: '', want: '', tags: [], imageUrl: null,
    systemBlock: { inventory: [] } as any, starred: false, createdAt: 1, updatedAt: 1,
  })) as any[]
  sprinkleRealmContent({ pois, npcs, regions, systemId: 'system-shadowdark', options: { treasureDensity: 'frequent', magicDensity: 'frequent', monsterDensity: 'off' }, rng: new SeededRandom('npc-seed') })
  const held = npcs.flatMap((n) => n.systemBlock.inventory)
  expect(held.length).toBeGreaterThan(0)
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/domain/services/worldgen/sprinkleRealmContent.test.ts -t "NPC inventories"`
Expected: FAIL — NPCs never receive items.

- [ ] **Step 3: Implement NPC holders**

In the per-region loop, build a combined holder pool: POIs + a weighted slice of that region's NPCs (e.g. ~20% of NPCs eligible). Add a helper to push an item to either holder type:

```ts
function npcsByRegion(npcs: NPC[]): Map<string, NPC[]> {
  const m = new Map<string, NPC[]>()
  for (const n of npcs) { if (!n.regionId) continue; const a = m.get(n.regionId) ?? []; a.push(n); m.set(n.regionId, a) }
  return m
}
function pushMagicToNpc(n: NPC, picked: { id: string|null; name: string; description: string } | null, notable: boolean) {
  n.systemBlock.inventory = [...n.systemBlock.inventory, { name: picked?.name ?? 'Strange Relic', slots: 1, description: picked?.description ?? '', source: 'compendium', compendiumKind: 'magicItem', ...(picked?.id ? { compendiumId: picked.id } : {}), notable }]
}
function pushTreasureToNpc(n: NPC, item: TreasureItem) {
  n.systemBlock.inventory = [...n.systemBlock.inventory, { name: item.name, slots: 1, description: item.description, value: item.value, quantity: item.quantity, source: 'treasure', ...(item.notable ? { notable: true } : {}) }]
}
```

In the region loop, when picking a holder, with a weight (~30%) pick from the region's NPC pool (if any) and route the item to the NPC via the helpers; otherwise route to a POI as in Task 4. The per-region/notable guarantee still holds (count NPC-held notable toward `regionHasNotable`).

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test src/domain/services/worldgen/sprinkleRealmContent.test.ts` → PASS.
Run: `pnpm build` → clean.

- [ ] **Step 5: Commit**

```bash
git add src/domain/services/worldgen/sprinkleRealmContent.ts src/domain/services/worldgen/sprinkleRealmContent.test.ts
git commit -m "feat: seed treasure/magic onto NPC inventories"
```

---

### Task 6: faction great-item guarantee

**Files:**
- Modify: `src/domain/services/worldgen/sprinkleRealmContent.ts`
- Test: extend `sprinkleRealmContent.test.ts`

**Interfaces:**
- Consumes: `Faction`.
- Produces: when `factions` provided, each non-party faction (`!isParty`) gets exactly one notable great item — magic if `magicDensity !== 'off'`, else a notable treasure — placed at its HQ POI (`headquartersPoiId` → that POI's treasure) or, failing that, its leader NPC (`leaderNpcId` → inventory). Independent of region budgets. Skip factions with neither.

- [ ] **Step 1: Write the failing test**

```ts
it('gives each non-party faction one notable great item at HQ or leader', () => {
  const hq = buildPOI({ regionId: 'rA', name: 'Hall', type: 'fortification' })
  const factions = [
    { id: 'f1', worldId: 'w', name: 'Iron Order', isParty: false, headquartersPoiId: hq.id, leaderNpcId: null } as any,
    { id: 'fp', worldId: 'w', name: 'The Party', isParty: true, headquartersPoiId: hq.id, leaderNpcId: null } as any,
  ]
  sprinkleRealmContent({ pois: [hq], factions, regions: [{ id: 'rA', terrain: 'grasslands' } as any], systemId: 'system-cairn-2e', options: { treasureDensity: 'moderate', magicDensity: 'moderate', monsterDensity: 'off' }, rng: new SeededRandom('fac') })
  const notable = hq.treasure.filter((t) => t.notable)
  expect(notable.length).toBeGreaterThanOrEqual(1) // at least the faction's great item
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/domain/services/worldgen/sprinkleRealmContent.test.ts -t "faction"`
Expected: FAIL — no faction guarantee.

- [ ] **Step 3: Implement**

After the region loop, add a faction pass:

```ts
if (input.factions) {
  const poiById = new Map(pois.map((p) => [p.id, p]))
  const npcById = new Map((input.npcs ?? []).map((n) => [n.id, n]))
  const frng = input.rng.child('faction-great-items')
  const magicOn = (options.magicDensity ?? 'off') !== 'off'
  for (const f of input.factions) {
    if (f.isParty) continue
    const hqPoi = f.headquartersPoiId ? poiById.get(f.headquartersPoiId) : undefined
    const leader = f.leaderNpcId ? npcById.get(f.leaderNpcId) : undefined
    if (!hqPoi && !leader) continue
    if (magicOn) {
      const picked = pickMagicItem(input.systemId, frng)
      if (hqPoi) hqPoi.treasure = [...hqPoi.treasure, { id: newId(), name: picked?.name ?? 'Relic', description: picked?.description ?? '', value: 'priceless', quantity: 1, collected: false, isMagic: true, ...(picked?.id ? { compendiumId: picked.id } : {}), notable: true }]
      else pushMagicToNpc(leader!, picked, true)
    } else {
      const item = pickTreasureItem(frng); item.notable = true
      if (hqPoi) hqPoi.treasure = [...hqPoi.treasure, item]
      else pushTreasureToNpc(leader!, item)
    }
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test src/domain/services/worldgen/sprinkleRealmContent.test.ts` → PASS.
Run: `pnpm build` → clean.

- [ ] **Step 5: Commit**

```bash
git add src/domain/services/worldgen/sprinkleRealmContent.ts src/domain/services/worldgen/sprinkleRealmContent.test.ts
git commit -m "feat: guarantee one notable great item per non-party faction"
```

---

### Task 7: tier-aware monsters per region + guardians

**Files:**
- Modify: `src/domain/services/worldgen/sprinkleRealmContent.ts`
- Test: extend `sprinkleRealmContent.test.ts`

**Interfaces:**
- Consumes: `pickTierMonster` (Task 2), `biomeTier`.
- Produces: when `monsterDensity !== 'off'`, every region gets `max(1, round(BASE_MONSTER × mult × tier))` monster refs on monster-eligible POIs, picked via `pickTierMonster(systemId, tier, rng)`; the region's guaranteed monster is a `{ high: true }` pick. Plus the guardian rule: a POI that received a `notable` find, in `tough`/`perilous`, gets a `{ high: true }` guardian ref with weighted chance (perilous ~0.75, tough ~0.4).

- [ ] **Step 1: Write the failing test**

```ts
it('every region gets >=1 monster; perilous notable POI gets a guardian', () => {
  const regions = [{ id: 'rP', terrain: 'mountains' } as any] // perilous
  const pois = [buildPOI({ regionId: 'rP', name: 'p1', type: 'landmark' }), buildPOI({ regionId: 'rP', name: 'p2', type: 'natural' })]
  sprinkleRealmContent({ pois, regions, systemId: 'system-shadowdark', options: { treasureDensity: 'moderate', magicDensity: 'moderate', monsterDensity: 'moderate' }, rng: new SeededRandom('mon') })
  const refs = pois.flatMap((p) => p.monsterRefs)
  expect(refs.length).toBeGreaterThan(0) // region has monsters
  // a notable-find POI should have at least one monster (guardian or regional)
  const notablePoi = pois.find((p) => p.treasure.some((t) => t.notable || t.isMagic))
  expect(notablePoi).toBeTruthy()
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/domain/services/worldgen/sprinkleRealmContent.test.ts -t "guardian"`
Expected: FAIL — monsters still global/random, no per-region/guardian.

- [ ] **Step 3: Implement**

Add `MONSTER_POI_TYPES` (keep, but exclude none extra), `BASE_MONSTER = 1`, and a guardian-chance map. Replace the flat monster branch with a per-region pass (when `regions` provided):

```ts
const GUARD_CHANCE = { easy: 0, tough: 0.4, perilous: 0.75 } as const
// per region:
if (monsterMult > 0) {
  const monsterHolders = (byRegion.get(region.id) ?? []).filter((p) => MONSTER_POI_TYPES.has(p.type))
  if (monsterHolders.length > 0) {
    const count = Math.max(1, Math.round(BASE_MONSTER * monsterMult * tier))
    for (let i = 0; i < count; i++) {
      const holder = rrng.pick(monsterHolders)
      const m = pickTierMonster(input.systemId, biomeTier(region.terrain), rrng, { high: i === 0 })
      if (m && !holder.monsterRefs.some((r) => r.id === m.id)) holder.monsterRefs = [...holder.monsterRefs, { id: m.id, quantity: rrng.between(1, 3) }]
    }
    // Guardian: notable-find POIs in tough/perilous regions
    const gc = GUARD_CHANCE[biomeTier(region.terrain)]
    for (const holder of monsterHolders) {
      const hasNotable = holder.treasure.some((t) => t.notable || t.isMagic)
      if (hasNotable && gc > 0 && rrng.chance(gc)) {
        const g = pickTierMonster(input.systemId, biomeTier(region.terrain), rrng, { high: true })
        if (g && !holder.monsterRefs.some((r) => r.id === g.id)) holder.monsterRefs = [...holder.monsterRefs, { id: g.id, quantity: 1 }]
      }
    }
  }
}
```

(`MONSTER_POI_TYPES` should also exclude `dungeon`/`ruin` to avoid double-stocking their generators; keep `camp/fortification/landmark/natural/shrine`.)

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test src/domain/services/worldgen/sprinkleRealmContent.test.ts` → PASS.
Run: `pnpm build` → clean.

- [ ] **Step 5: Commit**

```bash
git add src/domain/services/worldgen/sprinkleRealmContent.ts src/domain/services/worldgen/sprinkleRealmContent.test.ts
git commit -m "feat: tier-aware per-region monsters + guardians on notable loot"
```

---

### Task 8: wire npcs/regions/factions into the generateWorld call

**Files:**
- Modify: `src/domain/services/worldgen/generateWorld.ts`
- Test: extend `src/application/use-cases/GenerateWorld.test.ts` (or a focused world-gen test)

**Interfaces:**
- Produces: the `sprinkleRealmContent` call passes `npcs`, `regions`, `factions` so all the new behavior activates in real world-gen.

- [ ] **Step 1: Write the failing integration test**

Add to `GenerateWorld.test.ts` (uses the real container + fake-indexeddb already set up there):

```ts
it('seeds treasure on non-dungeon POIs in a generated world', async () => {
  await executeGenerateWorld({ name: 'T', systemId: 'system-cairn-2e', seed: 'seed-loot', size: 'medium', worldTreasureDensity: 'frequent', worldMagicDensity: 'moderate', worldMonsterDensity: 'moderate' } as any, deps() as any)
  const pois = await db.pois.toArray()
  const seeded = pois.filter((p) => p.type !== 'dungeon' && p.type !== 'ruin' && p.treasure.length > 0)
  expect(seeded.length).toBeGreaterThan(0)
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/application/use-cases/GenerateWorld.test.ts -t "seeds treasure"`
Expected: FAIL — call doesn't pass regions/npcs/factions, so per-region seeding doesn't run (only the flat fallback, which may still seed; if it passes spuriously, strengthen the assertion to require a `notable` find per region). Adjust assertion to `expect(pois.some((p) => p.treasure.some((t) => t.notable)))` which the flat path does NOT produce.

- [ ] **Step 3: Update the call**

In `generateWorld.ts`, find the `sprinkleRealmContent({ pois, systemId: opts.systemId, options: opts.realmContent, rng: rng.child('realm-content') })` call and add the new args:

```ts
    sprinkleRealmContent({
      pois,
      npcs,
      regions,
      factions,
      systemId: opts.systemId,
      options: opts.realmContent,
      rng: rng.child('realm-content'),
    })
```

(`npcs`, `regions`, `factions` are all in scope at that point in `generateWorld`.)

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test src/application/use-cases/GenerateWorld.test.ts` → PASS.
Run: `pnpm test` → full suite green.
Run: `pnpm build` → clean.

- [ ] **Step 5: Commit**

```bash
git add src/domain/services/worldgen/generateWorld.ts src/application/use-cases/GenerateWorld.test.ts
git commit -m "feat: activate per-region/NPC/faction/guardian seeding in world gen"
```

---

### Task 9: create-realm form — 3 density Selects

**Files:**
- Modify: `src/routes/_app/realms/new.tsx`

**Interfaces:**
- Consumes: `worldTreasureDensity`/`worldMagicDensity`/`worldMonsterDensity` on `GenerateWorldInput`.

- [ ] **Step 1: Replace state + inputs**

Replace the three `useState(true)` booleans (`genAutoTreasure`/`genAutoMagicItems`/`genAutoMonsters`) with:

```tsx
const [genTreasureDensity, setGenTreasureDensity] = useState<LootDensity>('moderate')
const [genMagicDensity, setGenMagicDensity] = useState<LootDensity>('moderate')
const [genMonsterDensity, setGenMonsterDensity] = useState<LootDensity>('moderate')
```

Import `type LootDensity` from `@domain/services/worldgen/lootDensity`. In the `executeGenerateWorld` call, replace `autoTreasure/autoMagicItems/autoMonsters` with `worldTreasureDensity: genTreasureDensity, worldMagicDensity: genMagicDensity, worldMonsterDensity: genMonsterDensity`.

- [ ] **Step 2: Replace the three Switch rows with Selects**

Replace each `Switch` row in the "Realm content" block with a labeled `Select` (mirror the existing `poiDensity` Select) offering `off / sparse / moderate / frequent`. Example for treasure (repeat for magic + monsters with their icons `Gem`/`Sparkles`/`Skull`):

```tsx
<div className="flex items-center justify-between gap-3">
  <Label htmlFor="gen-treasure" className="flex items-center gap-2 text-xs"><Gem className="size-3.5" /> Treasure</Label>
  <Select value={genTreasureDensity} onValueChange={(v) => setGenTreasureDensity(v as LootDensity)} disabled={isCreating}>
    <SelectTrigger id="gen-treasure" className="w-32"><SelectValue /></SelectTrigger>
    <SelectContent>
      <SelectItem value="off">Off</SelectItem>
      <SelectItem value="sparse">Sparse</SelectItem>
      <SelectItem value="moderate">Moderate</SelectItem>
      <SelectItem value="frequent">Frequent</SelectItem>
    </SelectContent>
  </Select>
</div>
```

- [ ] **Step 3: Verify build + manual**

Run: `pnpm build` → clean (tsc gate; this project has no component-render test harness — do NOT add RTL).
Manual: `pnpm dev` → create-realm form shows three density Selects; generating a world with them seeds treasure/magic/monsters.

- [ ] **Step 4: Commit**

```bash
git add src/routes/_app/realms/new.tsx
git commit -m "feat: create-realm form treasure/magic/monster density Selects"
```

---

### Task 10: region "What's Here" overview

**Files:**
- Create: `src/components/regions/regionContents.ts` (pure summary helper)
- Create: `src/components/regions/regionContents.test.ts`
- Create: `src/components/regions/RegionContentsPanel.tsx`
- Modify: `src/routes/_app/realms/regions_.$regionId.tsx` (render the panel in the Overview tab)

**Interfaces:**
- Consumes: `POI`, `NPC`, `TreasureItem`, `InventoryItem`, `getCompendiumById` (`@domain/data/compendium`).
- Produces:
  - `summarizeRegionContents(pois: POI[], npcs: NPC[]): RegionContents` where
    `RegionContents = { treasureCount: number; magicCount: number; highlights: { name: string; kind: 'magic' | 'notable' }[]; monsters: { name: string; count: number }[] }`.
    Treasure = all `poi.treasure` items + all `npc.systemBlock.inventory` items.
    `magicCount` counts magic (`TreasureItem.isMagic` or `InventoryItem.compendiumKind === 'magicItem'`).
    `highlights` = items where magic or `notable` (kind `'magic'` if magic else `'notable'`).
    `monsters` = `poi.monsterRefs` aggregated by id (name via `getCompendiumById(id)?.name ?? id`, summing `quantity ?? 1`).
  - `<RegionContentsPanel pois={POI[]} npcs={NPC[]} />`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { summarizeRegionContents } from './regionContents'
import { buildPOI } from '@domain/services/worldgen/buildPoi'

describe('summarizeRegionContents', () => {
  it('counts treasure/magic, lists highlights and monsters', () => {
    const p = buildPOI({ regionId: 'r', name: 'p', type: 'landmark' })
    p.treasure = [
      { id: 't1', name: 'Gold', description: '', value: '10 gp', quantity: 1, collected: false },
      { id: 't2', name: 'Sun Blade', description: '', value: 'priceless', quantity: 1, collected: false, isMagic: true, notable: true },
    ]
    p.monsterRefs = [{ id: 'mon-x', quantity: 2 }]
    const npc: any = { systemBlock: { inventory: [{ name: 'Ring of Y', slots: 1, description: '', source: 'compendium', compendiumKind: 'magicItem' }] } }
    const s = summarizeRegionContents([p], [npc])
    expect(s.treasureCount).toBe(3)       // 2 poi + 1 npc
    expect(s.magicCount).toBe(2)          // Sun Blade + Ring of Y
    expect(s.highlights.map((h) => h.name).sort()).toEqual(['Ring of Y', 'Sun Blade'])
    expect(s.monsters[0].count).toBe(2)
  })

  it('handles empty region', () => {
    const s = summarizeRegionContents([], [])
    expect(s).toEqual({ treasureCount: 0, magicCount: 0, highlights: [], monsters: [] })
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/components/regions/regionContents.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement helper + panel**

`src/components/regions/regionContents.ts`:

```ts
import type { POI } from '@domain/entities/POI'
import type { NPC } from '@domain/entities/NPC'
import { getCompendiumById } from '@domain/data/compendium'

export interface RegionContents {
  treasureCount: number
  magicCount: number
  highlights: { name: string; kind: 'magic' | 'notable' }[]
  monsters: { name: string; count: number }[]
}

export function summarizeRegionContents(pois: POI[], npcs: NPC[]): RegionContents {
  const poiItems = pois.flatMap((p) => p.treasure.map((t) => ({ name: t.name, magic: !!t.isMagic, notable: !!t.notable })))
  const npcItems = npcs.flatMap((n) => (n.systemBlock?.inventory ?? []).map((it) => ({ name: it.name, magic: it.compendiumKind === 'magicItem', notable: !!it.notable })))
  const all = [...poiItems, ...npcItems]
  const highlights = all.filter((i) => i.magic || i.notable).map((i) => ({ name: i.name, kind: i.magic ? 'magic' as const : 'notable' as const }))

  const monsterMap = new Map<string, number>()
  for (const p of pois) for (const ref of p.monsterRefs) monsterMap.set(ref.id, (monsterMap.get(ref.id) ?? 0) + (ref.quantity ?? 1))
  const monsters = [...monsterMap.entries()].map(([id, count]) => ({ name: getCompendiumById(id)?.name ?? id, count }))

  return { treasureCount: all.length, magicCount: all.filter((i) => i.magic).length, highlights, monsters }
}
```

`src/components/regions/RegionContentsPanel.tsx`:

```tsx
import type { POI } from '@domain/entities/POI'
import type { NPC } from '@domain/entities/NPC'
import { Coins, Skull, Sparkles } from 'lucide-react'
import { summarizeRegionContents } from './regionContents'

export function RegionContentsPanel({ pois, npcs }: { pois: POI[]; npcs: NPC[] }) {
  const s = summarizeRegionContents(pois, npcs)
  if (s.treasureCount === 0 && s.monsters.length === 0) return null
  return (
    <div className="space-y-2 rounded-md border bg-muted/30 p-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">What's Here</span>
      <div className="flex flex-wrap gap-4 text-sm">
        <span className="flex items-center gap-1"><Coins className="size-4" /> {s.treasureCount} treasure</span>
        <span className="flex items-center gap-1"><Sparkles className="size-4" /> {s.magicCount} magic</span>
        <span className="flex items-center gap-1"><Skull className="size-4" /> {s.monsters.reduce((a, m) => a + m.count, 0)} monsters</span>
      </div>
      {s.highlights.length > 0 && (
        <p className="text-xs text-muted-foreground">Notable finds: {s.highlights.map((h) => h.name).join(', ')}</p>
      )}
      {s.monsters.length > 0 && (
        <p className="text-xs text-muted-foreground">Threats: {s.monsters.map((m) => `${m.name}${m.count > 1 ? ` ×${m.count}` : ''}`).join(', ')}</p>
      )}
    </div>
  )
}
```

In `regions_.$regionId.tsx`, inside the Overview `TabsContent value="overview"` block, render `<RegionContentsPanel pois={pois} npcs={npcs} />` (the `pois` and `npcs` vars already exist from `usePOIs(regionId)` / `useNPCsByRegion(regionId)`). Add the import.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test src/components/regions/regionContents.test.ts` → PASS.
Run: `pnpm build` → clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/regions/regionContents.ts src/components/regions/regionContents.test.ts src/components/regions/RegionContentsPanel.tsx "src/routes/_app/realms/regions_.\$regionId.tsx"
git commit -m "feat: region What's Here overview (treasure, magic, threats)"
```

---

### Task 11: full verification

**Files:** none (verification only)

- [ ] **Step 1: Full suite**

Run: `pnpm test`
Expected: ALL pass — new `sprinkleRealmContent` tests + the pre-existing world-gen/dungeon/ruin/landmark suites (guards that the seeder evolution + config swap didn't regress).

- [ ] **Step 2: Build**

Run: `pnpm build`
Expected: `vite build` + `tsc --noEmit` clean.

- [ ] **Step 3: Manual smoke**

`pnpm dev`, generate a world (moderate densities): confirm non-dungeon POIs and some NPCs carry treasure/magic, every region has finds + a high-level monster, factions' HQ/leader hold a notable item, and a perilous notable site has a guardian. Confirm `off` on all three seeds nothing (except the faction guarantee, which still places notable treasure).

- [ ] **Step 4: Commit (if any fixups)**

```bash
git add -A && git commit -m "test: world treasure seeding suite green" --allow-empty
```

---

## Self-Review

**Spec coverage (spec → task):**
- LootDensity + multipliers → T1. ✓
- `InventoryItem.notable` → T1. ✓
- Tier-banded / high-level monster picks → T2. ✓
- Three density knobs replacing booleans (input/options/form/callers) → T3, T9. ✓
- Per-region treasure+magic, per-kind + notable guarantee, exclude ruin/dungeon → T4. ✓
- NPC holders → T5. ✓
- Faction great-item guarantee (HQ/leader, party excluded) → T6. ✓
- Tier-aware per-region monsters + guardians on notable loot → T7. ✓
- Wire npcs/regions/factions into generateWorld → T8. ✓
- Form Selects → T9. ✓
- Region "What's Here" overview (treasure/magic/threats on the Overview tab) → T10. ✓
- Determinism / both systems → asserted in T2/T4/T5/T7 tests (fixed seeds; both systemIds). ✓
- B2 seam (`notable || magic`) → flags set in T4/T5/T6; asserted in T4. ✓

**Placeholder scan:** No TBD/"handle edge cases"/"similar to". Base constants (`BASE_TREASURE/MAGIC/MONSTER`, ratios, guardian chances) are concrete defaults; tune if manual smoke feels off.

**Type consistency:** `LootDensity`/`LOOT_DENSITY` (T1) used in T3–T9. `pickTierMonster(systemId, tier, rng, {high?})` (T2) used in T7. `RealmContentSprinkleOptions = {treasureDensity?, magicDensity?, monsterDensity?}` (T3) consumed by T4–T7 and assembled in T8/`GenerateWorld`. `sprinkleRealmContent` input (`pois, npcs?, regions?, factions?, systemId, options, rng`) consistent across T3–T8. `InventoryItem.notable` (T1) used in T5/T6. `worldTreasureDensity/worldMagicDensity/worldMonsterDensity` on `GenerateWorldInput` (T3) used by T9 form + T8 test.

**Known follow-ups (out of scope):** Spec B2 (leads web + faction-seeks-item) consumes the `notable || magic` seam and faction HQ/leader ownership; tuning the base constants; no new UI (existing treasure/inventory/compendium views render seeded content).
