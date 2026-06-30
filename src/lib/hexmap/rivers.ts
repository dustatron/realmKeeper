import type { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { hexNeighbors, type Axial } from '~/lib/hexmap/hex'

// ─────────────────────────────────────────────────────────────────────────────
// Deterministic river tracing over an elevation field (see elevation.ts).
//
// PURE + SEEDED. No Dexie, no Date.now/Math.random. Same `field` + `cells` + same
// `rng` state → identical output.
//
// Algorithm:
//   1. Pick highland SOURCES — the highest-elevation cells, sampled with the rng.
//   2. From each source, flow downhill: at each step move to the lowest in-bounds
//      neighbour whose elevation is STRICTLY LESS than the current cell's. The
//      path is therefore strictly DECREASING in elevation (never increasing, and
//      never flat — a flat step would risk a loop). Stop when:
//        • the next cell is water (a lake / coast cell in `waterCells`), OR
//        • the current cell is on the MAP EDGE (a cell with a missing neighbour),
//          OR
//        • no strictly-lower neighbour exists (a local pit — terminates there).
//   3. Collect every cell touched by any river into `riverCells`.
//   4. Derive CHOKEPOINTS: river/river crossings (ford or bridge) and low gaps
//      between higher ground that a river threads through (pass).
//
// "Coast" handling: callers may pass explicit `waterCells` (e.g. lake cells from
// generateWorld). If omitted, the lowest cells of the field are NOT auto-flooded;
// rivers then terminate at map edges or local pits. The map edge is detected
// structurally (a cell that lacks one of its 6 neighbours in `cells`).
// ─────────────────────────────────────────────────────────────────────────────

export interface TraceRiversOptions {
  /**
   * Cells that count as water (lake/coast) — a river terminates upon reaching
   * one. Keyed by `${q},${r}`. Optional.
   */
  waterCells?: ReadonlySet<string>
  /**
   * Fraction of cells eligible as highland sources, taken from the TOP of the
   * elevation range. Default 0.2 (top 20%).
   */
  sourceFraction?: number
  /**
   * How many rivers to trace. Default: ~1 per 40 cells, clamped to
   * [1, eligible-source-count].
   */
  riverCount?: number
  /** Min source elevation. Sources below this are never chosen. Default 0.6. */
  minSourceElevation?: number
  /**
   * Explicit source cells (e.g. mountain-terrain hexes). When provided and
   * non-empty, rivers are traced downhill FROM these instead of the elevation-
   * derived highland set — so mountains reliably have rivers coming off them.
   */
  sources?: readonly Axial[]
}

export type ChokepointKind = 'ford' | 'pass' | 'bridge'

export interface Chokepoint {
  q: number
  r: number
  kind: ChokepointKind
}

export interface TraceRiversResult {
  /** Every cell any river passes through, keyed `${q},${r}`. */
  riverCells: Set<string>
  /** One ordered cell list per traced river (source → terminus). */
  paths: Axial[][]
  chokepoints: Chokepoint[]
}

const key = (c: Axial): string => `${c.q},${c.r}`

export function traceRivers(
  field: ReadonlyMap<string, number>,
  cells: readonly Axial[],
  rng: SeededRandom,
  opts: TraceRiversOptions = {},
): TraceRiversResult {
  const riverCells = new Set<string>()
  const paths: Axial[][] = []
  const chokepoints: Chokepoint[] = []
  if (cells.length === 0) {
    return { riverCells, paths, chokepoints }
  }

  const water = opts.waterCells ?? new Set<string>()
  const minSourceElevation = opts.minSourceElevation ?? 0.6
  const sourceFraction = opts.sourceFraction ?? 0.2

  // Fast cell lookup + elevation accessor (cells missing from the field are
  // treated as out-of-bounds / non-existent).
  const cellSet = new Set(cells.map(key))
  const elev = (c: Axial): number | undefined => field.get(key(c))

  // A cell is on the map edge if any of its 6 neighbours is absent from `cells`.
  const isEdge = (c: Axial): boolean =>
    hexNeighbors(c).some((n) => !cellSet.has(key(n)))

  // Explicit sources (e.g. mountain cells) take priority — rivers come off them.
  // Validate they're on the map and not water.
  const explicit = (opts.sources ?? []).filter(
    (c) => cellSet.has(key(c)) && !water.has(key(c)) && elev(c) !== undefined,
  )

  // Otherwise: candidate sources = highest-elevation land cells above the floor.
  const sorted = cells
    .filter((c) => !water.has(key(c)) && elev(c) !== undefined)
    .map((c) => ({ c, e: elev(c) as number }))
    .sort((a, b) => b.e - a.e)
  const topCount = Math.max(1, Math.round(sorted.length * sourceFraction))
  const elevationEligible = sorted
    .slice(0, topCount)
    .filter((s) => s.e >= minSourceElevation)
    .map((s) => s.c)

  const usingExplicit = explicit.length > 0
  const eligible = usingExplicit ? explicit : elevationEligible

  if (eligible.length === 0) {
    return { riverCells, paths, chokepoints }
  }

  // With explicit (mountain) sources, let about half of them spawn a river so
  // mountainous terrain reads as river country; otherwise ~1 per 40 cells.
  const defaultCount = usingExplicit
    ? Math.max(1, Math.round(eligible.length / 2))
    : Math.max(1, Math.round(cells.length / 40))
  const riverCount = Math.max(1, Math.min(eligible.length, opts.riverCount ?? defaultCount))
  const sources = rng.sample(eligible, riverCount)

  for (const source of sources) {
    const path: Axial[] = []
    const visited = new Set<string>()
    let current: Axial = { q: source.q, r: source.r }

    // Guard against pathological cycles (cannot happen with strictly-decreasing
    // steps, but the bound keeps us safe regardless).
    for (let guard = 0; guard <= cells.length; guard++) {
      const k = key(current)
      if (visited.has(k)) break
      visited.add(k)
      path.push(current)

      // Reached the coast/edge → river ends here.
      if (isEdge(current)) break

      const here = elev(current)
      if (here === undefined) break

      // Lowest strictly-lower in-bounds neighbour. If that neighbour is water,
      // we step onto it (terminus) and stop.
      let next: Axial | null = null
      let nextE = here
      for (const n of hexNeighbors(current)) {
        const nk = key(n)
        if (!cellSet.has(nk)) continue
        const ne = field.get(nk)
        if (ne === undefined) continue
        if (ne < nextE) {
          nextE = ne
          next = n
        }
      }

      if (!next) break // local pit — no downhill exit
      if (water.has(key(next))) {
        path.push(next)
        break
      }
      current = next
    }

    if (path.length === 0) continue
    paths.push(path)
    for (const c of path) riverCells.add(key(c))
  }

  // ── Chokepoints ────────────────────────────────────────────────────────────
  // FORD/BRIDGE: a cell where two or more distinct rivers meet (a crossing). The
  // higher the crossing, the more likely it's a bridged gorge vs a wadeable ford.
  // PASS: a low cell flanked by higher ground on opposite-ish sides that a river
  // threads — a natural gap.
  const riverMembership = new Map<string, number>() // cell key → #rivers touching
  for (const path of paths) {
    const seenThisRiver = new Set<string>()
    for (const c of path) {
      const k = key(c)
      if (seenThisRiver.has(k)) continue
      seenThisRiver.add(k)
      riverMembership.set(k, (riverMembership.get(k) ?? 0) + 1)
    }
  }

  const chokeSeen = new Set<string>()
  // Crossings (ford/bridge).
  for (const [k, count] of riverMembership) {
    if (count < 2) continue
    const e = field.get(k)
    if (e === undefined) continue
    const [q, r] = k.split(',').map(Number)
    chokepoints.push({ q, r, kind: e >= 0.5 ? 'bridge' : 'ford' })
    chokeSeen.add(k)
  }

  // Passes: a river cell that is a low gap between higher neighbours. Detected as
  // a river cell with at least two non-river neighbours that are BOTH higher than
  // it — i.e. the river squeezes through a saddle.
  for (const path of paths) {
    for (const c of path) {
      const k = key(c)
      if (chokeSeen.has(k)) continue
      const here = field.get(k)
      if (here === undefined) continue
      let higherFlanks = 0
      for (const n of hexNeighbors(c)) {
        const nk = key(n)
        if (!cellSet.has(nk)) continue
        if (riverCells.has(nk)) continue
        const ne = field.get(nk)
        if (ne !== undefined && ne > here) higherFlanks++
      }
      if (higherFlanks >= 2) {
        chokepoints.push({ q: c.q, r: c.r, kind: 'pass' })
        chokeSeen.add(k)
      }
    }
  }

  return { riverCells, paths, chokepoints }
}
