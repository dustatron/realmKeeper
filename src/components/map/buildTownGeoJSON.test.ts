import { describe, it, expect } from 'vitest'
import { buildTownGeoJSON } from './buildTownGeoJSON'
import type { WatabouCityData } from '@domain/value-objects/WatabouCityData'

const identity = (x: number, y: number): [number, number] => [x, y]

const data: WatabouCityData = {
  type: 'mfcg',
  features: [
    { type: 'Feature', properties: { id: 'earth' }, geometry: { type: 'Polygon', coordinates: [[[0, 0], [10, 0], [10, 10], [0, 0]]] } },
    { type: 'Feature', properties: { id: 'buildings', poiId: 'p1' }, geometry: { type: 'Polygon', coordinates: [[[2, 2], [4, 2], [4, 4], [2, 2]]] } },
    { type: 'Feature', properties: { id: 'roads' }, geometry: { type: 'LineString', coordinates: [[2, 2], [8, 8]] } },
  ],
}

describe('buildTownGeoJSON', () => {
  it('tags each feature with a classified kind', () => {
    const fc = buildTownGeoJSON(data, identity)
    const kinds = fc.features.map((f) => f.properties?.kind)
    expect(kinds).toEqual(['earth', 'building', 'road'])
  })

  it('preserves poiId on building features', () => {
    const fc = buildTownGeoJSON(data, identity)
    const b = fc.features.find((f) => f.properties?.kind === 'building')
    expect(b?.properties?.poiId).toBe('p1')
  })

  it('passes every coordinate through the mapper', () => {
    const fc = buildTownGeoJSON(data, (x, y) => [x + 100, y + 100])
    const road = fc.features.find((f) => f.properties?.kind === 'road')!
    expect((road.geometry as GeoJSON.LineString).coordinates[0]).toEqual([102, 102])
  })
})
