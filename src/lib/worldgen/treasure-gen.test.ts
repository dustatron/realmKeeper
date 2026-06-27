import { describe, it, expect } from 'vitest'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { generateTreasureItems } from './treasure-gen'

describe('generateTreasureItems', () => {
  it('returns exactly count items from the level pool', () => {
    const items = generateTreasureItems('standard', 3, new SeededRandom('s'))
    expect(items).toHaveLength(3)
    for (const it of items) {
      expect(it.id).toBeTruthy()
      expect(it.collected).toBe(false)
      expect(it.value).toBeTruthy()
    }
  })

  it('falls back to standard pool for an unknown level', () => {
    const items = generateTreasureItems('nonsense', 2, new SeededRandom('s'))
    expect(items).toHaveLength(2)
  })
})
