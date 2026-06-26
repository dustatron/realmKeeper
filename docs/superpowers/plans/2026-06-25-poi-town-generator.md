# POI-Driven Town Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate a clean, schematic town map for a settlement POI where each placed child POI becomes a clickable building footprint, with simple roads and an optional wall.

**Architecture:** A settlement POI lazily owns a `GameMap` of new `kind:'town'` that stores generated `WatabouCityData` (MFCG feature shape, but emitted in **POI pixel space**). A pure `generateTown(anchors, opts)` builds footprints/roads/wall from the placed child POIs. `MapViewer` renders the features as MapLibre fill/line layers — every coordinate transformed through the existing `pxToLngLat` — with POI markers on top; clicking a footprint resolves `properties.poiId` to open the POI popup.

**Tech Stack:** TanStack Start, TypeScript (strict), Dexie (IndexedDB), MapLibre GL, Vitest, ULID (`@shared/ulid`), `SeededRandom` (`src/lib/dungeon/SeededRandom.ts`).

## Global Constraints

- Package manager: **pnpm** only (no npm, no `package-lock.json`).
- Tests: `pnpm test` (vitest run). Build/typecheck: `pnpm build` (`vite build && tsc --noEmit`).
- Work on branch **`feature/poi-town-generator`** (already created). Never commit to `main`.
- The generator is a **pure function**: no `Date.now()`, no `Math.random()` — all randomness via `SeededRandom` seeded from a passed-in string. Same `(anchors, seed)` ⇒ identical output.
- Coordinates emitted by the generator are in **POI pixel space**: top-left origin, x-right, **y-down**, within `0..width × 0..height`.
- Footprint features set `properties.id` to a real MFCG **kind string** (`'buildings'`, `'walls'`, `'towers'`, `'roads'`, `'earth'`) and carry the owning POI id in a **separate `properties.poiId`**. Never put a ULID in `properties.id`.
- POI types (`@shared/constants` `POI_TYPES`): `settlement, building, interior, fortification, dungeon, natural, landmark, district, zone, ruin, camp, shrine, other`.
- Commit after each task. Commit message footer:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

## File Structure

| File | Responsibility |
|---|---|
| `src/domain/entities/GameMap.ts` | Add `'town'` to `kind`; add `townData`/`townPreset`/`townSeed`/`townWalled`. |
| `src/infrastructure/dexie/migrations/v37-town-defaults.ts` (new) | Pure `withTownDefaults(map)` backfill helper. |
| `src/infrastructure/dexie/db.ts` | `db.version(37)` migration using the helper. |
| `src/application/use-cases/ExportRealm.ts` / `ImportRealm.ts` | Carry town fields through export/import (mirror `kind:'hex'`). |
| `src/lib/watabou/featureStyle.ts` (new) | `classifyFeature` + `COLORS`, extracted from `WatabouCityRenderer` so both renderer and town layer share one classifier. |
| `src/lib/towngen/footprints.ts` (new) | `FOOTPRINT_TABLE` per POI type. |
| `src/lib/towngen/presets.ts` (new) | `PRESETS` (village/city) + shared `TownAnchor` type. |
| `src/lib/towngen/generateTown.ts` (new) | The pure generator. |
| `src/application/use-cases/GetOrCreateTownMap.ts` (new) | Lazy create of a settlement's `kind:'town'` map. |
| `src/components/map/buildTownGeoJSON.ts` (new) | Transform `townData` → MapLibre `FeatureCollection` via a coord mapper. |
| `src/components/map/MapViewer.tsx` | Town fill/line layers + footprint click. |
| `src/components/map/InteractiveMap.tsx` | Town controls (preset, wall, Generate/Regenerate). |
| `src/routes/_app/realms/pois_.$poiId.tsx` | "Town Map" entry button on settlements. |

---

## Task 1: GameMap schema — `kind:'town'` + town fields + migration + export/import

**Files:**
- Modify: `src/domain/entities/GameMap.ts`
- Create: `src/infrastructure/dexie/migrations/v37-town-defaults.ts`
- Test: `src/infrastructure/dexie/migrations/v37-town-defaults.test.ts`
- Modify: `src/infrastructure/dexie/db.ts` (after the `db.version(36)` block)
- Modify: `src/application/use-cases/ExportRealm.ts` (`GameMapExport` + mapping)
- Modify: `src/application/use-cases/ImportRealm.ts` (import mapping)

**Interfaces:**
- Produces: `GameMap.kind` now `'image' | 'hex' | 'town'`; new fields `townData?: WatabouCityData | null`, `townPreset?: 'village' | 'city' | null`, `townSeed?: string | null`, `townWalled?: boolean | null`. `withTownDefaults(map): GameMap`.

- [ ] **Step 1: Write the failing test**

Create `src/infrastructure/dexie/migrations/v37-town-defaults.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { withTownDefaults } from './v37-town-defaults'

describe('withTownDefaults', () => {
  it('fills missing town fields with null, leaving existing fields intact', () => {
    const row = { id: 'm1', name: 'X', kind: 'image' } as Record<string, unknown>
    expect(withTownDefaults(row)).toMatchObject({
      id: 'm1', name: 'X', kind: 'image',
      townData: null, townPreset: null, townSeed: null, townWalled: null,
    })
  })

  it('does not clobber an already-populated town field', () => {
    const row = { id: 'm2', kind: 'town', townPreset: 'city' } as Record<string, unknown>
    expect(withTownDefaults(row).townPreset).toBe('city')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/infrastructure/dexie/migrations/v37-town-defaults.test.ts`
Expected: FAIL — cannot find module `./v37-town-defaults`.

