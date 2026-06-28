# Encounter ↔ Region / Discovery Integration (Spec B3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Seed a region's encounter table from its own tier, monsters, and discovery sites, and let omen/discovery rolls point at real nearby POIs.

**Architecture:** A pure `buildRegionEncounterContent` produces all six category arrays from region data; it auto-seeds the region's lazily-created table and powers a "Regenerate from region" button. A `matchRegionLocation` resolver (mirroring `matchCompendiumMonster`) attaches a `locationMatch` to omen/discovery cascade rolls via a new **optional** `matchLocation` effect — so the POI/dungeon cascade path is untouched.

**Tech Stack:** TypeScript (strict), Dexie, Vitest, `SeededRandom`, the existing encounter cascade engine + compendium/tier helpers.

## Global Constraints

- **pnpm only.** Focused test: `pnpm test <path>`. Build gate: `pnpm build` (= `vite build && tsc --noEmit`). **Run `pnpm build` BEFORE every commit** — vitest does not typecheck.
- **Branch:** `feature/encounter-region-integration` (checked out). Never commit to `main`.
- **TDD:** failing test → minimal impl → passing test → build → commit, every task.
- **Determinism:** `buildRegionEncounterContent` is pure (seeded `SeededRandom`); compendium name resolution is static (no DB in the builder).
- **Scope: region encounter tables only** (`ownerRegionId`). POI/dungeon tables (`ownerPoiId`) and the POI cascade path stay untouched — achieved by making `matchLocation`/`regionPois` OPTIONAL.
- **No `EncounterTable` schema change** — categories stay flat `string[]`. The only data-model change is `EncounterRollResult.locationMatch`.
- Use existing path aliases.

---

## File Structure

- Create `src/domain/services/matchRegionLocation.ts` — POI-name resolver.
- Modify `src/domain/value-objects/EncounterRollResult.ts` — `locationMatch`.
- Modify `src/domain/services/encounterCascade.ts` — `matchLocation` effect + attach `locationMatch` for signOmen/discovery.
- Modify `src/application/use-cases/RollEncounterCascade.ts` — `CascadeContext.regionPois` + wire `matchLocation`.
- Create `src/domain/services/worldgen/regionEncounter.ts` — `buildRegionEncounterContent`.
- Create `src/application/use-cases/RegenerateRegionEncounter.ts` — regenerate use-case.
- Modify `src/routes/_app/realms/regions_.$regionId.tsx` — auto-seed on lazy create, pass `regionPois` to ctx, wire regenerate.
- Modify `src/components/shared/EncounterCascade.tsx` — "Regenerate from region" button (optional prop).
- Modify `src/components/shared/EncounterResultCards.tsx` — render `locationMatch` link.

---

### Task 1: `matchRegionLocation` resolver

**Files:**
- Create: `src/domain/services/matchRegionLocation.ts`
- Test: `src/domain/services/matchRegionLocation.test.ts`

**Interfaces:**
- Produces: `matchRegionLocation(entryText: string, pois: { id: string; name: string }[]): { poiId: string; name: string } | null` — case-insensitive substring match of a POI name in the entry text; longest name wins; null if none.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { matchRegionLocation } from './matchRegionLocation'

const pois = [{ id: 'p1', name: 'Broken Tower' }, { id: 'p2', name: 'Tower' }]

