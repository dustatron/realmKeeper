import { describe, it, expect } from 'vitest'
import type { POIEvent } from '@domain/entities/POIEvent'
import { isEventActiveOn } from './poiEventSchedule'

const evt = (over: Partial<POIEvent>): POIEvent =>
  ({ trigger: { year: null, season: 'summer', day: 10, watch: null }, durationWatches: 3, recurring: true, ...over } as POIEvent)

describe('isEventActiveOn', () => {
  it('is active across the whole trigger day for a full-day (watch:null) recurring event', () => {
    expect(isEventActiveOn(evt({}), { year: 1, season: 'summer', day: 10, watch: 1 }, 30, 3)).toBe(true)
    expect(isEventActiveOn(evt({}), { year: 1, season: 'summer', day: 10, watch: 3 }, 30, 3)).toBe(true)
  })
  it('is inactive the day before and after', () => {
    expect(isEventActiveOn(evt({}), { year: 1, season: 'summer', day: 9, watch: 3 }, 30, 3)).toBe(false)
    expect(isEventActiveOn(evt({}), { year: 1, season: 'summer', day: 11, watch: 1 }, 30, 3)).toBe(false)
  })
  it('re-arms the next year for a recurring (year:null) event', () => {
    expect(isEventActiveOn(evt({}), { year: 2, season: 'summer', day: 10, watch: 1 }, 30, 3)).toBe(true)
  })
  it('a one-time (year set) event is active only that year', () => {
    const one = evt({ trigger: { year: 1, season: 'summer', day: 10, watch: null }, recurring: false })
    expect(isEventActiveOn(one, { year: 1, season: 'summer', day: 10, watch: 1 }, 30, 3)).toBe(true)
    expect(isEventActiveOn(one, { year: 2, season: 'summer', day: 10, watch: 1 }, 30, 3)).toBe(false)
  })
})
