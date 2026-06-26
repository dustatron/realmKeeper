import { describe, expect, it } from 'vitest'
import type { POI } from '@domain/entities/POI'
import type { PoiType } from '@shared/constants'
import type { TownBuildingCandidate } from './townMapGeometry'
import { assignPoisToBuildings } from './townPoiPlacement'

function poi(overrides: Partial<POI>): POI {
  return {
    id: 'poi-1',
    name: 'POI',
    type: 'building' as PoiType,
    mapRef: null,
    position: null,
    ...overrides,
  } as POI
}

function building(id: string, area: number, x: number, y: number): TownBuildingCandidate {
  return {
    id,
    area,
    centroid: { x, y },
    bounds: { minX: x - 1, minY: y - 1, maxX: x + 1, maxY: y + 1 },
  }
}

describe('assignPoisToBuildings', () => {
  it('assigns unplaced POIs to unique building centroids', () => {
    const assignments = assignPoisToBuildings({
      mapId: 'map-1',
      imageSize: { width: 1000, height: 1000 },
      pois: [poi({ id: 'p1', name: 'A' }), poi({ id: 'p2', name: 'B' })],
      buildings: [building('b1', 100, 10, 20), building('b2', 50, 30, 40)],
    })

    expect(assignments).toEqual([
      { poiId: 'p1', position: { x: 10, y: 20 }, source: 'building', buildingId: 'b1' },
      { poiId: 'p2', position: { x: 30, y: 40 }, source: 'building', buildingId: 'b2' },
    ])
  })

  it('spreads assignments across distant buildings instead of clustering by size', () => {
    const assignments = assignPoisToBuildings({
      mapId: 'map-1',
      imageSize: { width: 1000, height: 1000 },
      pois: [
        poi({ id: 'p1', name: 'A' }),
        poi({ id: 'p2', name: 'B' }),
        poi({ id: 'p3', name: 'C' }),
      ],
      buildings: [
        building('central-large', 100, 500, 500),
        building('central-medium', 95, 510, 500),
        building('central-small', 90, 500, 510),
        building('east', 80, 900, 500),
        building('west', 75, 100, 500),
      ],
    })

    const buildingIds = assignments.map((a) => a.buildingId)
    expect(buildingIds).toEqual(expect.arrayContaining(['east', 'west']))
    expect(buildingIds.filter((id) => id?.startsWith('central'))).toHaveLength(1)
  })

  it('prefers edge buildings before central buildings for small assignment sets', () => {
    const assignments = assignPoisToBuildings({
      mapId: 'map-1',
      imageSize: { width: 1000, height: 1000 },
      pois: [
        poi({ id: 'p1', name: 'A' }),
        poi({ id: 'p2', name: 'B' }),
      ],
      buildings: [
        building('central-large', 100, 500, 500),
        building('north-west', 60, 100, 100),
        building('south-east', 50, 900, 900),
      ],
    })

    expect(assignments.map((a) => a.buildingId)).toEqual(['north-west', 'south-east'])
  })

  it('keeps existing placements out of the assignment list', () => {
    const assignments = assignPoisToBuildings({
      mapId: 'map-1',
      imageSize: { width: 1000, height: 1000 },
      pois: [
        poi({ id: 'placed-here', mapRef: 'map-1', position: { x: 1, y: 2 } }),
        poi({ id: 'placed-elsewhere', mapRef: 'map-2', position: { x: 3, y: 4 } }),
        poi({ id: 'new', name: 'New' }),
      ],
      buildings: [building('b1', 100, 10, 20)],
    })

    expect(assignments.map((a) => a.poiId)).toEqual(['new'])
  })

  it('can reassign existing placements on the same town map', () => {
    const assignments = assignPoisToBuildings({
      mapId: 'map-1',
      imageSize: { width: 1000, height: 1000 },
      reassignExistingOnMap: true,
      pois: [
        poi({ id: 'placed-here', name: 'Placed', mapRef: 'map-1', position: { x: 1, y: 2 } }),
        poi({ id: 'placed-elsewhere', name: 'Elsewhere', mapRef: 'map-2', position: { x: 3, y: 4 } }),
        poi({ id: 'new', name: 'New' }),
      ],
      buildings: [building('b1', 100, 10, 20), building('b2', 50, 30, 40)],
    })

    expect(assignments.map((a) => a.poiId)).toEqual(['new', 'placed-here'])
  })

  it('uses different building centroids when reassigning existing placements', () => {
    const assignments = assignPoisToBuildings({
      mapId: 'map-1',
      imageSize: { width: 1000, height: 1000 },
      reassignExistingOnMap: true,
      pois: [
        poi({ id: 'placed-here', mapRef: 'map-1', position: { x: 10, y: 20 } }),
      ],
      buildings: [
        building('current', 100, 10, 20),
        building('alternate', 90, 100, 120),
      ],
    })

    expect(assignments).toEqual([
      { poiId: 'placed-here', position: { x: 100, y: 120 }, source: 'building', buildingId: 'alternate' },
    ])
  })

  it('gives important POI types the largest buildings', () => {
    const assignments = assignPoisToBuildings({
      mapId: 'map-1',
      imageSize: { width: 1000, height: 1000 },
      pois: [
        poi({ id: 'shop', name: 'Shop', type: 'building' }),
        poi({ id: 'temple', name: 'Temple', type: 'shrine' }),
      ],
      buildings: [building('small', 10, 10, 10), building('large', 100, 90, 90)],
    })

    expect(assignments[0]).toMatchObject({
      poiId: 'temple',
      buildingId: 'large',
      position: { x: 90, y: 90 },
    })
  })

  it('is deterministic', () => {
    const input = {
      mapId: 'map-1',
      imageSize: { width: 1000, height: 1000 },
      pois: [poi({ id: 'b', name: 'B' }), poi({ id: 'a', name: 'A' })],
      buildings: [building('b2', 50, 30, 40), building('b1', 100, 10, 20)],
    }

    expect(assignPoisToBuildings(input)).toEqual(assignPoisToBuildings(input))
  })

  it('can choose a different spread when given a retry salt', () => {
    const input = {
      mapId: 'map-1',
      imageSize: { width: 1000, height: 1000 },
      reassignExistingOnMap: true,
      pois: [
        poi({ id: 'p1', name: 'A', mapRef: 'map-1', position: { x: 500, y: 500 } }),
        poi({ id: 'p2', name: 'B', mapRef: 'map-1', position: { x: 520, y: 520 } }),
      ],
      buildings: [
        building('north-west', 100, 100, 100),
        building('north-east', 100, 900, 100),
        building('south-east', 100, 900, 900),
        building('south-west', 100, 100, 900),
      ],
    }

    const first = assignPoisToBuildings({ ...input, placementSalt: 'retry-1' })
    const second = assignPoisToBuildings({ ...input, placementSalt: 'retry-2' })

    expect(first.map((a) => a.buildingId)).not.toEqual(second.map((a) => a.buildingId))
  })

  it('uses fallback positions only after buildings run out', () => {
    const assignments = assignPoisToBuildings({
      mapId: 'map-1',
      imageSize: { width: 1000, height: 1000 },
      pois: [
        poi({ id: 'p1', name: 'A' }),
        poi({ id: 'p2', name: 'B' }),
      ],
      buildings: [building('b1', 100, 10, 20)],
    })

    expect(assignments.map((a) => a.source)).toEqual(['building', 'fallback'])
    expect(assignments[1].position.x).toBeGreaterThanOrEqual(0)
    expect(assignments[1].position.x).toBeLessThanOrEqual(1000)
    expect(assignments[1].position.y).toBeGreaterThanOrEqual(0)
    expect(assignments[1].position.y).toBeLessThanOrEqual(1000)
  })
})
