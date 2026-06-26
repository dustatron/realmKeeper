# World Generation — Vertical Slice (See-It-Work) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A clickable end-to-end slice: press a "Generate Test World" button → a seeded generator builds a tiny biome-colored hex map → it's written to Dexie in one transaction → and you view it on the existing map screen. Proves the whole stack (UI → use-case → generator → Dexie → hex render) before Phases 2–5 are built out in depth.

**Architecture:** Builds directly on the Phase 1 foundation (`src/lib/hexmap/hex.ts`, `src/domain/data/worldgen/biomes.ts`, Dexie v36). The generator is a pure function returning a `GameMap` with precomputed hex-cell pixel geometry; a use-case persists it inside one `db.transaction('rw', ...)`; the existing `MapViewer` (maplibre, flat pixel CRS) renders the hex polygons by skipping the raster image and drawing a biome-colored fill layer — the same way it already draws region polygons.

**Tech Stack:** TypeScript strict, Dexie 4, maplibre-gl (existing `MapViewer`), Vitest + fake-indexeddb, existing `SeededRandom`.

## Scope — deliberately minimal

**In:** a generated `Realm` + a single hex `GameMap` (biome-colored grid), viewable on the map screen, launched from a button.

**Out (intentionally, for later phases):** POIs, regions, factions, NPCs, conflicts, hooks, the doom event, the size/advanced menu, hex editing. The slice generates **only the colored hex map**. POIs and the rest layer on top once this pipe is proven.

This slice also delivers the **multi-table transaction wrapper** the Phase 1 final review flagged as still-needed.

## Global Constraints

