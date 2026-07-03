import type { HexCell } from '@domain/entities/GameMap'
import type { POI } from '@domain/entities/POI'
import type { Connection } from '@domain/entities/Connection'
import type { Path } from '@domain/entities/Path'
import { hexNeighbors } from '~/lib/hexmap/hex'

/**
 * Converts map pixel coordinates to [lng, lat]. Injected by the caller
 * (MapViewer) so these builders stay pure — no maplibre, no DOM.
 */
export type PxToLngLat = (x: number, y: number) => [number, number]

/** Centroid of a hex cell = average of its corner points. */
function cellCentroid(cell: HexCell): { x: number; y: number } {
  const n = cell.corners.length
  const sum = cell.corners.reduce(
    (acc, c) => ({ x: acc.x + c.x, y: acc.y + c.y }),
    { x: 0, y: 0 },
  )
  return { x: sum.x / n, y: sum.y / n }
}

type Pt = { x: number; y: number }

/** Midpoint of the edge two adjacent hex cells share (their two common corners). */
function sharedEdgeMidpoint(a: HexCell, b: HexCell): Pt | null {
  const rk = (p: Pt) => `${Math.round(p.x)},${Math.round(p.y)}`
  const bKeys = new Map(b.corners.map((c) => [rk(c), c]))
  const shared = a.corners.filter((c) => bKeys.has(rk(c)))
  if (shared.length < 2) return null
  return { x: (shared[0].x + shared[1].x) / 2, y: (shared[0].y + shared[1].y) / 2 }
}

/**
 * A wavy polyline between two points: subdivides the segment and offsets each
 * interior sample perpendicular to the line by a sine wave, so the river reads
 * as meandering water rather than a ruler-straight road. Amplitude scales with
 * the segment length. Endpoints are preserved exactly so segments join cleanly.
 */
function wavy(p: Pt, q: Pt, segments = 10, waves = 2, ampFrac = 0.16): Pt[] {
  const dx = q.x - p.x
  const dy = q.y - p.y
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len // unit perpendicular
  const ny = dx / len
  const amp = len * ampFrac
  const out: Pt[] = []
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    // `waves` is an INTEGER number of half-periods (sin(t·π·waves)); both ends
    // land at offset 0 so consecutive segments meet exactly — no gaps.
    const off = Math.sin(t * Math.PI * waves) * amp
    out.push({ x: p.x + dx * t + nx * off, y: p.y + dy * t + ny * off })
  }
  // Pin the exact endpoints to kill any float drift, guaranteeing joins.
  out[0] = { x: p.x, y: p.y }
  out[out.length - 1] = { x: q.x, y: q.y }
  return out
}

// Deterministic pseudo-random in [0,1) from a coordinate pair — varies the wave
// per segment so the river feels organic instead of a uniform ripple.
function hash01(a: number, b: number): number {
  const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453
  return s - Math.floor(s)
}

// A gently wavy segment whose amplitude/wave-count vary by location, so the
// river meanders organically without looking like a tangle of springs.
function wavyVaried(p: Pt, q: Pt): Pt[] {
  const h = hash01(p.x + q.x, p.y + q.y)
  const ampFrac = 0.04 + h * 0.05 // ~0.04..0.09 (subtle)
  const waves = 2 + Math.floor(h * 2) // integer half-periods (2 or 3) → ends land at 0
  return wavy(p, q, 10, waves, ampFrac)
}

/**
 * Rivers drawn as wavy LINES that run through the GAPS BETWEEN hexes — the water
 * sits on the borders, not through cell centres, and never paints over
 * settlement/landmark tile doodles (unlike a hex fill).
 *
 * FLOW-ACCURATE when cells carry `riverTo` (the downstream successor): each cell
 * connects only along real flow edges — one line in from each upstream tributary,
 * one line out to the downstream cell, meeting at the centre. Tributaries merge
 * into trunks and confluences read as Y-junctions, so a dense drainage network no
 * longer collapses into a lattice of every-adjacent-pair joins.
 *
 * LEGACY FALLBACK: older generated maps flag `river` but lack `riverTo`. For
 * those we fall back to geometric adjacency (link every river neighbour) so their
 * rivers still render.
 */
