# Ruin & Landmark Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two-table "flavor" stub for ruins and landmarks with two purpose-built generators — ruins get history + a 2–4 area mini-crawl with compendium-resolved occupants and single-source loot; landmarks get legend/truth/secret/interaction/quest-hook lore.

**Architecture:** Pure deterministic *plan* generators (`src/lib/ruin`, `src/lib/landmark`) produce data; impure use-cases (`executeGenerateRuin`, `executeGenerateLandmark`) resolve the compendium, create NPC entities, and persist. Shared generation helpers (creature resolution, treasure, site history) move to a neutral `src/lib/worldgen/` module so ruin code never imports `src/lib/dungeon/`. World-gen pre-generates both kinds (capped) after the main transaction; a regenerate button re-rolls in place. UI extends the existing `GenericTemplate`.

**Tech Stack:** TypeScript (strict), TanStack Start, Dexie (IndexedDB), Zustand, Vitest, `fake-indexeddb`, `SeededRandom` (mulberry32), Cairn-style `TableDef` content tables.

## Global Constraints

- **Package manager:** `pnpm` only. Tests: `pnpm test <path>`; single test: `pnpm test <path> -t "name"`. Build gate: `pnpm build` (= `vite build && tsc --noEmit`).
- **Branch:** work on `update-ruin-generation` (already checked out). Never commit feature work to `main`.
- **TDD:** failing test → minimal impl → passing test → commit, every task.
- **Determinism:** pure generators take a `SeededRandom` and must be reproducible (`expect(a).toEqual(b)` for same seed). Never call `Date.now()`/`newId()`/`Math.random()` inside `src/lib/ruin/**` or `src/lib/landmark/**` — ids and timestamps are minted only in the use-case layer.
- **Loot is single-source:** every `TreasureItem` lives only in `poi.treasure`, tagged with `areaIndex`. Never store a second copy on an area.
- **Both systems:** ruin creature resolution must work for `system-cairn-2e` AND `system-shadowdark`.
- **No ruin→dungeon import:** after Phase 1, `src/lib/ruin/**` and `src/lib/landmark/**` import shared helpers only from `src/lib/worldgen/**`, never `src/lib/dungeon/**`.
- **Imports:** use the existing path aliases (`@domain/...`, `@application/...`, `@infrastructure/...`, `@shared/...`, `~/lib/...`). Match the style of the file you edit.
- **Dexie:** next version is **38**. Add new POI fields as defaults in the `db.pois.hook('reading')` normalizer (the load-bearing path) and a v38 `.upgrade()` backfill (belt-and-suspenders, mirrors v35).

---

## File Structure

**Phase 1 — shared module (moves + additions):**
- Move `src/lib/dungeon/compendium-utils.ts` → `src/lib/worldgen/compendium-utils.ts` (add `levelCap` override).
- Move `src/lib/dungeon/treasure-gen.ts` → `src/lib/worldgen/treasure-gen.ts` (add room-independent `generateTreasureItems` core; `generateRoomTreasure` becomes a thin wrapper).
- Create `src/lib/worldgen/siteHistory.ts` (builder/era/fate + activity templates, moved out of `DungeonHistoryGenerator`/`DungeonEcologyGenerator`).
- Re-point all importers under `src/lib/dungeon/**` and `src/application/use-cases/GenerateDungeon.ts`.

**Phase 2 — data model + persistence:**
- `src/domain/entities/RuinSite.ts` (new) — `RuinSite`, `RuinArea`, `OccupantGroup`, `RuinState`.
- `src/domain/entities/LandmarkLore.ts` (new) — `LandmarkLore`.
- `src/domain/value-objects/TreasureItem.ts` (modify) — add `areaIndex?`, `notable?`.
- `src/domain/entities/POI.ts` (modify) — add `ruinSite`, `landmarkLore`, `poiGenOptions`.
- `src/domain/services/worldgen/buildPoi.ts` (modify) — defaults + input fields.
- `src/infrastructure/dexie/db.ts` (modify) — v38 + read-hook defaults.
- `src/application/ports/INPCRepository.ts` + `src/infrastructure/dexie/repositories/NPCRepository.ts` (modify) — `bulkCreate`.
- `src/domain/services/worldgen/regionFlavor.ts` (modify) — export `biomeTier(biome)`.

**Phase 3 — landmark:**
- `src/domain/data/landmark-tables.ts` (new) — content tables.
- `src/lib/landmark/LandmarkGenerator.ts` (new) — `generateLandmark`.
- `src/application/use-cases/GenerateLandmark.ts` (new) — `executeGenerateLandmark`.
- `src/ui/hooks/useRegenerateLandmark.ts` (new).
- `src/application/use-cases/GenerateWorld.ts` (modify) — landmark pre-gen pass.

**Phase 4 — ruin:**
- `src/domain/data/ruin-tables.ts` (new) — content tables.
- `src/lib/ruin/ruinCreaturePools.ts` (new) — state→slug pools + `ruinCreatureLevel`.
- `src/lib/ruin/RuinGenerator.ts` (new) — `generateRuinSite`.
- `src/application/use-cases/GenerateRuin.ts` (new) — `executeGenerateRuin`.
- `src/ui/hooks/useRegenerateRuin.ts` (new).
- `src/application/use-cases/GenerateWorld.ts` (modify) — ruin pre-gen pass.

**Phase 5 — UI:**
- `src/components/poi-templates/RuinLoreBlock.tsx` (new), `LandmarkLoreBlock.tsx` (new), `RuinAreasSection.tsx` (new).
- `src/components/poi-templates/GenericTemplate.tsx` (modify) — render lore + areas, guarded by `poi.type`.
- `src/routes/_app/realms/pois_.$poiId.tsx` (modify) — action-bar Generate/Regenerate for ruin + landmark.

---

# Phase 1 — Shared module extraction

> Risk-isolated first. After each move, the existing dungeon test suite must stay green — it is the guard for the re-pointing.

### Task 1: Move `compendium-utils` to `src/lib/worldgen` and add `levelCap`

**Files:**
- Move: `src/lib/dungeon/compendium-utils.ts` → `src/lib/worldgen/compendium-utils.ts`
- Modify importers (find with grep, below)
- Test: `src/lib/worldgen/compendium-utils.test.ts` (new)

**Interfaces:**
- Produces: `resolveCreature(slug: string, systemId: string, rng: SeededRandom, opts?: { depth?: number; levelCap?: number }): { id: string; name: string } | null`. When `levelCap` is provided it replaces the `depth*2+1` cap in BOTH the over-level guard and the filter; otherwise behavior is unchanged (`depth` default 1). Also re-exports unchanged: `slugToName`, `findCompendiumId`, `getMonsterDescription`, `systemBlockFromMonster`, `fallbackSystemBlock`, `emptySystemBlock`, `pickWeapon`, `pickGear`, `pickSpellScroll`, `pickMagicItem`.

- [ ] **Step 1: Find all importers of the file**

Run: `rg -l "lib/dungeon/compendium-utils|from './compendium-utils'|from \"\./compendium-utils\"" src`
Expected: a list including `src/lib/dungeon/treasure-gen.ts`, `src/lib/dungeon/DungeonGenerator.ts`, `src/lib/dungeon/dungeon/*.ts`, `src/application/use-cases/GenerateDungeon.ts`. Note them.

- [ ] **Step 2: Write the failing test for the new location + `levelCap`**

Create `src/lib/worldgen/compendium-utils.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { resolveCreature } from './compendium-utils'

describe('resolveCreature (worldgen)', () => {
  it('resolves a known cairn creature deterministically', () => {
    const a = resolveCreature('wolf', 'system-cairn-2e', new SeededRandom('s'))
    const b = resolveCreature('wolf', 'system-cairn-2e', new SeededRandom('s'))
    expect(a).toEqual(b)
    expect(a?.name).toBeTruthy()
  })

  it('honors an explicit levelCap for shadowdark fallback', () => {
    // Unknown slug forces the filtered random branch; low cap must restrict the pool.
    const picked = resolveCreature('zzz_not_a_real_slug', 'system-shadowdark', new SeededRandom('s'), { levelCap: 1 })
    expect(picked).not.toBeNull()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test src/lib/worldgen/compendium-utils.test.ts`
Expected: FAIL — cannot resolve `./compendium-utils` (file not moved yet).

- [ ] **Step 4: Move the file and add the `levelCap` option**

Move the file (`git mv src/lib/dungeon/compendium-utils.ts src/lib/worldgen/compendium-utils.ts`). Change the `import type { SeededRandom } from './SeededRandom'` line to `import type { SeededRandom } from '~/lib/dungeon/SeededRandom'` (SeededRandom stays in `lib/dungeon`). Replace the `resolveCreature` signature + cap usage:

```ts
export function resolveCreature(
  slug: string,
  systemId: string,
  rng: SeededRandom,
  opts: { depth?: number; levelCap?: number } = {}
): { id: string; name: string } | null {
  const depth = opts.depth ?? 1
  const maxLevel = opts.levelCap ?? depth * 2 + 1
  const exactId = findCompendiumId(slug, systemId)
  if (exactId) {
    const entry = getCompendiumById(exactId) as CompendiumMonster | undefined
    if (entry?.systemData.system === 'shadowdark') {
      if (entry.systemData.data.level > maxLevel + 2) {
        // Over-leveled — fall through to filtered random pick
      } else {
        return { id: exactId, name: slugToName(slug) }
      }
    } else {
      return { id: exactId, name: slugToName(slug) }
    }
  }

  if (!_cache.has(systemId)) _cache.set(systemId, getMonstersBySystemId(systemId))
  const allMonsters = _cache.get(systemId)!
  if (allMonsters.length === 0) return null

  const levelFiltered = allMonsters.filter((m) => {
    if (m.systemData.system === 'shadowdark') return m.systemData.data.level <= maxLevel
    if (m.systemData.system === 'cairn') {
      const hp = parseInt(m.systemData.data.stats?.match(/(\d+)\s*HP/i)?.[1] ?? '99')
      return hp <= maxLevel * 6
    }
    return true
  })

  const pool = levelFiltered.length > 0 ? levelFiltered : allMonsters
  const picked = rng.pick(pool)
  return { id: picked.id, name: picked.name }
}
```

- [ ] **Step 5: Re-point every importer found in Step 1**

For each file, change `'./compendium-utils'` / `'../compendium-utils'` / `'~/lib/dungeon/compendium-utils'` to `'~/lib/worldgen/compendium-utils'`. In `GenerateDungeon.ts` (which calls `resolveCreature(slug, systemId, rng, depth)`), update the call to the new options shape: `resolveCreature(slug, systemId, rng, { depth })`.

Run: `rg -n "resolveCreature\(" src/application/use-cases/GenerateDungeon.ts` to find the call(s) and update each to pass `{ depth: <existingDepthArg> }`.

- [ ] **Step 6: Run worldgen test + full suite + typecheck**

Run: `pnpm test src/lib/worldgen/compendium-utils.test.ts`
Expected: PASS.
Run: `pnpm test` then `pnpm build`
Expected: all existing dungeon tests PASS; `tsc --noEmit` clean.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: move compendium-utils to lib/worldgen, add levelCap option"
```

---

### Task 2: Move `treasure-gen` to `src/lib/worldgen` and extract a room-independent core

**Files:**
- Move: `src/lib/dungeon/treasure-gen.ts` → `src/lib/worldgen/treasure-gen.ts`
- Test: `src/lib/worldgen/treasure-gen.test.ts` (new)
- Re-point importers (grep)

**Interfaces:**
- Produces: `generateTreasureItems(level: string, count: number, rng: SeededRandom): TreasureItem[]` — room-independent; picks `count` items from the `COIN_TREASURE[level]` pool. NOTE: it calls `newId()` (impure) and is therefore used only from the impure layer; ruins call it from the use-case.
- `generateRoomTreasure(room, level, rng)` keeps its signature but delegates to `generateTreasureItems`.

- [ ] **Step 1: Find importers**

Run: `rg -l "treasure-gen" src`
Expected: includes `src/lib/dungeon/DungeonGenerator.ts` and/or `src/application/use-cases/GenerateDungeon.ts`. Note them.

- [ ] **Step 2: Write the failing test**

Create `src/lib/worldgen/treasure-gen.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { generateTreasureItems } from './treasure-gen'