- Branch: `feature/procedural-world-generation`. Never commit to `main`.
- Field name `worldId` on entities; the `GameMap` foreign key to a realm is its existing `ownerRealmId`.
- Reuse Phase 1 primitives: `hex.ts` (`axialToPixel`, `hexCorners`), `biomes.ts` (`Biome`, `BIOMES`), `SeededRandom`. Do NOT duplicate hex math or RNG.
- `GameMap.kind === 'hex'` selects the hex render path; `'image'` keeps today's raster behavior unchanged.
- New `GameMap` geometry field must be **optional** (so existing image-map construction sites don't break and no migration is required — non-indexed fields need no schema change).
- IDs via `newId()`; timestamps `Date.now()`.
- Tasks 1–3 are TDD with Vitest. Tasks 4–5 touch maplibre/React UI that the node test env can't render — they are verified by **building and running the app** (explicit manual steps), not unit tests.
- Commit per task, conventional messages.

## File Structure

**Created:**
- `src/lib/hexmap/hexLayout.ts` — pure grid layout (cells → pixel corners + bounds) and biome colors.
- `src/lib/hexmap/hexLayout.test.ts`
- `src/domain/services/worldgen/generateTinyWorld.ts` — pure: seed → `{ realmInput, gameMap }`.
- `src/domain/services/worldgen/generateTinyWorld.test.ts`
- `src/application/use-cases/GenerateWorld.ts` — persists realm + map in one transaction.
- `src/application/use-cases/GenerateWorld.test.ts`

**Modified:**
- `src/domain/entities/GameMap.ts` — add optional `hexCells?: HexCell[]` and export `HexCell`.
- `src/components/map/MapViewer.tsx` — render the hex fill layer when `kind === 'hex'`; skip the raster source when there's no `imageUrl`.
- `src/routes/_app/realms/index.tsx` — add a "Generate Test World" button wired to the use-case + navigation.

---

### Task 1: Hex layout geometry + biome colors

Pure functions that turn grid dimensions into positioned hex cells (with pixel-space polygon corners, normalized to a positive bounding box) and map each biome to a fill color. The renderer stays dumb: it just converts stored corners with `pxToLngLat`.

**Files:**
- Modify: `src/domain/entities/GameMap.ts`
- Create: `src/lib/hexmap/hexLayout.ts`
- Test: `src/lib/hexmap/hexLayout.test.ts`

**Interfaces:**
- Consumes: `axialToPixel`, `hexCorners`, `Point` from `~/lib/hexmap/hex`; `Biome` from `~/domain/data/worldgen/biomes`.
- Produces:
  - `interface HexCell { q: number; r: number; biome: Biome; corners: Point[] }` (exported from `GameMap.ts`).
  - `BIOME_COLORS: Record<Biome, string>`.
  - `layoutHexGrid(cols: number, rows: number, hexSize: number): { cells: Array<{ q: number; r: number; cx: number; cy: number; corners: Point[] }>; width: number; height: number }` — offset rows mapped to axial; all corners translated so the min corner is `(0,0)`; `width`/`height` are the bounding-box size.

- [ ] **Step 1: Add the `HexCell` type to GameMap**

In `src/domain/entities/GameMap.ts`, add an import and an exported interface above the `GameMap` interface, and an optional field on `GameMap`:

```ts
import type { Point } from '~/lib/hexmap/hex'
import type { Biome } from '~/domain/data/worldgen/biomes'

export interface HexCell {
  q: number
  r: number
  biome: Biome
  corners: Point[]
}
```

Add to the `GameMap` interface (after `hexOrientation`):

```ts
  hexCells?: HexCell[]
```

- [ ] **Step 2: Write the failing layout test**

Create `src/lib/hexmap/hexLayout.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { layoutHexGrid, BIOME_COLORS } from './hexLayout'
import { BIOMES } from '~/domain/data/worldgen/biomes'

describe('layoutHexGrid', () => {
  it('produces cols*rows cells', () => {
    const { cells } = layoutHexGrid(8, 8, 40)
    expect(cells).toHaveLength(64)
  })

  it('normalizes geometry into a positive bounding box', () => {
    const { cells, width, height } = layoutHexGrid(5, 5, 30)
    expect(width).toBeGreaterThan(0)
    expect(height).toBeGreaterThan(0)
    for (const cell of cells) {
      for (const c of cell.corners) {
        expect(c.x).toBeGreaterThanOrEqual(-0.001)
        expect(c.y).toBeGreaterThanOrEqual(-0.001)
        expect(c.x).toBeLessThanOrEqual(width + 0.001)
        expect(c.y).toBeLessThanOrEqual(height + 0.001)
      }
    }
  })

  it('gives every cell 6 corners and distinct axial coords', () => {
    const { cells } = layoutHexGrid(4, 3, 20)
    for (const cell of cells) expect(cell.corners).toHaveLength(6)
    const keys = new Set(cells.map((c) => `${c.q},${c.r}`))
    expect(keys.size).toBe(12)
  })
})

describe('BIOME_COLORS', () => {
  it('has a color for every biome', () => {
    for (const b of BIOMES) {
      expect(BIOME_COLORS[b]).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })
})
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npm test -- src/lib/hexmap/hexLayout.test.ts`
Expected: FAIL — cannot resolve `./hexLayout`.

- [ ] **Step 4: Implement the layout + colors**

Create `src/lib/hexmap/hexLayout.ts`:

```ts
import { axialToPixel, hexCorners, type Point } from './hex'
import type { Biome } from '~/domain/data/worldgen/biomes'

export const BIOME_COLORS: Record<Biome, string> = {
  forest: '#2f6b3a',
  mountains: '#6b6b6b',
  grasslands: '#8db94e',
  desert: '#d9c27a',
  marsh: '#4f6b52',
  frozen: '#cfe3ef',
  blighted: '#3a2b35',
  hills: '#9c8a4e',
  jungle: '#1f6b46',
  lake: '#3b6ea5',
}

interface LaidOutCell {
  q: number
  r: number
  cx: number
  cy: number
  corners: Point[]
}

// Offset (col,row) → axial (pointy-top, odd-r style), with all geometry
// translated so the minimum corner is (0,0).
export function layoutHexGrid(
  cols: number,
  rows: number,
  hexSize: number
): { cells: LaidOutCell[]; width: number; height: number } {
  const raw: LaidOutCell[] = []
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const q = col - (row - (row & 1)) / 2
      const r = row
      const center = axialToPixel({ q, r }, hexSize)
      const corners = hexCorners(center, hexSize)
      raw.push({ q, r, cx: center.x, cy: center.y, corners })
    }
  }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const cell of raw) {
    for (const c of cell.corners) {
      if (c.x < minX) minX = c.x
      if (c.y < minY) minY = c.y
      if (c.x > maxX) maxX = c.x
      if (c.y > maxY) maxY = c.y
    }
  }

  const cells = raw.map((cell) => ({
    q: cell.q,
    r: cell.r,
    cx: cell.cx - minX,
    cy: cell.cy - minY,
    corners: cell.corners.map((c) => ({ x: c.x - minX, y: c.y - minY })),
  }))

  return { cells, width: maxX - minX, height: maxY - minY }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- src/lib/hexmap/hexLayout.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Typecheck and commit**

Run: `npx tsc --noEmit`
Expected: passes.

```bash
git add src/domain/entities/GameMap.ts src/lib/hexmap/hexLayout.ts src/lib/hexmap/hexLayout.test.ts
git commit -m "feat: add hex grid layout geometry + biome colors"
```

---

### Task 2: Tiny-world generator (pure, seeded)

A pure function: given a `realmId` + seed, lay out a Small hex grid, assign each cell a biome via seeded nearest-seed clustering, and return a `GameMap` (kind `'hex'`) carrying the cells and pixel bounds.

**Files:**
- Create: `src/domain/services/worldgen/generateTinyWorld.ts`
- Test: `src/domain/services/worldgen/generateTinyWorld.test.ts`

**Interfaces:**
- Consumes: `layoutHexGrid` (Task 1), `hexDistance` from `~/lib/hexmap/hex`, `BIOMES`/`Biome` from biomes, `SeededRandom`, `newId`, `GameMap`/`HexCell`.
- Produces: `buildTinyHexMap(realmId: string, seed: string, opts?: { cols?: number; rows?: number; hexSize?: number }): GameMap`.

- [ ] **Step 1: Write the failing generator test**

Create `src/domain/services/worldgen/generateTinyWorld.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildTinyHexMap } from './generateTinyWorld'
import { BIOMES } from '~/domain/data/worldgen/biomes'

