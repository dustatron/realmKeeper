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

  it('returns no candidates for invalid input', () => {
    expect(extractTownBuildings({ nope: true }, { width: 100, height: 100 })).toEqual([])
  })
})
