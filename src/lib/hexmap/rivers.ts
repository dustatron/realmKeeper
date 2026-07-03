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
//      EDGE cells are excluded (a source on the boundary terminates before its
//      first step, yielding a 1-hex stub); rivers flow TO the edge, not from it.
//   2. From each source, flow downhill with two refinements:
//        • MEANDER: among the strictly-lower neighbours, pick by lowest elevation
//          plus a small seeded jitter, so nearby sources diverge and wander rather
//          than tracing identical steepest-descent lines.
//        • OVERFLOW: at a local pit (no strictly-lower neighbour) the river spills
//          over the lowest surrounding lip to keep draining across flat midlands
//          and shallow saddles — bounded to a few consecutive uphill steps so it
//          crosses a saddle but never climbs a mountainside. Exceeding the bound
//          ends the river in that basin (an endorheic terminus).
//      Stop when: the next cell is water (a lake/coast cell in `waterCells`), the
//      current cell is on the MAP EDGE, or an unresolved pit is reached.
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

  // A river must FLOW TO the edge, not START on it: a source sitting on the map
  // boundary terminates (isEdge) before taking a single step, yielding a 1-hex
  // stub that renders as nothing. So exclude edge cells from source eligibility —
  // unless that would leave no candidates at all (tiny maps), where we keep them.
  const dropEdges = <T extends Axial>(list: T[]): T[] => {
    const inland = list.filter((c) => !isEdge(c))
    return inland.length > 0 ? inland : list
  }

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
  const eligible = dropEdges(usingExplicit ? explicit : elevationEligible)

  if (eligible.length === 0) {
    return { riverCells, paths, chokepoints }
  }

  // With explicit (mountain) sources, let ~40% of them spawn a river so
  // mountainous terrain reads as river country without saturating it; otherwise
  // ~1 per 40 cells. (Distinct courses merge downhill into trunks, so a fraction
  // of the mountains still yields a full drainage network — not a straw for each.)
  const defaultCount = usingExplicit
    ? Math.max(1, Math.round(eligible.length * 0.4))
    : Math.max(1, Math.round(cells.length / 40))
  const riverCount = Math.max(1, Math.min(eligible.length, opts.riverCount ?? defaultCount))
  const sources = rng.sample(eligible, riverCount)

  // Overflow lets a river spill out of a local pit over the lowest surrounding
  // lip instead of dying there — real drainage crosses shallow saddles and flat
  // midlands rather than stopping at every dimple in the terrain. Bounded so a
  // river can cross a saddle a few hexes wide but never climb a mountainside: after
  // this many consecutive uphill spill steps with no downhill relief, the river
  // ends in that basin (an endorheic terminus).
  const MAX_OVERFLOW_STEPS = 4

  for (const source of sources) {
    const path: Axial[] = []
    const visited = new Set<string>()
    let current: Axial = { q: source.q, r: source.r }
    let overflow = 0

    // Guard bounds total path length (visited-set already prevents revisits).
    for (let guard = 0; guard <= cells.length; guard++) {
      const k = key(current)
      if (visited.has(k)) break
      visited.add(k)
      path.push(current)

      // Reached the coast/edge → river ends here.
      if (isEdge(current)) break

      const here = elev(current)
      if (here === undefined) break

      // Gather all strictly-lower in-bounds neighbours (real downhill exits).
      const downhill: { cell: Axial; e: number; water: boolean }[] = []
      for (const n of hexNeighbors(current)) {
        const nk = key(n)
        if (!cellSet.has(nk)) continue
        const ne = field.get(nk)
        if (ne === undefined) continue
        if (ne < here) downhill.push({ cell: n, e: ne, water: water.has(nk) })
      }

      let next: Axial | null = null
      if (downhill.length > 0) {
        // Downhill available. MEANDER: pick among the strictly-lower neighbours by
        // lowest score with a small seeded jitter, so the course wanders and two
        // nearby sources diverge instead of tracing the same steepest-descent line.
        // Prefer stepping onto water when a watery exit is available.
        overflow = 0
        const waterExits = downhill.filter((d) => d.water)
        const pool = waterExits.length > 0 ? waterExits : downhill
        // MEANDER_JITTER (~8% of the [0,1] range) shuffles genuinely-close
        // neighbours without ever favouring an obviously-higher one.
        const MEANDER_JITTER = 0.08
        let bestScore = Infinity
        for (const d of pool) {
          const score = d.e + rng.next() * MEANDER_JITTER
          if (score < bestScore) {
            bestScore = score
            next = d.cell
          }
        }
      } else {
        // Local pit — OVERFLOW over the lowest unvisited lip to keep draining.
        if (overflow >= MAX_OVERFLOW_STEPS) break // endorheic basin — river ends
        overflow++
        let lowestE = Infinity
        for (const n of hexNeighbors(current)) {
          const nk = key(n)
          if (!cellSet.has(nk) || visited.has(nk)) continue
          const ne = field.get(nk)
          if (ne === undefined) continue
          if (ne < lowestE) {
            lowestE = ne
            next = n
          }
        }
      }

      if (!next) break
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
