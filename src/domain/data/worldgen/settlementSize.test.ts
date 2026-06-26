import { describe, it, expect } from 'vitest'
import { settlementSize } from './settlementSize'

describe('settlementSize', () => {
  it('classifies Cairn settlement subtypes by size', () => {
    expect(settlementSize('City')).toBe('large')
    expect(settlementSize('Citadel')).toBe('large')
    expect(settlementSize('Hamlet')).toBe('small')
    expect(settlementSize('Outpost')).toBe('small')
    expect(settlementSize('Village')).toBe('medium')
    expect(settlementSize(null)).toBe('medium')
  })
})
