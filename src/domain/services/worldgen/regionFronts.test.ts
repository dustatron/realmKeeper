import { describe, it, expect } from 'vitest'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { buildRegionFront } from './regionFronts'

describe('buildRegionFront', () => {
  it('returns a front with progress 0 and 4 or 6 segments', () => {
    const front = buildRegionFront({ regionId: 'r1', definingResource: 'iron ore', rng: new SeededRandom('seed') })
    expect(front.progress).toBe(0)
    expect([4, 6]).toContain(front.segments)
    expect(front.title.length).toBeGreaterThan(0)
    expect(front.description.length).toBeGreaterThan(0)
  })

  it('weaves the defining resource into the description', () => {
    const front = buildRegionFront({ regionId: 'r1', definingResource: 'silver', rng: new SeededRandom('seed') })
    expect(front.description).toContain('silver')
  })

  it('handles a null defining resource gracefully', () => {
    const front = buildRegionFront({ regionId: 'r1', definingResource: null, rng: new SeededRandom('seed') })
    expect(front.progress).toBe(0)
    expect([4, 6]).toContain(front.segments)
    expect(front.description.length).toBeGreaterThan(0)
  })

  it('is deterministic for a given seed', () => {
    const a = buildRegionFront({ regionId: 'r1', definingResource: 'grain', rng: new SeededRandom('abc') })
    const b = buildRegionFront({ regionId: 'r1', definingResource: 'grain', rng: new SeededRandom('abc') })
    expect(a).toEqual(b)
  })
})
