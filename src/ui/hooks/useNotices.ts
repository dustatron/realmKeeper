import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@infrastructure/dexie/db'

export function useNoticesByPoi(poiId: string | null) {
  return useLiveQuery(
    () => (poiId ? db.notices.where('poiId').equals(poiId).toArray() : []),
    [poiId]
  ) ?? []
}

export function useNoticesByRegion(regionId: string | null) {
  return useLiveQuery(
    () => (regionId ? db.notices.where('regionId').equals(regionId).toArray() : []),
    [regionId]
  ) ?? []
}
