# World Generation — Phase 3a: Regions + POIs — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a generated world contain real content: turn biome clusters into `Region` records, and scatter settlements / dungeons / ruins / landmarks onto hexes as `POI` records that show up (clickable) on the generated hex map. This makes the **POI-density** knob live.

**Architecture:** Builds on the existing generator (`buildTinyHexMap` → biome hex map) and Phase-1 primitives. A new pure `generateWorld(realmId, seed, opts)` lays out the grid + biome clusters once, produces the hex `GameMap`, one `Region` per cluster, and a set of `POI`s positioned at hex centers. The `GenerateWorld` use-case persists realm + map + regions + POIs in one Dexie transaction. POIs render via the existing map data flow (`usePOIsOnMap` keys on `mapRef`); regions are logical records (boundary left null — the biome hex fill is the visual).

**Tech Stack:** TypeScript strict, Dexie 4, Vitest + fake-indexeddb, existing `SeededRandom`, existing `MapViewer`/`InteractiveMap`.

## Context from investigation (binding facts)

- **POIs appear on a map** when `mapRef === gameMap.id` (`usePOIsOnMap`) AND they have a `position {x,y}` in that map's pixel space (`src/components/map/InteractiveMap.tsx:108`). Generated POIs MUST set both.
- **Regions** are realm-level (`useRegions(worldId)`), passed to `MapViewer` when the map is a realm map. The region render effect already **filters to `r.boundary && r.boundary.length >= 3`** (`MapViewer.tsx`), so a `null` boundary is safe and simply draws no polygon. v1 leaves region boundary `null`.
- **POI default shape** is defined by `executeCreatePOI` (`src/application/use-cases/CreatePOI.ts`) — ~40 fields. Task 2 extracts a pure `buildPOI` so the generator and the use-case share one source of truth.
- **Lazy dungeons** (spec §5b): generated dungeon POIs are stubs — `spatialDungeon: null` + `dungeonGenOptions` (seed/theme/size). The dungeon generator is NOT called during world-gen.
- **Hex geometry:** `layoutHexGrid(cols, rows, hexSize)` returns cells with `cx,cy` (center) + `corners`. POI `position` = the cell center `{x: cx, y: cy}`.

## Global Constraints

- Branch: `feature/procedural-world-generation`. Never commit to `main`.
- Field name `worldId` on entities; POIs reference their region via `regionId`, their map via `mapRef`.
- Reuse Phase-1 primitives (`hex.ts`, `hexLayout.ts`, `biomes.ts`, `SeededRandom`). No duplicated geometry/RNG.
- Generated dungeon POIs are STUBS (`spatialDungeon: null`, `dungeonGenOptions` set). Never call the dungeon generator in the pipeline.
- The generator is PURE (returns plain objects). Persistence happens only in the use-case, inside one `db.transaction('rw', ...)` listing every table written.
- IDs via `newId()`; timestamps `Date.now()`.
- Tasks 1–4 are TDD with Vitest. Task 5 is UI wiring, verified by build + a manual app run.
- Commit per task, conventional messages.

## File Structure

**Created:**
- `src/domain/data/worldgen/names.ts` — settlement/dungeon/ruin/landmark/region name tables + helpers.
- `src/domain/data/worldgen/names.test.ts`
- `src/domain/data/worldgen/poiKinds.ts` — POI-kind weighted table (settlement/dungeon/ruin/landmark) + kind→PoiType mapping + dungeon themes.
- `src/domain/data/worldgen/poiKinds.test.ts`
- `src/domain/services/worldgen/buildPoi.ts` — pure `buildPOI(input): POI` (extracted from CreatePOI).
- `src/domain/services/worldgen/generateWorld.ts` — pure `generateWorld(realmId, seed, opts) → { gameMap, regions, pois }`.
- `src/domain/services/worldgen/generateWorld.test.ts`

