# Treasure-Leads / Discovery Web (Spec B2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scatter rumors/notices/found-notes/NPC-knowledge across the world that point at real seeded items (POI- and NPC-held) and landmark secrets, give each non-party faction a quest to acquire a world item, and surface location-aware GM views of where treasure/magic/big-monsters are.

**Architecture:** A post-transaction world-gen pass (`executeGenerateTreasureLeads`) collects pointable finds after all items exist, runs a pure planner, and persists `Hook`s + their `Rumor`/`Notice` projections. Items become uniformly addressable via `{itemId, containerType, containerId}` (NPC inventory items gain ids). UI broadens rumor rendering, adds an NPC "rumors they know" block, a GM answer-key reveal, and extends the region overview to show holders/locations + big monsters.

**Tech Stack:** TypeScript (strict), Dexie, Vitest, `fake-indexeddb`, `SeededRandom`, the existing `Hook`/`Rumor`/`Notice` triad.

## Global Constraints

- **pnpm only.** Focused test: `pnpm test <path>`. Build gate: `pnpm build` (= `vite build && tsc --noEmit`). **Run `pnpm build` BEFORE every commit** — vitest does not typecheck.
- **Branch:** `feature/treasure-leads-web` (already checked out; B1 is on it). Never commit to `main`.
- **TDD:** failing test → minimal impl → passing test → `pnpm build` → commit, every task.
- **Determinism:** the planner takes a `SeededRandom`; same seed + inputs → same leads. Ids minted in the impure use-case layer.
- **Always-exact text:** the structured `Hook` holds the precise target; player-facing `Rumor`/`Notice` text names the item AND its exact site/holder.
- **Placement ≠ target:** a lead is placed at a holder DIFFERENT from the item's holder; per-settlement cap respected.
- **Pointable find:** `TreasureItem` with `notable || isMagic` (POI), `InventoryItem` with `notable || compendiumKind==='magicItem'` (NPC), plus each landmark's `landmarkLore.secret`.
- Use existing path aliases (`@domain/...`, `@application/...`, `~/...`, `@shared/...`).
- Current max Dexie version is **38** → this feature uses **39**.

---

## File Structure

- Modify `src/domain/value-objects/SystemBlock.ts` — `InventoryItem.id`.
- Modify `src/domain/entities/Hook.ts` — `targetType:'item'` + `containerType`/`containerId`.
- Modify `src/domain/entities/Rumor.ts` — `sourceNpcId`.
- Modify `src/components/shared/NPCInventoryEditor.tsx`, `src/domain/services/worldgen/seedTreasureHelpers.ts` — mint `InventoryItem.id`.
- Modify `src/infrastructure/dexie/db.ts` — v39 + read-hook backfills + `rumors` index.
- Modify `IRumorRepository`/`INoticeRepository` + their Dexie impls — add `bulkCreate`.
- Create `src/domain/services/worldgen/treasureLeads.ts` — pure `planTreasureLeads`.
- Create `src/application/use-cases/GenerateTreasureLeads.ts` — `executeGenerateTreasureLeads`.
- Modify `src/application/use-cases/GenerateWorld.ts` — post-pass call.
- Modify `src/components/poi-templates/GenericTemplate.tsx` — broaden `RumorList` render + GM reveal.
- Modify `src/components/shared/RumorList.tsx`, `NoticeBoard.tsx` — optional GM "points to" reveal.
- Create `src/ui/hooks/useNpcRumors.ts`; modify `src/routes/_app/realms/npcs_.$npcId.tsx` — "rumors they know".
- Modify `src/components/regions/regionContents.ts` + `RegionContentsPanel.tsx` — holder/location + big monsters.

---

# Phase 1 — Data model

### Task 1: `InventoryItem.id` (+ mint at all creation sites + backfill)

**Files:**
- Modify: `src/domain/value-objects/SystemBlock.ts`
- Modify: `src/domain/services/worldgen/seedTreasureHelpers.ts`
- Modify: `src/components/shared/NPCInventoryEditor.tsx`
- Modify: `src/infrastructure/dexie/db.ts` (npcs read-hook backfill)
- Test: `src/domain/services/worldgen/seedTreasureHelpers.test.ts` (extend)

**Interfaces:**
- Produces: `InventoryItem.id: string` (required). All creators mint `newId()`. Existing NPC inventory items are backfilled an `id` on read.

- [ ] **Step 1: Write the failing test**

Add to `seedTreasureHelpers.test.ts`:

```ts
import { newId } from '@shared/ulid'
it('pushMagicToNpc and pushTreasureToNpc give items a stable id', () => {
  const npc: any = { systemBlock: { inventory: [] } }
  // pushMagicToNpc / pushTreasureToNpc are exported from seedTreasureHelpers
  const { pushMagicToNpc, pushTreasureToNpc } = require('./seedTreasureHelpers')
  pushMagicToNpc(npc, { id: 'c1', name: 'Ring', description: '' }, true)
  pushTreasureToNpc(npc, { id: 't', name: 'Gold', description: '', value: '5gp', quantity: 1, collected: false })
  expect(npc.systemBlock.inventory[0].id).toBeTruthy()
  expect(npc.systemBlock.inventory[1].id).toBeTruthy()
  expect(npc.systemBlock.inventory[0].id).not.toBe(npc.systemBlock.inventory[1].id)
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/domain/services/worldgen/seedTreasureHelpers.test.ts -t "stable id"`
Expected: FAIL — `id` undefined.

- [ ] **Step 3: Add `id` to the type + all creators**

In `SystemBlock.ts`, add `id: string` as the FIRST field of `InventoryItem`.

In `seedTreasureHelpers.ts`, import `newId` (already imported) and set `id: newId()` in both `pushMagicToNpc`'s `item` and `pushTreasureToNpc`'s `invItem`.