describe('buildTinyHexMap', () => {
  it('builds a hex GameMap with cols*rows cells', () => {
    const map = buildTinyHexMap('realm-1', 'seed-a', { cols: 8, rows: 8, hexSize: 40 })
    expect(map.kind).toBe('hex')
    expect(map.ownerRealmId).toBe('realm-1')
    expect(map.hexCols).toBe(8)
    expect(map.hexRows).toBe(8)
    expect(map.hexCells).toHaveLength(64)
    expect(map.width).toBeGreaterThan(0)
    expect(map.height).toBeGreaterThan(0)
  })

  it('assigns every cell a known biome', () => {
    const map = buildTinyHexMap('realm-1', 'seed-a')
    for (const cell of map.hexCells!) {
      expect(BIOMES).toContain(cell.biome)
    }
  })

  it('is deterministic for a given seed', () => {
    const a = buildTinyHexMap('realm-1', 'seed-x')
    const b = buildTinyHexMap('realm-1', 'seed-x')
    expect(a.hexCells!.map((c) => c.biome)).toEqual(b.hexCells!.map((c) => c.biome))
  })

  it('produces different biome layouts for different seeds', () => {
    const a = buildTinyHexMap('realm-1', 'seed-1')
    const b = buildTinyHexMap('realm-1', 'seed-2')
    expect(a.hexCells!.map((c) => c.biome)).not.toEqual(b.hexCells!.map((c) => c.biome))
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/domain/services/worldgen/generateTinyWorld.test.ts`
Expected: FAIL — cannot resolve `./generateTinyWorld`.

- [ ] **Step 3: Implement the generator**

Create `src/domain/services/worldgen/generateTinyWorld.ts`:

```ts
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { hexDistance } from '~/lib/hexmap/hex'
import { layoutHexGrid } from '~/lib/hexmap/hexLayout'
import { BIOMES, type Biome } from '~/domain/data/worldgen/biomes'
import type { GameMap, HexCell } from '@domain/entities/GameMap'
import { newId } from '@shared/ulid'

// Land biomes used as cluster seeds (lake is scattered as filler, not a seed).
const LAND_BIOMES: Biome[] = BIOMES.filter((b) => b !== 'lake')

export function buildTinyHexMap(
  realmId: string,
  seed: string,
  opts: { cols?: number; rows?: number; hexSize?: number } = {}
): GameMap {
  const cols = opts.cols ?? 8
  const rows = opts.rows ?? 8
  const hexSize = opts.hexSize ?? 40
  const rng = new SeededRandom(seed)

  const { cells, width, height } = layoutHexGrid(cols, rows, hexSize)

  // Seed a handful of biome "centers"; each cell takes the nearest center's biome.
  const seedCount = Math.max(3, Math.round(Math.sqrt(cells.length) / 2))
  const centers = Array.from({ length: seedCount }, () => {
    const cell = cells[rng.between(0, cells.length - 1)]
    return { q: cell.q, r: cell.r, biome: rng.pick(LAND_BIOMES) }
  })

  const hexCells: HexCell[] = cells.map((cell) => {
    let best = centers[0]
    let bestDist = Infinity
    for (const center of centers) {
      const d = hexDistance({ q: cell.q, r: cell.r }, { q: center.q, r: center.r })
      if (d < bestDist) {
        bestDist = d
        best = center
      }
    }
    return { q: cell.q, r: cell.r, biome: best.biome, corners: cell.corners }
  })

  const now = Date.now()
  return {
    id: newId(),
    name: 'Generated World Map',
    ownerRealmId: realmId,
    ownerPoiId: null,
    imageUrl: '',
    width,
    height,
    sortOrder: now,
    kind: 'hex',
    hexCols: cols,
    hexRows: rows,
    hexSize,
    hexOrientation: 'pointy',
    hexCells,
    createdAt: now,
    updatedAt: now,
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/domain/services/worldgen/generateTinyWorld.test.ts`
Expected: PASS (4 tests).

> If the "different seeds" test is flaky (two seeds coincidentally identical), it won't be at this grid size — but if it ever fails, that's a real RNG bug, not a test to weaken.

- [ ] **Step 5: Typecheck and commit**

Run: `npx tsc --noEmit`
Expected: passes.

```bash
git add src/domain/services/worldgen/generateTinyWorld.ts src/domain/services/worldgen/generateTinyWorld.test.ts
git commit -m "feat: add tiny-world hex generator"
```

---

### Task 3: `GenerateWorld` use-case (realm + map in one transaction)

Creates the realm (reusing the existing realm use-case for defaults + party faction), builds the hex map, and persists the map inside a single `db.transaction('rw', ...)`. Returns the ids the UI needs to navigate.

**Files:**
- Create: `src/application/use-cases/GenerateWorld.ts`
- Test: `src/application/use-cases/GenerateWorld.test.ts`

**Interfaces:**
- Consumes: `executeCreateRealm` from `@application/use-cases/CreateRealm`; `buildTinyHexMap` (Task 2); the Dexie `db`; container repos.
- Produces: `executeGenerateWorld(input: { name: string; systemId: string; seed: string }, deps: GenerateWorldDeps): Promise<{ realmId: string; mapId: string }>` where `GenerateWorldDeps` includes `realmRepo`, `factionRepo`, `realmNoteRepo` (for realm creation).

- [ ] **Step 1: Write the failing use-case test**

Create `src/application/use-cases/GenerateWorld.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@infrastructure/dexie/db'
import { createContainer } from '@infrastructure/container'
import { executeGenerateWorld } from './GenerateWorld'

const container = createContainer()

beforeEach(async () => {
  await db.open()
  await Promise.all([db.worlds.clear(), db.gameMaps.clear(), db.factions.clear()])
})

describe('executeGenerateWorld', () => {
  it('persists a realm and a hex map, returning their ids', async () => {
    const { realmId, mapId } = await executeGenerateWorld(
      { name: 'Testlands', systemId: 'system-cairn-2e', seed: 'seed-1' },
      {
        realmRepo: container.realmRepo,
        factionRepo: container.factionRepo,
        realmNoteRepo: container.realmNoteRepo,
      }
    )

    const realm = await db.worlds.get(realmId)
    const map = await db.gameMaps.get(mapId)
    expect(realm?.name).toBe('Testlands')
    expect(map?.kind).toBe('hex')
    expect(map?.ownerRealmId).toBe(realmId)
    expect(map?.hexCells?.length).toBe(64)
  })

  it('is deterministic: same seed → same biome layout', async () => {
    const deps = {
      realmRepo: container.realmRepo,
      factionRepo: container.factionRepo,
      realmNoteRepo: container.realmNoteRepo,
    }
    const a = await executeGenerateWorld({ name: 'A', systemId: 'system-cairn-2e', seed: 'fixed' }, deps)
    const b = await executeGenerateWorld({ name: 'B', systemId: 'system-cairn-2e', seed: 'fixed' }, deps)
    const mapA = await db.gameMaps.get(a.mapId)
    const mapB = await db.gameMaps.get(b.mapId)
    expect(mapA?.hexCells?.map((c) => c.biome)).toEqual(mapB?.hexCells?.map((c) => c.biome))
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm test -- src/application/use-cases/GenerateWorld.test.ts`
Expected: FAIL — cannot resolve `./GenerateWorld`.

- [ ] **Step 3: Implement the use-case**

Create `src/application/use-cases/GenerateWorld.ts`:

```ts
import { db } from '@infrastructure/dexie/db'
import { executeCreateRealm } from '@application/use-cases/CreateRealm'
import { buildTinyHexMap } from '@domain/services/worldgen/generateTinyWorld'
import type { IRealmRepository } from '@application/ports/IRealmRepository'
import type { IFactionRepository } from '@application/ports/IFactionRepository'
import type { IRealmNoteRepository } from '@application/ports/IRealmNoteRepository'

export interface GenerateWorldDeps {
  realmRepo: IRealmRepository
  factionRepo: IFactionRepository
  realmNoteRepo: IRealmNoteRepository
}

export async function executeGenerateWorld(
  input: { name: string; systemId: string; seed: string },
  deps: GenerateWorldDeps
): Promise<{ realmId: string; mapId: string }> {
  const realm = await executeCreateRealm(
    { name: input.name, systemId: input.systemId, description: '' },
    deps
  )

  const gameMap = buildTinyHexMap(realm.id, input.seed)

  await db.transaction('rw', db.gameMaps, async () => {
    await db.gameMaps.put(gameMap)
  })

  return { realmId: realm.id, mapId: gameMap.id }
}
```

> NOTE: `executeCreateRealm`'s exact optional-input shape lives in `src/application/use-cases/CreateRealm.ts`. If its required input differs from `{ name, systemId, description }`, match its signature — read that file. The transaction here wraps the single map write; as POIs/regions join in later phases, add their tables to the same `db.transaction('rw', db.gameMaps, db.pois, db.regions, …)` call so the whole world commits atomically.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/application/use-cases/GenerateWorld.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Run the full suite, typecheck, commit**

Run: `npm test`
Expected: PASS — all prior tests still green.

Run: `npx tsc --noEmit`
Expected: passes.

```bash
git add src/application/use-cases/GenerateWorld.ts src/application/use-cases/GenerateWorld.test.ts
git commit -m "feat: add GenerateWorld use-case (realm + hex map in one transaction)"
```

---

### Task 4: Render the hex map in `MapViewer`

Teach the existing maplibre `MapViewer` to draw a `kind: 'hex'` map: skip the raster image source when there's no `imageUrl`, and add a biome-colored fill layer built from `map.hexCells`. Model the source/layer lifecycle on the existing **region-polygon effect** in this same file.

**This task is verified by building + running the app**, not a unit test (maplibre needs a real canvas/DOM the node test env lacks).

**Files:**
- Modify: `src/components/map/MapViewer.tsx`

**Interfaces:**
- Consumes: `map.kind`, `map.hexCells` (from `GameMap`), the existing `pxToLngLat` callback and `mapReady` state in this component.

- [ ] **Step 1: Guard the raster source for image-only maps**

In `MapViewer.tsx`, find the map-initialization effect (around lines 170–249) that adds the `'raster'` source/layer from `map.imageUrl`. Wrap the raster **source and layer** additions so they only run when `map.imageUrl` is a non-empty string. The map instance, bounds (`maxBounds`), and `pxToLngLat`-derived corners must still be set up from `map.width`/`map.height` for hex maps (they have width/height but no image). Add a background so an imageless map isn't blank — set the map container/canvas background via the existing style or a `background` layer (`{ id: 'bg', type: 'background', paint: { 'background-color': '#0f172a' } }`) added before any other layer.

- [ ] **Step 2: Add the hex fill effect**

Add a new `useEffect` modeled on the region-polygon effect (search for `showRegions` / `r.boundary!.map((p) => pxToLngLat(p.x, p.y))` around lines 533–632 — copy its source/layer add + cleanup structure). The new effect:

```tsx
// Render hex-grid biome fill for kind:'hex' maps.
useEffect(() => {
  const instance = mapRef.current
  if (!instance || !mapReady) return
  if (map.kind !== 'hex' || !map.hexCells || map.hexCells.length === 0) return

  const sourceId = 'hex-cells'
  const layerId = 'hex-cells-fill'
  const lineId = 'hex-cells-line'

  const features = map.hexCells.map((cell) => ({
    type: 'Feature' as const,
    properties: { color: BIOME_COLORS[cell.biome] },
    geometry: {
      type: 'Polygon' as const,
      coordinates: [
        [...cell.corners.map((c) => pxToLngLat(c.x, c.y)),
         pxToLngLat(cell.corners[0].x, cell.corners[0].y)],
      ],
    },
  }))
  const geojson = { type: 'FeatureCollection' as const, features }

  const existing = instance.getSource(sourceId) as maplibregl.GeoJSONSource | undefined
  if (existing) {
    existing.setData(geojson as GeoJSON.FeatureCollection)
  } else {
    instance.addSource(sourceId, { type: 'geojson', data: geojson as GeoJSON.FeatureCollection })
    instance.addLayer({
      id: layerId,
      type: 'fill',
      source: sourceId,
      paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.85 },
    })
    instance.addLayer({
      id: lineId,
      type: 'line',
      source: sourceId,
      paint: { 'line-color': '#00000033', 'line-width': 1 },
    })
  }

  return () => {
    if (instance.getLayer(lineId)) instance.removeLayer(lineId)
    if (instance.getLayer(layerId)) instance.removeLayer(layerId)
    if (instance.getSource(sourceId)) instance.removeSource(sourceId)
  }
}, [map.kind, map.hexCells, mapReady, pxToLngLat])
```

Add the import at the top of the file:

```tsx
import { BIOME_COLORS } from '~/lib/hexmap/hexLayout'
```

> Align the exact source/layer add-vs-update and cleanup idiom with the existing region effect — if that effect uses a particular guard or ordering (e.g. adding layers only once `style.load` has fired), match it to avoid "style not loaded" errors.

- [ ] **Step 3: Build to verify it compiles**

Run: `npx tsc --noEmit`
Expected: passes.

Run: `npm run build`
Expected: completes without errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/map/MapViewer.tsx
git commit -m "feat: render kind:hex maps as biome-colored hex fill in MapViewer"
```

(Visual verification happens end-to-end after Task 5.)

---

### Task 5: "Generate Test World" button + navigation

Add a button on the `/realms` screen that runs `executeGenerateWorld` with a random seed, sets the new realm active, and navigates to the generated hex map. Verified by running the app.

**Files:**
- Modify: `src/routes/_app/realms/index.tsx`

**Interfaces:**
- Consumes: `executeGenerateWorld` (Task 3), `container` (already in this route), `setActiveRealmId` (already used here via `useUIStore`), the router `navigate` (already imported).

- [ ] **Step 1: Add the handler**

In `src/routes/_app/realms/index.tsx`, near the existing `handleCreateRealm`, add (the realm-list route already imports `useNavigate`, `container`, and `setActiveRealmId`; reuse them):

```tsx
const [isGenerating, setIsGenerating] = useState(false)

const handleGenerateWorld = async () => {
  setIsGenerating(true)
  try {
    const seed = newId() // random, ULID-based seed
    const { realmId, mapId } = await executeGenerateWorld(
      { name: 'Generated World', systemId: 'system-cairn-2e', seed },
      {
        realmRepo: container.realmRepo,
        factionRepo: container.factionRepo,
        realmNoteRepo: container.realmNoteRepo,
      },
    )
    setActiveRealmId(realmId)
    navigate({ to: '/realms/maps/$mapId', params: { mapId } })
  } finally {
    setIsGenerating(false)
  }
}
```

Add imports at the top of the file:

```tsx
import { executeGenerateWorld } from '@application/use-cases/GenerateWorld'
import { newId } from '@shared/ulid'
```

> Confirm the map route path: the single-map route file is `src/routes/_app/realms/maps_.$mapId.tsx`. Use the route id TanStack generated for it (likely `/realms/maps/$mapId`). If `navigate` rejects the path, check the generated route tree for the exact id and use that.

- [ ] **Step 2: Add the button**

Near the existing "New Realm" button (around line 410 / 511), add:

```tsx
<Button onClick={handleGenerateWorld} disabled={isGenerating} variant="secondary">
  {isGenerating ? 'Generating…' : 'Generate Test World'}
</Button>
```

- [ ] **Step 3: Build**

Run: `npx tsc --noEmit` then `npm run build`
Expected: both pass.

- [ ] **Step 4: Manual end-to-end verification**

Run the app (`npm run dev`), open `/realms`, click **Generate Test World**. Expected:
- A new "Generated World" realm is created and becomes active.
- You land on the map screen showing a **biome-colored hex grid** (distinct colored regions of hexes), pan/zoom working on touch.
- Clicking Generate again with the app's random seed yields a **different** layout.

If the map is blank: check that `MapViewer` got `map.kind === 'hex'` and that the hex source/layer were added after the maplibre style loaded (Task 4 Step 2 note).

- [ ] **Step 5: Commit**

```bash
git add src/routes/_app/realms/index.tsx
git commit -m "feat: add Generate Test World button wired to the hex generator"
```

---

## Definition of Done

- `npm test` green (Tasks 1–3 add unit tests); `npx tsc --noEmit` and `npm run build` clean.
- Clicking **Generate Test World** on `/realms` creates a realm + hex map and navigates to a viewable, biome-colored hex map.
- The generator is deterministic per seed; the UI uses a random seed per click.
- One `db.transaction('rw', ...)` wraps the world write (extensible to more tables in later phases).

## Follow-ups this slice intentionally defers

- POIs/settlements/dungeons placed on hexes (next increment — build on `buildTinyHexMap`).
- Regions, factions, NPCs, the conflict web, hooks, doom event (Phases 3–4).
- The real generation menu (size/system/advanced/seed) in the create-realm dialog (Phase 5) — this slice uses a single fixed-size button.
- Per-hex click-through to contents; hex map editing.
