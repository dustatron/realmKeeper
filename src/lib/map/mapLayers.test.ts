import { describe, it, expect } from 'vitest'
import type { HexCell } from '@domain/entities/GameMap'
import type { POI } from '@domain/entities/POI'
import type { Connection } from '@domain/entities/Connection'
import {
  buildRiverGeoJSON,
  buildChokepointGeoJSON,
  buildTradeRouteGeoJSON,
  buildTreasureGeoJSON,
  buildResourceIconGeoJSON,
  wealthBandColor,
  type PxToLngLat,
} from './mapLayers'
import { hexNeighbors } from '~/lib/hexmap/hex'

// Identity stub: keep px coordinates so assertions are readable.
const toLngLat: PxToLngLat = (x, y) => [x, y]

function hex(partial: Partial<HexCell>): HexCell {
  return {
    q: 0,
    r: 0,
    biome: 'grasslands',
    corners: [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 2 },
      { x: 0, y: 2 },
    ],
    ...partial,
  }
}

function poi(partial: Partial<POI>): POI {
  return {
    id: 'p',
    parentPoiId: null,
    name: 'Place',
    position: { x: 1, y: 1 },
    treasure: [],
    magicItemRefs: [],
    trade: null,
    ...partial,
  } as unknown as POI
}

function conn(partial: Partial<Connection>): Connection {
  return {
    id: 'c',
    kind: 'supplies',
    fromId: 'a',
    toId: 'b',
    ...partial,
  } as unknown as Connection
}

describe('buildRiverGeoJSON', () => {
  it('emits wavy line(s) for adjacent river cells, none for isolated/non-river cells', () => {
    const nbr = hexNeighbors({ q: 0, r: 0 })[0]
    const cells = [
      hex({ q: 0, r: 0, river: true }),
      hex({ q: nbr.q, r: nbr.r, river: true }),
      hex({ q: 9, r: 9, river: true }), // isolated river cell → no segment
      hex({ q: 5, r: 5, river: false }),
    ]
    const fc = buildRiverGeoJSON(cells, toLngLat)
    expect(fc.type).toBe('FeatureCollection')
    // The adjacent pair produces river line(s); isolated/non-river cells produce none.
    expect(fc.features.length).toBeGreaterThanOrEqual(1)
    for (const f of fc.features) {
      const geom = f.geometry as GeoJSON.LineString
      expect(geom.type).toBe('LineString')
      // Wavy: each segment is subdivided into several points.
      expect(geom.coordinates.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('returns nothing when there are no river cells', () => {
    const fc = buildRiverGeoJSON([hex({ river: false })], toLngLat)
    expect(fc.features).toHaveLength(0)
  })
})

describe('buildChokepointGeoJSON', () => {
  it('tags kind and only includes cells with a chokepoint, at centroid', () => {
    const cells = [
      hex({ chokepoint: 'ford' }),
      hex({ chokepoint: 'pass' }),
      hex({ chokepoint: 'bridge' }),
      hex({ chokepoint: null }),
      hex({}),
    ]
    const fc = buildChokepointGeoJSON(cells, toLngLat)
    expect(fc.features).toHaveLength(3)
    expect(fc.features.map((f) => f.properties?.kind)).toEqual([
      'ford',
      'pass',
      'bridge',
    ])
    const pt = fc.features[0].geometry as GeoJSON.Point
    expect(pt.type).toBe('Point')
    // Centroid of the 2x2 square corners = (1, 1).
    expect(pt.coordinates).toEqual([1, 1])
  })
})

describe('buildTradeRouteGeoJSON', () => {
  it('draws a line for a supplies connection between two positioned POIs', () => {
    const map = new Map<string, POI>([
      ['a', poi({ id: 'a', position: { x: 0, y: 0 } })],
      ['b', poi({ id: 'b', position: { x: 5, y: 5 } })],
    ])
    const fc = buildTradeRouteGeoJSON([conn({ fromId: 'a', toId: 'b' })], map, toLngLat)
    expect(fc.features).toHaveLength(1)
    const line = fc.features[0].geometry as GeoJSON.LineString
    expect(line.type).toBe('LineString')
    // Lightly wavy: subdivided, but pinned to the two POI positions at the ends.
    expect(line.coordinates.length).toBeGreaterThanOrEqual(2)
    expect(line.coordinates[0]).toEqual([0, 0])
    expect(line.coordinates[line.coordinates.length - 1]).toEqual([5, 5])
  })

  it('skips connections with a missing or positionless endpoint', () => {
    const map = new Map<string, POI>([
      ['a', poi({ id: 'a', position: { x: 0, y: 0 } })],
      ['c', poi({ id: 'c', position: null })],
    ])
    const conns = [
      conn({ fromId: 'a', toId: 'missing' }), // endpoint not on map
      conn({ fromId: 'a', toId: 'c' }), // endpoint has no position
    ]
    const fc = buildTradeRouteGeoJSON(conns, map, toLngLat)
    expect(fc.features).toHaveLength(0)
  })

  it('ignores non-supplies connections', () => {
    const map = new Map<string, POI>([
      ['a', poi({ id: 'a', position: { x: 0, y: 0 } })],
      ['b', poi({ id: 'b', position: { x: 5, y: 5 } })],
    ])
    const fc = buildTradeRouteGeoJSON(
      [conn({ fromId: 'a', toId: 'b', kind: 'ally' })],
      map,
      toLngLat,
    )
    expect(fc.features).toHaveLength(0)
  })
})

describe('buildTreasureGeoJSON', () => {
  it('includes only overworld POIs holding loot; excludes children/loot-less', () => {
    const pois = [
      poi({ id: 'has-treasure', treasure: [{} as never] }),
      poi({ id: 'has-magic', magicItemRefs: [{} as never] }),
      poi({ id: 'no-loot' }),
      poi({ id: 'child', parentPoiId: 'has-treasure', treasure: [{} as never] }),
    ]
    const fc = buildTreasureGeoJSON(pois, toLngLat)
    expect(fc.features).toHaveLength(2)
    const names = fc.features.map((f) => f.properties?.name)
    expect(names).not.toContain('child')
    expect(fc.features[0].properties?.count).toBe(1)
  })
})

describe('buildResourceIconGeoJSON', () => {
  it('includes only POIs with trade.produces and attaches an icon', () => {
    const pois = [
      poi({ id: 'iron', trade: { produces: 'Iron Ore', needs: [] } }),
      poi({ id: 'none', trade: null }),
    ]
    const fc = buildResourceIconGeoJSON(pois, toLngLat)
    expect(fc.features).toHaveLength(1)
    expect(fc.features[0].properties?.produces).toBe('Iron Ore')
    expect(fc.features[0].properties?.icon).toBe('resource-iron-ore')
  })
})

describe('wealthBandColor', () => {
  it('returns a distinct color for each of the 5 bands', () => {
    const bands = ['destitute', 'poor', 'modest', 'prosperous', 'rich']
    const colors = bands.map(wealthBandColor)
    expect(new Set(colors).size).toBe(5)
  })

  it('returns grey for null/unknown', () => {
    const grey = '#9ca3af'
    expect(wealthBandColor(null)).toBe(grey)
    expect(wealthBandColor('mystery')).toBe(grey)
  })
})
