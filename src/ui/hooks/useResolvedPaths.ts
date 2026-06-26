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

      // Resolve hex size from the current POI's map
      const currentPoi = pois.find((p) => p.id === poiId)
      const gameMap = currentPoi?.mapRef
        ? await db.gameMaps.get(currentPoi.mapRef)
        : undefined
      const hexSize = gameMap?.hexSize ?? 40

      return paths.map((p) => {
        const fromPos = posMap.get(p.fromPoiId)
        const toPos = posMap.get(p.toPoiId)
        let hexes: number | null = null
        if (fromPos && toPos) {
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
