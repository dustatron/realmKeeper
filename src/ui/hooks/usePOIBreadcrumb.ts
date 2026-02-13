import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@infrastructure/dexie/db'
import type { POI } from '@domain/entities/POI'

export function usePOIBreadcrumb(poiId: string | null) {
  return useLiveQuery(async () => {
    if (!poiId) return []
    const chain: POI[] = []
    let current = await db.pois.get(poiId)
    while (current) {
      chain.unshift(current)
      if (!current.parentPoiId) break
      current = await db.pois.get(current.parentPoiId)
    }
    return chain
  }, [poiId]) ?? []
}
