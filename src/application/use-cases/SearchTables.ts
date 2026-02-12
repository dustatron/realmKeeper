import type { ITableRepository } from '@application/ports/ITableRepository'
import type { TableDef, TableSet } from '@domain/entities/TableDef'

export interface SearchTablesResult {
  sets: TableSet[]
  tables: TableDef[]
}

export async function executeSearchTables(
  query: string,
  systemId: string | null,
  deps: { tableRepo: ITableRepository }
): Promise<SearchTablesResult> {
  const allSets = await deps.tableRepo.getAllSets()
  const tables = systemId != null
    ? await deps.tableRepo.getTablesBySystemId(systemId)
    : await Promise.all(allSets.map((s) => deps.tableRepo.getTablesBySetId(s.id))).then((arr) => arr.flat())

  const q = query.toLowerCase()
  const filteredTables = q
    ? tables.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.includes(q))
      )
    : tables

  const matchedSetIds = new Set(filteredTables.map((t) => t.setId))
  const filteredSets = allSets.filter((s) => matchedSetIds.has(s.id))

  return { sets: filteredSets, tables: filteredTables }
}