In `NPCInventoryEditor.tsx`, add `id: newId()` to: `inventoryItemFromEntry`'s return, `inventoryItemFromTreasure`'s return, and the manual-add literal `{ id: newId(), name: '', slots: 1, description: '', source: 'manual' }`. Import `newId` from `@shared/ulid`.

- [ ] **Step 4: Backfill existing items on read**

In `db.ts` `db.npcs.hook('reading')`, after the systemBlock normalization, ensure inventory items have ids:

```ts
  if (rec.systemBlock) {
    const sb = (npc as Record<string, unknown>).systemBlock as Record<string, unknown>
    const inv = (sb.inventory as Array<Record<string, unknown>> | undefined) ?? []
    if (inv.some((it) => it.id === undefined)) {
      npc = { ...npc }
      ;(npc as Record<string, unknown>).systemBlock = {
        ...sb,
        inventory: inv.map((it) => (it.id === undefined ? { ...it, id: newId() } : it)),
      }
    }
  }
```

(`newId` must be imported at the top of `db.ts`.) Note: read-hook ids are non-deterministic but stable-per-record after first write; acceptable for legacy backfill.

- [ ] **Step 5: Run tests + build**

Run: `pnpm test src/domain/services/worldgen/seedTreasureHelpers.test.ts` → PASS.
Run: `pnpm test` then `pnpm build` → green (the `InventoryItem` shape change may surface other literals; `regionContents.test.ts` builds inventory items — add `id` there too if tsc flags it).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add stable id to InventoryItem (minted at all creators + backfilled)"
```

---

### Task 2: `HookSecret` item target + `Rumor.sourceNpcId`

**Files:**
- Modify: `src/domain/entities/Hook.ts`
- Modify: `src/domain/entities/Rumor.ts`
- Test: `src/domain/entities/Hook.itemTarget.test.ts` (new)

**Interfaces:**
- Produces: `HookSecret.targetType: 'poi'|'npc'|'faction'|'item'`; `HookSecret.containerType?: 'poi'|'npc'`; `HookSecret.containerId?: string`. `Rumor.sourceNpcId?: string | null`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import type { HookSecret } from './Hook'
import type { Rumor } from './Rumor'

describe('B2 entity extensions', () => {
  it('HookSecret supports item targets with a container', () => {
    const s: HookSecret = { kind: 'hidden_item', targetType: 'item', targetId: 'item1', containerType: 'npc', containerId: 'npc1', detail: 'x' }
    expect(s.containerType).toBe('npc')
  })
  it('Rumor supports sourceNpcId', () => {
    const r = { sourceNpcId: 'npc1' } as Partial<Rumor>
    expect(r.sourceNpcId).toBe('npc1')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/domain/entities/Hook.itemTarget.test.ts`
Expected: FAIL — `'item'`/`containerType` not assignable.

- [ ] **Step 3: Extend the types**

In `Hook.ts`:
```ts
export interface HookSecret {
  kind: 'captive' | 'hidden_item' | 'culprit' | 'destination' | 'truth'
  targetType: 'poi' | 'npc' | 'faction' | 'item'
  targetId: string
  containerType?: 'poi' | 'npc'   // for item targets: which POI/NPC holds it
  containerId?: string
  detail: string
}
```
In `Rumor.ts`, add `sourceNpcId?: string | null` after `hookId`.

- [ ] **Step 4: Run to verify it passes + build**

Run: `pnpm test src/domain/entities/Hook.itemTarget.test.ts` → PASS. `pnpm build` → clean.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: HookSecret item target + Rumor.sourceNpcId"
```

---

### Task 3: Dexie v39 + rumor/notice `bulkCreate`

**Files:**
- Modify: `src/infrastructure/dexie/db.ts`
- Modify: `src/application/ports/IRumorRepository.ts`, `INoticeRepository.ts`
- Modify: `src/infrastructure/dexie/repositories/RumorRepository.ts`, `NoticeRepository.ts`
- Test: `src/infrastructure/dexie/db.b2.test.ts` (new)

**Interfaces:**
- Produces: `rumors` index includes `sourceNpcId`; legacy rumors read back `sourceNpcId: null`. `IRumorRepository.bulkCreate(rumors: Rumor[])` + `INoticeRepository.bulkCreate(notices: Notice[])`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './db'
import { RumorRepository } from './repositories/RumorRepository'

describe('B2 dexie', () => {
  beforeEach(async () => { await db.open(); await db.rumors.clear() })
  it('legacy rumor reads back sourceNpcId null', async () => {
    const legacy: any = { id: 'r1', poiId: null, regionId: null, worldId: 'w', text: 't', source: 's', isUsed: false, isQuestHook: false, hookId: null, tags: [], createdAt: 1, updatedAt: 1 }
    await db.rumors.put(legacy)
    const read = await db.rumors.get('r1')
    expect(read?.sourceNpcId ?? null).toBeNull()
  })
  it('rumor bulkCreate inserts all', async () => {
    const repo = new RumorRepository()
    const mk = (id: string): any => ({ id, poiId: null, regionId: null, worldId: 'w', text: 't', source: 's', isUsed: false, isQuestHook: false, hookId: null, sourceNpcId: null, tags: [], createdAt: 1, updatedAt: 1 })
    await repo.bulkCreate([mk('a'), mk('b')])
    expect((await repo.getByRealmId('w')).length).toBe(2)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/infrastructure/dexie/db.b2.test.ts`
Expected: FAIL — `bulkCreate` missing.

- [ ] **Step 3: Implement**

In `db.ts`: define `storesV39` extending `storesV36` with `rumors: 'id, poiId, regionId, worldId, isUsed, hookId, sourceNpcId'`. Append:
```ts
const storesV39 = { ...storesV36, rumors: 'id, poiId, regionId, worldId, isUsed, hookId, sourceNpcId' }

// v39: Rumor.sourceNpcId (indexed) + HookSecret item-target fields (no index)
db.version(39).stores(storesV39).upgrade(async (tx) => {
  const rumors = await tx.table('rumors').toArray()
  for (const r of rumors) {
    if (r.sourceNpcId === undefined) await tx.table('rumors').put({ ...r, sourceNpcId: null })
  }
})
```
Add `sourceNpcId: null` to a `db.rumors.hook('reading')` defaults block (create one mirroring the pois hook if none exists; otherwise add the key).

