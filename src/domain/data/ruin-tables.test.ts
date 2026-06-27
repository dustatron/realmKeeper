import { describe, it, expect } from 'vitest'
import * as T from './ruin-tables'

describe('ruin tables', () => {
  it('core tables have >= 8 entries; failed-party >= 4', () => {
    for (const k of ['RUIN_PURPOSES','RUIN_AREA_NAMES','RUIN_AREA_READALOUD','RUIN_AREA_DETAILS','RUIN_DISCOVERIES','RUIN_HOOKS'] as const) {
      expect((T as Record<string, readonly string[]>)[k].length).toBeGreaterThanOrEqual(8)
    }
    expect(T.RUIN_FAILED_PARTY_DISCOVERY.length).toBeGreaterThanOrEqual(4)
  })
})