**Modified:**
- `src/application/use-cases/CreatePOI.ts` — delegate to `buildPOI`.
- `src/application/use-cases/GenerateWorld.ts` — use `generateWorld`; persist regions + POIs in the transaction; accept `poiDensity`.
- `src/application/use-cases/GenerateWorld.test.ts` — assert regions + POIs are created and linked.
- `src/routes/_app/realms/index.tsx` — pass `genPoiDensity` to `executeGenerateWorld`.

---

### Task 1: Worldgen name tables

Re-authored (not copied) name content for settlements, dungeons, ruins, landmarks, and regions, plus seeded pick helpers.

**Files:**
- Create: `src/domain/data/worldgen/names.ts`
- Test: `src/domain/data/worldgen/names.test.ts`

**Interfaces:**
- Consumes: `SeededRandom` from `~/lib/dungeon/SeededRandom`.
- Produces: `pickName(kind: NameKind, rng: SeededRandom): string` where `NameKind = 'settlement' | 'dungeon' | 'ruin' | 'landmark' | 'region'`. Each kind draws from a non-empty pool and may combine a prefix/suffix for variety.

- [ ] **Step 1: Write the failing test**

Create `src/domain/data/worldgen/names.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { pickName, NAME_KINDS } from './names'

describe('worldgen names', () => {
  it('produces a non-empty name for every kind', () => {
    for (const kind of NAME_KINDS) {
      expect(pickName(kind, new SeededRandom('s')).length).toBeGreaterThan(0)
    }
  })

  it('is deterministic for a given seed', () => {
    expect(pickName('settlement', new SeededRandom('x'))).toBe(
      pickName('settlement', new SeededRandom('x')),
    )
  })

  it('varies across draws from one rng', () => {
    const rng = new SeededRandom('y')
    const names = new Set(Array.from({ length: 8 }, () => pickName('settlement', rng)))
    expect(names.size).toBeGreaterThan(1)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/domain/data/worldgen/names.test.ts`
Expected: FAIL — cannot resolve `./names`.

- [ ] **Step 3: Implement the name tables**

Create `src/domain/data/worldgen/names.ts`:

