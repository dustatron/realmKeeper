import { describe, it, expect } from 'vitest'
import { REACTION_RANGES, dispositionForRoll } from './dice'

describe('dispositionForRoll', () => {
  const expected: Array<[number, string]> = [
    [2, 'hostile'], [3, 'wary'], [5, 'wary'], [6, 'curious'], [8, 'curious'],
    [9, 'kind'], [11, 'kind'], [12, 'helpful'],
  ]
  it.each(expected)('maps 2d6 total %i to %s', (total, disposition) => {
    expect(dispositionForRoll(total)).toBe(disposition)
  })

  it('ranges cover every 2d6 total 2..12 with no gaps', () => {
    for (let t = 2; t <= 12; t++) {
      expect(REACTION_RANGES.some((r) => t >= r.min && t <= r.max)).toBe(true)
    }
  })
})