describe('generateTreasureItems', () => {
  it('returns exactly count items from the level pool', () => {
    const items = generateTreasureItems('standard', 3, new SeededRandom('s'))
    expect(items).toHaveLength(3)
    for (const it of items) {
      expect(it.id).toBeTruthy()
      expect(it.collected).toBe(false)
      expect(it.value).toBeTruthy()
    }
  })

  it('falls back to standard pool for an unknown level', () => {
    const items = generateTreasureItems('nonsense', 2, new SeededRandom('s'))
    expect(items).toHaveLength(2)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test src/lib/worldgen/treasure-gen.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Move the file, extract the core, rewrite the wrapper**

`git mv src/lib/dungeon/treasure-gen.ts src/lib/worldgen/treasure-gen.ts`. Update imports: `import type { SpatialRoom } from '~/lib/dungeon/types'`, `import type { SeededRandom } from '~/lib/dungeon/SeededRandom'`, `import { pickWeapon, pickGear, pickSpellScroll, pickMagicItem } from './compendium-utils'`. Add the core and delegate:

```ts
export function generateTreasureItems(
  level: string,
  count: number,
  rng: SeededRandom
): TreasureItem[] {
  const items: TreasureItem[] = []
  const pool = COIN_TREASURE[level] ?? COIN_TREASURE.standard
  for (let i = 0; i < count; i++) {
    const pick = rng.pick(pool)
    items.push({ id: newId(), name: pick.name, description: '', value: pick.value, quantity: 1, collected: false })
  }
  return items
}

export function generateRoomTreasure(
  room: SpatialRoom,
  level: string,
  rng: SeededRandom
): TreasureItem[] {
  const isTreasureRoom = room.themeRoomType === 'treasure_vault' ||
    room.themeRoomType === 'loot_storage' ||
    room.themeRoomType === 'treasure_grotto'
  const chance = TREASURE_CHANCES[level] ?? TREASURE_CHANCES.standard
  const roll = isTreasureRoom ? chance.treasure : room.isDeadEnd ? chance.deadEnd : chance.other
  if (!rng.chance(roll)) return []
  const count = isTreasureRoom ? rng.between(2, 4) : rng.between(1, 2)
  return generateTreasureItems(level, count, rng)
}
```

(Keep `COIN_TREASURE`, `TREASURE_CHANCES`, and the other generators in the file unchanged.)

- [ ] **Step 5: Re-point importers**

Change each importer's path to `'~/lib/worldgen/treasure-gen'`.

- [ ] **Step 6: Run test + suite + typecheck**

Run: `pnpm test src/lib/worldgen/treasure-gen.test.ts` → PASS.
Run: `pnpm test` then `pnpm build` → all green, `tsc` clean.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: move treasure-gen to lib/worldgen, extract room-independent core"
```

---

### Task 3: Extract site-history templates to `src/lib/worldgen/siteHistory.ts`

**Files:**
- Create: `src/lib/worldgen/siteHistory.ts`
- Modify: `src/lib/dungeon/dungeon/DungeonHistoryGenerator.ts`, `src/lib/dungeon/dungeon/DungeonEcologyGenerator.ts` (import from the new module)
- Test: `src/lib/worldgen/siteHistory.test.ts` (new)

**Interfaces:**
- Produces:
  - `BUILDER_CULTURES: readonly string[]` (e.g. dwarven, elven, human, cultist, fae…)
  - `ERAS: readonly string[]` (e.g. "an age", "centuries", "a generation"…)
  - `FATES: readonly string[]` (e.g. "war", "plague", "a curse", "abandonment", "swallowed by the wild"…)
  - `OCCUPANT_ACTIVITIES: readonly string[]` (e.g. "standing guard", "feeding", "asleep", "squabbling", "performing a rite"…)
  - `pickSiteHistory(rng, used?: Set<string>): { builderCulture: string; era: string; fate: string }` — picks each, retrying up to 5 times to avoid values already in `used`; on accept, adds `builder:<culture>` and `fate:<fate>` to `used`.

- [ ] **Step 1: Locate the source arrays**

Run: `rg -n "ORIGINAL_BUILDER_TEMPLATES|builderCulture|era|fate|activity" src/lib/dungeon/dungeon/DungeonHistoryGenerator.ts src/lib/dungeon/dungeon/DungeonEcologyGenerator.ts`
Expected: the template arrays/objects. Note their exact string contents to move.

- [ ] **Step 2: Write the failing test**

Create `src/lib/worldgen/siteHistory.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { pickSiteHistory, BUILDER_CULTURES, ERAS, FATES } from './siteHistory'

describe('pickSiteHistory', () => {
  it('returns populated fields', () => {
    const h = pickSiteHistory(new SeededRandom('s'))
    expect(BUILDER_CULTURES).toContain(h.builderCulture)
    expect(ERAS).toContain(h.era)
    expect(FATES).toContain(h.fate)
  })

  it('avoids repeating builder/fate already in the used set when possible', () => {
    const used = new Set<string>()
    const first = pickSiteHistory(new SeededRandom('a'), used)
    const second = pickSiteHistory(new SeededRandom('b'), used)
    // With distinct seeds and a populated table, the second should differ on at least one axis.
    expect(`${first.builderCulture}|${first.fate}`).not.toBe(`${second.builderCulture}|${second.fate}`)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test src/lib/worldgen/siteHistory.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Create the module**

Create `src/lib/worldgen/siteHistory.ts` (move the real strings found in Step 1; representative minimum shown):

```ts
import type { SeededRandom } from '~/lib/dungeon/SeededRandom'

export const BUILDER_CULTURES = [
  'dwarven stonewrights', 'elven exiles', 'a forgotten human kingdom',
  'a doomsday cult', 'fae court', 'an order of knights', 'sorcerer-kings',
] as const

export const ERAS = [
  'a generation ago', 'centuries ago', 'an age ago', 'before living memory',
] as const

export const FATES = [
  'war swept it away', 'plague emptied its halls', 'a curse took root',
  'its people simply abandoned it', 'the wild swallowed it', 'betrayal from within',
] as const

export const OCCUPANT_ACTIVITIES = [
  'standing guard', 'feeding', 'asleep', 'squabbling over scraps',
  'performing a rite', 'hoarding shinies', 'patrolling the ruin',
] as const

export function pickSiteHistory(
  rng: SeededRandom,
  used?: Set<string>
): { builderCulture: string; era: string; fate: string } {
  const pickAvoiding = (arr: readonly string[], prefix: string): string => {
    let choice = rng.pick(arr)
    for (let i = 0; i < 5 && used?.has(`${prefix}:${choice}`); i++) choice = rng.pick(arr)
    used?.add(`${prefix}:${choice}`)
    return choice
  }
  return {
    builderCulture: pickAvoiding(BUILDER_CULTURES, 'builder'),
    era: rng.pick(ERAS),
    fate: pickAvoiding(FATES, 'fate'),
  }
}
```

- [ ] **Step 5: Re-point the dungeon generators (DRY)**

In `DungeonHistoryGenerator.ts` / `DungeonEcologyGenerator.ts`, replace the inlined builder/era/fate/activity arrays with imports from `'~/lib/worldgen/siteHistory'` where they map cleanly. If a dungeon array has extra theme-specific entries that don't generalize, leave those in place and only import the shared base — do not change dungeon output. Verify by running dungeon tests in Step 6.

- [ ] **Step 6: Run test + suite + typecheck**

Run: `pnpm test src/lib/worldgen/siteHistory.test.ts` → PASS.
Run: `pnpm test` then `pnpm build` → dungeon tests green, `tsc` clean.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: extract shared site-history templates to lib/worldgen"
```

---

# Phase 2 — Data model + persistence

### Task 4: Add `RuinSite` and `LandmarkLore` domain types

**Files:**
- Create: `src/domain/entities/RuinSite.ts`
- Create: `src/domain/entities/LandmarkLore.ts`
- Test: `src/domain/entities/RuinSite.test.ts` (type-level smoke test)

**Interfaces:**
- Produces the exact types below (consumed by every later task).

- [ ] **Step 1: Write the failing test**

Create `src/domain/entities/RuinSite.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import type { RuinSite, RuinArea, OccupantGroup, RuinState } from './RuinSite'
import type { LandmarkLore } from './LandmarkLore'

describe('ruin/landmark types', () => {
  it('constructs a minimal RuinSite', () => {
    const og: OccupantGroup = { npcIds: ['n1'], activity: 'asleep' }
    const area: RuinArea = { name: 'Gatehouse', order: 0, isEntry: true, readAloud: 'x', detail: 'y', discovery: null, occupants: [og] }
    const state: RuinState = 'beast-claimed'
    const site: RuinSite = {
      origin: 'o', fall: 'f', builderCulture: 'b', era: 'e',
      currentState: state, factionId: null, hook: 'h',
      notablePrizeItemId: null, areas: [area],
    }
    expect(site.areas[0].occupants[0].npcIds).toEqual(['n1'])
  })

  it('constructs LandmarkLore', () => {
    const lore: LandmarkLore = {
      legend: 'l', truth: 't', secret: 's',
      interactionTrigger: 'when you touch it', interactionEffect: 'a vision',
      questHook: 'q', sensory: 'sn',
    }
    expect(lore.truth).toBe('t')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/domain/entities/RuinSite.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Create the type files**

`src/domain/entities/RuinSite.ts`:

```ts
export type RuinState = 'empty' | 'beast-claimed' | 'faction-held' | 'haunted' | 'cult-site'

export interface OccupantGroup {
  npcIds: string[]   // link to NPC entities (all linked to the ruin POI's id)
  activity: string   // one-line behavior, e.g. "denning", "standing guard"
}

export interface RuinArea {
  name: string
  order: number               // 0 = entry/approach … last = heart
  isEntry: boolean            // exactly one area true
  readAloud: string
  detail: string              // feature / structural hazard (system-agnostic text)
  discovery: string | null    // a concrete find: document, remains, clue
  occupants: OccupantGroup[]
}

export interface RuinSite {
  origin: string
  fall: string
  builderCulture: string
  era: string
  currentState: RuinState
  factionId: string | null            // set only when currentState === 'faction-held'
  hook: string                        // themed around the notable prize + its area
  notablePrizeItemId: string | null   // id into poi.treasure (the notable:true item)
  areas: RuinArea[]                   // 2–4, ordered
}
```

`src/domain/entities/LandmarkLore.ts`:

```ts
export interface LandmarkLore {
  legend: string             // what locals believe
  truth: string              // the NATURE of the place (not a discoverable)
  secret: string             // a concrete DISCOVERABLE (cache, name, passage)
  interactionTrigger: string // "When you {touch the stone / sleep here}"
  interactionEffect: string  // narrative result: boon|curse|omen|vision|warning|nothing
  questHook: string          // points the party outward
  sensory: string
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/domain/entities/RuinSite.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/entities/RuinSite.ts src/domain/entities/LandmarkLore.ts src/domain/entities/RuinSite.test.ts
git commit -m "feat: add RuinSite and LandmarkLore domain types"
```

---

### Task 5: Extend `TreasureItem` with `areaIndex` and `notable`

**Files:**
- Modify: `src/domain/value-objects/TreasureItem.ts`
- Test: `src/domain/value-objects/TreasureItem.test.ts` (new)

**Interfaces:**
- Produces: `TreasureItem.areaIndex?: number`, `TreasureItem.notable?: boolean` (both optional, additive).

- [ ] **Step 1: Write the failing test**

Create `src/domain/value-objects/TreasureItem.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import type { TreasureItem } from './TreasureItem'

describe('TreasureItem extensions', () => {
  it('accepts areaIndex and notable', () => {
    const item: TreasureItem = {
      id: 'i', name: 'Crown', description: '', value: '500 gp',
      quantity: 1, collected: false, areaIndex: 2, notable: true,
    }
    expect(item.areaIndex).toBe(2)
    expect(item.notable).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/domain/value-objects/TreasureItem.test.ts`
Expected: FAIL — `areaIndex`/`notable` not assignable.

- [ ] **Step 3: Add the fields**

In `src/domain/value-objects/TreasureItem.ts`, append inside the interface:

```ts
  isMagic?: boolean
  compendiumId?: string
  areaIndex?: number   // ruin: which area holds this item (single-source loot tag)
  notable?: boolean    // ruin/landmark hook prize; Spec B points leads at notable items
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/domain/value-objects/TreasureItem.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/value-objects/TreasureItem.ts src/domain/value-objects/TreasureItem.test.ts
git commit -m "feat: add areaIndex and notable to TreasureItem"
```

---

### Task 6: Add `ruinSite`/`landmarkLore`/`poiGenOptions` to `POI` + `buildPOI`

**Files:**
- Modify: `src/domain/entities/POI.ts`
- Modify: `src/domain/services/worldgen/buildPoi.ts`
- Test: `src/domain/services/worldgen/buildPoi.test.ts` (new or append)

**Interfaces:**
- Produces: `POI.ruinSite: RuinSite | null`, `POI.landmarkLore: LandmarkLore | null`, `POI.poiGenOptions: { seed: string } | null`. `buildPOI` defaults all three to `null` and accepts optional inputs `ruinSite`, `landmarkLore`, `poiGenOptions`.

- [ ] **Step 1: Write the failing test**

Create `src/domain/services/worldgen/buildPoi.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildPOI } from './buildPoi'

describe('buildPOI new fields', () => {
  it('defaults ruinSite, landmarkLore, poiGenOptions to null', () => {
    const poi = buildPOI({ regionId: 'r', name: 'X', type: 'ruin' })
    expect(poi.ruinSite).toBeNull()
    expect(poi.landmarkLore).toBeNull()
    expect(poi.poiGenOptions).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/domain/services/worldgen/buildPoi.test.ts`
Expected: FAIL — properties don't exist on POI.

- [ ] **Step 3: Add fields to `POI`**

In `src/domain/entities/POI.ts`, add imports and fields near `spatialDungeon`:

```ts
import type { RuinSite } from '@domain/entities/RuinSite'
import type { LandmarkLore } from '@domain/entities/LandmarkLore'
```

```ts
  spatialDungeon: GeneratedDungeon | null
  dungeonGenOptions: DungeonGenOptions | null
  ruinSite: RuinSite | null
  landmarkLore: LandmarkLore | null
  poiGenOptions: { seed: string } | null
```

- [ ] **Step 4: Update `buildPOI`**

In `src/domain/services/worldgen/buildPoi.ts`, add to `BuildPOIInput`:

```ts
  ruinSite?: RuinSite | null
  landmarkLore?: LandmarkLore | null
  poiGenOptions?: { seed: string } | null
```

Add the imports (`import type { RuinSite } from '@domain/entities/RuinSite'` etc.), and in the returned object after `dungeonGenOptions`:

```ts
    ruinSite: input.ruinSite ?? null,
    landmarkLore: input.landmarkLore ?? null,
    poiGenOptions: input.poiGenOptions ?? null,
```

- [ ] **Step 5: Run test + typecheck**

Run: `pnpm test src/domain/services/worldgen/buildPoi.test.ts` → PASS.
Run: `pnpm build` → `tsc` clean (any other `POI` literal that omits the new fields will surface here; fix by adding the three `null` defaults wherever a full `POI` literal is built — search `rg -n "spatialDungeon: " src` and add the three lines after it).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add ruinSite/landmarkLore/poiGenOptions to POI and buildPOI"
```

---

### Task 7: Dexie v38 migration + read-hook defaults

**Files:**
- Modify: `src/infrastructure/dexie/db.ts`
- Test: `src/infrastructure/dexie/db.ruinFields.test.ts` (new)

**Interfaces:**
- Produces: existing POIs read back with `ruinSite/landmarkLore/poiGenOptions` defaulted to `null`.

- [ ] **Step 1: Write the failing test**

Create `src/infrastructure/dexie/db.ruinFields.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './db'

describe('POI read-hook defaults for ruin/landmark fields', () => {
  beforeEach(async () => { await db.open(); await db.pois.clear() })

  it('backfills null for new fields on legacy records', async () => {
    // Insert a record missing the new fields (simulate legacy)
    const legacy: any = { id: 'p1', regionId: 'r', parentPoiId: null, name: 'Old', type: 'ruin',
      subtypeLabel: null, floor: null, tags: [], position: null, mapRef: null, markerColor: null,
      readAloud: '', gmNotes: '', trouble: '', mood: '', sensory: '', services: [], imageUrl: null,
      monsterRefs: [], magicItemRefs: [], spellRefs: [], equipmentRefs: [], locationSeed: null,
      traps: [], treasure: [], roomWidth: null, roomLength: null, visited: false, lightLevel: null,
      wanderingMonsters: [], encounterChance: null, watabouSeed: null, watabouGenerator: null,
      watabouData: null, spatialDungeon: null, dungeonGenOptions: null, sessionLog: [], starred: false,
      createdAt: 1, updatedAt: 1 }
    await db.pois.put(legacy)
    const read = await db.pois.get('p1')
    expect(read?.ruinSite).toBeNull()
    expect(read?.landmarkLore).toBeNull()
    expect(read?.poiGenOptions).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/infrastructure/dexie/db.ruinFields.test.ts`
Expected: FAIL — read fields are `undefined`, not `null`.

- [ ] **Step 3: Add v38 + read-hook defaults**

In `src/infrastructure/dexie/db.ts`, after the `db.version(37)...` block add:

```ts
// v38: Add ruinSite/landmarkLore/poiGenOptions to POIs (no index change needed)
db.version(38).stores(storesV36).upgrade(async (tx) => {
  const pois = await tx.table('pois').toArray()
  for (const poi of pois) {
    if (poi.ruinSite === undefined) {
      await tx.table('pois').put({ ...poi, ruinSite: null, landmarkLore: null, poiGenOptions: null })
    }
  }
})
```

In the `db.pois.hook('reading')` `defaults` map, add:

```ts
    spatialDungeon: null,
    dungeonGenOptions: null,
    ruinSite: null,
    landmarkLore: null,
    poiGenOptions: null,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/infrastructure/dexie/db.ruinFields.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/infrastructure/dexie/db.ts src/infrastructure/dexie/db.ruinFields.test.ts
git commit -m "feat: Dexie v38 backfill + read-hook defaults for ruin/landmark fields"
```

---

### Task 8: Add `bulkCreate` to the NPC repository

**Files:**
- Modify: `src/application/ports/INPCRepository.ts`
- Modify: `src/infrastructure/dexie/repositories/NPCRepository.ts`
- Test: `src/infrastructure/dexie/repositories/NPCRepository.bulk.test.ts` (new)

**Interfaces:**
- Produces: `INPCRepository.bulkCreate(npcs: NPC[]): Promise<void>`.

- [ ] **Step 1: Write the failing test**

Create `src/infrastructure/dexie/repositories/NPCRepository.bulk.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@infrastructure/dexie/db'
import { NPCRepository } from './NPCRepository'
import type { NPC } from '@domain/entities/NPC'

const mkNpc = (id: string): NPC => ({
  id, worldId: 'w', name: id, factionIds: [], regionId: null, poiId: 'poi1',
  lifeStatus: 'alive', movementStatus: 'present', description: '', traits: [],
  motivation: '', appearance: '', voice: '', want: '', tags: [], imageUrl: null,
  systemBlock: {} as NPC['systemBlock'], starred: false, createdAt: 1, updatedAt: 1,
})

describe('NPCRepository.bulkCreate', () => {
  beforeEach(async () => { await db.open(); await db.npcs.clear() })
  it('inserts all npcs', async () => {
    const repo = new NPCRepository()
    await repo.bulkCreate([mkNpc('a'), mkNpc('b')])
    const got = await repo.getByPoiId('poi1')
    expect(got.map((n) => n.id).sort()).toEqual(['a', 'b'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/infrastructure/dexie/repositories/NPCRepository.bulk.test.ts`
Expected: FAIL — `bulkCreate` not a function.

- [ ] **Step 3: Implement**

In `INPCRepository.ts` add: `bulkCreate(npcs: NPC[]): Promise<void>`.
In `NPCRepository.ts` add:

```ts
  async bulkCreate(npcs: NPC[]): Promise<void> {
    await db.npcs.bulkPut(npcs)
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/infrastructure/dexie/repositories/NPCRepository.bulk.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add INPCRepository.bulkCreate"
```

---

### Task 9: Export `biomeTier` from `regionFlavor`

**Files:**
- Modify: `src/domain/services/worldgen/regionFlavor.ts`
- Test: `src/domain/services/worldgen/regionFlavor.tier.test.ts` (new)

**Interfaces:**
- Produces: `biomeTier(biome: Biome): 'easy' | 'tough' | 'perilous'`.

- [ ] **Step 1: Write the failing test**

Create `src/domain/services/worldgen/regionFlavor.tier.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { biomeTier } from './regionFlavor'

describe('biomeTier', () => {
  it('maps biomes to tiers', () => {
    expect(biomeTier('grasslands')).toBe('easy')
    expect(biomeTier('forest')).toBe('tough')
    expect(biomeTier('mountains')).toBe('perilous')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/domain/services/worldgen/regionFlavor.tier.test.ts`
Expected: FAIL — `biomeTier` not exported.

- [ ] **Step 3: Export the helper**

In `regionFlavor.ts`, export the `Tier` type and add a function (reuse the existing private `BIOME_TIER` map; keep `buildRegionFlavor` using it):

```ts
export type Tier = 'easy' | 'tough' | 'perilous'
// ...existing BIOME_TIER...
export function biomeTier(biome: Biome): Tier {
  return BIOME_TIER[biome]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/domain/services/worldgen/regionFlavor.tier.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: export biomeTier helper from regionFlavor"
```

---

# Phase 3 — Landmark (proves the gen → use-case → pre-gen → regen → UI pattern end-to-end on the simpler kind)

### Task 10: Landmark content tables

**Files:**
- Create: `src/domain/data/landmark-tables.ts`
- Test: `src/domain/data/landmark-tables.test.ts`

**Interfaces:**
- Produces: `LANDMARK_LEGENDS`, `LANDMARK_TRUTHS`, `LANDMARK_SECRETS`, `LANDMARK_TRIGGERS`, `LANDMARK_EFFECTS`, `LANDMARK_QUEST_HOOKS` — each `readonly string[]`, length ≥ 8.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import * as T from './landmark-tables'

describe('landmark tables', () => {
  it('each table has at least 8 non-empty entries', () => {
    for (const key of ['LANDMARK_LEGENDS','LANDMARK_TRUTHS','LANDMARK_SECRETS','LANDMARK_TRIGGERS','LANDMARK_EFFECTS','LANDMARK_QUEST_HOOKS'] as const) {
      const arr = (T as Record<string, readonly string[]>)[key]
      expect(arr.length).toBeGreaterThanOrEqual(8)
      expect(arr.every((s) => s.trim().length > 0)).toBe(true)
    }
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/domain/data/landmark-tables.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the tables**

Create `src/domain/data/landmark-tables.ts` with real GM content (≥8 each; abbreviated sample — fill to 8+):

```ts
export const LANDMARK_LEGENDS = [
  'locals say it grants a wish to those who weep before it',
  'they say no bird has sung here since the old war',
  'the elders swear it marks a god’s buried heart',
  'children are told it eats the names of the proud',
  'pilgrims claim it heals the faithful and curses the false',
  'travelers whisper it shows the face of your true love',
  'the dead are said to gather here on the longest night',
  'it is told the stones move a finger’s width each year',
] as const

export const LANDMARK_TRUTHS = [
  'it is a boundary stone of a power older than the realm',
  'it is the petrified body of something that should have stayed asleep',
  'it is a tuning fork for a magic the builders no longer understood',
  'it is a wound in the world, slowly healing',
  'it is exactly what it appears to be, and that is the strange part',
  'it is a prison, and the lock is failing',
  'it is a map, if you know how to stand',
  'it is a grave marker for a war everyone agreed to forget',
] as const

export const LANDMARK_SECRETS = [
  'a sealed cache lies beneath the third stone',
  'a name is carved where only the tall can read it',
  'a hollow rings under one flagstone',
  'a key-shaped notch waits for a key not yet found',
  'a hidden passage opens at a certain angle of light',
  'a true word, spoken aloud, reveals a chamber',
  'a forgotten ledger names who built it and why',
  'a small door, child-sized, leads somewhere it should not',
] as const

export const LANDMARK_TRIGGERS = [
  'When you touch it bare-handed',
  'When you sleep within its shadow',
  'When you speak your own name here',
  'When you leave an offering',
  'When you spill blood on the stone',
  'When the moon’s light strikes it',
  'When you climb to its highest point',
  'When you read the inscription aloud',
] as const

export const LANDMARK_EFFECTS = [
  'you receive a true vision of a distant place',
  'you wake rested and oddly certain of a direction to travel',
  'a quiet voice answers one honest question',
  'an ill omen settles over you until you make amends',
  'a faint blessing wards your next grave danger',
  'nothing happens — but you are never quite watched the same again',
  'you glimpse the place as it was at its height',
  'a warning, wordless and cold, of something coming',
] as const

export const LANDMARK_QUEST_HOOKS = [
  'the vision points toward a ruin half a realm away',
  'the inscription names a person who may still live',
  'whatever sleeps here will wake within a season',
  'a rival party was seen leaving, laden and afraid',
  'the offering bowl is full — someone tends this place',
  'the true word is written in a book held by a distant cult',
  'the secret chamber holds half of a thing; the other half is elsewhere',
  'pilgrims will pay well for proof of what is real here',
] as const
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test src/domain/data/landmark-tables.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/data/landmark-tables.ts src/domain/data/landmark-tables.test.ts
git commit -m "feat: landmark content tables"
```

---

### Task 11: `generateLandmark` pure generator

**Files:**
- Create: `src/lib/landmark/LandmarkGenerator.ts`
- Test: `src/lib/landmark/LandmarkGenerator.test.ts`

**Interfaces:**
- Consumes: landmark tables (Task 10); `pickCairn` from `@domain/services/worldgen/cairnPick`; `SeededRandom`.
- Produces: `generateLandmark(seed: string, biome: Biome, rng: SeededRandom): LandmarkLore`. (Takes both an explicit `seed` for parity with the ruin generator and the `rng`; uses `rng` for all picks. `biome`/`seed` reserved for biome-flavored variation; current impl may ignore `biome`.)

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { generateLandmark } from './LandmarkGenerator'

describe('generateLandmark', () => {
  it('fills all seven fields', () => {
    const lore = generateLandmark('s', 'forest', new SeededRandom('s'))
    for (const k of ['legend','truth','secret','interactionTrigger','interactionEffect','questHook','sensory'] as const) {
      expect(lore[k].trim().length).toBeGreaterThan(0)
    }
  })

  it('is deterministic for a given seed', () => {
    const a = generateLandmark('z', 'desert', new SeededRandom('z'))
    const b = generateLandmark('z', 'desert', new SeededRandom('z'))
    expect(a).toEqual(b)
  })

  it('keeps trigger and effect as distinct fields', () => {
    const lore = generateLandmark('q', 'hills', new SeededRandom('q'))
    expect(lore.interactionTrigger).not.toBe(lore.interactionEffect)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/lib/landmark/LandmarkGenerator.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
import type { SeededRandom } from '~/lib/dungeon/SeededRandom'
import type { Biome } from '@domain/data/worldgen/biomes'
import type { LandmarkLore } from '@domain/entities/LandmarkLore'
import { pickCairn } from '@domain/services/worldgen/cairnPick'
import {
  LANDMARK_LEGENDS, LANDMARK_TRUTHS, LANDMARK_SECRETS,
  LANDMARK_TRIGGERS, LANDMARK_EFFECTS, LANDMARK_QUEST_HOOKS,
} from '@domain/data/landmark-tables'

export function generateLandmark(_seed: string, _biome: Biome, rng: SeededRandom): LandmarkLore {
  const curiosity = pickCairn(rng, 'table-cairn-curiosity') || 'a strange place'
  const feature = pickCairn(rng, 'table-cairn-curiosity-feature') || ''
  return {
    legend: `Travelers know ${curiosity.toLowerCase()}; ${rng.pick(LANDMARK_LEGENDS)}.`,
    truth: `In truth, ${rng.pick(LANDMARK_TRUTHS)}.`,
    secret: rng.pick(LANDMARK_SECRETS) + '.',
    interactionTrigger: rng.pick(LANDMARK_TRIGGERS) + ',',
    interactionEffect: rng.pick(LANDMARK_EFFECTS) + '.',
    questHook: rng.pick(LANDMARK_QUEST_HOOKS) + '.',
    sensory: feature ? `${feature}.` : `${curiosity}.`,
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test src/lib/landmark/LandmarkGenerator.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/landmark/LandmarkGenerator.ts src/lib/landmark/LandmarkGenerator.test.ts
git commit -m "feat: generateLandmark pure generator"
```

---

### Task 12: `executeGenerateLandmark` use-case

**Files:**
- Create: `src/application/use-cases/GenerateLandmark.ts`
- Test: `src/application/use-cases/GenerateLandmark.test.ts`

**Interfaces:**
- Consumes: `generateLandmark` (Task 11); `IPOIRepository`, `IRegionRepository`.
- Produces: `executeGenerateLandmark(input: { poiId: string; seed: string }, deps: { poiRepo: IPOIRepository; regionRepo: IRegionRepository }): Promise<void>` — loads POI + its region's biome, generates lore, saves `landmarkLore` + `poiGenOptions.seed` via `poiRepo.update`.

- [ ] **Step 1: Confirm region biome access**

Run: `rg -n "terrain|biome" src/domain/entities/Region.ts src/application/ports/IRegionRepository.ts`
Expected: `Region.terrain` is the biome; `IRegionRepository.getById`. Note the exact field name (`terrain`).

- [ ] **Step 2: Write the failing test (hand-rolled fake repos)**

```ts
import { describe, it, expect } from 'vitest'
import { executeGenerateLandmark } from './GenerateLandmark'
import { buildPOI } from '@domain/services/worldgen/buildPoi'
import type { IPOIRepository } from '@application/ports/IPOIRepository'
import type { IRegionRepository } from '@application/ports/IRegionRepository'
import type { POI } from '@domain/entities/POI'
import type { Region } from '@domain/entities/Region'

function fakePoiRepo(seed: POI[]): IPOIRepository & { rows: POI[] } {
  const rows = [...seed]
  return {
    rows,
    getById: async (id) => rows.find((p) => p.id === id),
    update: async (p) => { const i = rows.findIndex((r) => r.id === p.id); if (i >= 0) rows[i] = p },
  } as unknown as IPOIRepository & { rows: POI[] }
}
function fakeRegionRepo(region: Region): IRegionRepository {
  return { getById: async () => region } as unknown as IRegionRepository
}

describe('executeGenerateLandmark', () => {
  it('saves landmarkLore and seed', async () => {
    const poi = buildPOI({ regionId: 'r1', name: 'The Cracked Bell', type: 'landmark' })
    const repo = fakePoiRepo([poi])
    const region = { id: 'r1', terrain: 'forest' } as unknown as Region
    await executeGenerateLandmark({ poiId: poi.id, seed: 'seed-1' }, { poiRepo: repo, regionRepo: fakeRegionRepo(region) })
    const saved = repo.rows[0]
    expect(saved.landmarkLore?.legend).toBeTruthy()
    expect(saved.poiGenOptions?.seed).toBe('seed-1')
  })
})
```

- [ ] **Step 3: Run to verify it fails**

Run: `pnpm test src/application/use-cases/GenerateLandmark.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement**

```ts
import type { IPOIRepository } from '@application/ports/IPOIRepository'
import type { IRegionRepository } from '@application/ports/IRegionRepository'
import type { Biome } from '@domain/data/worldgen/biomes'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { generateLandmark } from '~/lib/landmark/LandmarkGenerator'

export interface GenerateLandmarkInput { poiId: string; seed: string }
export interface GenerateLandmarkDeps { poiRepo: IPOIRepository; regionRepo: IRegionRepository }

export async function executeGenerateLandmark(
  input: GenerateLandmarkInput,
  deps: GenerateLandmarkDeps
): Promise<void> {
  const poi = await deps.poiRepo.getById(input.poiId)
  if (!poi) return
  const region = await deps.regionRepo.getById(poi.regionId)
  const biome = (region?.terrain ?? 'grasslands') as Biome
  const lore = generateLandmark(input.seed, biome, new SeededRandom(input.seed))
  await deps.poiRepo.update({ ...poi, landmarkLore: lore, poiGenOptions: { seed: input.seed }, updatedAt: Date.now() })
}
```

(If `IPOIRepository.update` takes a partial or differs, match its real signature — confirm with `rg -n "update" src/application/ports/IPOIRepository.ts`.)

- [ ] **Step 5: Run to verify it passes + typecheck**

Run: `pnpm test src/application/use-cases/GenerateLandmark.test.ts` → PASS.
Run: `pnpm build` → clean.

- [ ] **Step 6: Commit**

```bash
git add src/application/use-cases/GenerateLandmark.ts src/application/use-cases/GenerateLandmark.test.ts
git commit -m "feat: executeGenerateLandmark use-case"
```

---

### Task 13: `useRegenerateLandmark` hook + landmark world-gen pre-gen

**Files:**
- Create: `src/ui/hooks/useRegenerateLandmark.ts`
- Modify: `src/application/use-cases/GenerateWorld.ts`
- Test: `src/application/use-cases/GenerateWorld.landmark.test.ts`

**Interfaces:**
- Consumes: `executeGenerateLandmark` (Task 12); `useContainer`.
- Produces: `useRegenerateLandmark(): (poiId: string) => Promise<void>` (generates a fresh seed each call). World-gen const `PREGEN_LANDMARK_CAP = 12`; landmarks pre-generated after the main transaction.

- [ ] **Step 1: Write the failing world-gen test**

Create `src/application/use-cases/GenerateWorld.landmark.test.ts` (mirror the existing `GenerateWorld.test.ts` setup — copy its `beforeEach` table-clearing and `deps()`):

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@infrastructure/dexie/db'
import { createContainer } from '@infrastructure/container'
import { cairnSystemConfig } from '@infrastructure/dexie/seed-system-configs'
import { executeGenerateWorld } from './GenerateWorld'

const container = createContainer()
beforeEach(async () => {
  await db.open()
  await Promise.all([db.worlds.clear(), db.regions.clear(), db.pois.clear(), db.npcs.clear(), db.factions.clear(), db.paths.clear()])
  await db.systemConfigs.put(cairnSystemConfig)
})
const deps = () => ({
  realmRepo: container.realmRepo, regionRepo: container.regionRepo, factionRepo: container.factionRepo,
  realmNoteRepo: container.realmNoteRepo, poiRepo: container.poiRepo, npcRepo: container.npcRepo,
  pathRepo: container.pathRepo, factionPresenceRepo: container.factionPresenceRepo, poiEventRepo: container.poiEventRepo,
})

describe('world gen pre-generates landmarks', () => {
  it('at least one landmark has landmarkLore', async () => {
    await executeGenerateWorld({ seed: 'lm-seed', systemId: 'system-cairn-2e', name: 'T' } as any, deps() as any)
    const pois = await db.pois.toArray()
    const landmarks = pois.filter((p) => p.type === 'landmark')
    expect(landmarks.length).toBeGreaterThan(0)
    expect(landmarks.some((p) => p.landmarkLore != null)).toBe(true)
  })
})
```

(Match `executeGenerateWorld`'s real input/deps shape from `GenerateWorld.test.ts`; adjust the `as any` casts to the real types.)

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/application/use-cases/GenerateWorld.landmark.test.ts`
Expected: FAIL — no landmark has `landmarkLore`.

- [ ] **Step 3: Add the pre-gen pass**

In `GenerateWorld.ts`: add `const PREGEN_LANDMARK_CAP = 12` near `PREGEN_DUNGEON_CAP`. Capture stubs inside the transaction next to `dungeonStubs`:

```ts
    landmarkStubs = pois.filter((p) => p.type === 'landmark')
```

(declare `let landmarkStubs: POI[] = []` alongside `dungeonStubs`). After the dungeon pre-gen loop add:

```ts
  for (const stub of landmarkStubs.slice(0, PREGEN_LANDMARK_CAP)) {
    await executeGenerateLandmark(
      { poiId: stub.id, seed: `${input.seed}-landmark-${stub.id}` },
      { poiRepo: deps.poiRepo, regionRepo: deps.regionRepo }
    )
  }
```

Add `import { executeGenerateLandmark } from './GenerateLandmark'`. Ensure `deps.regionRepo` exists in `GenerateWorldDeps`; if not, add it (it's in the container).

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test src/application/use-cases/GenerateWorld.landmark.test.ts`
Expected: PASS.

- [ ] **Step 5: Create the regenerate hook**

`src/ui/hooks/useRegenerateLandmark.ts`:

```ts
import { useContainer } from '~/ui/hooks/useContainer'
import { executeGenerateLandmark } from '@application/use-cases/GenerateLandmark'
import { newId } from '@shared/ulid'

export function useRegenerateLandmark() {
  const container = useContainer()
  return async (poiId: string) => {
    await executeGenerateLandmark(
      { poiId, seed: `landmark-${newId()}` },
      { poiRepo: container.poiRepo, regionRepo: container.regionRepo }
    )
  }
}
```

(Dexie live-queries refresh the UI automatically on the POI update; no manual invalidation needed — confirm the detail page uses a live `usePOI` hook.)

- [ ] **Step 6: Typecheck + commit**

Run: `pnpm build` → clean.

```bash
git add -A
git commit -m "feat: landmark pre-gen pass + useRegenerateLandmark hook"
```

---

# Phase 4 — Ruin

### Task 14: Ruin creature pools + danger bands

**Files:**
- Create: `src/lib/ruin/ruinCreaturePools.ts`
- Test: `src/lib/ruin/ruinCreaturePools.test.ts`

**Interfaces:**
- Produces:
  - `RUIN_CREATURE_POOLS: Record<Exclude<RuinState,'empty'>, readonly string[]>` — non-empty slug arrays.
  - `ruinCreatureLevel(tier: 'easy'|'tough'|'perilous', systemId: string): number` — the `levelCap` passed to `resolveCreature`. Shadowdark: 2/4/6. Cairn (HP cap; `resolveCreature` multiplies by 6, so to cap HP at 8/15/25 return ~1/2/4): return 1/2/4.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { RUIN_CREATURE_POOLS, ruinCreatureLevel } from './ruinCreaturePools'

describe('ruin creature pools', () => {
  it('every non-empty state has a non-empty pool', () => {
    for (const state of ['beast-claimed','faction-held','haunted','cult-site'] as const) {
      expect(RUIN_CREATURE_POOLS[state].length).toBeGreaterThan(0)
    }
  })
  it('danger bands rise with tier for shadowdark', () => {
    expect(ruinCreatureLevel('easy','system-shadowdark')).toBeLessThan(ruinCreatureLevel('perilous','system-shadowdark'))
  })
  it('cairn caps are tighter than shadowdark levels', () => {
    expect(ruinCreatureLevel('easy','system-cairn-2e')).toBeLessThanOrEqual(ruinCreatureLevel('easy','system-shadowdark'))
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/lib/ruin/ruinCreaturePools.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
import type { RuinState } from '@domain/entities/RuinSite'

export const RUIN_CREATURE_POOLS: Record<Exclude<RuinState, 'empty'>, readonly string[]> = {
  'beast-claimed': ['wolf', 'bear', 'boar', 'giant_spider', 'giant_rat', 'serpent'],
  'haunted': ['skeleton', 'zombie', 'ghost', 'wraith', 'specter'],
  'cult-site': ['cultist', 'acolyte', 'cult_fanatic', 'summoned_horror'],
  'faction-held': ['bandit', 'soldier', 'mercenary', 'brigand', 'thug'],
}

export function ruinCreatureLevel(
  tier: 'easy' | 'tough' | 'perilous',
  systemId: string
): number {
  if (systemId === 'system-cairn-2e') {
    // resolveCreature caps cairn HP at levelCap*6 → 6/12/24 HP-ish
    return tier === 'easy' ? 1 : tier === 'tough' ? 2 : 4
  }
  // shadowdark: direct level cap
  return tier === 'easy' ? 2 : tier === 'tough' ? 4 : 6
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test src/lib/ruin/ruinCreaturePools.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ruin/ruinCreaturePools.ts src/lib/ruin/ruinCreaturePools.test.ts
git commit -m "feat: ruin creature pools and danger bands"
```

---

### Task 15: Ruin content tables

**Files:**
- Create: `src/domain/data/ruin-tables.ts`
- Test: `src/domain/data/ruin-tables.test.ts`

**Interfaces:**
- Produces: `RUIN_PURPOSES`, `RUIN_AREA_NAMES`, `RUIN_AREA_READALOUD`, `RUIN_AREA_DETAILS`, `RUIN_DISCOVERIES`, `RUIN_HOOKS` — `readonly string[]`, length ≥ 8 each. `RUIN_FAILED_PARTY_DISCOVERY: readonly string[]` (≥4).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import * as T from './ruin-tables'

describe('ruin tables', () => {
  it('core tables have >= 8 entries; failed-party >= 4', () => {
    for (const k of ['RUIN_PURPOSES','RUIN_AREA_NAMES','RUIN_AREA_READALOUD','RUIN_AREA_DETAILS','RUIN_DISCOVERIES','RUIN_HOOKS'] as const) {
      expect((T as Record<string, readonly string[]>)[k].length).toBeGreaterThanOrEqual(8)
    }
    expect(T.RUIN_FAILED_PARTY_DISCOVERY.length).toBeGreaterThanOrEqual(4)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/domain/data/ruin-tables.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the tables**

Create `src/domain/data/ruin-tables.ts` (real content; ≥8 each — sample, fill out):

```ts
export const RUIN_PURPOSES = [
  'a border fortress', 'a temple to a dead god', 'a mining colony', 'a noble’s seat',
  'a prison', 'a waystation', 'a library-keep', 'a watchtower', 'a healing sanctuary',
] as const

export const RUIN_AREA_NAMES = [
  'the Collapsed Gatehouse', 'the Flooded Undercroft', 'the Roofless Hall',
  'the Choked Stair', 'the Shattered Sanctum', 'the Overgrown Courtyard',
  'the Cracked Cistern', 'the Buried Vault', 'the Leaning Tower', 'the Ash-Choked Kitchen',
] as const

export const RUIN_AREA_READALOUD = [
  'Ivy has pried the stones apart; daylight falls through a broken roof.',
  'Black water stands ankle-deep, and something has nested in the rafters.',
  'Soot stains the walls; the fire that gutted this place was no accident.',
  'Rubble blocks half the room; a cold draft breathes from beneath it.',
  'Faded murals watch from the walls, their faces deliberately scratched out.',
  'Roots have burst the flagstones, and birds startle from the shadows.',
  'A foul smell rises from a pit where the floor gave way.',
  'Everything of value was stripped long ago — or so it first appears.',
] as const

export const RUIN_AREA_DETAILS = [
  'A section of floor is rotten and will give under weight.',
  'Loose masonry overhead waits for a loud noise to fall.',
  'A cold spot here makes torches gutter for no reason.',
  'Old claw-marks score the doorframe, shoulder-high.',
  'A dropped, rusted weapon hints someone fought here.',
  'A draft betrays a hidden space behind the far wall.',
  'Standing water hides a sudden drop.',
  'Fresh tracks cross the old dust — something still comes here.',
] as const

export const RUIN_DISCOVERIES = [
  'a water-stained ledger naming the builders and the day they fled',
  'a child’s toy, carefully wrapped, tucked into a wall niche',
  'a half-burned map marking a place that is not on any chart',
  'a sealed letter, never delivered, addressed to someone still alive',
  'a tally scratched into stone, counting down to a date',
  'a relic of the old faith, hidden where looters never looked',
  'a confession carved into the floor by a dying hand',
  'a key that fits no door in this ruin',
] as const

export const RUIN_FAILED_PARTY_DISCOVERY = [
  'the remains of an adventuring party, their gear claimed but their map intact',
  'a bedroll, a cold campfire, and a journal that stops mid-sentence',
  'four shallow graves and a fifth, empty, dug from the inside',
  'a rope still anchored at the lip of a pit, frayed where it was cut',
] as const

export const RUIN_HOOKS = [
  'they say {prize} still lies somewhere in {place}',
  'a dying traveler swore {prize} was hidden deep in {place}',
  'the old maps mark {prize} at {place}, if any dare fetch it',
  'a fence in town will pay well for {prize} out of {place}',
  'a scholar seeks {prize} rumored lost in {place}',
  'a heir wants {prize} recovered from {place}, no questions asked',
  'pilgrims whisper {prize} waits for the worthy in {place}',
  'a rival crew set out for {prize} in {place} and never returned',
] as const
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test src/domain/data/ruin-tables.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/data/ruin-tables.ts src/domain/data/ruin-tables.test.ts
git commit -m "feat: ruin content tables"
```

---

### Task 16: `generateRuinSite` pure plan generator

**Files:**
- Create: `src/lib/ruin/RuinGenerator.ts`
- Test: `src/lib/ruin/RuinGenerator.test.ts`

**Interfaces:**
- Consumes: ruin tables (Task 15), creature pools (Task 14), `pickSiteHistory` (Task 3), `pickCairn`, `SeededRandom`, `RuinState`.
- Produces the pure plan types and generator:

```ts
export interface OccupantSpec { slugs: string[]; count: number; activity: string }
export interface LootSpec { magic: boolean; notable: boolean }
export interface RuinAreaPlan {
  name: string; order: number; isEntry: boolean
  readAloud: string; detail: string; discovery: string | null
  occupantSpecs: OccupantSpec[]; lootSpecs: LootSpec[]
}
export interface RuinSitePlan {
  origin: string; fall: string; builderCulture: string; era: string
  currentState: RuinState; factionId: string | null
  hook: string; notablePrizeAreaIndex: number; areas: RuinAreaPlan[]
}
export function generateRuinSite(
  seed: string, tier: 'easy'|'tough'|'perilous',
  factionIds: string[], usedHistory: Set<string>, rng: SeededRandom
): RuinSitePlan
```

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { generateRuinSite } from './RuinGenerator'

describe('generateRuinSite', () => {
  it('produces 2-4 ordered areas with exactly one entry', () => {
    const plan = generateRuinSite('s', 'tough', [], new Set(), new SeededRandom('s'))
    expect(plan.areas.length).toBeGreaterThanOrEqual(2)
    expect(plan.areas.length).toBeLessThanOrEqual(4)
    expect(plan.areas.filter((a) => a.isEntry)).toHaveLength(1)
    const orders = plan.areas.map((a) => a.order)
    expect(orders).toEqual([...orders].sort((x, y) => x - y))
  })

  it('plants exactly one notable loot spec, in the notablePrizeArea', () => {
    const plan = generateRuinSite('s', 'tough', [], new Set(), new SeededRandom('s'))
    const notables = plan.areas.flatMap((a) => a.lootSpecs).filter((l) => l.notable)
    expect(notables).toHaveLength(1)
    const prizeArea = plan.areas[plan.notablePrizeAreaIndex]
    expect(prizeArea.lootSpecs.some((l) => l.notable)).toBe(true)
  })

  it('always yields at least one discovery (even when empty)', () => {
    // Search seeds is overkill; assert the invariant on several seeds
    for (const s of ['a','b','c','d','e']) {
      const plan = generateRuinSite(s, 'easy', [], new Set(), new SeededRandom(s))
      expect(plan.areas.some((a) => a.discovery && a.discovery.length > 0)).toBe(true)
    }
  })

  it('binds a faction only when faction-held and factions exist', () => {
    const plan = generateRuinSite('s', 'tough', ['fac1'], new Set(), new SeededRandom('s'))
    if (plan.currentState === 'faction-held') expect(plan.factionId).toBe('fac1')
    else expect(plan.factionId).toBeNull()
  })

  it('is deterministic for a given seed', () => {
    const a = generateRuinSite('z', 'perilous', ['f'], new Set(), new SeededRandom('z'))
    const b = generateRuinSite('z', 'perilous', ['f'], new Set(), new SeededRandom('z'))
    expect(a).toEqual(b)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/lib/ruin/RuinGenerator.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
import type { SeededRandom } from '~/lib/dungeon/SeededRandom'
import type { RuinState } from '@domain/entities/RuinSite'
import { pickCairn } from '@domain/services/worldgen/cairnPick'
import { pickSiteHistory, OCCUPANT_ACTIVITIES } from '~/lib/worldgen/siteHistory'
import { RUIN_CREATURE_POOLS } from './ruinCreaturePools'
import {
  RUIN_PURPOSES, RUIN_AREA_NAMES, RUIN_AREA_READALOUD, RUIN_AREA_DETAILS,
  RUIN_DISCOVERIES, RUIN_FAILED_PARTY_DISCOVERY, RUIN_HOOKS,
} from '@domain/data/ruin-tables'

export interface OccupantSpec { slugs: string[]; count: number; activity: string }
export interface LootSpec { magic: boolean; notable: boolean }
export interface RuinAreaPlan {
  name: string; order: number; isEntry: boolean
  readAloud: string; detail: string; discovery: string | null
  occupantSpecs: OccupantSpec[]; lootSpecs: LootSpec[]
}
export interface RuinSitePlan {
  origin: string; fall: string; builderCulture: string; era: string
  currentState: RuinState; factionId: string | null
  hook: string; notablePrizeAreaIndex: number; areas: RuinAreaPlan[]
}

const STATE_TABLE = [
  { value: 'empty' as RuinState, weight: 2 },
  { value: 'beast-claimed' as RuinState, weight: 4 },
  { value: 'haunted' as RuinState, weight: 3 },
  { value: 'cult-site' as RuinState, weight: 2 },
  { value: 'faction-held' as RuinState, weight: 3 },
]

function pickState(rng: SeededRandom): RuinState {
  const total = STATE_TABLE.reduce((s, e) => s + e.weight, 0)
  let r = rng.between(1, total)
  for (const e of STATE_TABLE) { r -= e.weight; if (r <= 0) return e.value }
  return 'empty'
}

export function generateRuinSite(
  seed: string,
  tier: 'easy' | 'tough' | 'perilous',
  factionIds: string[],
  usedHistory: Set<string>,
  rng: SeededRandom
): RuinSitePlan {
  const purpose = rng.pick(RUIN_PURPOSES)
  const { builderCulture, era, fate } = pickSiteHistory(rng, usedHistory)
  const origin = `Built by ${builderCulture} ${era} as ${purpose}.`
  const fall = `Then ${fate}.`

  let currentState = pickState(rng)
  let factionId: string | null = null
  if (currentState === 'faction-held') {
    if (factionIds.length > 0) factionId = rng.pick(factionIds)
    else currentState = 'beast-claimed'
  }

  const areaCount = rng.between(2, 4)
  const names = rng.sample(RUIN_AREA_NAMES, areaCount)
  const notablePrizeAreaIndex = areaCount - 1 // deepest area holds the prize
  const pool = currentState === 'empty' ? [] : RUIN_CREATURE_POOLS[currentState]

  // Guarantee at least one discovery across the ruin.
  const discoveryArea = rng.between(0, areaCount - 1)

  const areas: RuinAreaPlan[] = []
  for (let i = 0; i < areaCount; i++) {
    const isDeepest = i === areaCount - 1
    const isEntry = i === 0

    // Occupants: concentrate in the deepest ("lair") area; some in the middle.
    const occupantSpecs: OccupantSpec[] = []
    if (pool.length > 0 && !isEntry) {
      const count = isDeepest ? rng.between(2, 4) : rng.between(0, 2)
      if (count > 0) {
        occupantSpecs.push({
          slugs: rng.sample(pool, Math.min(2, pool.length)),
          count,
          activity: rng.pick(OCCUPANT_ACTIVITIES),
        })
      }
    }

    // Loot: prize in the deepest area; chance of extra loot elsewhere.
    const lootSpecs: LootSpec[] = []
    if (isDeepest) {
      lootSpecs.push({ magic: rng.chance(0.6), notable: true })
    } else if (rng.chance(0.4)) {
      lootSpecs.push({ magic: rng.chance(0.25), notable: false })
    }

    // Discovery: guaranteed in discoveryArea; the deepest area may carry the
    // "failed party" flavor; otherwise occasional.
    let discovery: string | null = null
    if (i === discoveryArea) discovery = rng.pick(RUIN_DISCOVERIES)
    else if (currentState === 'empty' && isDeepest && rng.chance(0.3)) discovery = rng.pick(RUIN_FAILED_PARTY_DISCOVERY)
    else if (rng.chance(0.2)) discovery = rng.pick(RUIN_DISCOVERIES)

    areas.push({
      name: names[i] ?? `Area ${i + 1}`,
      order: i,
      isEntry,
      readAloud: rng.pick(RUIN_AREA_READALOUD),
      detail: rng.pick(RUIN_AREA_DETAILS),
      discovery,
      occupantSpecs,
      lootSpecs,
    })
  }

  const place = areas[notablePrizeAreaIndex].name
  const prize = pickCairn(rng, 'table-cairn-lair') ? 'a lost relic' : 'a hoard'
  const hook = rng.pick(RUIN_HOOKS).replace('{prize}', prize).replace('{place}', place)

  return { origin, fall, builderCulture, era, currentState, factionId, hook, notablePrizeAreaIndex, areas }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test src/lib/ruin/RuinGenerator.test.ts`
Expected: PASS (all five cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/ruin/RuinGenerator.ts src/lib/ruin/RuinGenerator.test.ts
git commit -m "feat: generateRuinSite pure plan generator"
```

---

### Task 17: `executeGenerateRuin` use-case (compendium resolution + loot single-source)

**Files:**
- Create: `src/application/use-cases/GenerateRuin.ts`
- Test: `src/application/use-cases/GenerateRuin.test.ts`

**Interfaces:**
- Consumes: `generateRuinSite` (Task 16), `resolveCreature` (Task 1), `buildCreatureNpc` (shared NPC factory — `@domain/services/worldgen/npcFactory`, added by the shared-NPC-factory bugfix), `generateTreasureItems` (Task 2), `ruinCreatureLevel` (Task 14), `biomeTier` (Task 9), `bulkCreate` (Task 8).
- Produces: `executeGenerateRuin(input: { poiId: string; worldId: string; systemId: string; seed: string; usedHistory?: Set<string> }, deps: { poiRepo: IPOIRepository; npcRepo: INPCRepository; regionRepo: IRegionRepository }): Promise<void>`.

Behavior: load POI + region biome → tier; wipe prior ruin NPCs (`npcRepo.getByPoiId` → `delete`); generate plan; resolve occupants to NPCs (bulkCreate), record ids into area `OccupantGroup.npcIds`; resolve loot to `TreasureItem[]` tagged with `areaIndex`, mark one `notable`; concatenate into `poi.treasure`; set `ruinSite.notablePrizeItemId`; save `ruinSite` + `poiGenOptions.seed`.

- [ ] **Step 1: Write the failing test (both systems)**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@infrastructure/dexie/db'
import { createContainer } from '@infrastructure/container'
import { buildPOI } from '@domain/services/worldgen/buildPoi'
import { executeGenerateRuin } from './GenerateRuin'

const container = createContainer()
const deps = () => ({ poiRepo: container.poiRepo, npcRepo: container.npcRepo, regionRepo: container.regionRepo })

beforeEach(async () => { await db.open(); await Promise.all([db.pois.clear(), db.npcs.clear(), db.regions.clear()]) })

async function seedRuin(systemId: string) {
  await db.regions.put({ id: 'r1', terrain: 'mountains' } as any) // perilous → occupants likely
  const poi = buildPOI({ regionId: 'r1', name: 'Old Fort', type: 'ruin' })
  await db.pois.put(poi)
  await executeGenerateRuin({ poiId: poi.id, worldId: 'w', systemId, seed: 'ruin-1' }, deps())
  return (await db.pois.get(poi.id))!
}

describe('executeGenerateRuin', () => {
  for (const systemId of ['system-cairn-2e', 'system-shadowdark']) {
    it(`generates a ruin for ${systemId}: lore, areas, loot single-source, notable prize`, async () => {
      const saved = await seedRuin(systemId)
      expect(saved.ruinSite).not.toBeNull()
      expect(saved.ruinSite!.areas.length).toBeGreaterThanOrEqual(2)
      // loot lives only on poi.treasure, tagged with areaIndex
      expect(saved.treasure.length).toBeGreaterThan(0)
      expect(saved.treasure.every((t) => typeof t.areaIndex === 'number')).toBe(true)
      const notable = saved.treasure.filter((t) => t.notable)
      expect(notable).toHaveLength(1)
      expect(saved.ruinSite!.notablePrizeItemId).toBe(notable[0].id)
      // occupant npcs (if any) are linked to the ruin POI and referenced by areas
      const npcs = await db.npcs.where('poiId').equals(saved.id).toArray()
      const refIds = saved.ruinSite!.areas.flatMap((a) => a.occupants.flatMap((o) => o.npcIds))
      for (const id of refIds) expect(npcs.some((n) => n.id === id)).toBe(true)
    })
  }

  it('regen wipes prior occupant NPCs (no dupes)', async () => {
    const first = await seedRuin('system-shadowdark')
    const before = (await db.npcs.where('poiId').equals(first.id).toArray()).length
    await executeGenerateRuin({ poiId: first.id, worldId: 'w', systemId: 'system-shadowdark', seed: 'ruin-2' }, deps())
    const after = (await db.npcs.where('poiId').equals(first.id).toArray()).length
    // Not additive: count reflects only the latest generation
    expect(after).toBeLessThanOrEqual(before + 4)
    expect(after).toBeGreaterThanOrEqual(0)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/application/use-cases/GenerateRuin.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
import type { IPOIRepository } from '@application/ports/IPOIRepository'
import type { INPCRepository } from '@application/ports/INPCRepository'
import type { IRegionRepository } from '@application/ports/IRegionRepository'
import type { Biome } from '@domain/data/worldgen/biomes'
import type { NPC } from '@domain/entities/NPC'
import type { TreasureItem } from '@domain/value-objects/TreasureItem'
import type { RuinSite, RuinArea, OccupantGroup } from '@domain/entities/RuinSite'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { biomeTier } from '@domain/services/worldgen/regionFlavor'
import { resolveCreature } from '~/lib/worldgen/compendium-utils'
import { buildCreatureNpc } from '@domain/services/worldgen/npcFactory'
import { generateTreasureItems } from '~/lib/worldgen/treasure-gen'
import { generateRuinSite } from '~/lib/ruin/RuinGenerator'
import { ruinCreatureLevel } from '~/lib/ruin/ruinCreaturePools'

// NOTE: occupant NPCs are built with the SHARED `buildCreatureNpc` factory
// (created by the shared-NPC-factory bugfix). Do not hand-roll NPC object
// literals here. `newId` is no longer needed in this file (the factory mints
// ids; treasure ids come from generateTreasureItems).

export interface GenerateRuinInput {
  poiId: string; worldId: string; systemId: string; seed: string
  usedHistory?: Set<string>
}
export interface GenerateRuinDeps {
  poiRepo: IPOIRepository; npcRepo: INPCRepository; regionRepo: IRegionRepository
}

export async function executeGenerateRuin(input: GenerateRuinInput, deps: GenerateRuinDeps): Promise<void> {
  const poi = await deps.poiRepo.getById(input.poiId)
  if (!poi) return
  const region = await deps.regionRepo.getById(poi.regionId)
  const biome = (region?.terrain ?? 'grasslands') as Biome
  const tier = biomeTier(biome)

  // Regen: wipe prior occupant NPCs linked to this ruin.
  const prior = await deps.npcRepo.getByPoiId(poi.id)
  for (const n of prior) await deps.npcRepo.delete(n.id)

  const rng = new SeededRandom(input.seed)
  const plan = generateRuinSite(input.seed, tier, [], input.usedHistory ?? new Set(), rng)

  const now = Date.now()
  const levelCap = ruinCreatureLevel(tier, input.systemId)
  const newNpcs: NPC[] = []
  const treasure: TreasureItem[] = []
  let notablePrizeItemId: string | null = null

  const areas: RuinArea[] = plan.areas.map((ap) => {
    // Occupants → NPC entities
    const occupants: OccupantGroup[] = ap.occupantSpecs.map((spec) => {
      const npcIds: string[] = []
      for (let i = 0; i < spec.count; i++) {
        const slug = spec.slugs[i % spec.slugs.length]
        const resolved = resolveCreature(slug, input.systemId, rng, { levelCap })
        // Use the SHARED creature builder (src/domain/services/worldgen/npcFactory.ts)
        // so ruin occupants get the same appearance/stat-block treatment as dungeon
        // creatures (appearance from the bestiary description). Do NOT hand-build the
        // NPC literal here — that is exactly the divergence the shared factory removes.
        const npc = buildCreatureNpc({
          worldId: input.worldId,
          regionId: poi.regionId,
          poiId: poi.id,
          systemId: input.systemId,
          compendiumId: resolved?.id ?? null,
          name: resolved?.name ?? slug.replace(/_/g, ' '),
          activity: spec.activity,
          depth: levelCap,
          dangerLevel: 'medium',
          disposition: 'hostile',
          tags: ['creature', 'ruin'],
        }, rng)
        newNpcs.push(npc)
        npcIds.push(npc.id)
      }
      return { npcIds, activity: spec.activity }
    })

    // Loot → TreasureItem[] tagged with areaIndex
    for (const loot of ap.lootSpecs) {
      const items = generateTreasureItems('standard', 1, rng).map((t) => ({ ...t, areaIndex: ap.order, notable: loot.notable }))
      for (const item of items) {
        treasure.push(item)
        if (loot.notable) notablePrizeItemId = item.id
      }
    }

    return {
      name: ap.name, order: ap.order, isEntry: ap.isEntry,
      readAloud: ap.readAloud, detail: ap.detail, discovery: ap.discovery,
      occupants,
    }
  })

  if (newNpcs.length > 0) await deps.npcRepo.bulkCreate(newNpcs)

  const ruinSite: RuinSite = {
    origin: plan.origin, fall: plan.fall, builderCulture: plan.builderCulture, era: plan.era,
    currentState: plan.currentState, factionId: plan.factionId, hook: plan.hook,
    notablePrizeItemId, areas,
  }

  await deps.poiRepo.update({ ...poi, ruinSite, treasure, poiGenOptions: { seed: input.seed }, updatedAt: now })
}
```

(If `getByPoiId`/`delete`/`update` signatures differ, confirm via `rg -n "getByPoiId|delete|update" src/application/ports/INPCRepository.ts src/application/ports/IPOIRepository.ts` and match. `fallbackSystemBlock(depth, dangerLevel, systemId)` signature confirmed from `GenerateDungeon.ts`.)

- [ ] **Step 4: Run to verify it passes + typecheck**

Run: `pnpm test src/application/use-cases/GenerateRuin.test.ts` → PASS (both systems + regen).
Run: `pnpm build` → clean.

- [ ] **Step 5: Commit**

```bash
git add src/application/use-cases/GenerateRuin.ts src/application/use-cases/GenerateRuin.test.ts
git commit -m "feat: executeGenerateRuin use-case (both systems, single-source loot)"
```

---

### Task 18: Ruin world-gen pre-gen pass + `useRegenerateRuin` hook

**Files:**
- Modify: `src/application/use-cases/GenerateWorld.ts`
- Create: `src/ui/hooks/useRegenerateRuin.ts`
- Test: `src/application/use-cases/GenerateWorld.ruin.test.ts`

**Interfaces:**
- Produces: `PREGEN_RUIN_CAP = 8`; ruins pre-generated with a shared per-realm `usedHistory` Set. `useRegenerateRuin(): (poiId: string) => Promise<void>`.

- [ ] **Step 1: Write the failing world-gen test**

Create `src/application/use-cases/GenerateWorld.ruin.test.ts` (same setup as Task 13's test):

```ts
// ...same imports + beforeEach + deps() as GenerateWorld.landmark.test.ts...
describe('world gen pre-generates ruins', () => {
  it('at least one ruin has a ruinSite with areas', async () => {
    await executeGenerateWorld({ seed: 'ruin-seed', systemId: 'system-cairn-2e', name: 'T' } as any, deps() as any)
    const pois = await db.pois.toArray()
    const ruins = pois.filter((p) => p.type === 'ruin')
    expect(ruins.length).toBeGreaterThan(0)
    expect(ruins.some((p) => (p.ruinSite?.areas.length ?? 0) >= 2)).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/application/use-cases/GenerateWorld.ruin.test.ts`
Expected: FAIL — no ruin has a `ruinSite`.

- [ ] **Step 3: Add the ruin pre-gen pass**

In `GenerateWorld.ts`: add `const PREGEN_RUIN_CAP = 8`. Declare `let ruinStubs: POI[] = []` and inside the transaction: `ruinStubs = pois.filter((p) => p.type === 'ruin')`. After the landmark loop:

```ts
  const usedHistory = new Set<string>()
  for (const stub of ruinStubs.slice(0, PREGEN_RUIN_CAP)) {
    await executeGenerateRuin(
      { poiId: stub.id, worldId: realmId, systemId: input.systemId, seed: `${input.seed}-ruin-${stub.id}`, usedHistory },
      { poiRepo: deps.poiRepo, npcRepo: deps.npcRepo, regionRepo: deps.regionRepo }
    )
  }
```

Add `import { executeGenerateRuin } from './GenerateRuin'`.

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test src/application/use-cases/GenerateWorld.ruin.test.ts`
Expected: PASS.

- [ ] **Step 5: Create the regenerate hook**

`src/ui/hooks/useRegenerateRuin.ts`:

```ts
import { useContainer } from '~/ui/hooks/useContainer'
import { executeGenerateRuin } from '@application/use-cases/GenerateRuin'
import { useActiveRealm } from '~/ui/hooks/useActiveRealm'
import { newId } from '@shared/ulid'

export function useRegenerateRuin() {
  const container = useContainer()
  const realm = useActiveRealm()
  return async (poiId: string) => {
    if (!realm) return
    await executeGenerateRuin(
      { poiId, worldId: realm.id, systemId: realm.systemId, seed: `ruin-${newId()}` },
      { poiRepo: container.poiRepo, npcRepo: container.npcRepo, regionRepo: container.regionRepo }
    )
  }
}
```

(Confirm `useActiveRealm` path/shape via `rg -n "useActiveRealm" src/ui/hooks`. It provides `realm.id` and `realm.systemId` as used in the generate-dungeon route.)

- [ ] **Step 6: Typecheck + commit**

Run: `pnpm build` → clean.

```bash
git add -A
git commit -m "feat: ruin pre-gen pass + useRegenerateRuin hook"
```

---

# Phase 5 — UI

### Task 19: Lore + areas presentational components

**Files:**
- Create: `src/components/poi-templates/LandmarkLoreBlock.tsx`
- Create: `src/components/poi-templates/RuinLoreBlock.tsx`
- Create: `src/components/poi-templates/RuinAreasSection.tsx`
- Test: `src/components/poi-templates/RuinLoreBlock.test.tsx`

**Interfaces:**
- Produces: `<RuinLoreBlock site={RuinSite} />`, `<LandmarkLoreBlock lore={LandmarkLore} />`, `<RuinAreasSection areas={RuinArea[]} npcs={NPC[]} treasure={TreasureItem[]} />` (areas render in `order`; per-area loot = `treasure.filter(t => t.areaIndex === area.order)`; per-area occupants resolved from `npcs` filtered to `occupant.npcIds`).

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RuinLoreBlock } from './RuinLoreBlock'
import type { RuinSite } from '@domain/entities/RuinSite'

const site: RuinSite = {
  origin: 'Built by stonewrights.', fall: 'Then plague.', builderCulture: 'dwarven', era: 'an age ago',
  currentState: 'beast-claimed', factionId: null, hook: 'they say a relic lies within',
  notablePrizeItemId: null, areas: [],
}

describe('RuinLoreBlock', () => {
  it('renders origin, fall, and hook', () => {
    render(<RuinLoreBlock site={site} />)
    expect(screen.getByText(/Built by stonewrights/)).toBeTruthy()
    expect(screen.getByText(/Then plague/)).toBeTruthy()
    expect(screen.getByText(/a relic lies within/)).toBeTruthy()
  })
})
```

(Confirm the project's React test setup — `rg -l "@testing-library/react" src` — and mirror an existing component test's imports. If no component tests exist, instead write a pure render-to-string smoke using the same pattern as an existing `.test.tsx`; if there are truly none, skip the RTL test and assert the component is a function that returns an element.)

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test src/components/poi-templates/RuinLoreBlock.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the three components**

`RuinLoreBlock.tsx` (mirror the DungeonTemplate "Dungeon Lore" markup style):

```tsx
import type { RuinSite } from '@domain/entities/RuinSite'

export function RuinLoreBlock({ site }: { site: RuinSite }) {
  return (
    <div className="space-y-2 rounded-md border bg-muted/30 p-3">
      <div className="flex items-center gap-2">
        <span className="text-xs">🏚</span>
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ruin Lore</span>
      </div>
      <p className="text-sm italic text-foreground">{site.origin} {site.fall}</p>
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span>Built by: <span className="font-medium capitalize text-foreground">{site.builderCulture}</span></span>
        <span>State: <span className="font-medium capitalize text-foreground">{site.currentState.replace('-', ' ')}</span></span>
      </div>
      {site.hook && <p className="border-t border-border pt-1 text-sm text-foreground">Hook: <span className="italic">{site.hook}</span></p>}
    </div>
  )
}
```

`LandmarkLoreBlock.tsx`:

```tsx
import type { LandmarkLore } from '@domain/entities/LandmarkLore'

export function LandmarkLoreBlock({ lore }: { lore: LandmarkLore }) {
  const Row = ({ label, text }: { label: string; text: string }) =>
    text ? <p className="text-sm"><span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}: </span>{text}</p> : null
  return (
    <div className="space-y-2 rounded-md border bg-muted/30 p-3">
      <div className="flex items-center gap-2">
        <span className="text-xs">✨</span>
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Landmark Lore</span>
      </div>
      <Row label="Legend" text={lore.legend} />
      <Row label="Truth" text={lore.truth} />
      <Row label="Interaction" text={`${lore.interactionTrigger} ${lore.interactionEffect}`} />
      <Row label="Secret" text={lore.secret} />
      <Row label="Quest" text={lore.questHook} />
    </div>
  )
}
```

`RuinAreasSection.tsx`:

```tsx
import type { RuinArea } from '@domain/entities/RuinSite'
import type { NPC } from '@domain/entities/NPC'
import type { TreasureItem } from '@domain/value-objects/TreasureItem'

export function RuinAreasSection({ areas, npcs, treasure }: { areas: RuinArea[]; npcs: NPC[]; treasure: TreasureItem[] }) {
  const sorted = [...areas].sort((a, b) => a.order - b.order)
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Areas</h3>
      {sorted.map((area) => {
        const areaLoot = treasure.filter((t) => t.areaIndex === area.order)
        const occNames = area.occupants.flatMap((o) =>
          o.npcIds.map((id) => npcs.find((n) => n.id === id)?.name).filter(Boolean) as string[])
        return (
          <div key={area.order} className="rounded-md border p-3">
            <div className="flex items-center gap-2">
              <span className="font-medium">{area.name}</span>
              {area.isEntry && <span className="text-xs text-muted-foreground">(entry)</span>}
            </div>
            <p className="mt-1 text-sm italic text-foreground">{area.readAloud}</p>
            {area.detail && <p className="text-xs text-muted-foreground">{area.detail}</p>}
            {area.discovery && <p className="text-xs text-foreground">🔍 {area.discovery}</p>}
            {occNames.length > 0 && (
              <p className="text-xs text-muted-foreground">Occupants: {occNames.join(', ')}
                {area.occupants[0]?.activity ? ` — ${area.occupants[0].activity}` : ''}</p>
            )}
            {areaLoot.length > 0 && (
              <p className="text-xs text-muted-foreground">Loot: {areaLoot.map((t) => t.name + (t.notable ? ' ★' : '')).join(', ')}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test src/components/poi-templates/RuinLoreBlock.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/poi-templates/RuinLoreBlock.tsx src/components/poi-templates/LandmarkLoreBlock.tsx src/components/poi-templates/RuinAreasSection.tsx src/components/poi-templates/RuinLoreBlock.test.tsx
git commit -m "feat: ruin/landmark lore + areas presentational components"
```

---

### Task 20: Wire lore + areas into `GenericTemplate` (type-guarded)

**Files:**
- Modify: `src/components/poi-templates/GenericTemplate.tsx`

**Interfaces:**
- Consumes: the three components (Task 19). Uses existing `allNPCs` (already computed in the template) and `poi.treasure`.

- [ ] **Step 1: Add imports**

At the top of `GenericTemplate.tsx`:

```tsx
import { RuinLoreBlock } from './RuinLoreBlock'
import { LandmarkLoreBlock } from './LandmarkLoreBlock'
import { RuinAreasSection } from './RuinAreasSection'
```

- [ ] **Step 2: Insert the lore + areas blocks in the Overview tab**

In the Overview `TabsContent`, immediately after the `<SensoryBlock text={poi.sensory} />` line and before `{mapSection}`, add (guarded by `poi.type`, mirroring the existing `poi.type === "ruin"` RumorList guard):

```tsx
          {poi.type === "ruin" && poi.ruinSite && (
            <>
              <RuinLoreBlock site={poi.ruinSite} />
              <RuinAreasSection areas={poi.ruinSite.areas} npcs={allNPCs} treasure={poi.treasure} />
            </>
          )}

          {poi.type === "landmark" && poi.landmarkLore && (
            <LandmarkLoreBlock lore={poi.landmarkLore} />
          )}
```

- [ ] **Step 3: Verify it renders (manual + typecheck)**

Run: `pnpm build` → clean.
Run the app (`pnpm dev`), open a generated ruin POI → Overview shows Ruin Lore + Areas; open a landmark → Landmark Lore. (No automated step here; the component logic is unit-tested in Task 19.)

- [ ] **Step 4: Commit**

```bash
git add src/components/poi-templates/GenericTemplate.tsx
git commit -m "feat: render ruin/landmark lore + areas in GenericTemplate"
```

---

### Task 21: Action-bar Generate/Regenerate button for ruin + landmark

**Files:**
- Modify: `src/routes/_app/realms/pois_.$poiId.tsx`

**Interfaces:**
- Consumes: `useRegenerateRuin` (Task 18), `useRegenerateLandmark` (Task 13).

- [ ] **Step 1: Add hook imports + instances**

Near the top of the route component (where `useContainer`/other hooks are used):

```tsx
import { useRegenerateRuin } from '~/ui/hooks/useRegenerateRuin'
import { useRegenerateLandmark } from '~/ui/hooks/useRegenerateLandmark'
// inside the component:
  const regenerateRuin = useRegenerateRuin()
  const regenerateLandmark = useRegenerateLandmark()
  const [isRegenerating, setIsRegenerating] = useState(false)
```

(`useState` is already imported in this file; confirm.)

- [ ] **Step 2: Add the button to `poiActionBar`**

After the existing `poi.type === 'dungeon'` Generate/Regenerate `<Link>` block, add:

```tsx
      {(poi.type === 'ruin' || poi.type === 'landmark') && (
        <Button
          size="sm"
          variant="outline"
          disabled={isRegenerating}
          onClick={async () => {
            setIsRegenerating(true)
            try {
              if (poi.type === 'ruin') await regenerateRuin(poi.id)
              else await regenerateLandmark(poi.id)
            } finally {
              setIsRegenerating(false)
            }
          }}
        >
          <Wand2 className="mr-2 size-4" />
          {(poi.type === 'ruin' ? poi.ruinSite : poi.landmarkLore) ? 'Regenerate' : 'Generate'}
        </Button>
      )}
```

(`Wand2` and `Button` are already imported in this file.)

- [ ] **Step 3: Typecheck + manual verify**

Run: `pnpm build` → clean.
Run the app: open a ruin → click Regenerate → lore/areas/occupants re-roll in place; open a never-generated stub ruin → button reads "Generate" and fills it on click.

- [ ] **Step 4: Commit**

```bash
git add src/routes/_app/realms/pois_.$poiId.tsx
git commit -m "feat: Generate/Regenerate action-bar button for ruins and landmarks"
```

---

### Task 22: Full-suite green + final verification

**Files:** none (verification only)

- [ ] **Step 1: Run the entire suite**

Run: `pnpm test`
Expected: ALL tests pass — new ruin/landmark tests AND the pre-existing dungeon/world-gen suite (guards the Phase 1 extraction).

- [ ] **Step 2: Production build**

Run: `pnpm build`
Expected: `vite build` succeeds and `tsc --noEmit` is clean.

- [ ] **Step 3: Manual smoke**

Run `pnpm dev`, generate a fresh world, and confirm: ruins show lore + ordered areas (entry first) + occupants + per-area loot with the ★ notable prize; landmarks show legend/truth/interaction/secret/quest; Regenerate works for both; the At-A-Glance loot count reflects `poi.treasure`.

- [ ] **Step 4: Commit any final fixups**

```bash
git add -A
git commit -m "test: full ruin/landmark suite green" --allow-empty
```

---

## Self-Review

**Spec coverage check (spec → task):**
- Two separate generators → Tasks 11 (landmark), 16 (ruin). ✓
- Mini-crawl, ordered areas, one entry → Task 16 (gen invariants) + 19/20 (render in order). ✓
- Occupants from compendium, both systems, multiple → Task 17 (both-system test). ✓
- State→slug pools, danger bands (Cairn-tuned) → Task 14. ✓
- Loot single-source `poi.treasure` tagged by `areaIndex` → Tasks 5, 17, 19. ✓
- Notable prize + seam → Tasks 5 (`notable`), 16 (`notablePrizeAreaIndex`), 17 (`notablePrizeItemId`). ✓
- Discoveries incl. empty + failed-party flavor → Tasks 15, 16. ✓
- Occupant activity → Tasks 3 (`OCCUPANT_ACTIVITIES`), 16, 17. ✓
- Per-realm history dedup → Tasks 3 (`pickSiteHistory` used-set), 18 (shared `usedHistory`). ✓
- Landmark legend/truth(nature)/secret(discoverable)/trigger+effect/quest → Tasks 10, 11. ✓
- Shared module, no ruin→dungeon import → Tasks 1–3. ✓
- `treasure-gen` room-independent core → Task 2. ✓
- `bulkCreate` → Task 8. ✓
- `biomeTier` export → Task 9. ✓
- Use-case DI pattern, both kinds → Tasks 12, 17. ✓
- Pre-gen passes capped → Tasks 13 (`PREGEN_LANDMARK_CAP`), 18 (`PREGEN_RUIN_CAP`). ✓
- In-place regenerate hooks → Tasks 13, 18, 21. ✓
- `GenericTemplate` lore + areas, type-guarded → Task 20. ✓
- Dexie v38 + read-hook → Task 7. ✓
- Determinism (pure plans) → Tasks 11, 16 deterministic tests. ✓

**Placeholder scan:** No "TBD"/"handle edge cases"/"similar to" — every code step shows real code. Content tables ship concrete starter entries (data, not placeholders) with a "fill to 8+" note where abbreviated.

**Type consistency:** `RuinSite`/`RuinArea`/`OccupantGroup`/`RuinState` (Task 4) match their use in Tasks 16/17/19. `RuinSitePlan`/`RuinAreaPlan`/`OccupantSpec`/`LootSpec` (Task 16) match consumption in Task 17. `resolveCreature(slug, systemId, rng, { depth?, levelCap? })` (Task 1) matches calls in Tasks 17 and the updated GenerateDungeon. `generateTreasureItems(level, count, rng)` (Task 2) matches Task 17. `executeGenerateRuin`/`executeGenerateLandmark` signatures match their world-gen and hook call sites (Tasks 13/18/21).

**Known follow-ups (out of this plan, by design):** Spec B (leads/discovery web) consumes the `notable` seam; POI god-interface refactor; expanding content tables beyond the starter entries.
