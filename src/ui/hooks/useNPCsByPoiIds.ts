import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@infrastructure/dexie/db'

export function useNPCsByPoiIds(poiIds: string[]) {
  return useLiveQuery(
    () => (poiIds.length > 0 ? db.npcs.where('poiId').anyOf(poiIds).toArray() : []),
    [poiIds.join(',')]
  ) ?? []
}
