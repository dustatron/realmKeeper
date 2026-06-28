import { describe, it, expect } from 'vitest'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { generateTreasureItems, generateRoomTreasure } from './treasure-gen'
import type { SpatialRoom } from '~/lib/dungeon/types'

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

  it('generateRoomTreasure returns TreasureItem[] for a treasure_vault room', () => {
    const room: SpatialRoom = {
      id: 'r1',
      name: 'Vault',
      description: '',
      type: 'chamber',
      size: 'medium',
      depth: 1,
      bounds: { x: 0, y: 0, width: 5, height: 5 },
      encounters: [],
      treasure: [],
      features: [],
      hazards: [],
      secrets: [],
      explored: false,
      themeRoomType: 'treasure_vault',
    }
    const items = generateRoomTreasure(room, 'standard', new SeededRandom('vault'))
    expect(Array.isArray(items)).toBe(true)
    expect(items.length).toBeGreaterThan(0)
    for (const it of items) {
      expect(it.id).toBeTruthy()
    }
  })
})