- [ ] **Step 3: Create the helper**

Create `src/infrastructure/dexie/migrations/v37-town-defaults.ts`:

```ts
/** Pure backfill helper used by the db.version(37) upgrade. */
export function withTownDefaults<T extends Record<string, unknown>>(map: T): T {
  return {
    ...map,
    townData: map.townData ?? null,
    townPreset: map.townPreset ?? null,
    townSeed: map.townSeed ?? null,
    townWalled: map.townWalled ?? null,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/infrastructure/dexie/migrations/v37-town-defaults.test.ts`
Expected: PASS (2 passing).

- [ ] **Step 5: Extend the GameMap entity**

In `src/domain/entities/GameMap.ts`, add the import and fields. Change the `kind` line and append the four fields before `width`:

```ts
import type { WatabouCityData } from '@domain/value-objects/WatabouCityData'
// ...
export interface GameMap {
  // ...existing fields...
  kind: 'image' | 'hex' | 'town'
  // ...existing hex fields...
  townData?: WatabouCityData | null
  townPreset?: 'village' | 'city' | null
  townSeed?: string | null
  townWalled?: boolean | null
  width: number
  height: number
  // ...rest unchanged...
}
```

- [ ] **Step 6: Add the v37 migration**

In `src/infrastructure/dexie/db.ts`, add an import near the other migration-helper imports:

```ts
import { withTownDefaults } from './migrations/v37-town-defaults'
```

Immediately after the `db.version(36)...` block, add (no index change — `gameMaps` already indexes `kind` from v36, so reuse `storesV36`):

```ts
// v37: Add town map fields to gameMaps (kind:'town' generated settlement maps)
db.version(37).stores(storesV36).upgrade(async (tx) => {
  const maps = await tx.table('gameMaps').toArray()
  for (const map of maps) {
    await tx.table('gameMaps').put(withTownDefaults(map))
  }
})
```

- [ ] **Step 7: Carry town fields through export/import**

In `src/application/use-cases/ExportRealm.ts`, add to the `GameMapExport` interface (after the hex fields):

```ts
  townData?: import('@domain/value-objects/WatabouCityData').WatabouCityData | null
  townPreset?: 'village' | 'city' | null
  townSeed?: string | null
  townWalled?: boolean | null
```

And in the `gameMaps` mapping object (after `hexCells: m.hexCells ?? null,`):

```ts
      townData: m.townData ?? null,
      townPreset: m.townPreset ?? null,
      townSeed: m.townSeed ?? null,
      townWalled: m.townWalled ?? null,
```

In `src/application/use-cases/ImportRealm.ts`, the `imageUrl` line already blanks images for non-image maps — extend it to cover `'town'`:

```ts
    const imageUrl =
      kind === 'hex' || kind === 'town'
        ? ''
        : gm.imageBase64 ? `data:image/png;base64,${gm.imageBase64}` : ''
```

And in the `gameMapRepo.create({ ... })` call (after `hexCells: gm.hexCells ?? undefined,`):

```ts
      townData: gm.townData ?? null,
      townPreset: gm.townPreset ?? null,
      townSeed: gm.townSeed ?? null,
      townWalled: gm.townWalled ?? null,
```

- [ ] **Step 8: Typecheck + test**

Run: `pnpm build`
Expected: PASS (no TS errors — the new `kind` union and fields compile everywhere `GameMap` is used).
Run: `pnpm test src/infrastructure/dexie/migrations/v37-town-defaults.test.ts`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/domain/entities/GameMap.ts src/infrastructure/dexie/ src/application/use-cases/ExportRealm.ts src/application/use-cases/ImportRealm.ts
git commit -m "feat(maps): add kind:'town' GameMap with town fields + v37 migration

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Foundations — shared classifier, footprint table, presets

**Files:**
- Create: `src/lib/watabou/featureStyle.ts`
- Modify: `src/components/watabou/WatabouCityRenderer.tsx` (import the extracted symbols)
- Create: `src/lib/towngen/footprints.ts`
- Create: `src/lib/towngen/presets.ts`
- Test: `src/lib/towngen/footprints.test.ts`

**Interfaces:**
- Produces:
  - `classifyFeature(f): FeatureKind` and `COLORS` (moved verbatim from the renderer).
  - `FootprintShape = 'rect' | 'blob'`; `FootprintSpec = { shape: FootprintShape; w: number; h: number }`; `FOOTPRINT_TABLE: Record<PoiType, FootprintSpec>`.
  - `TownAnchor = { poiId: string; x: number; y: number; type: PoiType }`; `TownPreset = { footprintScale: number; roadWidth: number; padding: number; wallDefault: boolean }`; `PRESETS: Record<'village' | 'city', TownPreset>`.

- [ ] **Step 1: Extract `classifyFeature` + `COLORS` into a shared module**

Create `src/lib/watabou/featureStyle.ts` by **moving** the `FeatureKind` type, `classifyFeature` function, and the `COLORS` constant out of `src/components/watabou/WatabouCityRenderer.tsx` (lines ~10-47) verbatim. Export all three:

```ts
import type { WatabouCityFeature } from '@domain/value-objects/WatabouCityData'

export type FeatureKind =
  | 'earth' | 'water' | 'farm' | 'plaza' | 'tree' | 'road' | 'river'
  | 'wall' | 'building' | 'tower' | 'unknown'

export function classifyFeature(f: WatabouCityFeature): FeatureKind {
  // ...exact body moved from WatabouCityRenderer.tsx...
}

export const COLORS: Record<string, { fill: string; stroke: string; strokeWidth: number; opacity?: number }> = {
  // ...exact object moved from WatabouCityRenderer.tsx...
}
```

