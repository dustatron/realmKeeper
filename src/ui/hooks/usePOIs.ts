import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@infrastructure/dexie/db'

export function usePOIs(regionId: string | null) {
  return useLiveQuery(
    () => (regionId ? db.pois.where('regionId').equals(regionId).toArray() : []),
    [regionId]
  ) ?? []
}

export function usePOI(id: string | null) {
  return useLiveQuery(
    () => (id ? db.pois.get(id) : undefined),
    [id]
  )
}

export function useRealmPOIs(realmId: string | null) {
  return useLiveQuery(
    async () => {
      if (!realmId) return []
      const regions = await db.regions.where('realmId').equals(realmId).toArray()
      const regionIds = regions.map((r) => r.id)
      if (regionIds.length === 0) return []
      return db.pois.where('regionId').anyOf(regionIds).toArray()
    },
    [realmId]
  ) ?? []
}
