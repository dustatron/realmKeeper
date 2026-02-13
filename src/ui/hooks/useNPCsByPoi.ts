import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@infrastructure/dexie/db'

export function useNPCsByPoi(poiId: string | null) {
  return useLiveQuery(
    () => (poiId ? db.npcs.where('poiId').equals(poiId).toArray() : []),
    [poiId]
  ) ?? []
}
