import { queryDb, Schema } from '@livestore/livestore'
import { useQuery } from '@livestore/react'
import { poisTable } from '@infrastructure/livestore/tables'
import { parseJsonRows } from '@shared/parseJsonRow'
import type { POI } from '@domain/entities/POI'

export function usePOIs(regionId: string | null) {
  return useQuery(
    queryDb(
      regionId
        ? poisTable.select().where({ regionId })
        : { query: 'SELECT * FROM pois WHERE 1 = 0', schema: Schema.Array(Schema.Unknown), bindValues: {} },
      { deps: regionId ?? '' }
    )
  ) as POI[]
}

export function usePOI(id: string | null) {
  const rows = useQuery(
    queryDb(
      id
        ? poisTable.select().where({ id })
        : { query: 'SELECT * FROM pois WHERE 1 = 0', schema: Schema.Array(Schema.Unknown), bindValues: {} },
      { deps: id ?? '' }
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
            bindValues: { worldId },
          }
        : { query: 'SELECT * FROM pois WHERE 1 = 0', schema: Schema.Array(Schema.Unknown), bindValues: {} },
      { deps: [worldId], map: parseJsonRows }
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
            bindValues: { worldId },
          }
        : { query: 'SELECT * FROM pois WHERE 1 = 0', schema: Schema.Array(Schema.Unknown), bindValues: {} },
      { deps: [worldId, limit], map: parseJsonRows }
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
            bindValues: { worldId },
          }
        : { query: 'SELECT * FROM pois WHERE 1 = 0', schema: Schema.Array(Schema.Unknown), bindValues: {} },
      { deps: [worldId], map: parseJsonRows }
    )
  ) as POI[]
}