describe('matchRegionLocation', () => {
  it('matches a POI name in the text, longest wins', () => {
    expect(matchRegionLocation('tracks lead toward the Broken Tower', pois)).toEqual({ poiId: 'p1', name: 'Broken Tower' })
  })
  it('returns null when no POI name appears', () => {
    expect(matchRegionLocation('a quiet afternoon', pois)).toBeNull()
  })
  it('ignores empty names', () => {
    expect(matchRegionLocation('anything', [{ id: 'x', name: '' }])).toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/domain/services/matchRegionLocation.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
/** Best-effort match of an encounter entry to a region POI by name (longest wins). */
export function matchRegionLocation(
  entryText: string,
  pois: { id: string; name: string }[],
): { poiId: string; name: string } | null {
  const text = entryText.toLowerCase()
  const matches = pois.filter((p) => p.name && text.includes(p.name.toLowerCase()))
  if (matches.length === 0) return null
  matches.sort((a, b) => b.name.length - a.name.length)
  return { poiId: matches[0].id, name: matches[0].name }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test src/domain/services/matchRegionLocation.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/services/matchRegionLocation.ts src/domain/services/matchRegionLocation.test.ts
git commit -m "feat: matchRegionLocation resolver"
```

---

### Task 2: cascade `locationMatch` for omen/discovery

**Files:**
- Modify: `src/domain/value-objects/EncounterRollResult.ts`
- Modify: `src/domain/services/encounterCascade.ts`
- Modify: `src/application/use-cases/RollEncounterCascade.ts`
- Test: `src/domain/services/encounterCascade.location.test.ts`

**Interfaces:**
- Consumes: `matchRegionLocation` (Task 1).
- Produces: `EncounterRollResult.locationMatch?: { poiId: string; name: string } | null`. `CascadeEffects.matchLocation?: (text: string) => { poiId: string; name: string } | null` (optional). `CascadeContext.regionPois?: { id: string; name: string }[]` (optional). `buildResult` attaches `locationMatch` for `signOmen`/`discovery` categories when `matchLocation` is provided.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { rollCascade, type CascadeSection, type CascadeEffects } from './encounterCascade'

const fx = (category: string): CascadeEffects => ({
  rollDie: () => 1,
  rollReaction: () => ({ roll: 7, disposition: 'curious' }),
  generateNpc: async () => ({}) as any,
  matchMonster: () => null,
  matchLocation: (text) => (text.includes('Broken Tower') ? { poiId: 'p1', name: 'Broken Tower' } : null),
  now: () => 0,
})

describe('cascade locationMatch', () => {
  it('attaches locationMatch for a signOmen roll', async () => {
    const sections: CascadeSection[] = [{ category: 'signOmen', label: 'Sign / Omen', entries: ['tracks toward the Broken Tower'], isCustom: false }]
    const r = await rollCascade(sections, fx('signOmen'))
    expect(r.locationMatch).toEqual({ poiId: 'p1', name: 'Broken Tower' })
  })
  it('attaches locationMatch for a discovery roll', async () => {
    const sections: CascadeSection[] = [{ category: 'discovery', label: 'Discovery', entries: ['The Broken Tower'], isCustom: false }]
    const r = await rollCascade(sections, fx('discovery'))
    expect(r.locationMatch?.poiId).toBe('p1')
  })
  it('does not attach for creature/loss', async () => {
    const sections: CascadeSection[] = [{ category: 'loss', label: 'Loss', entries: ['Broken Tower mentioned'], isCustom: false }]
    const r = await rollCascade(sections, fx('loss'))
    expect(r.locationMatch ?? null).toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/domain/services/encounterCascade.location.test.ts`
Expected: FAIL — `matchLocation` not on `CascadeEffects` / `locationMatch` not set.

- [ ] **Step 3: Implement**

In `EncounterRollResult.ts`, add after `monsterMatch`:
```ts
  /** signOmen/discovery only: matched region POI */
  locationMatch?: { poiId: string; name: string } | null
```

In `encounterCascade.ts`, add to `CascadeEffects`:
```ts
  matchLocation?: (text: string) => { poiId: string; name: string } | null
```
In `buildResult`, replace the final `return base` with:
```ts
  if (section.category === 'signOmen' || section.category === 'discovery') {
    return { ...base, locationMatch: fx.matchLocation?.(entryText) ?? null }
  }
  return base
```

In `RollEncounterCascade.ts`: add `regionPois?: { id: string; name: string }[]` to `CascadeContext`; in `buildCascadeEffects`, add (import `matchRegionLocation`):
```ts
    matchLocation: ctx.regionPois
      ? (text) => matchRegionLocation(text, ctx.regionPois!)
      : undefined,
```

- [ ] **Step 4: Run to verify it passes + build**

Run: `pnpm test src/domain/services/encounterCascade.location.test.ts` → PASS.
Run: `pnpm build` → clean (POI cascade path unaffected — `regionPois`/`matchLocation` optional).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: cascade attaches locationMatch for omen/discovery"
```

---

### Task 3: `buildRegionEncounterContent` builder

**Files:**
- Create: `src/domain/services/worldgen/regionEncounter.ts`
- Test: `src/domain/services/worldgen/regionEncounter.test.ts`

**Interfaces:**
- Consumes: `tierForTerrain` (`@domain/services/worldgen/regionFlavor`), `pickTierMonster` (`~/lib/worldgen/compendium-utils`), `getCompendiumById` (`@domain/data/compendium`), `POI`, `Faction`, `SeededRandom`.
- Produces:
```ts
export interface RegionEncounterContent {
  creature: string[]; signOmen: string[]; loss: string[]
  npc: string[]; discovery: string[]; treasure: string[]
}
export function buildRegionEncounterContent(input: {
  region: { terrain: string }
  pois: POI[]
  factions?: Faction[]
  systemId: string
  rng: SeededRandom
}): RegionEncounterContent
```
All six arrays non-empty (so they override the generic defaults in `getActiveSections`).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { buildRegionEncounterContent } from './regionEncounter'
import { buildPOI } from './buildPoi'
import { getMonstersBySystemId } from '@domain/data/compendium'

describe('buildRegionEncounterContent', () => {
  it('seeds creatures from region monsters + tier top-up; discovery/omen reference real sites', () => {
    const mon = getMonstersBySystemId('system-cairn-2e')[0]
    const lair = buildPOI({ regionId: 'r', name: 'The Sunken Grotto', type: 'dungeon' })
    const camp = buildPOI({ regionId: 'r', name: 'Wolf Camp', type: 'camp' })
    camp.monsterRefs = [{ id: mon.id, quantity: 2 }]
    const c = buildRegionEncounterContent({ region: { terrain: 'mountains' }, pois: [lair, camp], systemId: 'system-cairn-2e', rng: new SeededRandom('s') })
    // creature includes the seeded monster's name + topped up to >= 6
    expect(c.creature).toContain(mon.name)
    expect(c.creature.length).toBeGreaterThanOrEqual(6)
    // discovery references the real site
    expect(c.discovery.some((d) => d.includes('The Sunken Grotto'))).toBe(true)
    // at least one omen points to a real site
    expect(c.signOmen.some((o) => o.includes('The Sunken Grotto') || o.includes('Wolf Camp'))).toBe(true)
    // every category non-empty
    for (const k of ['creature','signOmen','loss','npc','discovery','treasure'] as const) expect(c[k].length).toBeGreaterThan(0)
  })
  it('is deterministic', () => {
    const a = buildRegionEncounterContent({ region: { terrain: 'forest' }, pois: [], systemId: 'system-shadowdark', rng: new SeededRandom('z') })
    const b = buildRegionEncounterContent({ region: { terrain: 'forest' }, pois: [], systemId: 'system-shadowdark', rng: new SeededRandom('z') })
    expect(a).toEqual(b)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/domain/services/worldgen/regionEncounter.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
import type { POI } from '@domain/entities/POI'
import type { Faction } from '@domain/entities/Faction'
import type { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { tierForTerrain } from './regionFlavor'
import { pickTierMonster } from '~/lib/worldgen/compendium-utils'
import { getCompendiumById } from '@domain/data/compendium'

export interface RegionEncounterContent {
  creature: string[]; signOmen: string[]; loss: string[]
  npc: string[]; discovery: string[]; treasure: string[]
}

const OMEN_TEMPLATES = [
  'Fresh tracks lead toward {site}',
  'Smoke rises from the direction of {site}',
  'A distant sound echoes from {site}',
  'Carrion birds circle over {site}',
  'Travelers hurry away from {site}',
]
const AMBIENT_OMENS: Record<'easy'|'tough'|'perilous', string[]> = {
  easy: ['Birdsong falls suddenly silent', 'A cold breeze, out of season', 'Footprints crossing the path'],
  tough: ['Claw marks gouged shoulder-high', 'A carcass, recently killed', 'Distant drums after dark'],
  perilous: ['The air itself feels watched', 'Old bones half-buried in the trail', 'A scream, then nothing'],
}
const LOSS_BY_TIER: Record<'easy'|'tough'|'perilous', string[]> = {
  easy: ['A sudden downpour slows travel', 'The trail forks unmarked', 'A pack strap snaps'],
  tough: ['A bridge is washed out', 'Quicksand swallows a pack', 'A rockslide blocks the way'],
  perilous: ['The ground gives way to a sinkhole', 'A flash flood scatters the party', 'A blizzard closes in'],
}
const TREASURE_BY_TIER: Record<'easy'|'tough'|'perilous', string[]> = {
  easy: ['A pouch of coins (2d6 sp)', 'A traveler\'s dropped ring', 'A cache of dried food + 1d6 gp'],
  tough: ['A strongbox (3d6 gp)', 'A gem worth 50 gp', 'A fine weapon, lightly used'],
  perilous: ['A hoard fragment (5d10 gp)', 'A jeweled relic (250 gp)', 'An ornate art object'],
}
const NPC_PROMPTS = ['A wary traveler', 'A wounded scout', 'A wandering merchant', 'A lost pilgrim', 'A hermit who knows the land']

const dedup = (xs: string[]) => [...new Set(xs.filter(Boolean))]

export function buildRegionEncounterContent(input: {
  region: { terrain: string }; pois: POI[]; factions?: Faction[]; systemId: string; rng: SeededRandom
}): RegionEncounterContent {
  const { region, pois, factions, systemId, rng } = input
  const tier = tierForTerrain(region.terrain)

  // creature: region monster names + tier top-up to >= 6
  const monsterNames = dedup(
    pois.flatMap((p) => p.monsterRefs).map((r) => getCompendiumById(r.id)?.name ?? ''),
  )
  const creature = [...monsterNames]
  for (let i = 0; creature.length < 6 && i < 12; i++) {
    const m = pickTierMonster(systemId, tier, rng)
    if (m && !creature.includes(m.name)) creature.push(m.name)
  }
  if (creature.length === 0) creature.push('Wandering beasts')

  // discovery: the region's real notable sites
  const sites = dedup(
    pois
      .filter((p) => ['dungeon', 'ruin', 'landmark'].includes(p.type) || p.treasure.some((t) => t.notable || t.isMagic))
      .map((p) => p.name),
  )
  const discovery = sites.length > 0 ? [...sites] : ['An unmarked cave', 'A weathered shrine', 'A buried ruin']

  // signOmen: location-pointing (for a few sites) + ambient
  const signOmen: string[] = []
  for (const site of sites.slice(0, 4)) {
    signOmen.push(rng.pick(OMEN_TEMPLATES).replace('{site}', site))
  }
  signOmen.push(...AMBIENT_OMENS[tier])

  // loss / treasure by tier
  const loss = [...LOSS_BY_TIER[tier]]
  const treasure = [...TREASURE_BY_TIER[tier]]

  // npc: prompts + faction-flavored when available
  const npc = [...NPC_PROMPTS]
  for (const f of (factions ?? []).slice(0, 2)) npc.push(`An agent of the ${f.name}`)

  return { creature, signOmen, loss, npc, discovery, treasure }
}
```

- [ ] **Step 4: Run to verify it passes + build**

Run: `pnpm test src/domain/services/worldgen/regionEncounter.test.ts` → PASS.
Run: `pnpm build` → clean.

- [ ] **Step 5: Commit**

```bash
git add src/domain/services/worldgen/regionEncounter.ts src/domain/services/worldgen/regionEncounter.test.ts
git commit -m "feat: buildRegionEncounterContent (region-flavored encounter content)"
```

---

### Task 4: `executeRegenerateRegionEncounter` use-case

**Files:**
- Create: `src/application/use-cases/RegenerateRegionEncounter.ts`
- Test: `src/application/use-cases/RegenerateRegionEncounter.test.ts`

**Interfaces:**
- Consumes: `buildRegionEncounterContent` (Task 3), `IEncounterTableRepository`, `IPOIRepository`, `IFactionRepository`, `IRegionRepository`.
- Produces: `executeRegenerateRegionEncounter(input: { regionId: string; worldId: string; systemId: string; seed?: string }, deps: { encounterTableRepo, poiRepo, factionRepo, regionRepo }): Promise<EncounterTable>` — loads the region + its POIs + factions, builds content, and upserts the region's encounter table (update existing else create), with the six arrays set and `lastResult: null`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@infrastructure/dexie/db'
import { createContainer } from '@infrastructure/container'
import { buildPOI } from '@domain/services/worldgen/buildPoi'
import { executeRegenerateRegionEncounter } from './RegenerateRegionEncounter'

const c = createContainer()
const deps = () => ({ encounterTableRepo: c.encounterTableRepo, poiRepo: c.poiRepo, factionRepo: c.factionRepo, regionRepo: c.regionRepo })
beforeEach(async () => { await db.open(); await Promise.all([db.regions.clear(), db.pois.clear(), db.factions.clear(), db.encounterTables.clear()]) })

describe('executeRegenerateRegionEncounter', () => {
  it('builds + persists a region encounter table from its POIs', async () => {
    await db.regions.put({ id: 'r1', worldId: 'w', terrain: 'mountains' } as any)
    const lair = buildPOI({ regionId: 'r1', name: 'The Black Vault', type: 'dungeon' }); await db.pois.put(lair)
    const t = await executeRegenerateRegionEncounter({ regionId: 'r1', worldId: 'w', systemId: 'system-cairn-2e', seed: 's' }, deps())
    expect(t.ownerRegionId).toBe('r1')
    expect(t.creature.length).toBeGreaterThan(0)
    expect(t.discovery.some((d) => d.includes('The Black Vault'))).toBe(true)
    expect(t.lastResult).toBeNull()
    // persisted
    const fromDb = await db.encounterTables.where('ownerRegionId').equals('r1').first()
    expect(fromDb?.creature.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/application/use-cases/RegenerateRegionEncounter.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
import type { IEncounterTableRepository } from '@application/ports/IEncounterTableRepository'
import type { IPOIRepository } from '@application/ports/IPOIRepository'
import type { IFactionRepository } from '@application/ports/IFactionRepository'
import type { IRegionRepository } from '@application/ports/IRegionRepository'
import type { EncounterTable } from '@domain/entities/EncounterTable'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { newId } from '@shared/ulid'
import { buildRegionEncounterContent } from '@domain/services/worldgen/regionEncounter'

export interface RegenerateRegionEncounterInput { regionId: string; worldId: string; systemId: string; seed?: string }
export interface RegenerateRegionEncounterDeps {
  encounterTableRepo: IEncounterTableRepository; poiRepo: IPOIRepository
  factionRepo: IFactionRepository; regionRepo: IRegionRepository
}

export async function executeRegenerateRegionEncounter(
  input: RegenerateRegionEncounterInput, deps: RegenerateRegionEncounterDeps,
): Promise<EncounterTable> {
  const region = await deps.regionRepo.getById(input.regionId)
  if (!region) throw new Error('Region not found')
  const pois = await deps.poiRepo.getByRegionId(input.regionId)
  const factions = await deps.factionRepo.getByRealmId(input.worldId)
  const content = buildRegionEncounterContent({
    region: { terrain: region.terrain }, pois, factions, systemId: input.systemId,
    rng: new SeededRandom(input.seed ?? `${input.regionId}-encounter`),
  })
  const now = Date.now()
  const existing = await deps.encounterTableRepo.getByRegionId(input.regionId)
  if (existing) {
    const updated: EncounterTable = { ...existing, ...content, lastResult: null, updatedAt: now }
    await deps.encounterTableRepo.update(updated)
    return updated
  }
  const created: EncounterTable = {
    id: newId(), ownerPoiId: null, ownerRegionId: input.regionId, worldId: input.worldId,
    ...content, customSections: [], disabledCategories: [], lastResult: null, createdAt: now, updatedAt: now,
  }
  await deps.encounterTableRepo.create(created)
  return created
}
```

(Confirm `IRegionRepository.getById` exists; it does per the codebase. `factionRepo.getByRealmId` confirmed.)

- [ ] **Step 4: Run + build**

Run: `pnpm test src/application/use-cases/RegenerateRegionEncounter.test.ts` → PASS. `pnpm test` + `pnpm build` → green.

- [ ] **Step 5: Commit**

```bash
git add src/application/use-cases/RegenerateRegionEncounter.ts src/application/use-cases/RegenerateRegionEncounter.test.ts
git commit -m "feat: executeRegenerateRegionEncounter use-case"
```

---

### Task 5: region route — auto-seed on create + regionPois in ctx + regenerate wiring

**Files:**
- Modify: `src/routes/_app/realms/regions_.$regionId.tsx`

**Interfaces:**
- Consumes: `buildRegionEncounterContent` (Task 3), `executeRegenerateRegionEncounter` (Task 4), `CascadeContext.regionPois` (Task 2).

- [ ] **Step 1: Auto-seed the lazily-created region table**

In `handleEncounterCascade`, replace the empty `executeCreateEncounterTable({ ownerRegionId, worldId })` call with a seeded one — build content first:

```ts
const content = buildRegionEncounterContent({
  region: { terrain: region.terrain }, pois, factions,
  systemId: systemConfig.id, rng: new SeededRandom(`${region.id}-encounter`),
})
const table = encounterTable ?? await executeCreateEncounterTable(
  { ownerRegionId: region.id, worldId: region.worldId, ...content },
  { encounterTableRepo: container.encounterTableRepo },
)
```
(`pois` = `usePOIs(regionId)`, `factions` = `useFactions(activeRealmId)` — both already loaded in the route; import `buildRegionEncounterContent` + `SeededRandom`.)

- [ ] **Step 2: Pass `regionPois` into the cascade ctx**

In the same `ctx: CascadeContext`, add:
```ts
regionPois: pois.map((p) => ({ id: p.id, name: p.name })),
```

- [ ] **Step 3: Wire "Regenerate from region"**

Add a handler and pass it to `EncounterCascade` (new optional prop from Task 6):
```ts
const handleRegenerateEncounter = async () => {
  if (!region || !systemConfig) return
  await executeRegenerateRegionEncounter(
    { regionId: region.id, worldId: region.worldId, systemId: systemConfig.id },
    { encounterTableRepo: container.encounterTableRepo, poiRepo: container.poiRepo, factionRepo: container.factionRepo, regionRepo: container.regionRepo },
  )
}
```
Pass `onRegenerateFromRegion={handleRegenerateEncounter}` to `<EncounterCascade>`.

- [ ] **Step 4: Build + manual verify**

Run: `pnpm build` → clean. Run: `pnpm test` → green. Manual: open a region's Encounters tab → the table is pre-filled with the region's monsters/sites; "Regenerate from region" re-rolls it.

- [ ] **Step 5: Commit**

```bash
git add src/routes/_app/realms/regions_.\$regionId.tsx
git commit -m "feat: region encounter auto-seed + regionPois ctx + regenerate"
```

---

### Task 6: EncounterCascade "Regenerate" button + locationMatch render

**Files:**
- Modify: `src/components/shared/EncounterCascade.tsx`
- Modify: `src/components/shared/EncounterResultCards.tsx`

**Interfaces:**
- Consumes: `EncounterRollResult.locationMatch` (Task 2).
- Produces: `EncounterCascade` gains optional `onRegenerateFromRegion?: () => Promise<void>` (renders a "Regenerate from region" button when present). `EncounterResultCards` renders a POI link for `locationMatch` on omen/discovery rolls.

- [ ] **Step 1: Add the regenerate button (optional prop)**

In `EncounterCascade.tsx`, add `onRegenerateFromRegion?: () => Promise<void>` to props. When present, render a button (near the roll/edit controls) that calls it (guard with the existing `pending` state). Optional → POI usages (which don't pass it) are unaffected.

- [ ] **Step 2: Render locationMatch**

In `EncounterResultCards.tsx`, in the "Other (flavor text)" return (the branch that handles `signOmen`/`discovery`), add below the entry text — when `result.locationMatch` is set — a link:
```tsx
{result.locationMatch && (
  <Link to="/realms/pois/$poiId" params={{ poiId: result.locationMatch.poiId }} className="text-xs text-primary underline">
    🔎 {result.locationMatch.name}
  </Link>
)}
```
(Import `Link` from `@tanstack/react-router` if not already imported.)

- [ ] **Step 3: Build + commit**

Run: `pnpm build` → clean (tsc gate; no component-render harness). Run: `pnpm test` → green.

```bash
git add src/components/shared/EncounterCascade.tsx src/components/shared/EncounterResultCards.tsx
git commit -m "feat: regenerate button + locationMatch link in encounter UI"
```

---

### Task 7: full verification

**Files:** none.

- [ ] **Step 1:** Run `pnpm test` → all pass (new B3 tests + existing encounter/world-gen suites).
- [ ] **Step 2:** Run `pnpm build` → `vite build` + `tsc --noEmit` clean.
- [ ] **Step 3:** Manual smoke: a region's Encounters tab pre-fills creatures from its monsters + discovery from its sites; rolling a Sign/Omen or Discovery that names a site shows a link to that POI; "Regenerate from region" re-rolls; POI/dungeon encounter tabs are unchanged.
- [ ] **Step 4:** `git add -A && git commit -m "test: B3 suite green" --allow-empty`

---

## Self-Review

**Spec coverage:**
- `matchRegionLocation` → T1. ✓
- `locationMatch` + cascade attach (omen/discovery; optional effect; POI path untouched) → T2. ✓
- `buildRegionEncounterContent` (all six categories: region monsters+top-up, discovery sites, omens→sites, tier loss/treasure, faction-flavored npc) → T3. ✓
- Regenerate use-case → T4. ✓
- Auto-seed on lazy create + regionPois in ctx + regenerate wiring → T5. ✓
- Regenerate button + locationMatch UI link → T6. ✓
- Region-only scope (POI/dungeon untouched via optional ctx/effect) → T2/T5/T6. ✓

**Placeholder scan:** none. Content tables (omen/loss/treasure/npc templates) are concrete starter content.

**Type consistency:** `RegionEncounterContent` (T3) consumed by T4/T5. `matchRegionLocation(text, {id,name}[])` (T1) used in T2. `CascadeContext.regionPois`/`CascadeEffects.matchLocation` (T2) used in T5. `EncounterRollResult.locationMatch` (T2) rendered in T6. `executeRegenerateRegionEncounter(input, deps)` (T4) matches the T5 call site.

**Known follow-ups:** content tables are starter-sized (could expand like the ruin/landmark tables); POI/dungeon encounter tables intentionally not region-linked.
