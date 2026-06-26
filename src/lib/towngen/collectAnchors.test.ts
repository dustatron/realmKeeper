import { describe, it, expect } from 'vitest'
import { collectAnchors } from './collectAnchors'
import type { POI } from '@domain/entities/POI'

const poi = (over: Partial<POI>): POI => ({ id: 'x', type: 'building', position: { x: 1, y: 2 }, ...over } as POI)

describe('collectAnchors', () => {
  it('maps placed POIs to anchors', () => {
    const a = collectAnchors([poi({ id: 'p1', position: { x: 10, y: 20 }, type: 'shrine' })])
    expect(a).toEqual([{ poiId: 'p1', x: 10, y: 20, type: 'shrine' }])
  })

  it('skips POIs with no position', () => {
    expect(collectAnchors([poi({ id: 'p2', position: null })])).toHaveLength(0)
  })
})
