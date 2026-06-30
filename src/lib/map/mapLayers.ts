import type { HexCell } from '@domain/entities/GameMap'
import type { POI } from '@domain/entities/POI'
import type { Connection } from '@domain/entities/Connection'
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
 * Rivers drawn as wavy LINES that run through the GAPS BETWEEN hexes — each
 * river cell links the midpoints of the edges it shares with river neighbours
 * (so the water sits on the borders, not through cell centres), with endpoints
 * dipping toward the cell centre. Lines never paint over settlement/landmark
 * tile doodles (unlike a hex fill).
 */
export function buildRiverGeoJSON(
  hexCells: HexCell[],
  toLngLat: PxToLngLat,
): GeoJSON.FeatureCollection {
  const riverCells = hexCells.filter((cell) => cell.river === true)
  const byCoord = new Map(riverCells.map((c) => [`${c.q},${c.r}`, c]))
  const features: GeoJSON.Feature[] = []
  const addLine = (pts: Pt[]) => {
    if (pts.length < 2) return
    features.push({
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates: pts.map((p) => toLngLat(p.x, p.y)) },
    })
  }

  for (const cell of riverCells) {
    const center = cellCentroid(cell)
    // Midpoints of edges shared with river neighbours.
    const mids: Pt[] = []
    for (const n of hexNeighbors({ q: cell.q, r: cell.r })) {
      const nb = byCoord.get(`${n.q},${n.r}`)
      if (!nb) continue
      const m = sharedEdgeMidpoint(cell, nb)
      if (m) mids.push(m)
    }
    if (mids.length === 0) continue
    if (mids.length === 1) {
      // River endpoint: run from the border midpoint to the cell centre.
      addLine(wavyVaried(mids[0], center))
    } else if (mids.length === 2) {
      // Through-flow: border → border across the cell.
      addLine([...wavyVaried(mids[0], center), ...wavyVaried(center, mids[1]).slice(1)])
    } else {
      // Confluence: each border midpoint meets at the centre.
      for (const m of mids) addLine(wavyVaried(m, center))
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
 * Line features connecting the two POIs of each `'supplies'` connection.
 * Skips a connection if an endpoint id isn't in `poiById` or lacks a position.
 */
export function buildTradeRouteGeoJSON(
  connections: Connection[],
  poiById: Map<string, POI>,
  toLngLat: PxToLngLat,
): GeoJSON.FeatureCollection {
  const features = connections
    .filter((conn) => conn.kind === 'supplies')
    .flatMap((conn) => {
      const from = poiById.get(conn.fromId)
      const to = poiById.get(conn.toId)
      if (!from?.position || !to?.position) return []
      // Lightly wavy — less than the rivers — so trade routes read like roads
      // with a touch of organic curve.
      const pts = wavy(
        { x: from.position.x, y: from.position.y },
        { x: to.position.x, y: to.position.y },
        8,
        2,
        0.03,
      )
      return [
        {
          type: 'Feature' as const,
          properties: {},
          geometry: {
            type: 'LineString' as const,
            coordinates: pts.map((p) => toLngLat(p.x, p.y)),
          },
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