In the ports, add `bulkCreate(rumors: Rumor[]): Promise<void>` / `bulkCreate(notices: Notice[]): Promise<void>`. In the Dexie repos, implement `async bulkCreate(rows) { await db.rumors.bulkPut(rows) }` (and `db.notices`).

- [ ] **Step 4: Run + build**

Run: `pnpm test src/infrastructure/dexie/db.b2.test.ts` → PASS. `pnpm test` + `pnpm build` → green.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: Dexie v39 (rumors.sourceNpcId) + rumor/notice bulkCreate"
```

---

# Phase 2 — Generation

### Task 4: pure `planTreasureLeads`

**Files:**
- Create: `src/domain/services/worldgen/treasureLeads.ts`
- Test: `src/domain/services/worldgen/treasureLeads.test.ts`

**Interfaces:**
- Produces:
```ts
export interface LeadTarget {
  kind: 'item' | 'landmark'
  // item:
  itemId?: string; itemName?: string; isMagic?: boolean
  containerType?: 'poi' | 'npc'; containerId?: string
  // landmark:
  landmarkPoiId?: string; secret?: string
  regionId: string | null
}
export interface LeadSource {
  kind: 'tavern' | 'npc' | 'note' | 'notice'
  poiId?: string      // tavern/note/notice placement POI
  npcId?: string      // npc-knowledge placement NPC
  isSettlement?: boolean
}
export interface LeadPlan { target: LeadTarget; source: LeadSource }
export function planTreasureLeads(
  targets: LeadTarget[],
  sources: { settlements: LeadSource[]; npcs: LeadSource[]; otherSites: LeadSource[] },
  rng: SeededRandom,
  opts?: { perSettlementCap?: number },
): LeadPlan[]
```
- Each target gets 1–2 plans; a plan's placement holder must differ from the target's holder (`source.poiId !== target.containerId`/`landmarkPoiId`, `source.npcId !== target.containerId`); per-settlement cap (default 3) on tavern+notice placements; source kind chosen by weight (tavern 0.4, note 0.3, npc 0.2, notice 0.1), falling back to an available kind. Deterministic.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { planTreasureLeads, type LeadTarget } from './treasureLeads'

const targets: LeadTarget[] = [
  { kind: 'item', itemId: 'i1', itemName: 'Sun Blade', isMagic: true, containerType: 'poi', containerId: 'poiA', regionId: 'r1' },
  { kind: 'item', itemId: 'i2', itemName: 'Ember Ring', isMagic: true, containerType: 'npc', containerId: 'npcG', regionId: 'r1' },
]
const sources = {
  settlements: [{ kind: 'tavern' as const, poiId: 'town1', isSettlement: true }, { kind: 'notice' as const, poiId: 'town1', isSettlement: true }],
  npcs: [{ kind: 'npc' as const, npcId: 'npcE' }],
  otherSites: [{ kind: 'note' as const, poiId: 'ruinB' }],
}

describe('planTreasureLeads', () => {
  it('produces 1-2 leads per target, placement != target holder', () => {
    const plans = planTreasureLeads(targets, sources, new SeededRandom('s'))
    for (const t of targets) {
      const forT = plans.filter((p) => p.target.itemId === t.itemId)
      expect(forT.length).toBeGreaterThanOrEqual(1)
      expect(forT.length).toBeLessThanOrEqual(2)
      for (const p of forT) {
        expect(p.source.poiId).not.toBe(t.containerId)
        expect(p.source.npcId).not.toBe(t.containerId)
      }
    }
  })
  it('is deterministic', () => {
    const a = planTreasureLeads(targets, sources, new SeededRandom('z'))
    const b = planTreasureLeads(targets, sources, new SeededRandom('z'))
    expect(a).toEqual(b)
  })
  it('respects the per-settlement cap', () => {
    const many: LeadTarget[] = Array.from({ length: 20 }, (_, i) => ({ kind: 'item', itemId: 'x' + i, itemName: 'X', isMagic: false, containerType: 'poi', containerId: 'p' + i, regionId: 'r1' }))
    const plans = planTreasureLeads(many, sources, new SeededRandom('c'), { perSettlementCap: 2 })
    const atTown1 = plans.filter((p) => (p.source.kind === 'tavern' || p.source.kind === 'notice') && p.source.poiId === 'town1')
    expect(atTown1.length).toBeLessThanOrEqual(2)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/domain/services/worldgen/treasureLeads.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
import type { SeededRandom } from '~/lib/dungeon/SeededRandom'
// (types as in the Interfaces block above)

const SOURCE_WEIGHTS: Array<{ kind: LeadSource['kind']; w: number }> = [
  { kind: 'tavern', w: 0.4 }, { kind: 'note', w: 0.3 }, { kind: 'npc', w: 0.2 }, { kind: 'notice', w: 0.1 },
]

function holderId(t: LeadTarget): string | undefined {
  return t.kind === 'landmark' ? t.landmarkPoiId : t.containerId
}

export function planTreasureLeads(
  targets: LeadTarget[],
  sources: { settlements: LeadSource[]; npcs: LeadSource[]; otherSites: LeadSource[] },
  rng: SeededRandom,
  opts: { perSettlementCap?: number } = {},
): LeadPlan[] {
  const cap = opts.perSettlementCap ?? 3
  const settlementCount = new Map<string, number>()
  const plans: LeadPlan[] = []

  const candidatesFor = (kind: LeadSource['kind'], t: LeadTarget): LeadSource[] => {
    const hid = holderId(t)
    if (kind === 'npc') return sources.npcs.filter((s) => s.npcId !== hid)
    if (kind === 'note') return sources.otherSites.filter((s) => s.poiId !== hid)
    // tavern/notice → settlements, honoring the cap and not the target's own POI
    return sources.settlements.filter((s) => s.kind === kind && s.poiId !== hid && (settlementCount.get(s.poiId!) ?? 0) < cap)
  }

  for (const t of targets) {
    const leadCount = rng.between(1, 2)
    for (let i = 0; i < leadCount; i++) {
      // weighted source kind, retried against availability
      const order = rng.shuffle(SOURCE_WEIGHTS.flatMap((e) => Array(Math.round(e.w * 10)).fill(e.kind)))
      let placed = false
      for (const kind of order) {
        const cands = candidatesFor(kind, t)
        if (cands.length === 0) continue
        const src = rng.pick(cands)
        if (src.kind === 'tavern' || src.kind === 'notice') settlementCount.set(src.poiId!, (settlementCount.get(src.poiId!) ?? 0) + 1)
        plans.push({ target: t, source: src })
        placed = true
        break
      }
      if (!placed) break // no eligible placement for this target
    }
  }
  return plans
}
```

