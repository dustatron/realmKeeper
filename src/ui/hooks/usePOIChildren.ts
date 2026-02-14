import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@infrastructure/dexie/db'

export function usePOIChildren(parentPoiId: string | null) {
  return useLiveQuery(
    () => parentPoiId ? db.pois.where('parentPoiId').equals(parentPoiId).toArray() : [],
    [parentPoiId]
  ) ?? []
}
