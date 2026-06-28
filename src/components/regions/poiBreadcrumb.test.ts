import { describe, it, expect } from 'vitest'
import { poiBreadcrumb } from './poiBreadcrumb'
import { buildPOI } from '@domain/services/worldgen/buildPoi'

describe('poiBreadcrumb', () => {
  it('walks parentPoiId root→leaf', () => {
    const town = buildPOI({ regionId: 'r', name: 'Riverton', type: 'settlement' })
    const mill = buildPOI({ regionId: 'r', name: 'Old Mill', type: 'building' }); mill.parentPoiId = town.id
    const cellar = buildPOI({ regionId: 'r', name: 'Cellar', type: 'interior' }); cellar.parentPoiId = mill.id
    expect(poiBreadcrumb(cellar.id, [town, mill, cellar]).map(c => c.name)).toEqual(['Riverton','Old Mill','Cellar'])
  })
  it('returns [] for missing/empty and is cycle-safe', () => {
    expect(poiBreadcrumb(null, [])).toEqual([])
    expect(poiBreadcrumb('nope', [])).toEqual([])
  })
})