```ts
import { SeededRandom } from '~/lib/dungeon/SeededRandom'

export type NameKind = 'settlement' | 'dungeon' | 'ruin' | 'landmark' | 'region'
export const NAME_KINDS: NameKind[] = ['settlement', 'dungeon', 'ruin', 'landmark', 'region']

const SETTLEMENT_PREFIX = ['Ash', 'Black', 'Grey', 'Oak', 'Stone', 'Thorn', 'Wind', 'Salt', 'Fern', 'Crow']
const SETTLEMENT_SUFFIX = ['ford', 'haven', 'bury', 'wick', 'moor', 'hollow', 'gate', 'reach', 'mill', 'fall']

const DUNGEON_PREFIX = ['Tomb of', 'Vault of', 'Pit of', 'Halls of', 'Warren of', 'Crypt of', 'Den of']
const DUNGEON_NOUN = ['the Forgotten', 'the Pale King', 'Vël', 'the Worm', 'Ashes', 'the Drowned', 'the Gaunt']

const RUIN_PREFIX = ['Broken', 'Sunken', 'Shattered', 'Hollow', 'Weeping', 'Fallen']
const RUIN_NOUN = ['Spire', 'Keep', 'Temple', 'Bastion', 'Arch', 'Manse']

const LANDMARK = [
  'the Standing Stones', 'the Hanged Oak', 'Gallows Hill', 'the Weeping Falls',
  'the Bone Bridge', 'the Salt Pillar', 'the Watcher’s Cairn', 'the Black Tarn',
]

const REGION_PREFIX = ['The', 'Old', 'Wild', 'Far', 'Grim', 'Lost']
const REGION_NOUN = ['Marches', 'Reaches', 'Downs', 'Wilds', 'Expanse', 'Hinterlands', 'Verge']

export function pickName(kind: NameKind, rng: SeededRandom): string {
  switch (kind) {
    case 'settlement':
      return `${rng.pick(SETTLEMENT_PREFIX)}${rng.pick(SETTLEMENT_SUFFIX)}`
    case 'dungeon':
      return `${rng.pick(DUNGEON_PREFIX)} ${rng.pick(DUNGEON_NOUN)}`
    case 'ruin':
      return `The ${rng.pick(RUIN_PREFIX)} ${rng.pick(RUIN_NOUN)}`
    case 'landmark':
      return rng.pick(LANDMARK)
    case 'region':
      return `${rng.pick(REGION_PREFIX)} ${rng.pick(REGION_NOUN)}`
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/domain/data/worldgen/names.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Typecheck and commit**

Run: `npx tsc --noEmit`
Expected: passes.

```bash
git add src/domain/data/worldgen/names.ts src/domain/data/worldgen/names.test.ts
git commit -m "feat: add worldgen name tables"
```

---

### Task 2: POI-kind table + extract pure `buildPOI`

Define which POI kinds scatter (with weights) and a single source of truth for building a fully-defaulted `POI`.

**Files:**
- Create: `src/domain/data/worldgen/poiKinds.ts`
- Test: `src/domain/data/worldgen/poiKinds.test.ts`
- Create: `src/domain/services/worldgen/buildPoi.ts`
- Modify: `src/application/use-cases/CreatePOI.ts`

**Interfaces:**
- Produces (`poiKinds.ts`):
  - `type PoiKind = 'settlement' | 'dungeon' | 'ruin' | 'landmark'`
  - `POI_KIND_TABLE: WeightedTable<PoiKind>` (re-authored weights).
  - `poiKindToType(kind: PoiKind): PoiType` (settlement→`'settlement'`, dungeon→`'dungeon'`, ruin→`'ruin'`, landmark→`'landmark'`).
  - `DUNGEON_THEMES: string[]` (for dungeon stub options).
- Produces (`buildPoi.ts`): `buildPOI(input: BuildPOIInput): POI` — same field defaults as `executeCreatePOI`, but pure (no repo). `BuildPOIInput` mirrors `CreatePOIInput` plus optional `dungeonGenOptions`.

- [ ] **Step 1: Write the failing poiKinds test**

Create `src/domain/data/worldgen/poiKinds.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { POI_KIND_TABLE, poiKindToType, DUNGEON_THEMES } from './poiKinds'

