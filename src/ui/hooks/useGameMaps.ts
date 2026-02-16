import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@infrastructure/dexie/db'

export function useRealmMaps(worldId: string | null) {
  return useLiveQuery(
    () => (worldId ? db.gameMaps.where('ownerRealmId').equals(worldId).sortBy('sortOrder') : []),
    [worldId]
  ) ?? []
}

/** All maps in a realm: realm-owned + owned by POIs in that realm */
export function useAllRealmMaps(worldId: string | null) {
  return useLiveQuery(
    async () => {
      if (!worldId) return []
      const realmMaps = await db.gameMaps.where('ownerRealmId').equals(worldId).sortBy('sortOrder')
      const regions = await db.regions.where('worldId').equals(worldId).toArray()
      const regionIds = regions.map((r) => r.id)
      if (regionIds.length === 0) return realmMaps
      const pois = await db.pois.where('regionId').anyOf(regionIds).toArray()
      const poiIds = pois.map((p) => p.id)
      if (poiIds.length === 0) return realmMaps
      const poiMaps = await db.gameMaps.where('ownerPoiId').anyOf(poiIds).sortBy('sortOrder')
      return [...realmMaps, ...poiMaps]
    },
    [worldId]
  ) ?? []
}

export function usePOIMaps(poiId: string | null) {
  return useLiveQuery(
    () => (poiId ? db.gameMaps.where('ownerPoiId').equals(poiId).sortBy('sortOrder') : []),
    [poiId]
  ) ?? []
}

export function useGameMap(mapId: string | null) {
  return useLiveQuery(
    () => (mapId ? db.gameMaps.get(mapId) : undefined),
    [mapId]
  )
}

export function usePOIsOnMap(mapId: string | null) {
  return useLiveQuery(
    () => (mapId ? db.pois.where('mapRef').equals(mapId).toArray() : []),
    [mapId]
  ) ?? []
}

export function usePathsOnMap(mapId: string | null) {
  return useLiveQuery(
    async () => {
      if (!mapId) return []
      const pois = await db.pois.where('mapRef').equals(mapId).toArray()
      const poiIds = new Set(pois.map((p) => p.id))
      if (poiIds.size === 0) return []
      const allPaths = await Promise.all(
        [...poiIds].map(async (id) => {
          const [from, to] = await Promise.all([
            db.paths.where('fromPoiId').equals(id).toArray(),
            db.paths.where('toPoiId').equals(id).toArray(),
          ])
          return [...from, ...to]
        })
      )
      // Only include paths where BOTH endpoints are on this map
      const seen = new Set<string>()
      return allPaths.flat().filter((p) => {
        if (seen.has(p.id)) return false
        seen.add(p.id)
        return poiIds.has(p.fromPoiId) && poiIds.has(p.toPoiId)
      })
    },
    [mapId]
  ) ?? []
}