In `WatabouCityRenderer.tsx`, delete those definitions and import them instead:

```ts
import { classifyFeature, COLORS, type FeatureKind } from '~/lib/watabou/featureStyle'
```

- [ ] **Step 2: Verify the extraction compiles + renders unchanged**

Run: `pnpm build`
Expected: PASS (renderer still references `classifyFeature`/`COLORS`/`FeatureKind`, now imported).

- [ ] **Step 3: Write the failing footprint-table test**

Create `src/lib/towngen/footprints.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { POI_TYPES } from '@shared/constants'
import { FOOTPRINT_TABLE } from './footprints'

describe('FOOTPRINT_TABLE', () => {
  it('has a spec for every POI type', () => {
    for (const t of POI_TYPES) {
      expect(FOOTPRINT_TABLE[t], `missing spec for ${t}`).toBeDefined()
    }
  })

  it('uses positive, sane dimensions', () => {
    for (const t of POI_TYPES) {
      const s = FOOTPRINT_TABLE[t]
      expect(s.w).toBeGreaterThan(0)
      expect(s.h).toBeGreaterThan(0)
      expect(s.w).toBeLessThanOrEqual(200)
      expect(s.h).toBeLessThanOrEqual(200)
      expect(['rect', 'blob']).toContain(s.shape)
    }
  })

  it('renders shrines/temples as rounded blobs and houses as rects', () => {
    expect(FOOTPRINT_TABLE.shrine.shape).toBe('blob')
    expect(FOOTPRINT_TABLE.building.shape).toBe('rect')
  })
})
```

- [ ] **Step 4: Run test to verify it fails**

Run: `pnpm test src/lib/towngen/footprints.test.ts`
Expected: FAIL — cannot find module `./footprints`.

- [ ] **Step 5: Create the footprint table**

Create `src/lib/towngen/footprints.ts`:

```ts
import type { PoiType } from '@shared/constants'

export type FootprintShape = 'rect' | 'blob'
export interface FootprintSpec {
  shape: FootprintShape
  /** base width/height in pixel units (before preset scaling) */
  w: number
  h: number
}

export const FOOTPRINT_TABLE: Record<PoiType, FootprintSpec> = {
  settlement: { shape: 'rect', w: 60, h: 60 },
  building: { shape: 'rect', w: 34, h: 28 },
  interior: { shape: 'rect', w: 26, h: 22 },
  fortification: { shape: 'rect', w: 70, h: 70 },
  dungeon: { shape: 'blob', w: 44, h: 44 },
  natural: { shape: 'blob', w: 40, h: 40 },
  landmark: { shape: 'blob', w: 30, h: 30 },
  district: { shape: 'rect', w: 80, h: 60 },
  zone: { shape: 'rect', w: 80, h: 60 },
  ruin: { shape: 'rect', w: 36, h: 30 },
  camp: { shape: 'blob', w: 28, h: 28 },
  shrine: { shape: 'blob', w: 24, h: 24 },
  other: { shape: 'rect', w: 30, h: 26 },
}
```

- [ ] **Step 6: Create presets + the `TownAnchor` type**

Create `src/lib/towngen/presets.ts`:

```ts
import type { PoiType } from '@shared/constants'

export interface TownAnchor {
  poiId: string
  x: number
  y: number
  type: PoiType
}

export interface TownPreset {
  /** multiplier applied to FOOTPRINT_TABLE dimensions */
  footprintScale: number
  /** rendered road stroke width (informational; styling reads COLORS) */
  roadWidth: number
  /** outward offset of the wall hull / earth pad, in pixel units */
  padding: number
  /** wall on by default for this preset (overridable per town) */
  wallDefault: boolean
}

export const PRESETS: Record<'village' | 'city', TownPreset> = {
  village: { footprintScale: 1, roadWidth: 3, padding: 40, wallDefault: false },
  city: { footprintScale: 1.15, roadWidth: 5, padding: 70, wallDefault: true },
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `pnpm test src/lib/towngen/footprints.test.ts`
Expected: PASS (3 passing).

- [ ] **Step 8: Commit**

```bash
git add src/lib/watabou/featureStyle.ts src/components/watabou/WatabouCityRenderer.tsx src/lib/towngen/
git commit -m "feat(towngen): footprint table, presets; extract shared feature classifier

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: `generateTown` — the pure generator

**Files:**
- Create: `src/lib/towngen/generateTown.ts`
- Test: `src/lib/towngen/generateTown.test.ts`

**Interfaces:**
- Consumes: `FOOTPRINT_TABLE` (Task 2), `PRESETS` + `TownAnchor` (Task 2), `classifyFeature` (Task 2), `SeededRandom` (`src/lib/dungeon/SeededRandom.ts`), `WatabouCityData` (`@domain/value-objects/WatabouCityData`).
- Produces: `generateTown(anchors: TownAnchor[], opts: GenerateTownOpts): WatabouCityData` where `GenerateTownOpts = { preset: 'village' | 'city'; seed: string; walled?: boolean; width?: number; height?: number }`.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/towngen/generateTown.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { generateTown, type GenerateTownOpts } from './generateTown'
import type { TownAnchor } from './presets'
import { classifyFeature } from '~/lib/watabou/featureStyle'

const anchors: TownAnchor[] = [
  { poiId: 'p1', x: 200, y: 200, type: 'settlement' },
  { poiId: 'p2', x: 400, y: 300, type: 'building' },
  { poiId: 'p3', x: 300, y: 500, type: 'shrine' },
]
const base: GenerateTownOpts = { preset: 'village', seed: 'seed-xyz', width: 1000, height: 1000 }

