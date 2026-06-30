import { describe, it, expect } from 'vitest'
import {
  NATURAL_SITE_NAMES,
  NATURAL_SITE_HAZARDS,
  naturalSiteTableSets,
  naturalSiteTableDefs,
  NATURAL_SITE_NAME_TABLE_ID,
  NATURAL_SITE_HAZARD_TABLE_ID,
} from './naturalSites.tables'

describe('naturalSites tables', () => {
  it('has evocative, non-empty unique names', () => {
    expect(NATURAL_SITE_NAMES.length).toBeGreaterThan(10)
    for (const name of NATURAL_SITE_NAMES) expect(name.trim().length).toBeGreaterThan(0)
    expect(new Set(NATURAL_SITE_NAMES).size).toBe(NATURAL_SITE_NAMES.length)
  })

  it('expected sample names are present', () => {
    expect(NATURAL_SITE_NAMES).toContain('The Hollow Wood')
    expect(NATURAL_SITE_NAMES).toContain('Mournmere')
    expect(NATURAL_SITE_NAMES).toContain('The Singing Caverns')
    expect(NATURAL_SITE_NAMES).toContain('The Weeping Fen')
  })

  it('every hazard pairs a mood with a trouble', () => {
    expect(NATURAL_SITE_HAZARDS.length).toBeGreaterThan(0)
    for (const h of NATURAL_SITE_HAZARDS) {
      expect(h.mood.trim().length).toBeGreaterThan(0)
      expect(h.trouble.trim().length).toBeGreaterThan(0)
    }
  })

  it('registers browsable table defs in the set', () => {
    const ids = naturalSiteTableSets[0].tableIds
    expect(ids).toContain(NATURAL_SITE_NAME_TABLE_ID)
    expect(ids).toContain(NATURAL_SITE_HAZARD_TABLE_ID)

    const defIds = naturalSiteTableDefs.map((d) => d.id)
    expect(defIds).toContain(NATURAL_SITE_NAME_TABLE_ID)
    expect(defIds).toContain(NATURAL_SITE_HAZARD_TABLE_ID)
  })

  it('name table def preserves source order 1:1', () => {
    const def = naturalSiteTableDefs.find((d) => d.id === NATURAL_SITE_NAME_TABLE_ID)!
    expect(def.entries.map((e) => e.text)).toEqual([...NATURAL_SITE_NAMES])
  })
})
