import { queryDb, Schema } from '@livestore/livestore'
import { useQuery } from '@livestore/react'
import type { POI } from '@domain/entities/POI'

export function usePOIs(regionId: string | null) {
  return useQuery(
    queryDb(
      regionId
        ? {
            query: 'SELECT * FROM pois WHERE regionId = $regionId',
            schema: Schema.Array(Schema.Unknown),
            bindValues: { $regionId: regionId },
          }
        : { query: 'SELECT * FROM pois WHERE 1 = 0', schema: Schema.Array(Schema.Unknown), bindValues: {} },
      { deps: [regionId] }
    )
  ) as POI[]
}

export function usePOI(id: string | null) {
  const rows = useQuery(
    queryDb(
      id
        ? {
            query: 'SELECT * FROM pois WHERE id = $id LIMIT 1',
            schema: Schema.Array(Schema.Unknown),
            bindValues: { $id: id },
          }
        : { query: 'SELECT * FROM pois WHERE 1 = 0', schema: Schema.Array(Schema.Unknown), bindValues: {} },
      { deps: [id] }
    )
  ) as POI[]
  return rows[0] as POI | undefined
}

export function useRealmPOIs(worldId: string | null) {
  return useQuery(
    queryDb(
      worldId
        ? {
            query: `SELECT p.* FROM pois p
                    INNER JOIN regions r ON p.regionId = r.id
                    WHERE r.worldId = $worldId`,
            schema: Schema.Array(Schema.Unknown),
            bindValues: { $worldId: worldId },
          }
        : { query: 'SELECT * FROM pois WHERE 1 = 0', schema: Schema.Array(Schema.Unknown), bindValues: {} },
      { deps: [worldId] }
    )
  ) as POI[]
}

export function useRecentVisitedPOIs(worldId: string | null, limit = 5) {
  return useQuery(
    queryDb(
      worldId
        ? {
            query: `SELECT p.* FROM pois p
                    INNER JOIN regions r ON p.regionId = r.id
                    WHERE r.worldId = $worldId AND p.visited = 1
                    ORDER BY p.updatedAt DESC
                    LIMIT ${limit}`,
            schema: Schema.Array(Schema.Unknown),
            bindValues: { $worldId: worldId },
          }
        : { query: 'SELECT * FROM pois WHERE 1 = 0', schema: Schema.Array(Schema.Unknown), bindValues: {} },
      { deps: [worldId, limit] }
    )
  ) as POI[]
}

export function useStarredPOIs(worldId: string | null) {
  return useQuery(
    queryDb(
      worldId
        ? {
            query: `SELECT p.* FROM pois p
                    INNER JOIN regions r ON p.regionId = r.id
                    WHERE r.worldId = $worldId AND p.starred = 1`,
            schema: Schema.Array(Schema.Unknown),
            bindValues: { $worldId: worldId },
          }
        : { query: 'SELECT * FROM pois WHERE 1 = 0', schema: Schema.Array(Schema.Unknown), bindValues: {} },
      { deps: [worldId] }
    )
  ) as POI[]
}
