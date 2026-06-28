import { describe, it, expect } from 'vitest'
import { matchRegionLocation } from './matchRegionLocation'

const pois = [{ id: 'p1', name: 'Broken Tower' }, { id: 'p2', name: 'Tower' }]

describe('matchRegionLocation', () => {
  it('matches a POI name in the text, longest wins', () => {
    expect(matchRegionLocation('tracks lead toward the Broken Tower', pois)).toEqual({ poiId: 'p1', name: 'Broken Tower' })
  })
  it('returns null when no POI name appears', () => {
    expect(matchRegionLocation('a quiet afternoon', pois)).toBeNull()
  })
  it('ignores empty names', () => {
    expect(matchRegionLocation('anything', [{ id: 'x', name: '' }])).toBeNull()
  })
})