function buildingFeatures(data: ReturnType<typeof generateTown>) {
  return data.features.filter((f) => f.properties.id === 'buildings')
}

describe('generateTown', () => {
  it('is deterministic for the same anchors + seed', () => {
    expect(generateTown(anchors, base)).toEqual(generateTown(anchors, base))
  })

  it('emits one building footprint per anchor, each carrying its poiId', () => {
    const b = buildingFeatures(generateTown(anchors, base))
    expect(b).toHaveLength(3)
    expect(b.map((f) => f.properties.poiId).sort()).toEqual(['p1', 'p2', 'p3'])
  })

  it('classifies every footprint as a building (no properties.id collision)', () => {
    for (const f of buildingFeatures(generateTown(anchors, base))) {
      expect(classifyFeature(f)).toBe('building')
    }
  })

  it('keeps all coordinates within the pixel canvas', () => {
    const data = generateTown(anchors, base)
    const flat: number[] = []
    const walk = (c: unknown): void => {
      if (Array.isArray(c) && typeof c[0] === 'number') { flat.push(c[0] as number, c[1] as number) }
      else if (Array.isArray(c)) c.forEach(walk)
    }
    data.features.forEach((f) => walk(f.geometry.coordinates))
    const xs = flat.filter((_, i) => i % 2 === 0)
    const ys = flat.filter((_, i) => i % 2 === 1)
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0)
    expect(Math.max(...xs)).toBeLessThanOrEqual(1000)
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0)
    expect(Math.max(...ys)).toBeLessThanOrEqual(1000)
  })

  it('adds a wall for the city preset and omits it for village by default', () => {
    const wallsIn = (o: GenerateTownOpts) =>
      generateTown(anchors, o).features.some((f) => f.properties.id === 'walls')
    expect(wallsIn({ ...base, preset: 'village' })).toBe(false)
    expect(wallsIn({ ...base, preset: 'city' })).toBe(true)
  })

  it('honors an explicit walled override over the preset default', () => {
    const walls = generateTown(anchors, { ...base, preset: 'village', walled: true })
      .features.some((f) => f.properties.id === 'walls')
    expect(walls).toBe(true)
  })

  it('returns an earth-only town for zero anchors', () => {
    const data = generateTown([], base)
    expect(buildingFeatures(data)).toHaveLength(0)
    expect(data.features.every((f) => f.properties.id === 'earth')).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/lib/towngen/generateTown.test.ts`
Expected: FAIL — cannot find module `./generateTown`.

- [ ] **Step 3: Implement the generator**

Create `src/lib/towngen/generateTown.ts`:

```ts
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import type { WatabouCityData, WatabouCityFeature } from '@domain/value-objects/WatabouCityData'
import { FOOTPRINT_TABLE } from './footprints'
import { PRESETS, type TownAnchor } from './presets'

export interface GenerateTownOpts {
  preset: 'village' | 'city'
  seed: string
  walled?: boolean
  width?: number
  height?: number
}

type Pt = [number, number]

const DEFAULT_W = 1000
const DEFAULT_H = 1000

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

/** Axis-aligned rectangle ring centered on (cx,cy). */
function rectRing(cx: number, cy: number, w: number, h: number, W: number, H: number): Pt[] {
  const hw = w / 2, hh = h / 2
  const ring: Pt[] = [
    [cx - hw, cy - hh], [cx + hw, cy - hh],
    [cx + hw, cy + hh], [cx - hw, cy + hh],
  ]
  return ring.map(([x, y]) => [clamp(x, 0, W), clamp(y, 0, H)] as Pt).concat([[clamp(cx - hw, 0, W), clamp(cy - hh, 0, H)]])
}

/** Octagonal "blob" ring approximating a rounded footprint. */
function blobRing(cx: number, cy: number, w: number, h: number, rng: SeededRandom, W: number, H: number): Pt[] {
  const rx = w / 2, ry = h / 2
  const steps = 8
  const ring: Pt[] = []
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2
    const j = 0.85 + rng.next() * 0.3 // gentle irregularity, deterministic
    ring.push([clamp(cx + Math.cos(a) * rx * j, 0, W), clamp(cy + Math.sin(a) * ry * j, 0, H)])
  }
  ring.push(ring[0])
  return ring
}

/** Andrew's monotone-chain convex hull. */
function convexHull(points: Pt[]): Pt[] {
  const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  if (pts.length < 3) return pts
  const cross = (o: Pt, a: Pt, b: Pt) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lower: Pt[] = []
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop()
    lower.push(p)
  }
  const upper: Pt[] = []
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop()
    upper.push(p)
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1))
}

/** Offset hull points outward from the centroid by `pad`. */
function offsetHull(hull: Pt[], pad: number, W: number, H: number): Pt[] {
  const cx = hull.reduce((s, p) => s + p[0], 0) / hull.length
  const cy = hull.reduce((s, p) => s + p[1], 0) / hull.length
  return hull.map(([x, y]) => {
    const dx = x - cx, dy = y - cy
    const len = Math.hypot(dx, dy) || 1
    return [clamp(x + (dx / len) * pad, 0, W), clamp(y + (dy / len) * pad, 0, H)] as Pt
  })
}

function feature(id: string, type: string, coordinates: unknown, poiId?: string): WatabouCityFeature {
  return {
    type: 'Feature',
    properties: poiId ? { id, poiId } : { id },
    geometry: { type, coordinates: coordinates as WatabouCityFeature['geometry']['coordinates'] },
  }
}

