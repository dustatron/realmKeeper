import { describe, it, expect } from 'vitest'
import { ruinLandmarkTableSets, ruinLandmarkTableDefs } from './ruin-landmark-tables'
import { getAllSystemSets, getSystemTablesBySetId, isSystemSetId } from './system-tables'

describe('ruin/landmark browsable tables', () => {
  it('registers both sets into the system table browser', () => {
    const ids = getAllSystemSets().map((s) => s.id)
    expect(ids).toContain('tableset-rk-ruins')
    expect(ids).toContain('tableset-rk-landmarks')
    expect(isSystemSetId('tableset-rk-ruins')).toBe(true)
    expect(isSystemSetId('tableset-rk-landmarks')).toBe(true)
  })

  it('every set tableId resolves to a real def, and vice versa', () => {
    const defIds = new Set(ruinLandmarkTableDefs.map((d) => d.id))
    for (const set of ruinLandmarkTableSets) {
      for (const tid of set.tableIds) {
        expect(defIds.has(tid)).toBe(true)
      }
      // browser lookup returns exactly this set's defs
      const fromBrowser = getSystemTablesBySetId(set.id)
      expect(fromBrowser.map((d) => d.id).sort()).toEqual([...set.tableIds].sort())
    }
  })

  it('each def has well-formed entries and a matching dice formula', () => {
    for (const d of ruinLandmarkTableDefs) {
      expect(d.entries.length).toBeGreaterThan(0)
      expect(d.diceFormula).toBe(`1d${d.entries.length}`)
      // entries are 1-indexed, contiguous, non-empty
      d.entries.forEach((e, i) => {
        expect(e.min).toBe(i + 1)
        expect(e.max).toBe(i + 1)
        expect(e.text.trim().length).toBeGreaterThan(0)
      })
      expect(d.systemId).toBeNull()
    }
  })
})