export function buildRiverGeoJSON(
  hexCells: HexCell[],
  toLngLat: PxToLngLat,
): GeoJSON.FeatureCollection {
  const riverCells = hexCells.filter((cell) => cell.river === true)
  const byCoord = new Map(hexCells.map((c) => [`${c.q},${c.r}`, c]))
  const features: GeoJSON.Feature[] = []
  const addLine = (pts: Pt[]) => {
    if (pts.length < 2) return
    features.push({
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: pts.map((p) => toLngLat(p.x, p.y)) },
    })
  }

  const hasFlow = riverCells.some((c) => c.riverTo != null)

  if (!hasFlow) {
    // ── Legacy geometric adjacency (maps generated before `riverTo`). ──────────
    for (const cell of riverCells) {
      const center = cellCentroid(cell)
      const mids: Pt[] = []
      for (const n of hexNeighbors({ q: cell.q, r: cell.r })) {
        const nb = byCoord.get(`${n.q},${n.r}`)
        if (!nb || nb.river !== true) continue
        const m = sharedEdgeMidpoint(cell, nb)
        if (m) mids.push(m)
      }
      if (mids.length === 0) continue
      if (mids.length === 1) {
        addLine(wavyVaried(mids[0], center))
      } else if (mids.length === 2) {
        addLine([...wavyVaried(mids[0], center), ...wavyVaried(center, mids[1]).slice(1)])
      } else {
        for (const m of mids) addLine(wavyVaried(m, center))
      }
    }
    return { type: 'FeatureCollection', features }
  }

  // ── Flow-accurate: connect only along real upstream→downstream edges. ────────
  // Reverse index: cell key → the cells that flow INTO it.
  const upstream = new Map<string, HexCell[]>()
  for (const cell of riverCells) {
    if (!cell.riverTo) continue
    const dk = `${cell.riverTo.q},${cell.riverTo.r}`
    const arr = upstream.get(dk)
    if (arr) arr.push(cell)
    else upstream.set(dk, [cell])
  }

  for (const cell of riverCells) {
    const center = cellCentroid(cell)

    // Border midpoints of the tributaries flowing into this cell.
    const inMids: Pt[] = []
    for (const up of upstream.get(`${cell.q},${cell.r}`) ?? []) {
      const m = sharedEdgeMidpoint(cell, up)
      if (m) inMids.push(m)
    }

    // Border midpoint of the edge this cell drains out through.
    let outMid: Pt | null = null
    if (cell.riverTo) {
      const down = byCoord.get(`${cell.riverTo.q},${cell.riverTo.r}`)
      if (down) outMid = sharedEdgeMidpoint(cell, down)
    }

    if (outMid && inMids.length === 0) {
      // Source: centre → outgoing border.
      addLine(wavyVaried(center, outMid))
    } else if (outMid) {
      // Through-flow / confluence: the main tributary runs border → centre →
      // outgoing border; any extra tributaries dip in to meet at the centre.
      addLine([...wavyVaried(inMids[0], center), ...wavyVaried(center, outMid).slice(1)])
      for (let i = 1; i < inMids.length; i++) addLine(wavyVaried(inMids[i], center))
    } else {
      // Terminus (map edge / lake): tributaries meet at the centre.
      for (const m of inMids) addLine(wavyVaried(m, center))
    }
  }
  return { type: 'FeatureCollection', features }
}

/**
 * Point features for chokepoints, tagged `{ kind }` (ford/pass/bridge),
 * placed at the cell centroid.
 */
export function buildChokepointGeoJSON(
  hexCells: HexCell[],
  toLngLat: PxToLngLat,
): GeoJSON.FeatureCollection {
  const features = hexCells
    .filter((cell) => cell.chokepoint != null)
    .map((cell) => {
      const c = cellCentroid(cell)
      return {
        type: 'Feature' as const,
        properties: { kind: cell.chokepoint as string },
        geometry: {
          type: 'Point' as const,
          coordinates: toLngLat(c.x, c.y),
        },
      }
    })
  return { type: 'FeatureCollection', features }
}

/**
 * Shortest road path (by travel watches) between two POIs over the road graph.
 * Returns the ordered POI-id chain (inclusive of both ends), or null if the two
 * aren't road-connected. Dijkstra — the graphs here are small (tens of nodes).
 */
function roadPath(src: string, dst: string, paths: Path[]): string[] | null {
  if (src === dst) return [src]
  const adj = new Map<string, { to: string; w: number }[]>()
  const link = (a: string, b: string, w: number) => {
    const arr = adj.get(a)
    if (arr) arr.push({ to: b, w })
    else adj.set(a, [{ to: b, w }])
  }
  for (const p of paths) {
    const w = Math.max(1, p.baseTravelWatches)
    link(p.fromPoiId, p.toPoiId, w)
    link(p.toPoiId, p.fromPoiId, w)
  }
  if (!adj.has(src) || !adj.has(dst)) return null

  const dist = new Map<string, number>([[src, 0]])
  const prev = new Map<string, string>()
  const visited = new Set<string>()
  // Small-graph Dijkstra: linear scan for the nearest unvisited node.
  while (true) {
    let cur: string | null = null
    let best = Infinity
    for (const [node, d] of dist) {
      if (!visited.has(node) && d < best) {
        best = d
        cur = node
      }
    }
    if (cur === null) break
    if (cur === dst) break
    visited.add(cur)
    for (const { to, w } of adj.get(cur) ?? []) {
      if (visited.has(to)) continue
      const nd = best + w
      if (nd < (dist.get(to) ?? Infinity)) {
        dist.set(to, nd)
        prev.set(to, cur)
      }
    }
  }
  if (!dist.has(dst)) return null
  const chain: string[] = [dst]
  let node = dst
  while (node !== src) {
    const p = prev.get(node)
    if (p === undefined) return null
    chain.push(p)
    node = p
  }
  chain.reverse()
  return chain
}

