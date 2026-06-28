import { describe, it, expect } from 'vitest'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { buildRegionFlavor, REGION_PROBLEMS } from './regionFlavor'

describe('region problem', () => {
  it('buildRegionFlavor returns a problem from the table, deterministic per seed', () => {
    const a = buildRegionFlavor('forest', new SeededRandom('s'))
    const b = buildRegionFlavor('forest', new SeededRandom('s'))
    expect(a.problem).toBe(b.problem)
    expect(REGION_PROBLEMS).toContain(a.problem)
    expect(REGION_PROBLEMS.length).toBeGreaterThanOrEqual(20)
  })
})
