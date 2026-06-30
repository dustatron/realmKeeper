import { describe, it, expect } from 'vitest'
import {
  REGION_FRONT_TITLES, REGION_FRONT_DESCRIPTIONS,
  regionFrontTableDefs, regionFrontTableSets,
  REGION_FRONT_TITLE_TABLE_ID, REGION_FRONT_DESC_TABLE_ID,
} from './regionFront.tables'

describe('regionFront.tables', () => {
  it('has non-empty title and description pools', () => {
    expect(REGION_FRONT_TITLES.length).toBeGreaterThan(0)
    expect(REGION_FRONT_DESCRIPTIONS.length).toBeGreaterThan(0)
  })

  it('descriptions escalate (each names a present harm and a worse end)', () => {
    for (const d of REGION_FRONT_DESCRIPTIONS) {
      expect(d.length).toBeGreaterThan(80) // multi-sentence escalation, not a one-liner
    }
  })

  it('exposes browsable TableDefs matching the source arrays', () => {
    const titleDef = regionFrontTableDefs.find((t) => t.id === REGION_FRONT_TITLE_TABLE_ID)
    const descDef = regionFrontTableDefs.find((t) => t.id === REGION_FRONT_DESC_TABLE_ID)
    expect(titleDef?.entries.map((e) => e.text)).toEqual([...REGION_FRONT_TITLES])
    expect(descDef?.entries.map((e) => e.text)).toEqual([...REGION_FRONT_DESCRIPTIONS])
  })

  it('registers a table set referencing both tables', () => {
    expect(regionFrontTableSets[0].tableIds).toContain(REGION_FRONT_TITLE_TABLE_ID)
    expect(regionFrontTableSets[0].tableIds).toContain(REGION_FRONT_DESC_TABLE_ID)
  })
})
