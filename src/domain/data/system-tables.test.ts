import { describe, it, expect } from 'vitest'
import { getAllSystemTables, getAllSystemSets, getSystemTablesBySetId } from './system-tables'
import { nameTableDefs } from './worldgen/names.tables'
import { SETTLEMENT_PREFIX } from './worldgen/names'
import { NAME_TABLE_IDS } from './worldgen/names'
import { SHOP_TYPES, SHOP_TYPES_TABLE_ID } from './worldgen/shops.tables'

describe('system table registry', () => {
  it('has globally unique table ids', () => {
    const ids = getAllSystemTables().map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has globally unique set ids', () => {
    const ids = getAllSystemSets().map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every set\'s tableIds resolve to registered tables', () => {
    const known = new Set(getAllSystemTables().map((t) => t.id))
    for (const set of getAllSystemSets()) {
      for (const id of set.tableIds) expect(known.has(id)).toBe(true)
    }
  })

  it('every registered table has at least one entry', () => {
    for (const t of getAllSystemTables()) expect(t.entries.length).toBeGreaterThan(0)
  })

  it('views are a 1:1 single source of their arrays (order preserved)', () => {
    // Name view wraps the literal pool unchanged — this guards determinism.
    const prefix = nameTableDefs.find((d) => d.id === NAME_TABLE_IDS.settlementPrefix)
    expect(prefix?.entries.map((e) => e.text)).toEqual([...SETTLEMENT_PREFIX])
    expect(getSystemTablesBySetId('tableset-rk-shops').find((t) => t.id === SHOP_TYPES_TABLE_ID)
      ?.entries.map((e) => e.text)).toEqual([...SHOP_TYPES])
  })
})
