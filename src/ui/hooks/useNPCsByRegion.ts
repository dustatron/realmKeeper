import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@infrastructure/dexie/db'

export function useNPCsByRegion(regionId: string | null) {
  return useLiveQuery(
    () => (regionId ? db.npcs.where('regionId').equals(regionId).toArray() : []),
    [regionId]
  ) ?? []
}