(Define the interfaces from the Interfaces block at the top of the file.)

- [ ] **Step 4: Run + build**

Run: `pnpm test src/domain/services/worldgen/treasureLeads.test.ts` → PASS. `pnpm build` → clean.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: pure planTreasureLeads"
```

---

### Task 5: `executeGenerateTreasureLeads` use-case

**Files:**
- Create: `src/application/use-cases/GenerateTreasureLeads.ts`
- Test: `src/application/use-cases/GenerateTreasureLeads.test.ts`

**Interfaces:**
- Consumes: `planTreasureLeads` (Task 4); ports `IPOIRepository`, `INPCRepository`, `IHookRepository`, `IRumorRepository`, `INoticeRepository`.
- Produces: `executeGenerateTreasureLeads(input: { worldId: string; seed: string }, deps: { poiRepo, npcRepo, hookRepo, rumorRepo, noticeRepo }): Promise<void>` — collects pointable targets from committed POIs/NPCs, builds placement sources, plans leads, and writes a `Hook` + a `Rumor` (tavern/npc/note) or `Notice` (notice) per plan.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@infrastructure/dexie/db'
import { createContainer } from '@infrastructure/container'
import { buildPOI } from '@domain/services/worldgen/buildPoi'
import { executeGenerateTreasureLeads } from './GenerateTreasureLeads'

const c = createContainer()
const deps = () => ({ poiRepo: c.poiRepo, npcRepo: c.npcRepo, hookRepo: c.hookRepo, rumorRepo: c.rumorRepo, noticeRepo: c.noticeRepo })

beforeEach(async () => { await db.open(); await Promise.all([db.pois.clear(), db.npcs.clear(), db.hooks.clear(), db.rumors.clear(), db.notices.clear()]) })

describe('executeGenerateTreasureLeads', () => {
  it('creates item-targeted hooks + projections for notable finds', async () => {
    const town = buildPOI({ regionId: 'r1', name: 'Town', type: 'settlement' }); await db.pois.put(town)
    const vault = buildPOI({ regionId: 'r1', name: 'Vault', type: 'landmark' })
    vault.treasure = [{ id: 'itm1', name: 'Sun Blade', description: '', value: 'priceless', quantity: 1, collected: false, isMagic: true, notable: true }]
    await db.pois.put(vault)
    await executeGenerateTreasureLeads({ worldId: 'w', seed: 'leads-1' }, deps())
    const hooks = await db.hooks.where('worldId').equals('w').toArray()
    const itemHook = hooks.find((h) => h.secret.targetType === 'item' && h.secret.targetId === 'itm1')
    expect(itemHook).toBeTruthy()
    expect(itemHook!.secret.containerType).toBe('poi')
    expect(itemHook!.secret.containerId).toBe(vault.id)
    const rumorsAndNotices = [...(await db.rumors.toArray()), ...(await db.notices.toArray())]
    expect(rumorsAndNotices.some((x) => x.hookId === itemHook!.id)).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/application/use-cases/GenerateTreasureLeads.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
import type { IPOIRepository } from '@application/ports/IPOIRepository'
import type { INPCRepository } from '@application/ports/INPCRepository'
import type { IHookRepository } from '@application/ports/IHookRepository'
import type { IRumorRepository } from '@application/ports/IRumorRepository'
import type { INoticeRepository } from '@application/ports/INoticeRepository'
import type { Hook } from '@domain/entities/Hook'
import type { Rumor } from '@domain/entities/Rumor'
import type { Notice } from '@domain/entities/Notice'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { newId } from '@shared/ulid'
import { planTreasureLeads, type LeadTarget, type LeadSource } from '@domain/services/worldgen/treasureLeads'

export interface GenerateTreasureLeadsInput { worldId: string; seed: string }
export interface GenerateTreasureLeadsDeps {
  poiRepo: IPOIRepository; npcRepo: INPCRepository
  hookRepo: IHookRepository; rumorRepo: IRumorRepository; noticeRepo: INoticeRepository
}

export async function executeGenerateTreasureLeads(input: GenerateTreasureLeadsInput, deps: GenerateTreasureLeadsDeps): Promise<void> {
  const pois = await deps.poiRepo.getByRealmId(input.worldId)   // confirm method name (see note)
  const npcs = await deps.npcRepo.getByRealmId(input.worldId)
  const poiName = new Map(pois.map((p) => [p.id, p.name]))
  const npcName = new Map(npcs.map((n) => [n.id, n.name]))

  // Collect pointable targets
  const targets: LeadTarget[] = []
  for (const p of pois) {
    for (const t of p.treasure) {
      if (t.notable || t.isMagic) targets.push({ kind: 'item', itemId: t.id, itemName: t.name, isMagic: !!t.isMagic, containerType: 'poi', containerId: p.id, regionId: p.regionId })
    }
    if (p.type === 'landmark' && p.landmarkLore?.secret) targets.push({ kind: 'landmark', landmarkPoiId: p.id, secret: p.landmarkLore.secret, regionId: p.regionId })
  }
  for (const n of npcs) {
    for (const it of n.systemBlock?.inventory ?? []) {
      if (it.notable || it.compendiumKind === 'magicItem') targets.push({ kind: 'item', itemId: it.id, itemName: it.name, isMagic: it.compendiumKind === 'magicItem', containerType: 'npc', containerId: n.id, regionId: n.regionId })
    }
  }
  if (targets.length === 0) return

  // Build placement sources
  const settlements: LeadSource[] = pois.filter((p) => p.type === 'settlement').flatMap((p) => [
    { kind: 'tavern' as const, poiId: p.id, isSettlement: true },
    { kind: 'notice' as const, poiId: p.id, isSettlement: true },
  ])
  const npcSources: LeadSource[] = npcs.map((n) => ({ kind: 'npc' as const, npcId: n.id }))
  const otherSites: LeadSource[] = pois.filter((p) => p.type !== 'settlement').map((p) => ({ kind: 'note' as const, poiId: p.id }))

  const rng = new SeededRandom(input.seed)
  const plans = planTreasureLeads(targets, { settlements, npcs: npcSources, otherSites }, rng)

  const now = Date.now()
  const hooks: Hook[] = []; const rumors: Rumor[] = []; const notices: Notice[] = []

  const where = (t: LeadTarget): string =>
    t.kind === 'landmark' ? (poiName.get(t.landmarkPoiId!) ?? 'a strange place')
      : t.containerType === 'npc' ? (npcName.get(t.containerId!) ?? 'someone')
      : (poiName.get(t.containerId!) ?? 'a forgotten place')
  const itemLabel = (t: LeadTarget): string => t.kind === 'landmark' ? 'a hidden secret' : (t.itemName ?? 'something valuable')

  for (const { target, source } of plans) {
    const hookId = newId()
    hooks.push({
      id: hookId, worldId: input.worldId, type: target.isMagic ? 'artifact' : 'lost_item',
      title: `Recover ${itemLabel(target)}`, status: 'open', contactNpcId: source.npcId ?? null,
      rewardText: 'Coin, and the gratitude of the one who told you.',
      secret: target.kind === 'landmark'
        ? { kind: 'truth', targetType: 'poi', targetId: target.landmarkPoiId!, detail: target.secret ?? '' }
        : { kind: 'hidden_item', targetType: 'item', targetId: target.itemId!, containerType: target.containerType, containerId: target.containerId, detail: `${itemLabel(target)} is held by ${where(target)}.` },
      createdAt: now, updatedAt: now,
    })
    const text = `They say ${itemLabel(target)} can be found with ${where(target)}.`
    if (source.kind === 'notice') {
      notices.push({ id: newId(), poiId: source.poiId ?? null, regionId: null, worldId: input.worldId, title: `Sought: ${itemLabel(target)}`, description: text, type: 'request', reward: 'Negotiable.', contactNpcId: null, hookId, isUsed: false, tags: ['treasure-lead'], createdAt: now, updatedAt: now })
    } else {
      const flavorSource = source.kind === 'tavern' ? 'tavern talk' : source.kind === 'note' ? 'a found note' : (npcName.get(source.npcId!) ?? 'a local')
      rumors.push({ id: newId(), poiId: source.poiId ?? null, regionId: null, worldId: input.worldId, text, source: flavorSource, isUsed: false, isQuestHook: true, hookId, sourceNpcId: source.npcId ?? null, tags: ['treasure-lead'], createdAt: now, updatedAt: now })
    }
  }

  await deps.hookRepo.bulkCreate(hooks)
  if (rumors.length) await deps.rumorRepo.bulkCreate(rumors)
  if (notices.length) await deps.noticeRepo.bulkCreate(notices)
}
```

