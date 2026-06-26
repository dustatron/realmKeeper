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
