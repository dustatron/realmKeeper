import { describe, it, expect } from 'vitest'
import { POI_TYPES } from '@shared/constants'
import { FOOTPRINT_TABLE } from './footprints'

describe('FOOTPRINT_TABLE', () => {
  it('has a spec for every POI type', () => {
    for (const t of POI_TYPES) {
      expect(FOOTPRINT_TABLE[t], `missing spec for ${t}`).toBeDefined()
    }
  })

  it('uses positive, sane dimensions', () => {
    for (const t of POI_TYPES) {
      const s = FOOTPRINT_TABLE[t]
      expect(s.w).toBeGreaterThan(0)
      expect(s.h).toBeGreaterThan(0)
      expect(s.w).toBeLessThanOrEqual(200)
      expect(s.h).toBeLessThanOrEqual(200)
      expect(['rect', 'blob']).toContain(s.shape)
    }
  })

  it('renders shrines/temples as rounded blobs and houses as rects', () => {
    expect(FOOTPRINT_TABLE.shrine.shape).toBe('blob')
    expect(FOOTPRINT_TABLE.building.shape).toBe('rect')
  })
})
