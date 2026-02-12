import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@infrastructure/dexie/db'

export function useTableSets() {
  return useLiveQuery(() => db.tableSets.toArray()) ?? []
}

export function useTableSet(id: string | null) {
  return useLiveQuery(
    () => (id ? db.tableSets.get(id) : undefined),
    [id]
  )
}

export function useTablesInSet(setId: string | null) {
  return useLiveQuery(
    () => (setId ? db.tableDefs.where('setId').equals(setId).toArray() : []),
    [setId]
  ) ?? []
}

export function useRollHistory(realmId: string | null, limit = 20) {
  return useLiveQuery(
    () => realmId
      ? db.rollHistory
          .where('realmId')
          .equals(realmId)
          .toArray()
          .then((rolls) => rolls.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit))
      : [],
    [realmId, limit]
  ) ?? []
}
