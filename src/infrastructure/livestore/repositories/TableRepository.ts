import type { Store } from '@livestore/livestore'
import type { schema } from '../schema'
import {
  tableSetCreated,
  tableSetUpdated,
  tableSetDeleted,
  tableDefCreated,
  tableDefUpdated,
  tableDefDeleted,
} from '../events'
import type { TableDef, TableSet } from '@domain/entities/TableDef'
import {
  getSystemTableById,
  getSystemTablesBySystemId,
  getSystemTablesByTag,
  getSystemTablesBySetId,
  getAllSystemSets,
  getSystemSetById,
  isSystemSetId,
} from '@domain/data/system-tables'

export class TableRepository {
  constructor(private store: Store<typeof schema>) {}

  async getTableById(id: string): Promise<TableDef | undefined> {
    const systemTable = getSystemTableById(id)
    if (systemTable) return systemTable
    const rows = this.store.query(
      { query: 'SELECT * FROM tableDefs WHERE id = $id', bindValues: { id } }
    ) as TableDef[]
    return rows[0] ?? undefined
  }

  async getTablesBySetId(setId: string): Promise<TableDef[]> {
    if (isSystemSetId(setId)) return getSystemTablesBySetId(setId)
    return this.store.query(
      { query: 'SELECT * FROM tableDefs WHERE setId = $setId', bindValues: { setId } }
    ) as TableDef[]
  }

  async getTablesByTag(tag: string): Promise<TableDef[]> {
    const systemTables = getSystemTablesByTag(tag)
    const dbTables = this.store.query(
      { query: 'SELECT * FROM tableDefs WHERE tags LIKE $pattern', bindValues: { pattern: '%' + tag + '%' } }
    ) as TableDef[]
    return [...systemTables, ...dbTables]
  }

  async getTablesBySystemId(systemId: string | null): Promise<TableDef[]> {
    if (systemId === null) {
      const dbTables = this.store.query(
        { query: 'SELECT * FROM tableDefs WHERE systemId IS NULL', bindValues: {} }
      ) as TableDef[]
      return dbTables
    }
    const systemTables = getSystemTablesBySystemId(systemId)
    const dbTables = this.store.query(
      { query: 'SELECT * FROM tableDefs WHERE systemId = $systemId', bindValues: { systemId } }
    ) as TableDef[]
    return [...systemTables, ...dbTables]
  }

  async getSetById(id: string): Promise<TableSet | undefined> {
    const systemSet = getSystemSetById(id)
    if (systemSet) return systemSet
    const rows = this.store.query(
      { query: 'SELECT * FROM tableSets WHERE id = $id', bindValues: { id } }
    ) as TableSet[]
    return rows[0] ?? undefined
  }

  async getAllSets(): Promise<TableSet[]> {
    const systemSets = getAllSystemSets()
    const dbSets = this.store.query({ query: 'SELECT * FROM tableSets', bindValues: {} }) as TableSet[]
    return [...systemSets, ...dbSets]
  }

  // Write methods — only affect DB (custom tables)

  async createTable(table: TableDef): Promise<void> {
    this.store.commit(tableDefCreated(table as any))
  }

  async updateTable(table: TableDef): Promise<void> {
    this.store.commit(tableDefUpdated(table as any))
  }

  async deleteTable(id: string): Promise<void> {
    this.store.commit(tableDefDeleted({ id }))
  }

  async createSet(set: TableSet): Promise<void> {
    this.store.commit(tableSetCreated(set as any))
  }

  async updateSet(set: TableSet): Promise<void> {
    this.store.commit(tableSetUpdated(set as any))
  }

  async deleteSet(id: string): Promise<void> {
    this.store.commit(tableSetDeleted({ id }))
  }
}
