import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@infrastructure/dexie/db'

export function usePaths() {
  return useLiveQuery(
    () => db.paths.toArray(),
    []
  ) ?? []
}

export function usePathsByPoi(poiId: string | null) {
  return useLiveQuery(
    async () => {
      if (!poiId) return []
      const [from, to] = await Promise.all([
        db.paths.where('fromPoiId').equals(poiId).toArray(),
        db.paths.where('toPoiId').equals(poiId).toArray(),
      ])
      const seen = new Set<string>()
      return [...from, ...to].filter((p) => {
        if (seen.has(p.id)) return false
        seen.add(p.id)
        return true
      })
    },
    [poiId]
  ) ?? []
}
