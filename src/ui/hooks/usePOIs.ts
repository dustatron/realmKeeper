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
