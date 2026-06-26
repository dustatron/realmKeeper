import { SeededRandom } from '~/lib/dungeon/SeededRandom'

/**
 * A building slot fronting a street: a center point plus the angle the building
 * faces (aligned to the street it sits on).
 */
export interface BuildingSlot {
  x: number
  y: number
  angle: number
}

export interface StreetLayout {
  /** Street centerlines, as polylines in pixel space. */
  streets: [number, number][][]
  /** One slot per requested building, in fill order (main street first). */
  slots: BuildingSlot[]
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

/**
 * Lay out a small town as a main street with optional cross streets, and place
 * `count` building slots fronting those streets on both sides. Buildings line
 * the roads instead of each wiring to a center — the road comes first, the
 * buildings sit on it. Deterministic for a given seed.
 */
export function streetLayout(
  count: number,
  width: number,
  height: number,
  seed: string,
): StreetLayout {
  const streets: [number, number][][] = []
  const slots: BuildingSlot[] = []
  if (count <= 0) return { streets, slots }

  const rng = new SeededRandom(seed)
  const m = Math.min(width, height) * 0.12
  const pitch = 100 // spacing between buildings along a street
  const setback = 50 // perpendicular distance from street centerline to building center
  const lead = pitch * 0.7 // road lead-in/out past the last building
  const yMain = height * 0.5
  const raw: BuildingSlot[] = []

  // Main horizontal road: centered, sized to the buildings it carries (plus a
  // lead-in/out so the road enters and leaves town rather than dead-ending).
  const maxCols = Math.max(1, Math.floor((width - 2 * m) / pitch))
  const mainCols = Math.min(Math.ceil(count / 2), maxCols)
  const span = (mainCols - 1) * pitch
  const startX = (width - span) / 2
  streets.push([[startX - lead, yMain], [startX + span + lead, yMain]])
  for (let c = 0; c < mainCols; c++) {
    const x = startX + c * pitch
    raw.push({ x, y: yMain - setback, angle: 0 })
    raw.push({ x, y: yMain + setback, angle: 0 })
  }

  // Cross streets for overflow, aligned to main-road columns so they form a grid
  // of streets rather than floating lines.
  const extra = Math.max(0, count - raw.length)
  if (extra > 0) {
    const nCross = Math.min(mainCols, Math.ceil(extra / 6))
    for (let k = 0; k < nCross; k++) {
      const colIdx = Math.round(((k + 1) * (mainCols - 1)) / (nCross + 1))
      const xC = startX + colIdx * pitch
      streets.push([[xC, m], [xC, height - m]])
      for (let y = m + pitch / 2; y <= height - m; y += pitch) {
        if (Math.abs(y - yMain) < pitch * 1.2) continue // keep clear of the main-road intersection
        raw.push({ x: xC - setback, y, angle: Math.PI / 2 })
        raw.push({ x: xC + setback, y, angle: Math.PI / 2 })
      }
    }
  }

  // Take the first `count` slots, with gentle deterministic jitter so frontage
  // reads as irregular rather than a clean ruler line.
  for (let i = 0; i < count && i < raw.length; i++) {
    const sl = raw[i]
    slots.push({
      x: clamp(sl.x + rng.float(-pitch * 0.12, pitch * 0.12), m, width - m),
      y: clamp(sl.y + rng.float(-8, 8), m, height - m),
      angle: sl.angle + rng.float(-0.08, 0.08),
    })
  }
  return { streets, slots }
}