export function generateTown(anchors: TownAnchor[], opts: GenerateTownOpts): WatabouCityData {
  const W = opts.width ?? DEFAULT_W
  const H = opts.height ?? DEFAULT_H
  const preset = PRESETS[opts.preset]
  const rng = new SeededRandom(opts.seed)
  const features: WatabouCityFeature[] = []

  // 1. Earth base — bounding box around anchors (or whole canvas if empty), padded.
  if (anchors.length === 0) {
    features.push(feature('earth', 'Polygon', [[[0, 0], [W, 0], [W, H], [0, H], [0, 0]]]))
    return { type: 'mfcg', features }
  }
  const minX = Math.min(...anchors.map((a) => a.x)) - preset.padding
  const minY = Math.min(...anchors.map((a) => a.y)) - preset.padding
  const maxX = Math.max(...anchors.map((a) => a.x)) + preset.padding
  const maxY = Math.max(...anchors.map((a) => a.y)) + preset.padding
  const ex0 = clamp(minX, 0, W), ey0 = clamp(minY, 0, H)
  const ex1 = clamp(maxX, 0, W), ey1 = clamp(maxY, 0, H)
  features.push(feature('earth', 'Polygon', [[[ex0, ey0], [ex1, ey0], [ex1, ey1], [ex0, ey1], [ex0, ey0]]]))

  // 2. Footprints — one per anchor, tagged with poiId; properties.id = 'buildings'.
  const centroid: Pt = [
    anchors.reduce((s, a) => s + a.x, 0) / anchors.length,
    anchors.reduce((s, a) => s + a.y, 0) / anchors.length,
  ]
  for (const a of anchors) {
    const spec = FOOTPRINT_TABLE[a.type]
    const w = spec.w * preset.footprintScale
    const h = spec.h * preset.footprintScale
    const ring =
      spec.shape === 'blob'
        ? blobRing(a.x, a.y, w, h, rng, W, H)
        : rectRing(a.x, a.y, w, h, W, H)
    features.push(feature('buildings', 'Polygon', [ring], a.poiId))
    // 3. Road — a spoke from this footprint to the town centroid. Legible, deterministic.
    features.push(feature('roads', 'LineString', [[a.x, a.y], centroid]))
  }

  // 4. Wall — optional, convex hull of footprint anchors offset outward, left open at a gate.
  const walled = opts.walled ?? preset.wallDefault
  if (walled && anchors.length >= 3) {
    const hull = offsetHull(convexHull(anchors.map((a) => [a.x, a.y] as Pt)), preset.padding, W, H)
    // Gate: drop the last edge so the wall is an open polyline (a gap).
    features.push(feature('walls', 'LineString', hull))
    features.push(feature('towers', 'MultiPoint', hull))
  }

  return { type: 'mfcg', features }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/lib/towngen/generateTown.test.ts`
Expected: PASS (7 passing).

- [ ] **Step 5: Commit**

```bash
git add src/lib/towngen/generateTown.ts src/lib/towngen/generateTown.test.ts
git commit -m "feat(towngen): pure generateTown — footprints, road spokes, optional wall

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: `GetOrCreateTownMap` lazy use-case

**Files:**
- Create: `src/application/use-cases/GetOrCreateTownMap.ts`
- Test: `src/application/use-cases/GetOrCreateTownMap.test.ts`

**Interfaces:**
- Consumes: `IGameMapRepository` (`getByPoiId`, `create`), `newId` (`@shared/ulid`).
- Produces: `executeGetOrCreateTownMap(input: { poiId: string; name: string; width?: number; height?: number }, deps: { gameMapRepo: IGameMapRepository }): Promise<GameMap>`.

- [ ] **Step 1: Write the failing test**

Create `src/application/use-cases/GetOrCreateTownMap.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { executeGetOrCreateTownMap } from './GetOrCreateTownMap'
import type { IGameMapRepository } from '@application/ports/IGameMapRepository'
import type { GameMap } from '@domain/entities/GameMap'

function fakeRepo(seed: GameMap[] = []): IGameMapRepository & { rows: GameMap[] } {
  const rows = [...seed]
  return {
    rows,
    getById: async (id) => rows.find((m) => m.id === id),
    getByRealmId: async () => [],
    getByPoiId: async (poiId) => rows.filter((m) => m.ownerPoiId === poiId),
    create: async (m) => { rows.push(m) },
    update: async (m) => { const i = rows.findIndex((r) => r.id === m.id); if (i >= 0) rows[i] = m },
    delete: async (id) => { const i = rows.findIndex((r) => r.id === id); if (i >= 0) rows.splice(i, 1) },
  }
}

describe('executeGetOrCreateTownMap', () => {
  it('creates a kind:town map with no image when none exists', async () => {
    const repo = fakeRepo()
    const map = await executeGetOrCreateTownMap({ poiId: 'poi1', name: 'Riverbend' }, { gameMapRepo: repo })
    expect(map.kind).toBe('town')
    expect(map.ownerPoiId).toBe('poi1')
    expect(map.imageUrl).toBe('')
    expect(map.width).toBeGreaterThan(0)
    expect(map.height).toBeGreaterThan(0)
    expect(repo.rows).toHaveLength(1)
  })

  it('returns the existing town map instead of creating a second', async () => {
    const repo = fakeRepo()
    const first = await executeGetOrCreateTownMap({ poiId: 'poi1', name: 'Riverbend' }, { gameMapRepo: repo })
    const again = await executeGetOrCreateTownMap({ poiId: 'poi1', name: 'Riverbend' }, { gameMapRepo: repo })
    expect(again.id).toBe(first.id)
    expect(repo.rows).toHaveLength(1)
  })

  it('ignores a non-town map on the same POI and creates the town map', async () => {
    const repo = fakeRepo([{ id: 'img1', ownerPoiId: 'poi1', kind: 'image' } as GameMap])
    const map = await executeGetOrCreateTownMap({ poiId: 'poi1', name: 'Riverbend' }, { gameMapRepo: repo })
    expect(map.kind).toBe('town')
    expect(repo.rows).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/application/use-cases/GetOrCreateTownMap.test.ts`
Expected: FAIL — cannot find module `./GetOrCreateTownMap`.

- [ ] **Step 3: Implement the use-case**

Create `src/application/use-cases/GetOrCreateTownMap.ts`:

```ts
import type { IGameMapRepository } from '@application/ports/IGameMapRepository'
import type { GameMap } from '@domain/entities/GameMap'
import { newId } from '@shared/ulid'

const TOWN_CANVAS = 1000

export interface GetOrCreateTownMapInput {
  poiId: string
  name: string
  width?: number
  height?: number
}

export async function executeGetOrCreateTownMap(
  input: GetOrCreateTownMapInput,
  deps: { gameMapRepo: IGameMapRepository },
): Promise<GameMap> {
  const existing = (await deps.gameMapRepo.getByPoiId(input.poiId)).find((m) => m.kind === 'town')
  if (existing) return existing

  const now = Date.now()
  const map: GameMap = {
    id: newId(),
    name: `${input.name} — Town`,
    ownerRealmId: null,
    ownerPoiId: input.poiId,
    imageUrl: '',
    kind: 'town',
    hexCols: null,
    hexRows: null,
    hexSize: null,
    hexOrientation: null,
    width: input.width ?? TOWN_CANVAS,
    height: input.height ?? TOWN_CANVAS,
    townData: null,
    townPreset: null,
    townSeed: null,
    townWalled: null,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
  }
  await deps.gameMapRepo.create(map)
  return map
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/application/use-cases/GetOrCreateTownMap.test.ts`
Expected: PASS (3 passing).

- [ ] **Step 5: Commit**

```bash
git add src/application/use-cases/GetOrCreateTownMap.ts src/application/use-cases/GetOrCreateTownMap.test.ts
git commit -m "feat(maps): lazy GetOrCreateTownMap use-case

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: `buildTownGeoJSON` helper + MapViewer town rendering

**Files:**
- Create: `src/components/map/buildTownGeoJSON.ts`
- Test: `src/components/map/buildTownGeoJSON.test.ts`
- Modify: `src/components/map/MapViewer.tsx`

**Interfaces:**
- Consumes: `classifyFeature`/`COLORS` (Task 2), `WatabouCityData` (Task 1 field), `pxToLngLat` (existing in MapViewer).
- Produces: `buildTownGeoJSON(data: WatabouCityData, toLngLat: (x: number, y: number) => [number, number]): GeoJSON.FeatureCollection` — each feature gets `properties.kind` (from `classifyFeature`) and preserves `poiId`; all coordinates passed through `toLngLat`.

- [ ] **Step 1: Write the failing test**

Create `src/components/map/buildTownGeoJSON.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildTownGeoJSON } from './buildTownGeoJSON'
import type { WatabouCityData } from '@domain/value-objects/WatabouCityData'

