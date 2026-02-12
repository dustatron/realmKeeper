import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@infrastructure/dexie/db'

export function usePaths(regionId: string | null) {
  return useLiveQuery(
    () => (regionId ? db.paths.where('regionId').equals(regionId).toArray() : []),
    [regionId]
  ) ?? []
}
