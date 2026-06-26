import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@infrastructure/dexie/db'
import type { Path } from '@domain/entities/Path'
import { hexesBetween } from '~/lib/hexmap/travel'

export interface ResolvedPath extends Path {
  fromName: string
  toName: string
  hexes: number | null
}

export function useResolvedPaths(poiId: string | null): ResolvedPath[] {
  return useLiveQuery(
    async () => {
      if (!poiId) return []
      const [from, to] = await Promise.all([
        db.paths.where('fromPoiId').equals(poiId).toArray(),
        db.paths.where('toPoiId').equals(poiId).toArray(),
      ])
      const seen = new Set<string>()
      const paths = [...from, ...to].filter((p) => {
        if (seen.has(p.id)) return false
        seen.add(p.id)
        return true
      })

      const poiIds = new Set<string>()
      for (const p of paths) {
        poiIds.add(p.fromPoiId)
        poiIds.add(p.toPoiId)
      }

      const pois = await db.pois.where('id').anyOf([...poiIds]).toArray()
      const nameMap = new Map(pois.map((p) => [p.id, p.name]))
      const posMap = new Map(pois.map((p) => [p.id, p.position]))
      const mapRefMap = new Map(pois.map((p) => [p.id, p.mapRef]))

      // Resolve hex map for the current POI
      const currentPoi = pois.find((p) => p.id === poiId)
      const currentMapRef = currentPoi?.mapRef ?? null
      const gameMap = currentMapRef
        ? await db.gameMaps.get(currentMapRef)
        : undefined
      // Only compute hexes on a genuine, single hex map with a real hexSize
      const isHexMap =
        gameMap != null &&
        gameMap.kind === 'hex' &&
        typeof gameMap.hexSize === 'number' &&
        gameMap.hexSize != null
      const hexSize = isHexMap ? (gameMap!.hexSize as number) : null

      return paths.map((p) => {
        const fromPos = posMap.get(p.fromPoiId)
        const toPos = posMap.get(p.toPoiId)
        // Both endpoints must share the current POI's map
        const fromMapRef = mapRefMap.get(p.fromPoiId) ?? null
        const toMapRef = mapRefMap.get(p.toPoiId) ?? null
        const sameMap =
          fromMapRef != null &&
          toMapRef != null &&
          fromMapRef === currentMapRef &&
          toMapRef === currentMapRef
        let hexes: number | null = null
        if (isHexMap && hexSize != null && sameMap && fromPos && toPos) {
          const d = hexesBetween(fromPos, toPos, hexSize)
          if (d > 0) hexes = d
        }
        return {
          ...p,
          fromName: nameMap.get(p.fromPoiId) ?? p.fromPoiId.slice(0, 8),
          toName: nameMap.get(p.toPoiId) ?? p.toPoiId.slice(0, 8),
          hexes,
        }
      })
    },
    [poiId]
  ) ?? []
}
