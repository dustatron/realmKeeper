import { describe, it, expect } from 'vitest'
import { withTradeDefault } from './v43-trade-defaults'

describe('withTradeDefault', () => {
  it('adds trade: null when missing', () => {
    const poi = { id: 'p1', name: 'Hollow' } as Record<string, unknown>
    expect(withTradeDefault(poi).trade).toBe(null)
  })

  it('preserves an existing trade value', () => {
    const trade = { produces: 'iron', needs: ['grain'] }
    const poi = { id: 'p1', trade } as Record<string, unknown>
    expect(withTradeDefault(poi).trade).toBe(trade)
  })

  it('does not mutate the input row', () => {
    const poi = { id: 'p1' } as Record<string, unknown>
    withTradeDefault(poi)
    expect('trade' in poi).toBe(false)
  })
})
