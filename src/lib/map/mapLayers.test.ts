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
  it('emits one closed polygon per river cell, none for others', () => {
    const cells = [hex({ river: true }), hex({ river: false }), hex({})]
    const fc = buildRiverGeoJSON(cells, toLngLat)
    expect(fc.type).toBe('FeatureCollection')
    expect(fc.features).toHaveLength(1)
    const geom = fc.features[0].geometry as GeoJSON.Polygon
    expect(geom.type).toBe('Polygon')
    // 4 corners + closing point.
    expect(geom.coordinates[0]).toHaveLength(5)
    expect(geom.coordinates[0][0]).toEqual(geom.coordinates[0][4])
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
    expect(line.coordinates).toEqual([
      [0, 0],
      [5, 5],
    ])
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
