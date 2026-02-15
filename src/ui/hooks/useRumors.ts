import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@infrastructure/dexie/db'

export function useRumorsByPoi(poiId: string | null) {
  return useLiveQuery(
    () => (poiId ? db.rumors.where('poiId').equals(poiId).toArray() : []),
    [poiId]
  ) ?? []
}

export function useRumorsByRegion(regionId: string | null) {
  return useLiveQuery(
    () => (regionId ? db.rumors.where('regionId').equals(regionId).toArray() : []),
    [regionId]
  ) ?? []
}
