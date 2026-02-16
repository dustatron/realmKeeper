import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@infrastructure/dexie/db'

export function useRegions(worldId: string | null) {
  return useLiveQuery(
    () => (worldId ? db.regions.where('worldId').equals(worldId).toArray() : []),
    [worldId]
  ) ?? []
}

export function useRegion(id: string | null) {
  return useLiveQuery(
    () => (id ? db.regions.get(id) : undefined),
    [id]
  )
}
