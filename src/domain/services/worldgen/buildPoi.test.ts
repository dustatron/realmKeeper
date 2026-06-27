import { describe, it, expect } from 'vitest'
import { buildPOI } from './buildPoi'

describe('buildPOI', () => {
  it('defaults encounterChance to null', () => {
    const poi = buildPOI({ regionId: 'r1', name: 'Cave', type: 'dungeon' })
    expect(poi.encounterChance).toBeNull()
  })
})

describe('buildPOI new fields', () => {
  it('defaults ruinSite, landmarkLore, poiGenOptions to null', () => {
    const poi = buildPOI({ regionId: 'r', name: 'X', type: 'ruin' })
    expect(poi.ruinSite).toBeNull()
    expect(poi.landmarkLore).toBeNull()
    expect(poi.poiGenOptions).toBeNull()
  })
})