const identity = (x: number, y: number): [number, number] => [x, y]

const data: WatabouCityData = {
  type: 'mfcg',
  features: [
    { type: 'Feature', properties: { id: 'earth' }, geometry: { type: 'Polygon', coordinates: [[[0, 0], [10, 0], [10, 10], [0, 0]]] } },
    { type: 'Feature', properties: { id: 'buildings', poiId: 'p1' }, geometry: { type: 'Polygon', coordinates: [[[2, 2], [4, 2], [4, 4], [2, 2]]] } },
    { type: 'Feature', properties: { id: 'roads' }, geometry: { type: 'LineString', coordinates: [[2, 2], [8, 8]] } },
  ],
}

describe('buildTownGeoJSON', () => {
  it('tags each feature with a classified kind', () => {
    const fc = buildTownGeoJSON(data, identity)
    const kinds = fc.features.map((f) => f.properties?.kind)
    expect(kinds).toEqual(['earth', 'building', 'road'])
  })

  it('preserves poiId on building features', () => {
    const fc = buildTownGeoJSON(data, identity)
    const b = fc.features.find((f) => f.properties?.kind === 'building')
    expect(b?.properties?.poiId).toBe('p1')
  })

  it('passes every coordinate through the mapper', () => {
    const fc = buildTownGeoJSON(data, (x, y) => [x + 100, y + 100])
    const road = fc.features.find((f) => f.properties?.kind === 'road')!
    expect((road.geometry as GeoJSON.LineString).coordinates[0]).toEqual([102, 102])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/components/map/buildTownGeoJSON.test.ts`
Expected: FAIL — cannot find module `./buildTownGeoJSON`.

- [ ] **Step 3: Implement the helper**

Create `src/components/map/buildTownGeoJSON.ts`:

```ts
import type { WatabouCityData } from '@domain/value-objects/WatabouCityData'
import { classifyFeature } from '~/lib/watabou/featureStyle'

type ToLngLat = (x: number, y: number) => [number, number]

function mapCoords(coords: unknown, toLngLat: ToLngLat): unknown {
  if (Array.isArray(coords) && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
    return toLngLat(coords[0], coords[1] as number)
  }
  if (Array.isArray(coords)) return coords.map((c) => mapCoords(c, toLngLat))
  return coords
}

export function buildTownGeoJSON(data: WatabouCityData, toLngLat: ToLngLat): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: data.features.map((f) => ({
      type: 'Feature',
      properties: {
        kind: classifyFeature(f),
        poiId: (f.properties as { poiId?: string }).poiId ?? null,
      },
      geometry: {
        type: f.geometry.type,
        coordinates: mapCoords(f.geometry.coordinates, toLngLat),
      } as GeoJSON.Geometry,
    })),
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/components/map/buildTownGeoJSON.test.ts`
Expected: PASS (3 passing).

- [ ] **Step 5: Wire the town layers into MapViewer**

In `src/components/map/MapViewer.tsx`, add the import:

```ts
import { buildTownGeoJSON } from './buildTownGeoJSON'
import { COLORS } from '~/lib/watabou/featureStyle'
```

After the existing hex-cell effect (the one gated on `map.kind !== 'hex'`, ending ~line 739), add a sibling effect that renders town features as fill + line layers and wires footprint clicks. `pxToLngLat`, `mapRef`, `mapReady`, `poisRef`, and `onPoiClick` are already in scope:

```ts
// Render generated-town features for kind:'town' maps.
useEffect(() => {
  const instance = mapRef.current
  if (!instance || !mapReady) return
  if (map.kind !== 'town' || !map.townData) return

  const srcId = 'town-features'
  const fillId = 'town-fill'
  const lineId = 'town-line'
  const fc = buildTownGeoJSON(map.townData, (x, y) => pxToLngLat(x, y))

  if (instance.getSource(srcId)) {
    ;(instance.getSource(srcId) as maplibregl.GeoJSONSource).setData(fc)
  } else {
    instance.addSource(srcId, { type: 'geojson', data: fc })
    // Fills: earth / building / plaza / water (drawn under markers).
    instance.addLayer({
      id: fillId,
      type: 'fill',
      source: srcId,
      filter: ['in', ['get', 'kind'], ['literal', ['earth', 'building', 'plaza', 'water', 'farm']]],
      paint: {
        'fill-color': [
          'match', ['get', 'kind'],
          'earth', COLORS.earth.fill,
          'building', COLORS.building.fill,
          'plaza', COLORS.plaza.fill,
          'water', COLORS.water.fill,
          'farm', COLORS.farm.fill,
          '#b8a88a',
        ],
        'fill-outline-color': '#6b5c3e',
      },
    })
    // Lines: roads / walls / rivers.
    instance.addLayer({
      id: lineId,
      type: 'line',
      source: srcId,
      filter: ['in', ['get', 'kind'], ['literal', ['road', 'wall', 'river']]],
      paint: {
        'line-color': [
          'match', ['get', 'kind'],
          'wall', COLORS.wall.stroke,
          'river', COLORS.river.stroke,
          COLORS.road.stroke,
        ],
        'line-width': ['match', ['get', 'kind'], 'wall', 3, 'river', 4, 1.5],
      },
    })
    // Footprint click → resolve poiId → open the POI popup (same as a marker click).
    instance.on('click', fillId, (e) => {
      const poiId = e.features?.[0]?.properties?.poiId
      if (!poiId) return
      const poi = poisRef.current.find((p) => p.id === poiId)
      if (poi) onPoiClick?.(poi)
    })
    instance.on('mouseenter', fillId, () => { instance.getCanvas().style.cursor = 'pointer' })
    instance.on('mouseleave', fillId, () => { instance.getCanvas().style.cursor = '' })
  }
}, [map.id, map.kind, map.townData, mapReady, pxToLngLat, onPoiClick])
```

- [ ] **Step 6: Typecheck + run all town tests**

Run: `pnpm build`
Expected: PASS.
Run: `pnpm test src/components/map/buildTownGeoJSON.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/map/buildTownGeoJSON.ts src/components/map/buildTownGeoJSON.test.ts src/components/map/MapViewer.tsx
git commit -m "feat(maps): render kind:'town' features as MapLibre fill/line layers + footprint click

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Town controls + settlement entry point

**Files:**
- Create: `src/lib/towngen/collectAnchors.ts`
- Test: `src/lib/towngen/collectAnchors.test.ts`
- Modify: `src/components/map/InteractiveMap.tsx` (town controls + Generate handler)
- Modify: `src/routes/_app/realms/pois_.$poiId.tsx` ("Town Map" button)

**Interfaces:**
- Consumes: `generateTown` (Task 3), `executeGetOrCreateTownMap` (Task 4), `usePOIsOnMap` (existing), `container.gameMapRepo`/`container.poiRepo` (existing), `newId`.
- Produces: `collectAnchors(pois: POI[]): TownAnchor[]` — placed POIs (with `position`) → anchors.

- [ ] **Step 1: Write the failing test**

Create `src/lib/towngen/collectAnchors.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { collectAnchors } from './collectAnchors'
import type { POI } from '@domain/entities/POI'

const poi = (over: Partial<POI>): POI => ({ id: 'x', type: 'building', position: { x: 1, y: 2 }, ...over } as POI)

describe('collectAnchors', () => {
  it('maps placed POIs to anchors', () => {
    const a = collectAnchors([poi({ id: 'p1', position: { x: 10, y: 20 }, type: 'shrine' })])
    expect(a).toEqual([{ poiId: 'p1', x: 10, y: 20, type: 'shrine' }])
  })

  it('skips POIs with no position', () => {
    expect(collectAnchors([poi({ id: 'p2', position: null })])).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/lib/towngen/collectAnchors.test.ts`
Expected: FAIL — cannot find module `./collectAnchors`.

- [ ] **Step 3: Implement the helper**

Create `src/lib/towngen/collectAnchors.ts`:

```ts
import type { POI } from '@domain/entities/POI'
import type { TownAnchor } from './presets'

export function collectAnchors(pois: POI[]): TownAnchor[] {
  return pois
    .filter((p): p is POI & { position: { x: number; y: number } } => p.position != null)
    .map((p) => ({ poiId: p.id, x: p.position.x, y: p.position.y, type: p.type }))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/lib/towngen/collectAnchors.test.ts`
Expected: PASS (2 passing).

- [ ] **Step 5: Add town controls + Generate handler to InteractiveMap**

In `src/components/map/InteractiveMap.tsx`, add imports:

```ts
import { generateTown } from '~/lib/towngen/generateTown'
import { collectAnchors } from '~/lib/towngen/collectAnchors'
import { newId } from '@shared/ulid'
```

Add a regenerate handler inside the component (near the other `handle*` callbacks). It reads the placed POIs (`poisOnMap`), regenerates, and persists onto the map via `container.gameMapRepo.update`:

```ts
const handleRegenerateTown = useCallback(async () => {
  const preset = gameMap.townPreset ?? 'village'
  const seed = gameMap.townSeed ?? newId()
  const townData = generateTown(collectAnchors(poisOnMap), {
    preset,
    seed,
    walled: gameMap.townWalled ?? undefined,
    width: gameMap.width,
    height: gameMap.height,
  })
  await container.gameMapRepo.update({
    ...gameMap,
    townData,
    townPreset: preset,
    townSeed: seed,
    updatedAt: Date.now(),
  })
}, [gameMap, poisOnMap, container.gameMapRepo])
```

Render a small control bar when the map is a town. Place it just above the `<MapViewer .../>` block, inside the existing `flex-1 relative` container or directly under `<MapToolbar/>`:

```tsx
{gameMap.kind === 'town' && (
  <div className="flex items-center gap-2 px-3 py-1.5 border-b bg-muted/30">
    <Select
      value={gameMap.townPreset ?? 'village'}
      onValueChange={async (v) => {
        await container.gameMapRepo.update({ ...gameMap, townPreset: v as 'village' | 'city', updatedAt: Date.now() })
      }}
    >
      <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="village">Village</SelectItem>
        <SelectItem value="city">City</SelectItem>
      </SelectContent>
    </Select>
    <Button
      size="sm"
      variant="outline"
      onClick={async () => {
        await container.gameMapRepo.update({ ...gameMap, townWalled: !(gameMap.townWalled ?? false), updatedAt: Date.now() })
      }}
    >
      {gameMap.townWalled ? 'Walled: on' : 'Walled: off'}
    </Button>
    <Button size="sm" onClick={handleRegenerateTown}>
      {gameMap.townData ? 'Regenerate' : 'Generate town'}
    </Button>
  </div>
)}
```

(`Select`, `SelectTrigger`, `SelectContent`, `SelectItem`, `SelectValue`, and `Button` are already imported in this file.)

- [ ] **Step 6: Add the "Town Map" entry button on settlements**

In `src/routes/_app/realms/pois_.$poiId.tsx`, add the import:

```ts
import { executeGetOrCreateTownMap } from '@application/use-cases/GetOrCreateTownMap'
```

Next to the existing "Add Map"/"Edit Map" button (around line 508), add a settlement-only button. `poi`, `container`, and `usePOIMaps`'s live query mean the new map appears in `poiMaps` automatically once created:

```tsx
{poi.type === 'settlement' && (
  <Button
    size="sm"
    variant="outline"
    onClick={async () => {
      await executeGetOrCreateTownMap(
        { poiId: poi.id, name: poi.name, width: 1000, height: 1000 },
        { gameMapRepo: container.gameMapRepo },
      )
    }}
  >
    <MapPinned className="mr-2 size-4" />
    Town Map
  </Button>
)}
```

- [ ] **Step 7: Typecheck + run the full suite**

Run: `pnpm build`
Expected: PASS.
Run: `pnpm test`
Expected: PASS (all suites, including the new towngen tests).

- [ ] **Step 8: Manual verification (app)**

Run: `pnpm dev`, open a settlement POI:
1. Click **Town Map** → a town map appears in the POI's map list.
2. Open it, switch to **Place POIs**, drop a few child building pins.
3. Click **Generate town** → footprints appear under the pins, joined by road spokes; **City** preset adds a wall.
4. Click a footprint → the POI popup opens for that building.
5. Drag a pin, click **Regenerate** → the footprint reflows to the new position.

- [ ] **Step 9: Commit**

```bash
git add src/lib/towngen/collectAnchors.ts src/lib/towngen/collectAnchors.test.ts src/components/map/InteractiveMap.tsx src/routes/_app/realms/pois_.\$poiId.tsx
git commit -m "feat(towngen): town generate/regenerate controls + settlement entry point

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review Notes

- **Spec coverage:** §A storage/lazy-create → Tasks 1, 4, 6. §B anchors (reuses placement) → Task 6 (`collectAnchors` + existing place-poi mode). §C generator (pixel space, `properties.id`=kind, `poiId` separate, footprints/roads/wall) → Tasks 2–3. §D render via `pxToLngLat` + footprint click on `poiId` → Task 5. §E generate/regenerate UI → Task 6. Determinism, classification, pixel-bounds, wall toggle, empty-anchor → Task 3 tests.
- **Deferred (per spec, YAGNI):** water/river hand-placement; a true gate gap renders as an open wall polyline (Task 3) rather than a styled gateway; clickable footprints in the static `WatabouCityRenderer` detail view (interaction lives only on MapViewer).
- **Coordinate invariant** is enforced in two places: Task 3 emits pixel-space coords (tested ≤ canvas bounds); Task 5 transforms every coord through `pxToLngLat` before `setData` — never feeds raw coords to a source.
