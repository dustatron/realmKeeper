import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@infrastructure/dexie/db'
import {
  getAllSystemSets,
  getSystemTablesBySetId,
  isSystemSetId,
} from '@domain/data/system-tables'

export function useTableSets() {
  const dbSets = useLiveQuery(() => db.tableSets.toArray()) ?? []
  return [...getAllSystemSets(), ...dbSets]
}

export function useTableSet(id: string | null) {
  return useLiveQuery(
    () => (id ? db.tableSets.get(id) : undefined),
    [id]
  )
}

export function useTablesInSet(setId: string | null) {
  const dbTables = useLiveQuery(
    () => (setId && !isSystemSetId(setId) ? db.tableDefs.where('setId').equals(setId).toArray() : []),
    [setId]
  ) ?? []

  if (setId && isSystemSetId(setId)) {
    return getSystemTablesBySetId(setId)
  }
  return dbTables
}

export function useRollHistory(worldId: string | null, limit = 20) {
  return useLiveQuery(
    () => worldId
      ? db.rollHistory
          .where('worldId')
          .equals(worldId)
          .toArray()
          .then((rolls) => rolls.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit))
      : [],
    [worldId, limit]
  ) ?? []
}