/**
 * Line features for each `'supplies'` trade connection, drawn ALONG the road
 * network: the route follows the shortest road chain from supplier to consumer
 * (goods travel the roads, not a straight cross-map diagonal), so it overlays
 * the road layer exactly and reads as a highlighted goods-carrying route. Falls
 * back to a straight line only when the pair isn't road-connected (e.g. river-
 * only links). Skips a connection if an endpoint id/position is missing.
 */
export function buildTradeRouteGeoJSON(
  connections: Connection[],
  poiById: Map<string, POI>,
  toLngLat: PxToLngLat,
  paths: Path[] = [],
): GeoJSON.FeatureCollection {
  const features = connections
    .filter((conn) => conn.kind === 'supplies')
    .flatMap((conn) => {
      const from = poiById.get(conn.fromId)
      const to = poiById.get(conn.toId)
      if (!from?.position || !to?.position) return []

      // Prefer the road chain so trade hugs the actual roads; straight fallback.
      const chain = roadPath(conn.fromId, conn.toId, paths)
      let coords: [number, number][]
      if (chain && chain.length >= 2) {
        const waypoints = chain
          .map((id) => poiById.get(id)?.position)
          .filter((p): p is NonNullable<typeof p> => p != null)
        coords = waypoints.map((p) => toLngLat(p.x, p.y))
      } else {
        coords = [toLngLat(from.position.x, from.position.y), toLngLat(to.position.x, to.position.y)]
      }
      if (coords.length < 2) return []
      return [
        {
          type: 'Feature' as const,
          properties: {},
          geometry: { type: 'LineString' as const, coordinates: coords },
        },
      ]
    })
  return { type: 'FeatureCollection', features }
}

/**
 * Point features for overworld POIs (`parentPoiId == null`) that hold loot —
 * non-empty `treasure` OR `magicItemRefs`. Props: `{ name, count }`.
 */
export function buildTreasureGeoJSON(
  pois: POI[],
  toLngLat: PxToLngLat,
): GeoJSON.FeatureCollection {
  const features = pois
    .filter((poi) => poi.parentPoiId == null && poi.position != null)
    .flatMap((poi) => {
      const count = poi.treasure.length + poi.magicItemRefs.length
      if (count === 0) return []
      return [
        {
          type: 'Feature' as const,
          properties: { name: poi.name, count },
          geometry: {
            type: 'Point' as const,
            coordinates: toLngLat(poi.position!.x, poi.position!.y),
          },
        },
      ]
    })
  return { type: 'FeatureCollection', features }
}

/**
 * Point features for settlements/natural sites that produce a good
 * (`trade.produces`). Props: `{ produces, icon }`.
 */
export function buildResourceIconGeoJSON(
  pois: POI[],
  toLngLat: PxToLngLat,
): GeoJSON.FeatureCollection {
  const features = pois
    .filter((poi) => poi.position != null && poi.trade?.produces)
    .map((poi) => ({
      type: 'Feature' as const,
      properties: {
        produces: poi.trade!.produces,
        icon: resourceIconFor(poi.trade!.produces),
      },
      geometry: {
        type: 'Point' as const,
        coordinates: toLngLat(poi.position!.x, poi.position!.y),
      },
    }))
  return { type: 'FeatureCollection', features }
}

/** Maps a produced good to an icon key. Falls back to a generic icon. */
export function resourceIconFor(produces: string): string {
  return `resource-${produces.toLowerCase().replace(/\s+/g, '-')}`
}

/** 5-stop wealth-band color ramp; null/unknown bands fall back to neutral grey. */
export function wealthBandColor(band: string | null): string {
  switch (band) {
    case 'destitute':
      return '#7f1d1d' // deep red
    case 'poor':
      return '#c2410c' // orange
    case 'modest':
      return '#ca8a04' // amber
    case 'prosperous':
      return '#65a30d' // lime
    case 'rich':
      return '#15803d' // green
    default:
      return '#9ca3af' // neutral grey
  }
}
