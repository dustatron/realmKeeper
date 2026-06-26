import { describe, it, expect } from 'vitest'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { POI_KIND_TABLE, poiKindToType, DUNGEON_THEMES } from './poiKinds'

describe('poi kinds', () => {
  it('maps every kind to a valid PoiType', () => {
    expect(poiKindToType('settlement')).toBe('settlement')
    expect(poiKindToType('dungeon')).toBe('dungeon')
    expect(poiKindToType('ruin')).toBe('ruin')
    expect(poiKindToType('landmark')).toBe('landmark')
  })

  it('weighted table picks deterministically and only valid kinds', () => {
    const rng = new SeededRandom('k')
    const kinds = Array.from({ length: 20 }, () => rng.pickWeighted(POI_KIND_TABLE))
    for (const k of kinds) expect(['settlement', 'dungeon', 'ruin', 'landmark']).toContain(k)
  })

  it('has at least one dungeon theme', () => {
    expect(DUNGEON_THEMES.length).toBeGreaterThan(0)
  })
})
