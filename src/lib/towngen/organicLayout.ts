import { SeededRandom } from '~/lib/dungeon/SeededRandom'

/** A building plot fronting a lane. `filler` plots are anonymous (no POI). */
export interface OrganicSlot {
  x: number
  y: number
  angle: number
  filler: boolean
}

export interface OrganicLayout {
  /** Lane centerlines (curved polylines) in pixel space. */
  roads: [number, number][][]
  /** Central plaza ring. */
  plaza: [number, number][]
  /** Building plots — the first `namedCount` (closest to centre) are non-filler. */
  slots: OrganicSlot[]
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

/**
 * Lay a settlement out organically: a few lanes curving out from a central
 * plaza, buildings lining both sides, plus anonymous filler buildings so the
 * place reads as a dense town rather than a handful of boxes. The GM's named
 * POIs take the central plots; filler fills the outskirts. Deterministic per seed.
 */
export function organicLayout(
  namedCount: number,
  width: number,
  height: number,
  seed: string,
  preset: 'village' | 'city',
): OrganicLayout {
  const rng = new SeededRandom(seed)
  const margin = Math.min(width, height) * 0.1
  const cx = width / 2 + rng.float(-width * 0.04, width * 0.04)
  const cy = height / 2 + rng.float(-height * 0.04, height * 0.04)
  const maxR = Math.min(width, height) / 2 - margin
  const step = maxR / 6

  const roads: [number, number][][] = []

  // Main lanes radiate from the centre at irregular angles, curving as they go.
  const K = preset === 'city' ? 5 : 3
  const mainRoads: [number, number][][] = []
  for (let i = 0; i < K; i++) {
    let a = (i / K) * Math.PI * 2 + rng.float(-0.3, 0.3)
    let x = cx
    let y = cy
    const poly: [number, number][] = [[x, y]]
    const steps = 5 + Math.floor(rng.next() * 3)
    for (let s = 0; s < steps; s++) {
      a += rng.float(-0.28, 0.28)
      x = clamp(x + Math.cos(a) * step, margin, width - margin)
      y = clamp(y + Math.sin(a) * step, margin, height - margin)
      poly.push([x, y])
    }
    mainRoads.push(poly)
    roads.push(poly)
  }

  // Secondary lanes branch off the main ones.
  const nBranch = preset === 'city' ? 5 : 2
  for (let b = 0; b < nBranch; b++) {
    const road = mainRoads[Math.floor(rng.next() * mainRoads.length)]
    const idx = 1 + Math.floor(rng.next() * (road.length - 1))
    let [x, y] = road[idx]
    let a = rng.float(0, Math.PI * 2)
    const poly: [number, number][] = [[x, y]]
    const steps = 2 + Math.floor(rng.next() * 3)
    for (let s = 0; s < steps; s++) {
      a += rng.float(-0.3, 0.3)
      x = clamp(x + Math.cos(a) * step * 0.8, margin, width - margin)
      y = clamp(y + Math.sin(a) * step * 0.8, margin, height - margin)
      poly.push([x, y])
    }
    roads.push(poly)
  }

  // Central plaza (octagon) the named buildings cluster around.
  const pr = step * 0.6
  const plaza: [number, number][] = []
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    plaza.push([cx + Math.cos(a) * pr, cy + Math.sin(a) * pr])
  }
  plaza.push(plaza[0])

  // Building plots line both sides of every lane, set back, facing the lane.
  const setback = 34
  const pitch = 46
  const raw: { x: number; y: number; angle: number; d: number }[] = []
  for (const road of roads) {
    for (let i = 0; i < road.length - 1; i++) {
      const [x1, y1] = road[i]
      const [x2, y2] = road[i + 1]
      const segLen = Math.hypot(x2 - x1, y2 - y1)
      const dir = Math.atan2(y2 - y1, x2 - x1)
      const nx = Math.cos(dir + Math.PI / 2)
      const ny = Math.sin(dir + Math.PI / 2)
      const n = Math.max(1, Math.floor(segLen / pitch))
      for (let k = 0; k < n; k++) {
        const t = (k + 0.5) / n
        const bx = x1 + (x2 - x1) * t
        const by = y1 + (y2 - y1) * t
        for (const side of [1, -1]) {
          const sx = bx + nx * setback * side + rng.float(-6, 6)
          const sy = by + ny * setback * side + rng.float(-6, 6)
          const d = Math.hypot(sx - cx, sy - cy)
          if (d < pr + setback) continue // keep the plaza clear
          raw.push({
            x: clamp(sx, margin, width - margin),
            y: clamp(sy, margin, height - margin),
            angle: dir + rng.float(-0.1, 0.1),
            d,
          })
        }
      }
    }
  }

  // Greedy de-overlap, nearest-to-centre first so prime plots come first.
  raw.sort((p, q) => p.d - q.d)
  const minDist = pitch * 0.8
  const kept: typeof raw = []
  for (const s of raw) {
    if (kept.every((k) => Math.hypot(k.x - s.x, k.y - s.y) >= minDist)) kept.push(s)
  }

  // Fill to a town-sized count (named + filler), capped by available plots.
  const targetTotal = preset === 'city' ? 55 : 28
  const total = Math.min(kept.length, Math.max(namedCount, targetTotal))
  const slots: OrganicSlot[] = kept.slice(0, total).map((s, i) => ({
    x: s.x,
    y: s.y,
    angle: s.angle,
    filler: i >= namedCount,
  }))
  return { roads, plaza, slots }
}
