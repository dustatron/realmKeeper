import type { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { hexDistance, type Axial } from '~/lib/hexmap/hex'
import type { Biome } from '~/domain/data/worldgen/biomes'

// ─────────────────────────────────────────────────────────────────────────────
// Deterministic elevation field over a set of hex cells.
//
// PURE + SEEDED. No Dexie, no Date.now/Math.random. Same `cells` + same `rng`
// state → identical output. The caller owns the rng, so threading the SAME rng
// here keeps the whole worldgen pipeline reproducible.
//
// Model: seeded value-noise. We scatter a handful of "control points" with random
// target heights, then every cell's elevation is the inverse-distance-weighted
// blend of those control points. This yields smooth gradients (no per-cell hash
// hash noise), with highlands clustering near high control points and lowlands
// near low ones — exactly the shape rivers (rivers.ts) want to flow down.
//
// Contract:
//   • Returns a Map keyed by `${q},${r}` for EVERY input cell.
//   • Every value is in [0,1] (inclusive), normalised across the field so the
//     lowest cell is ~0 and the highest ~1 (a single-cell field returns 0.5).
//   • Deterministic for a given rng sequence.
// ─────────────────────────────────────────────────────────────────────────────

export interface ElevationOptions {
  /**
   * Number of noise control points. Defaults to a size-scaled count
   * (~sqrt(cells)/2, clamped to [3, 12]). More points → busier terrain.
   */
  controlPoints?: number
  /**
   * Per-cell biome, keyed `${q},${r}`. When provided, the field is BIASED so
   * elevation follows terrain — mountains high, water/marsh low — instead of
   * being random noise decoupled from biome. This is what lets rivers (rivers.ts)
   * reliably originate on mountains and flow downhill to lowlands: without it, a
   * mountain-biome cell often lands in an elevation pit and its river is a 1-hex
   * stub. Cells absent from the map, or biomes absent from BIOME_BASE_HEIGHT, use
   * the neutral midland base.
   */
  biomes?: ReadonlyMap<string, Biome>
}

// Target height per biome (0 = basin, 1 = peak). Ordered so highlands out-rank
// lowlands; the smooth noise below adds intra-biome variation for flow gradients.
const BIOME_BASE_HEIGHT: Record<Biome, number> = {
  mountains: 1.0,
  hills: 0.72,
  frozen: 0.6,
  forest: 0.5,
  jungle: 0.46,
  blighted: 0.44,
  grasslands: 0.42,
  desert: 0.4,
  marsh: 0.18,
  lake: 0.0,
}
const NEUTRAL_BASE_HEIGHT = 0.45

// How strongly biome pulls elevation vs the smooth noise. Kept moderate: the
// smooth noise must stay the dominant gradient (rivers need slope to flow, and a
// uniform-biome map would otherwise flatten into a rainless plateau), while biome
// still lifts mountains above lowlands so highlands read as source country.
const BIOME_WEIGHT = 0.4

const cellKey = (c: Axial): string => `${c.q},${c.r}`

export function buildElevationField(
  cells: readonly Axial[],
  rng: SeededRandom,
  opts: ElevationOptions = {},
): Map<string, number> {
  const field = new Map<string, number>()
  if (cells.length === 0) return field
  if (cells.length === 1) {
    field.set(cellKey(cells[0]), 0.5)
    return field
  }

  const pointCount = Math.max(
    3,
    Math.min(12, opts.controlPoints ?? Math.round(Math.sqrt(cells.length) / 2)),
  )

  // Scatter control points on DISTINCT cells (sample-without-replacement), each
  // with a random target height. Sampling cells (not free coordinates) keeps the
  // influence anchored to the actual map and avoids points landing off-grid.
  const anchors = rng
    .sample(cells as Axial[], Math.min(pointCount, cells.length))
    .map((cell) => ({ q: cell.q, r: cell.r, height: rng.next() }))

  // Inverse-distance-weighted blend. A small epsilon avoids divide-by-zero when a
  // cell IS an anchor (distance 0) — it then dominates the blend, as intended.
  const POWER = 2
  const EPS = 0.5
  const biomes = opts.biomes
  const raw: { key: string; value: number }[] = []
  let min = Infinity
  let max = -Infinity
  for (const cell of cells) {
    let weightSum = 0
    let valueSum = 0
    for (const a of anchors) {
      const d = hexDistance(cell, a)
      const w = 1 / Math.pow(d + EPS, POWER)
      weightSum += w
      valueSum += w * a.height
    }
    const smooth = valueSum / weightSum
    const key = cellKey(cell)
    // Bias toward the biome's base height when biomes are supplied, so terrain
    // and elevation agree; otherwise the smooth noise stands alone.
    let value = smooth
    if (biomes) {
      const biome = biomes.get(key)
      const base = biome ? BIOME_BASE_HEIGHT[biome] ?? NEUTRAL_BASE_HEIGHT : NEUTRAL_BASE_HEIGHT
      value = smooth * (1 - BIOME_WEIGHT) + base * BIOME_WEIGHT
    }
    if (value < min) min = value
    if (value > max) max = value
    raw.push({ key, value })
  }

  // Normalise to [0,1] so the field always spans the full range regardless of how
  // the random anchor heights happened to cluster. Flat field (max===min) → 0.5.
  const span = max - min
  for (const { key, value } of raw) {
    field.set(key, span > 0 ? (value - min) / span : 0.5)
  }
  return field
}

// ─────────────────────────────────────────────────────────────────────────────
// Advisory biome refinement from elevation.
//
// `regionBiome`, when provided, is AUTHORITATIVE — it is returned unchanged. Only
// when it is absent does elevation alone suggest a biome. This keeps the function
// composable: a later integration step decides whether to consult elevation, and
// this never overrides a deliberate region assignment.
//
// Suggestion bands (when no regionBiome):
//   ≥ 0.80 → mountains   (highlands)
//   ≥ 0.55 → hills       (uplands)
//   ≥ 0.25 → grasslands  (midlands; neutral default)
//   ≥ 0.10 → marsh       (lowlands)
//   <  0.10 → lake        (basins / water)
// ─────────────────────────────────────────────────────────────────────────────

export function biomeFromElevation(elevation: number, regionBiome?: Biome): Biome {
  if (regionBiome !== undefined) return regionBiome
  if (elevation >= 0.8) return 'mountains'
  if (elevation >= 0.55) return 'hills'
  if (elevation >= 0.25) return 'grasslands'
  if (elevation >= 0.1) return 'marsh'
  return 'lake'
}