NOTE: confirm `IPOIRepository`/`INPCRepository` have a `getByRealmId(worldId)` (NPC repo does; POI repo — check; if it's `getByWorldId` or requires region iteration, adapt — e.g. `db.pois.where('...').` is not available via port, so use the actual port method). If the POI port lacks a world-wide getter, add one or read via the regions. Match real signatures.

- [ ] **Step 4: Run + build**

Run: `pnpm test src/application/use-cases/GenerateTreasureLeads.test.ts` → PASS. `pnpm test` + `pnpm build` → green.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: executeGenerateTreasureLeads use-case"
```

---

### Task 6: faction-seeks-item

**Files:**
- Modify: `src/application/use-cases/GenerateTreasureLeads.ts`
- Test: `src/application/use-cases/GenerateTreasureLeads.test.ts` (extend)

**Interfaces:**
- Consumes: `IFactionRepository`. Adds `factionRepo` to `GenerateTreasureLeadsDeps`.
- Produces: each non-party faction with a leader gets a `Hook` (contact = leader, secret → an item NOT held at its own HQ/leader) + a `Notice` at the faction HQ.

- [ ] **Step 1: Write the failing test**

```ts
it('gives each non-party faction a seeks-item hook + HQ notice', async () => {
  const hq = buildPOI({ regionId: 'r1', name: 'Hall', type: 'settlement' }); await db.pois.put(hq)
  const vault = buildPOI({ regionId: 'r1', name: 'Vault', type: 'landmark' })
  vault.treasure = [{ id: 'crown1', name: 'Iron Crown', description: '', value: 'priceless', quantity: 1, collected: false, isMagic: true, notable: true }]
  await db.pois.put(vault)
  await db.npcs.put({ id: 'leadA', worldId: 'w', name: 'Sera', factionIds: ['fA'], regionId: 'r1', poiId: hq.id, lifeStatus: 'alive', movementStatus: 'present', description: '', traits: [], motivation: '', appearance: '', voice: '', want: '', tags: [], imageUrl: null, systemBlock: { inventory: [] } as any, starred: false, createdAt: 1, updatedAt: 1 } as any)
  await db.factions.put({ id: 'fA', worldId: 'w', name: 'Iron Order', description: '', type: 'mil', status: 'active', isParty: false, regionId: 'r1', headquartersPoiId: hq.id, leaderNpcId: 'leadA', agentNpcIds: [], agendaGoals: [], advantages: [], obstacles: [], traits: [], sortOrder: 0, createdAt: 1, updatedAt: 1 } as any)
  const dz = { poiRepo: c.poiRepo, npcRepo: c.npcRepo, hookRepo: c.hookRepo, rumorRepo: c.rumorRepo, noticeRepo: c.noticeRepo, factionRepo: c.factionRepo }
  await executeGenerateTreasureLeads({ worldId: 'w', seed: 'fac-leads' }, dz)
  const hooks = await db.hooks.where('worldId').equals('w').toArray()
  const seeks = hooks.find((h) => h.contactNpcId === 'leadA' && h.secret.targetType === 'item')
  expect(seeks).toBeTruthy()
  const notices = await db.notices.where('worldId').equals('w').toArray()
  expect(notices.some((n) => n.poiId === hq.id && n.hookId === seeks!.id)).toBe(true)
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/application/use-cases/GenerateTreasureLeads.test.ts -t "seeks-item"`
Expected: FAIL — no faction pass / `factionRepo` missing.

- [ ] **Step 3: Implement**

Add `factionRepo: IFactionRepository` to `GenerateTreasureLeadsDeps` (import the port). After the lead loop, before the bulk writes, add a faction pass:

```ts
  const factions = await deps.factionRepo.getByRealmId(input.worldId) // confirm method name
  const frng = rng.child('faction-seeks')
  for (const f of factions) {
    if (f.isParty || !f.leaderNpcId) continue
    // an item NOT held at this faction's own HQ/leader
    const candidates = targets.filter((t) => t.kind === 'item' && t.containerId !== f.headquartersPoiId && t.containerId !== f.leaderNpcId)
    if (candidates.length === 0) continue
    const t = frng.pick(candidates)
    const hookId = newId()
    hooks.push({
      id: hookId, worldId: input.worldId, type: 'artifact', title: `${f.name} seeks ${itemLabel(t)}`, status: 'open',
      contactNpcId: f.leaderNpcId, rewardText: 'The favor of the faction.',
      secret: { kind: 'hidden_item', targetType: 'item', targetId: t.itemId!, containerType: t.containerType, containerId: t.containerId, detail: `${f.name} covets ${itemLabel(t)}, last known to be with ${where(t)}.` },
      createdAt: now, updatedAt: now,
    })
    if (f.headquartersPoiId) {
      notices.push({ id: newId(), poiId: f.headquartersPoiId, regionId: f.regionId, worldId: input.worldId, title: `${f.name} seeks ${itemLabel(t)}`, description: `The ${f.name} will reward whoever brings them ${itemLabel(t)}, last seen with ${where(t)}.`, type: 'bounty', reward: 'The favor of the faction.', contactNpcId: f.leaderNpcId, hookId, isUsed: false, tags: ['faction-seeks'], createdAt: now, updatedAt: now })
    }
  }
```

(Move the `bulkCreate` writes to after this pass.)

- [ ] **Step 4: Run + build**

Run: `pnpm test src/application/use-cases/GenerateTreasureLeads.test.ts` → PASS. `pnpm build` → clean.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: faction-seeks-item hooks + HQ notices"
```

---

### Task 7: wire the post-pass into world gen

**Files:**
- Modify: `src/application/use-cases/GenerateWorld.ts`
- Test: `src/application/use-cases/GenerateWorld.test.ts` (extend)

**Interfaces:**
- Produces: `executeGenerateTreasureLeads` runs in the post-transaction tail (after ruin/dungeon/landmark pregen), so leads point at fully-seeded items. `GenerateWorldDeps` already supplies poiRepo/npcRepo/factionRepo; add hookRepo/rumorRepo/noticeRepo if missing.

- [ ] **Step 1: Write the failing integration test**

```ts
it('generates treasure leads after world gen', async () => {
  await executeGenerateWorld({ name: 'T', systemId: 'system-cairn-2e', seed: 'leadworld', size: 'medium', worldMagicDensity: 'frequent', worldTreasureDensity: 'frequent', worldMonsterDensity: 'moderate' } as any, deps() as any)
  const hooks = await db.hooks.toArray()
  expect(hooks.some((h) => h.secret.targetType === 'item' && (h.tags?.includes?.('treasure-lead') ?? true))).toBe(true)
  const rumors = await db.rumors.toArray()
  expect(rumors.some((r) => r.tags?.includes('treasure-lead') || r.tags?.includes('faction-seeks'))).toBe(true)
})
```
(Adjust assertions to the real shapes; the key check is that item-targeted hooks exist post-gen.)

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/application/use-cases/GenerateWorld.test.ts -t "treasure leads"`
Expected: FAIL — no leads generated.

- [ ] **Step 3: Wire the call**

Add `hookRepo`/`rumorRepo`/`noticeRepo` to `GenerateWorldDeps` if not present (import ports; container provides them — update the route + test `deps()` callers like prior tasks). After the ruin pregen loop, before `return`:

```ts
  await executeGenerateTreasureLeads(
    { worldId: realmId, seed: `${input.seed}-leads` },
    { poiRepo: deps.poiRepo, npcRepo: deps.npcRepo, hookRepo: deps.hookRepo, rumorRepo: deps.rumorRepo, noticeRepo: deps.noticeRepo, factionRepo: deps.factionRepo },
  )
```

Add `import { executeGenerateTreasureLeads } from './GenerateTreasureLeads'`. Update every `executeGenerateWorld` caller (route `new.tsx`, test `deps()` helpers) to include the three repos if newly added to deps.

- [ ] **Step 4: Run + build**

Run: `pnpm test src/application/use-cases/GenerateWorld.test.ts` → PASS. `pnpm test` + `pnpm build` → green.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: run treasure-leads post-pass in world gen"
```

---

# Phase 3 — UI

### Task 8: broaden `RumorList` rendering

**Files:**
- Modify: `src/components/poi-templates/GenericTemplate.tsx`

**Interfaces:**
- Consumes: existing `rumors` + `on*Rumor*` props already passed to `GenericTemplate`.

- [ ] **Step 1: Change the gate**

In `GenericTemplate.tsx`, the `RumorList` is gated `poi.type === "ruin"`. Broaden to the POI types where leads land (ruin, landmark, natural, camp, shrine, fortification, other, building) — i.e. show it for every non-dungeon type this template serves. Replace the guard with: render `RumorList` whenever `rumors.length > 0 || poi.type === 'ruin'` (so empty sections don't appear on types that never get leads, but any POI carrying leads shows them).

```tsx
{(rumors.length > 0 || poi.type === "ruin") && (
  <RumorList rumors={rumors} onToggleUsed={onToggleRumorUsed} onCreate={onCreateRumor} onDelete={onDeleteRumor} />
)}
```

- [ ] **Step 2: Build + manual verify**

Run: `pnpm build` → clean (no component-render harness; build is the gate). Manual: a landmark/POI that received a lead shows its rumor.

- [ ] **Step 3: Commit**

```bash
git add src/components/poi-templates/GenericTemplate.tsx
git commit -m "feat: show RumorList on any POI carrying leads"
```

---

### Task 9: NPC "Rumors they know"

**Files:**
- Create: `src/ui/hooks/useNpcRumors.ts`
- Modify: `src/routes/_app/realms/npcs_.$npcId.tsx`
- Test: `src/ui/hooks/useNpcRumors.test.ts`

**Interfaces:**
- Produces: `useNpcRumors(worldId: string | null, npcId: string | null): Rumor[]` — `db.rumors` where `sourceNpcId === npcId`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@infrastructure/dexie/db'

describe('npc rumors query', () => {
  beforeEach(async () => { await db.open(); await db.rumors.clear() })
  it('finds rumors by sourceNpcId', async () => {
    await db.rumors.bulkPut([
      { id: 'r1', poiId: null, regionId: null, worldId: 'w', text: 't', source: 's', isUsed: false, isQuestHook: true, hookId: null, sourceNpcId: 'npc1', tags: [], createdAt: 1, updatedAt: 1 },
      { id: 'r2', poiId: null, regionId: null, worldId: 'w', text: 't', source: 's', isUsed: false, isQuestHook: true, hookId: null, sourceNpcId: 'npc2', tags: [], createdAt: 1, updatedAt: 1 },
    ] as any)
    const got = (await db.rumors.toArray()).filter((r) => r.sourceNpcId === 'npc1')
    expect(got.map((r) => r.id)).toEqual(['r1'])
  })
})
```

- [ ] **Step 2: Run to verify it fails / passes**

Run: `pnpm test src/ui/hooks/useNpcRumors.test.ts`
Expected: PASS once `sourceNpcId` exists (Task 2/3 added it) — this test asserts the query shape the hook uses. (If it fails, the field/index is missing.)

- [ ] **Step 3: Implement the hook + render**

`useNpcRumors.ts`:
```ts
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@infrastructure/dexie/db'
import type { Rumor } from '@domain/entities/Rumor'
export function useNpcRumors(worldId: string | null, npcId: string | null): Rumor[] {
  return useLiveQuery(async () => {
    if (!worldId || !npcId) return []
    return (await db.rumors.where('worldId').equals(worldId).toArray()).filter((r) => r.sourceNpcId === npcId)
  }, [worldId, npcId]) ?? []
}
```

In `npcs_.$npcId.tsx`: `const npcRumors = useNpcRumors(npc?.worldId ?? null, npcId)`. After the "Quests & Hooks" card, add a "Rumors They Know" card (mirror that card's structure) listing each rumor's `text` + `source`, shown when `npcRumors.length > 0`.

- [ ] **Step 4: Build + commit**

Run: `pnpm test src/ui/hooks/useNpcRumors.test.ts` → PASS. `pnpm build` → clean.

```bash
git add -A
git commit -m "feat: NPC 'rumors they know' block"
```

---

### Task 10: GM answer-key reveal on leads

**Files:**
- Modify: `src/components/shared/RumorList.tsx`, `src/components/shared/NoticeBoard.tsx`
- Modify: `src/components/poi-templates/GenericTemplate.tsx` + `SettlementTemplate.tsx` (pass the resolver)

**Interfaces:**
- Produces: `RumorList`/`NoticeBoard` accept an optional `resolveTarget?: (hookId: string) => string | null` and render a muted GM-only "Points to: {resolved}" line when present.

- [ ] **Step 1: Add the optional prop + render**

In `RumorList.tsx` and `NoticeBoard.tsx`, add `resolveTarget?: (hookId: string) => string | null` to props. For each rumor/notice with a `hookId`, render `{r.hookId && resolveTarget?.(r.hookId) && (<p className="text-xs text-muted-foreground">🔑 Points to: {resolveTarget(r.hookId)}</p>)}`.

- [ ] **Step 2: Provide the resolver from the templates**

In `GenericTemplate.tsx`/`SettlementTemplate.tsx`, build a `resolveTarget` from the realm's hooks (load via a `useHooks`-style query already available, or pass hooks in). Map `hookId → human string`: for `secret.targetType==='item'`, `"{detail}"` already reads naturally (e.g. "Sun Blade is held by Grik"); else for `'poi'` use the POI name. A minimal resolver: look up the hook by id and return `hook.secret.detail`. Pass `resolveTarget` to `RumorList`/`NoticeBoard`.

(If wiring realm hooks into these templates is heavy, scope this task to: resolver returns `hook.secret.detail` via a passed `hooksById` map; the template builds the map from a `useHooks(worldId)` live query. Confirm a hooks hook exists — `useNpcHooks` shows the `db.hooks` query pattern.)

- [ ] **Step 3: Build + commit**

Run: `pnpm build` → clean.

```bash
git add -A
git commit -m "feat: GM answer-key reveal on rumors/notices"
```

---

### Task 11: location-aware region overview

**Files:**
- Modify: `src/components/regions/regionContents.ts`
- Modify: `src/components/regions/RegionContentsPanel.tsx`
- Test: `src/components/regions/regionContents.test.ts` (extend)

**Interfaces:**
- Produces: `summarizeRegionContents(pois, npcs)` returns holder/location per highlight and a big-monsters-with-location list:
```ts
export interface RegionContents {
  treasureCount: number
  magicCount: number
  highlights: { name: string; kind: 'magic' | 'notable'; location: string }[]
  bigMonsters: { name: string; location: string; count: number }[]
  monsters: { name: string; count: number }[]   // kept for the total
}
```
`location` = the holding POI name (or NPC name). `bigMonsters` = monster refs whose `monsterThreat` ≥ the region tier's upper band, named via compendium, with the holding POI name.

- [ ] **Step 1: Write the failing test**

```ts
it('reports holder location per highlight and big monsters with location', () => {
  const mill = buildPOI({ regionId: 'r', name: 'Old Mill', type: 'landmark' })
  mill.treasure = [{ id: 't1', name: 'Sun Blade', description: '', value: 'priceless', quantity: 1, collected: false, isMagic: true, notable: true }]
  mill.monsterRefs = [{ id: 'mon-ogre', quantity: 1 }]
  const s = summarizeRegionContents([mill], [])
  expect(s.highlights[0]).toMatchObject({ name: 'Sun Blade', location: 'Old Mill' })
  // bigMonsters resolves names + location (mon-ogre may resolve to its id if not in compendium)
  expect(s.bigMonsters.some((m) => m.location === 'Old Mill')).toBe(true)
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/components/regions/regionContents.test.ts -t "holder location"`
Expected: FAIL — `highlights[].location`/`bigMonsters` missing.

- [ ] **Step 3: Implement**

Rework `summarizeRegionContents` to keep holder identity:
- POI items: map to `{ name, magic, notable, location: poi.name }`.
- NPC items (filtered as today): `{ name, magic, notable, location: npc.name }`.
- `highlights` carry `location`.
- `bigMonsters`: iterate `pois`; for each `monsterRefs` entry, resolve the compendium monster; include it when `monsterThreat(monster) >= upperBand(tier)` — derive the region tier via the region's biome if available, else include the top-quartile by threat; `location: poi.name`. (Import `monsterThreat` from `~/lib/worldgen/compendium-utils`; resolve the monster via `getCompendiumById` → cast to `CompendiumMonster` for `monsterThreat`. If the ref isn't a compendium monster, skip it from bigMonsters but keep it in `monsters`.)
- Keep `treasureCount`/`magicCount`/`monsters` as before.

Update `RegionContentsPanel.tsx` to render: "Notable finds: Sun Blade — Old Mill, …" and a "Big monsters: Ogre — Old Mill" line.

- [ ] **Step 4: Run + build + commit**

Run: `pnpm test src/components/regions/regionContents.test.ts` → PASS. `pnpm build` → clean.

```bash
git add -A
git commit -m "feat: location-aware region overview (holders + big monsters)"
```

---

### Task 12: full verification

**Files:** none (verification only)

- [ ] **Step 1: Full suite** — Run: `pnpm test` → all pass (new B2 tests + the B1/ruin/dungeon suites).
- [ ] **Step 2: Build** — Run: `pnpm build` → `vite build` + `tsc --noEmit` clean.
- [ ] **Step 3: Manual smoke** — `pnpm dev`, generate a world: confirm rumors/notices appear pointing at named items at named sites; an NPC's page shows "rumors they know"; factions have a "seeks" notice at HQ; the region overview lists treasures/magic with locations + big monsters with locations; the GM "points to" line shows on a lead.
- [ ] **Step 4: Commit (fixups)** — `git add -A && git commit -m "test: B2 suite green" --allow-empty`

---

## Self-Review

**Spec coverage (spec → task):**
- `InventoryItem.id` (uniform item targets) → T1. ✓
- `HookSecret` item target + container; `Rumor.sourceNpcId` → T2. ✓
- Dexie v39 + rumor/notice bulkCreate → T3. ✓
- Pure planner (1–2/target, placement≠holder, per-settlement cap, exact) → T4. ✓
- Use-case: collect pointable POI+NPC items + landmark secrets → Hook+Rumor/Notice → T5. ✓
- Faction-seeks-item → T6. ✓
- Post-pass after all items exist → T7. ✓
- Broaden RumorList → T8. NPC "rumors they know" → T9. GM reveal → T10. ✓
- Location-aware region views (holders + big monsters) → T11. ✓
- Determinism / migration → asserted in T4 (deterministic), T3 (legacy read), T1 (backfill). ✓

**Placeholder scan:** No TBD/"handle edge cases". `getByRealmId` on POI/faction repos is flagged "confirm method name" in T5/T6 — implementers verify the real port method (a known unknown, not a placeholder).

**Type consistency:** `LeadTarget`/`LeadSource`/`LeadPlan` (T4) consumed by T5/T6. `HookSecret` item fields (T2) used in T5/T6. `InventoryItem.id` (T1) read in T5's NPC collection. `RegionContents` shape (T11) matches its panel. `executeGenerateTreasureLeads(input, deps)` (T5) matches the T7 call site.

**Known follow-ups:** B3 (encounter ↔ region/discovery integration) consumes this leads + location data. Regen idempotency: the post-pass is additive on re-run — acceptable for fresh world-gen; a dedupe/clear pass is out of scope.
