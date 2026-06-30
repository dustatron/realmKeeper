import type { HexCell } from '@domain/entities/GameMap'
import type { POI } from '@domain/entities/POI'
import type { Connection } from '@domain/entities/Connection'

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

/**
 * Blue overlay polygons for river cells. Mirrors MapViewer's biome-fill
 * geometry: map each corner through `toLngLat` and close the ring.
 */
export function buildRiverGeoJSON(
  hexCells: HexCell[],
  toLngLat: PxToLngLat,
): GeoJSON.FeatureCollection {
  const features = hexCells
    .filter((cell) => cell.river === true)
    .map((cell) => ({
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'Polygon' as const,
        coordinates: [
          [
            ...cell.corners.map((c) => toLngLat(c.x, c.y)),
            toLngLat(cell.corners[0].x, cell.corners[0].y),
          ],
        ],
      },
    }))
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
      return [
        {
          type: 'Feature' as const,
          properties: {},
          geometry: {
            type: 'LineString' as const,
            coordinates: [
              toLngLat(from.position.x, from.position.y),
              toLngLat(to.position.x, to.position.y),
            ],
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
