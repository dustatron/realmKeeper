import { describe, expect, it } from 'vitest'
import greenfair from './city/sm/greenfair.json'
import blackvale from './city/md/blackvale.json'
import bluevale from './city/larg/bluevale.json'
import { extractTownBuildings } from './townMapGeometry'

describe('extractTownBuildings', () => {
  it('extracts buildings from a small bundled town', () => {
    const buildings = extractTownBuildings(greenfair, { width: 2118, height: 1985 })

    expect(buildings.length).toBeGreaterThan(100)
    expect(buildings[0].area).toBeGreaterThanOrEqual(buildings[1].area)
  })

  it.each([
    ['small', greenfair, { width: 2118, height: 1985 }],
    ['medium', blackvale, { width: 1404, height: 1534 }],
    ['large', bluevale, { width: 1193, height: 1305 }],
  ] as const)('keeps %s town centroids inside the image bounds', (_label, json, size) => {
    const buildings = extractTownBuildings(json, size)

    expect(buildings.length).toBeGreaterThan(0)
    for (const building of buildings) {
      expect(building.centroid.x).toBeGreaterThanOrEqual(0)
      expect(building.centroid.x).toBeLessThanOrEqual(size.width)
      expect(building.centroid.y).toBeGreaterThanOrEqual(0)
      expect(building.centroid.y).toBeLessThanOrEqual(size.height)
      expect(building.area).toBeGreaterThan(0)
    }
  })

  it('returns a deterministic candidate list', () => {
    expect(extractTownBuildings(greenfair, { width: 2118, height: 1985 }))
      .toEqual(extractTownBuildings(greenfair, { width: 2118, height: 1985 }))
  })

  it('places candidates inside building polygons instead of polygon holes', () => {
    const buildings = extractTownBuildings({
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', id: 'values', generator: 'mfcg' },
        {
          type: 'Polygon',
          id: 'earth',
          coordinates: [[[0, 0], [100, 0], [100, 100], [0, 100]]],
        },
        {
          type: 'MultiPolygon',
          id: 'buildings',
          coordinates: [[
            [[10, 10], [90, 10], [90, 90], [10, 90]],
            [[35, 35], [35, 65], [65, 65], [65, 35]],
          ]],
        },
      ],
    }, { width: 100, height: 100 })

    expect(buildings).toHaveLength(1)
    expect(buildings[0].centroid.x > 35 && buildings[0].centroid.x < 65).toBe(false)
    expect(buildings[0].centroid.y > 35 && buildings[0].centroid.y < 65).toBe(false)
  })

  it('ignores district polygons because they can cover streets and plazas', () => {
    const buildings = extractTownBuildings({
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', id: 'values', generator: 'mfcg' },
        {
          type: 'Polygon',
          id: 'earth',
          coordinates: [[[0, 0], [100, 0], [100, 100], [0, 100]]],
        },
        {
          type: 'GeometryCollection',
          id: 'districts',
          geometries: [
            {
              type: 'Polygon',
              coordinates: [[[10, 10], [30, 10], [30, 30], [10, 30]]],
            },
          ],
        },
      ],
    }, { width: 100, height: 100 })

    expect(buildings).toEqual([])
  })

  it('returns no candidates for invalid input', () => {
    expect(extractTownBuildings({ nope: true }, { width: 100, height: 100 })).toEqual([])
  })
})
