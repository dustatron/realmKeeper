import { queryDb, Schema } from '@livestore/livestore'
import { useQuery } from '@livestore/react'
import {
  getAllSystemSets,
  getSystemTablesBySetId,
  isSystemSetId,
} from '@domain/data/system-tables'
import type { TableSet, TableDef } from '@domain/entities/TableDef'
import type { RollHistory } from '@domain/entities/RollHistory'

export function useTableSets() {
  const dbSets = useQuery(queryDb({
    query: 'SELECT * FROM tableSets',
    schema: Schema.Array(Schema.Unknown),
  })) as TableSet[]
  return [...getAllSystemSets(), ...dbSets]
}

export function useTableSet(id: string | null) {
  const results = useQuery(queryDb({
    query: id
      ? 'SELECT * FROM tableSets WHERE id = $id LIMIT 1'
      : 'SELECT * FROM tableSets WHERE 1 = 0',
    schema: Schema.Array(Schema.Unknown),
    bindValues: id ? { $id: id } : {},
  }, { deps: [id] })) as TableSet[]
  return results[0] ?? undefined
}

export function useTablesInSet(setId: string | null) {
  const isSystem = setId ? isSystemSetId(setId) : false
  const dbTables = useQuery(queryDb({
    query: setId && !isSystem
      ? 'SELECT * FROM tableDefs WHERE setId = $setId'
      : 'SELECT * FROM tableDefs WHERE 1 = 0',
    schema: Schema.Array(Schema.Unknown),
    bindValues: setId && !isSystem ? { $setId: setId } : {},
  }, { deps: [setId] })) as TableDef[]

  if (setId && isSystem) {
    return getSystemTablesBySetId(setId)
  }
  return dbTables
}

export function useRollHistory(worldId: string | null, limit = 20) {
  return useQuery(queryDb({
    query: worldId
      ? `SELECT * FROM rollHistory WHERE worldId = $worldId ORDER BY timestamp DESC LIMIT ${limit}`
      : 'SELECT * FROM rollHistory WHERE 1 = 0',
    schema: Schema.Array(Schema.Unknown),
    bindValues: worldId ? { $worldId: worldId } : {},
  }, { deps: [worldId, limit] })) as RollHistory[]
}
