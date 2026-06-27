import { describe, it, expect } from 'vitest'
import { buildPOI } from './buildPoi'

describe('buildPOI', () => {
  it('defaults encounterChance to null', () => {
    const poi = buildPOI({ regionId: 'r1', name: 'Cave', type: 'dungeon' })
    expect(poi.encounterChance).toBeNull()
  })
})
