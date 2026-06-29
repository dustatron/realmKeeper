import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@infrastructure/dexie/db'
import type { TableDef } from '@domain/entities/TableDef'
import { getAllSystemTables } from '@domain/data/system-tables'
import { TableRepository } from './TableRepository'

function customTable(id: string, texts: string[]): TableDef {
  return {
    id,
    setId: 'tableset-custom',
    name: id,
    diceFormula: `1d${texts.length}`,
    entries: texts.map((text, i) => ({ min: i + 1, max: i + 1, text })),
    tags: [],
    systemId: null,
  }
}

describe('TableRepository.resolveAll', () => {
  const repo = new TableRepository()

  beforeEach(async () => {
    await db.tableDefs.clear()
  })

  it('exposes all built-in tables when Dexie is empty', async () => {
    const tables = await repo.resolveAll()
    const builtIn = getAllSystemTables()
    expect(builtIn.length).toBeGreaterThan(0)
    for (const t of builtIn) expect(tables.has(t.id)).toBe(true)
  })

  it('unions non-overlapping custom tables with built-ins', async () => {
    await db.tableDefs.put(customTable('table-custom-only', ['solo']))
    const tables = await repo.resolveAll()
    expect(tables.texts('table-custom-only')).toEqual(['solo'])
    // a known built-in is still present
    expect(tables.has(getAllSystemTables()[0].id)).toBe(true)
  })

  it('lets a Dexie table override a built-in with the same id', async () => {
    const builtIn = getAllSystemTables()[0]
    await db.tableDefs.put(customTable(builtIn.id, ['overridden']))
    const tables = await repo.resolveAll()
    expect(tables.texts(builtIn.id)).toEqual(['overridden'])
  })
})