describe('poi kinds', () => {
  it('maps every kind to a valid PoiType', () => {
    expect(poiKindToType('settlement')).toBe('settlement')
    expect(poiKindToType('dungeon')).toBe('dungeon')
    expect(poiKindToType('ruin')).toBe('ruin')
    expect(poiKindToType('landmark')).toBe('landmark')
  })

  it('weighted table picks deterministically and only valid kinds', () => {
    const rng = new SeededRandom('k')
    const kinds = Array.from({ length: 20 }, () => rng.pickWeighted(POI_KIND_TABLE))
    for (const k of kinds) expect(['settlement', 'dungeon', 'ruin', 'landmark']).toContain(k)
  })

  it('has at least one dungeon theme', () => {
    expect(DUNGEON_THEMES.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/domain/data/worldgen/poiKinds.test.ts`
Expected: FAIL — cannot resolve `./poiKinds`.

- [ ] **Step 3: Implement poiKinds**

Create `src/domain/data/worldgen/poiKinds.ts`:

```ts
import { createWeightedTable, type WeightedTable } from '~/lib/dungeon/SeededRandom'
import type { PoiType } from '@shared/constants'

export type PoiKind = 'settlement' | 'dungeon' | 'ruin' | 'landmark'

export const POI_KIND_TABLE: WeightedTable<PoiKind> = createWeightedTable<PoiKind>({
  settlement: 4,
  dungeon: 3,
  ruin: 2,
  landmark: 3,
})

export function poiKindToType(kind: PoiKind): PoiType {
  switch (kind) {
    case 'settlement':
      return 'settlement'
    case 'dungeon':
      return 'dungeon'
    case 'ruin':
      return 'ruin'
    case 'landmark':
      return 'landmark'
  }
}

export const DUNGEON_THEMES = ['crypt', 'cave', 'temple', 'ruin', 'mine', 'lair']
```

- [ ] **Step 4: Run the poiKinds test to verify it passes**

Run: `npm test -- src/domain/data/worldgen/poiKinds.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Create the pure `buildPOI`**

Create `src/domain/services/worldgen/buildPoi.ts`. Copy the exact default field set from `executeCreatePOI` (read `src/application/use-cases/CreatePOI.ts` and reproduce every field), but as a pure function. Signature:

```ts
import type { POI } from '@domain/entities/POI'
import type { PoiType } from '@shared/constants'
import type { Service } from '@domain/value-objects/Service'
import type { LocationSeed } from '@domain/value-objects/LocationSeed'
import type { DungeonGenOptions } from '~/lib/dungeon/types'
import { newId } from '@shared/ulid'

export interface BuildPOIInput {
  regionId: string
  parentPoiId?: string | null
  name: string
  description?: string
  type: PoiType
  subtypeLabel?: string | null
  floor?: number | null
  tags?: string[]
  position?: { x: number; y: number } | null
  mapRef?: string | null
  markerColor?: string | null
  readAloud?: string
  gmNotes?: string
  trouble?: string
  mood?: string
  sensory?: string
  services?: Service[]
  locationSeed?: LocationSeed | null
  dungeonGenOptions?: DungeonGenOptions | null
}

export function buildPOI(input: BuildPOIInput): POI {
  const now = Date.now()
  return {
    id: newId(),
    regionId: input.regionId,
    parentPoiId: input.parentPoiId ?? null,
    name: input.name,
    description: input.description ?? '',
    type: input.type,
    subtypeLabel: input.subtypeLabel ?? null,
    floor: input.floor ?? null,
    tags: input.tags ?? [],
    position: input.position ?? null,
    mapRef: input.mapRef ?? null,
    markerColor: input.markerColor ?? null,
    readAloud: input.readAloud ?? '',
    gmNotes: input.gmNotes ?? '',
    trouble: input.trouble ?? '',
    mood: input.mood ?? '',
    sensory: input.sensory ?? '',
    services: input.services ?? [],
    imageUrl: null,
    locationSeed: input.locationSeed ?? null,
    traps: [],
    treasure: [],
    roomWidth: null,
    roomLength: null,
    visited: false,
    lightLevel: null,
    wanderingMonsters: [],
    watabouSeed: null,
    watabouGenerator: null,
    watabouData: null,
    spatialDungeon: null,
    dungeonGenOptions: input.dungeonGenOptions ?? null,
    sessionLog: [],
    starred: false,
    monsterRefs: [],
    magicItemRefs: [],
    spellRefs: [],
    equipmentRefs: [],
    createdAt: now,
    updatedAt: now,
  }
}
```

> Verify field-for-field against `CreatePOI.ts` — if the `POI` entity has gained a field, include it here, or `tsc` will fail.

- [ ] **Step 6: Refactor `executeCreatePOI` to delegate**

In `src/application/use-cases/CreatePOI.ts`, replace the inline object construction so the use-case builds the POI via `buildPOI` and then persists it. Keep `CreatePOIInput` and the function signature unchanged (it can re-export or wrap `BuildPOIInput`). Result:

```ts
import type { IPOIRepository } from '@application/ports/IPOIRepository'
import type { POI } from '@domain/entities/POI'
import { buildPOI, type BuildPOIInput } from '@domain/services/worldgen/buildPoi'

export type CreatePOIInput = BuildPOIInput

export async function executeCreatePOI(
  input: CreatePOIInput,
  deps: { poiRepo: IPOIRepository }
): Promise<POI> {
  const poi = buildPOI(input)
  await deps.poiRepo.create(poi)
  return poi
}
```

- [ ] **Step 7: Run the full suite + typecheck**

Run: `npm test`
Expected: PASS — existing POI/use-case tests still green (the refactor is behavior-preserving).

Run: `npx tsc --noEmit`
Expected: passes.

- [ ] **Step 8: Commit**

```bash
git add src/domain/data/worldgen/poiKinds.ts src/domain/data/worldgen/poiKinds.test.ts \
  src/domain/services/worldgen/buildPoi.ts src/application/use-cases/CreatePOI.ts
git commit -m "feat: add POI-kind table and extract pure buildPOI"
```

---

### Task 3: `generateWorld` — regions + POIs

The core of this increment. A pure function that lays out the grid + biome clusters once, builds the hex `GameMap`, one `Region` per cluster, and POIs scattered by density.

**Files:**
- Create: `src/domain/services/worldgen/generateWorld.ts`
- Test: `src/domain/services/worldgen/generateWorld.test.ts`

**Interfaces:**
- Consumes: `layoutHexGrid` + `BIOME_COLORS` (`hexLayout`), `hexDistance` (`hex`), `BIOMES`/`Biome` + `pickBiomeFeature` (`biomes`), `pickName` (`names`), `POI_KIND_TABLE`/`poiKindToType`/`DUNGEON_THEMES` (`poiKinds`), `buildPOI` (`buildPoi`), `SeededRandom`, `newId`, `GameMap`/`HexCell`, `Region`, `POI`.
- Produces:
  - `type PoiDensity = 'sparse' | 'normal' | 'dense'`
  - `generateWorld(realmId: string, seed: string, opts: { cols: number; rows: number; hexSize?: number; poiDensity?: PoiDensity }): { gameMap: GameMap; regions: Region[]; pois: POI[] }`

**Algorithm:**
1. `layoutHexGrid(cols, rows, hexSize)` → cells with `q,r,cx,cy,corners`.
2. Seed `seedCount = max(3, round(sqrt(cellCount)/2))` biome centers, each a random cell + random land biome (lake excluded from seeds — reuse the pattern from `generateTinyWorld`).
3. Create one `Region` per center: `{ id: newId(), worldId: realmId, name: pickName('region', rng), description: '', terrain: biome, features: [pickBiomeFeature(biome, rng)], dangers: [], settlements: [], resources: [], people: [], boundary: null, color: BIOME_COLORS[biome], imageUrl: null, createdAt, updatedAt }`.
4. For each cell: nearest center → assign `biome` + `regionId` (that center's region id). Build `HexCell { q, r, biome, corners }`. Track each cell's `regionId` + `center {cx,cy}` for POI placement.
5. Build `GameMap` (kind `'hex'`, hexCells, width/height from layout, `ownerRealmId: realmId`, hex params, `imageUrl: ''`) — same shape as today's `buildTinyHexMap`.
6. Scatter POIs: `poiCount = round(landCellCount * DENSITY[poiDensity])` where `DENSITY = { sparse: 0.08, normal: 0.15, dense: 0.25 }`. Pick that many distinct non-lake cells (use `rng.sample` over land cells). For each: roll `kind = rng.pickWeighted(POI_KIND_TABLE)`; `type = poiKindToType(kind)`; `name = pickName(kind === 'landmark' ? 'landmark' : kind, rng)`; `position = { x: cell.cx, y: cell.cy }`; `regionId = cell.regionId`; `mapRef = gameMap.id`; for dungeons set `dungeonGenOptions = { seed: \`${seed}-${id}\`, theme: rng.pick(DUNGEON_THEMES), size: 'medium' }` (match the real `DungeonGenOptions` shape — read `~/lib/dungeon/types`; if a required field differs, set it) and leave `spatialDungeon: null`. Build via `buildPOI(...)`.
7. Return `{ gameMap, regions, pois }`.

- [ ] **Step 1: Write the failing test**

Create `src/domain/services/worldgen/generateWorld.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { generateWorld } from './generateWorld'

const REALM = 'realm-1'

describe('generateWorld', () => {
  it('produces a hex map, regions, and POIs', () => {
    const { gameMap, regions, pois } = generateWorld(REALM, 'seed-a', { cols: 8, rows: 8 })
    expect(gameMap.kind).toBe('hex')
    expect(gameMap.ownerRealmId).toBe(REALM)
    expect(gameMap.hexCells).toHaveLength(64)
    expect(regions.length).toBeGreaterThan(0)
    expect(pois.length).toBeGreaterThan(0)
  })

  it('every POI links to a generated region, is placed on this map, and has a position', () => {
    const { gameMap, regions, pois } = generateWorld(REALM, 'seed-a', { cols: 8, rows: 8 })
    const regionIds = new Set(regions.map((r) => r.id))
    for (const p of pois) {
      expect(regionIds.has(p.regionId)).toBe(true)
      expect(p.mapRef).toBe(gameMap.id)
      expect(p.position).not.toBeNull()
    }
  })

  it('dungeon POIs are lazy stubs (no spatialDungeon, with dungeonGenOptions)', () => {
    const { pois } = generateWorld(REALM, 'seed-a', { cols: 12, rows: 12, poiDensity: 'dense' })
    const dungeons = pois.filter((p) => p.type === 'dungeon')
    for (const d of dungeons) {
      expect(d.spatialDungeon).toBeNull()
      expect(d.dungeonGenOptions).not.toBeNull()
    }
  })

  it('density scales POI count (dense > sparse)', () => {
    const sparse = generateWorld(REALM, 's', { cols: 12, rows: 12, poiDensity: 'sparse' })
    const dense = generateWorld(REALM, 's', { cols: 12, rows: 12, poiDensity: 'dense' })
    expect(dense.pois.length).toBeGreaterThan(sparse.pois.length)
  })

  it('is deterministic for a given seed (biomes + POI types)', () => {
    const a = generateWorld(REALM, 'fixed', { cols: 8, rows: 8 })
    const b = generateWorld(REALM, 'fixed', { cols: 8, rows: 8 })
    expect(a.gameMap.hexCells!.map((c) => c.biome)).toEqual(b.gameMap.hexCells!.map((c) => c.biome))
    expect(a.pois.map((p) => p.type)).toEqual(b.pois.map((p) => p.type))
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/domain/services/worldgen/generateWorld.test.ts`
Expected: FAIL — cannot resolve `./generateWorld`.

- [ ] **Step 3: Implement `generateWorld`** following the Algorithm above. Read `~/lib/dungeon/types` for the exact `DungeonGenOptions` shape before constructing dungeon stubs. Reuse `layoutHexGrid`, `hexDistance`, biome/name/poiKind tables, and `buildPOI`. Keep it pure (no Dexie).

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/domain/services/worldgen/generateWorld.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Full suite + typecheck + commit**

Run: `npm test` then `npx tsc --noEmit` — both clean.

```bash
git add src/domain/services/worldgen/generateWorld.ts src/domain/services/worldgen/generateWorld.test.ts
git commit -m "feat: generate regions + POIs onto the hex world"
```

---

### Task 4: Wire `GenerateWorld` use-case to persist regions + POIs

Switch the use-case from `buildTinyHexMap` to `generateWorld`, persist regions + POIs inside the existing transaction, and thread the POI-density param.

**Files:**
- Modify: `src/application/use-cases/GenerateWorld.ts`
- Modify: `src/application/use-cases/GenerateWorld.test.ts`

**Interfaces:**
- Consumes: `generateWorld`, `PoiDensity` (Task 3).
- Produces: `GenerateWorldInput` gains `poiDensity?: PoiDensity` (default `'normal'`). Return shape unchanged (`{ realmId, mapId }`).

- [ ] **Step 1: Update the use-case test** (`GenerateWorld.test.ts`) — add assertions that regions and POIs were persisted and linked:

```ts
  it('persists regions and POIs linked to the realm and map', async () => {
    const { realmId, mapId } = await executeGenerateWorld(
      { name: 'World', systemId: 'system-cairn-2e', seed: 'seed-1', size: 'small', poiDensity: 'normal' },
      deps()
    )
    const regions = await db.regions.where('worldId').equals(realmId).toArray()
    const pois = await db.pois.where('mapRef').equals(mapId).toArray()
    expect(regions.length).toBeGreaterThan(0)
    expect(pois.length).toBeGreaterThan(0)
    const regionIds = new Set(regions.map((r) => r.id))
    for (const p of pois) expect(regionIds.has(p.regionId)).toBe(true)
  })
```

Also clear `db.regions` and `db.pois` in `beforeEach`.

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/application/use-cases/GenerateWorld.test.ts`
Expected: FAIL — no regions/POIs persisted yet.

- [ ] **Step 3: Update the use-case**

In `src/application/use-cases/GenerateWorld.ts`:
- Import `generateWorld` and `PoiDensity` from `@domain/services/worldgen/generateWorld`.
- Add `poiDensity?: PoiDensity` to `GenerateWorldInput`.
- Inside the transaction, after creating the realm, call `generateWorld(realm.id, input.seed, { cols, rows, poiDensity: input.poiDensity ?? 'normal' })`, then bulk-put: `db.gameMaps.put(gameMap)`, `db.regions.bulkPut(regions)`, `db.pois.bulkPut(pois)`.
- Add `db.regions, db.pois` to the `db.transaction('rw', ...)` table list. Keep `SIZE_PRESETS` for cols/rows. Remove the `buildTinyHexMap` import if no longer used.

- [ ] **Step 4: Run the use-case test + full suite + typecheck**

Run: `npm test` then `npx tsc --noEmit` — both clean.

> If `generateTinyWorld.ts`/its test are now unused, leave them (harmless) or delete both together; do not leave a dangling import.

- [ ] **Step 5: Commit**

```bash
git add src/application/use-cases/GenerateWorld.ts src/application/use-cases/GenerateWorld.test.ts
git commit -m "feat: persist generated regions + POIs in the world transaction"
```

---

### Task 5: Make the POI-density knob live in the modal

Thread the dialog's `genPoiDensity` into `executeGenerateWorld`. Verified by build + manual run.

**Files:**
- Modify: `src/routes/_app/realms/index.tsx`

- [ ] **Step 1: Pass the density param**

In `handleCreateRealm`'s generate branch, add `poiDensity: genPoiDensity` to the `executeGenerateWorld` input object (the state already exists; it was previously inert).

- [ ] **Step 2: Build + typecheck**

Run: `npx tsc --noEmit` then `npm run build` — both clean. Run `npm test` — all green.

- [ ] **Step 3: Manual end-to-end verification**

`npm run dev`, open `/realms`, **New Realm** (generation is on by default) → pick a size, open **Advanced**, set **POI density**, **Generate World**. Expected:
- The hex map shows scattered markers (settlements/dungeons/ruins/landmarks).
- Higher POI density → visibly more markers.
- Clicking a marker opens the POI; a dungeon POI shows as an ungenerated stub (generates on first open via the existing flow).
- The Regions list shows the generated regions.

- [ ] **Step 4: Commit**

```bash
git add src/routes/_app/realms/index.tsx
git commit -m "feat: make POI density live in the generation modal"
```

---

## Definition of Done

- `npm test` green; `npx tsc --noEmit` and `npm run build` clean.
- Generating a world produces `Region` records (one per biome cluster) and `POI` records (settlements/dungeons/ruins/landmarks) placed on the hex map and visible as clickable markers.
- POI density (sparse/normal/dense) measurably changes the number of POIs.
- Dungeon POIs are lazy stubs (`spatialDungeon: null`, `dungeonGenOptions` set) — the dungeon generator is not invoked during world-gen.
- `buildPOI` is the single source of truth for POI defaults (used by both `executeCreatePOI` and the generator).

## Deferred to later Phase-3 increments

- Region **boundary polygons** (hex-cluster outlines) — v1 leaves boundary null; biome hex fill is the visual.
- **Paths** between settlements (spec stage 4b).
- **Factions** + relationships, **NPCs** (make those knobs live).
- **Danger** knob wiring (e.g. dungeon size/threat scaling) — still inert after this increment.
- Region flavor depth (dangers/resources/people tables beyond a single feature).
