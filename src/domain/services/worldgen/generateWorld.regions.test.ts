import { describe, it, expect } from 'vitest'
import { generateWorld } from './generateWorld'

// Regression for two ways a region could end up empty, both breaching the
// "no region left empty" intent:
//  1. biome centers picked with replacement → a duplicate center owns no cells
//  2. lake carving consuming every land cell of a small region
// ~10% of seeds triggered one of these before the fix, so a seed sweep is a
// reliable guard.
describe('generateWorld — no empty regions', () => {
  it('every persisted region owns land and gets at least one POI, across seeds', () => {
    for (let s = 0; s < 200; s++) {
      const { regions, pois } = generateWorld('realm', `region-sweep-${s}`, {
        cols: 8,
        rows: 8,
      })
      const regionsWithPoi = new Set(pois.map((p) => p.regionId))
      const empty = regions.filter((r) => !regionsWithPoi.has(r.id))
      expect(empty, `seed ${s}: regions with no POIs: ${empty.map((r) => r.name).join(', ')}`).toEqual([])
    }
  })

  it('keeps every region reachable as a real, named place (boundary drawn)', () => {
    // A surviving region must own cells, so it gets a boundary outline.
    const { regions } = generateWorld('realm', 'region-boundary', { cols: 8, rows: 8 })
    for (const r of regions) {
      expect(r.boundary, `region ${r.name} should have a boundary`).not.toBeNull()
    }
  })
})
