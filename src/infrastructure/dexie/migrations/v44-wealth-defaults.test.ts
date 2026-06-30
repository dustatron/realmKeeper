import { describe, it, expect } from 'vitest'
import { withWealthBandDefault, withWealthTierDefault, withFrontDefault } from './v44-wealth-defaults'

describe('withWealthBandDefault', () => {
  it('adds wealthBand: null when missing', () => {
    const poi = { id: 'p1', name: 'Hollow' } as Record<string, unknown>
    expect(withWealthBandDefault(poi).wealthBand).toBe(null)
  })

  it('preserves an existing wealthBand value', () => {
    const poi = { id: 'p1', wealthBand: 'rich' } as Record<string, unknown>
    expect(withWealthBandDefault(poi).wealthBand).toBe('rich')
  })

  it('does not mutate the input row', () => {
    const poi = { id: 'p1' } as Record<string, unknown>
    withWealthBandDefault(poi)
    expect('wealthBand' in poi).toBe(false)
  })
})

describe('withWealthTierDefault', () => {
  it('adds wealthTier: null when missing', () => {
    const npc = { id: 'n1', name: 'Guard' } as Record<string, unknown>
    expect(withWealthTierDefault(npc).wealthTier).toBe(null)
  })

  it('preserves an existing wealthTier value', () => {
    const npc = { id: 'n1', wealthTier: 'wealthy' } as Record<string, unknown>
    expect(withWealthTierDefault(npc).wealthTier).toBe('wealthy')
  })

  it('does not mutate the input row', () => {
    const npc = { id: 'n1' } as Record<string, unknown>
    withWealthTierDefault(npc)
    expect('wealthTier' in npc).toBe(false)
  })
})

describe('withFrontDefault', () => {
  it('adds front: null when missing', () => {
    const region = { id: 'r1', name: 'The Fens' } as Record<string, unknown>
    expect(withFrontDefault(region).front).toBe(null)
  })

  it('preserves an existing front value', () => {
    const front = { title: 'The Rising Tide', description: 'Waters climb.', progress: 0, segments: 4 }
    const region = { id: 'r1', front } as Record<string, unknown>
    expect(withFrontDefault(region).front).toBe(front)
  })

  it('does not mutate the input row', () => {
    const region = { id: 'r1' } as Record<string, unknown>
    withFrontDefault(region)
    expect('front' in region).toBe(false)
  })
})
