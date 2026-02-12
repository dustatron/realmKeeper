import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@infrastructure/dexie/db'

export function useRegions(realmId: string | null) {
  return useLiveQuery(
    () => (realmId ? db.regions.where('realmId').equals(realmId).toArray() : []),
    [realmId]
  ) ?? []
}

export function useRegion(id: string | null) {
  return useLiveQuery(
    () => (id ? db.regions.get(id) : undefined),
    [id]
  )
}
