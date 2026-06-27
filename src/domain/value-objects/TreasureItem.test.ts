import { describe, it, expect } from 'vitest'
import type { TreasureItem } from './TreasureItem'

describe('TreasureItem extensions', () => {
  it('accepts areaIndex and notable', () => {
    const item: TreasureItem = {
      id: 'i', name: 'Crown', description: '', value: '500 gp',
      quantity: 1, collected: false, areaIndex: 2, notable: true,
    }
    expect(item.areaIndex).toBe(2)
    expect(item.notable).toBe(true)
  })
})
