import { queryDb, Schema } from '@livestore/livestore'
import { useQuery } from '@livestore/react'
import { useMemo } from 'react'
import { parseJsonRows } from '@shared/parseJsonRow'
import type { GameMap } from '@domain/entities/GameMap'
import type { POI } from '@domain/entities/POI'
import type { Path } from '@domain/entities/Path'

export function useRealmMaps(worldId: string | null) {
  return useQuery(
    queryDb(
      worldId
        ? {
            query: 'SELECT * FROM gameMaps WHERE ownerRealmId = $worldId ORDER BY sortOrder ASC',
            schema: Schema.Array(Schema.Unknown),
            bindValues: { worldId },
          }
        : { query: 'SELECT * FROM gameMaps WHERE 1 = 0', schema: Schema.Array(Schema.Unknown), bindValues: {} },
      { deps: [worldId], map: parseJsonRows }
    )
  ) as GameMap[]
}

/** All maps in a realm: realm-owned + owned by POIs in that realm */
export function useAllRealmMaps(worldId: string | null) {
  return useQuery(
    queryDb(
      worldId
        ? {
            query: `SELECT gm.* FROM gameMaps gm
                    WHERE gm.ownerRealmId = $worldId
                    UNION ALL
                    SELECT gm.* FROM gameMaps gm
                    INNER JOIN pois p ON gm.ownerPoiId = p.id
                    INNER JOIN regions r ON p.regionId = r.id
                    WHERE r.worldId = $worldId
                    ORDER BY sortOrder ASC`,
            schema: Schema.Array(Schema.Unknown),
            bindValues: { worldId },
          }
        : { query: 'SELECT * FROM gameMaps WHERE 1 = 0', schema: Schema.Array(Schema.Unknown), bindValues: {} },
      { deps: [worldId], map: parseJsonRows }
    )
  ) as GameMap[]
}

export function usePOIMaps(poiId: string | null) {
  return useQuery(
    queryDb(
      poiId
        ? {
            query: 'SELECT * FROM gameMaps WHERE ownerPoiId = $poiId ORDER BY sortOrder ASC',
            schema: Schema.Array(Schema.Unknown),
            bindValues: { poiId },
          }
        : { query: 'SELECT * FROM gameMaps WHERE 1 = 0', schema: Schema.Array(Schema.Unknown), bindValues: {} },
      { deps: [poiId], map: parseJsonRows }
    )
  ) as GameMap[]
}

export function useGameMap(mapId: string | null) {
  const rows = useQuery(
    queryDb(
      mapId
        ? {
            query: 'SELECT * FROM gameMaps WHERE id = $mapId LIMIT 1',
            schema: Schema.Array(Schema.Unknown),
            bindValues: { mapId },
          }
        : { query: 'SELECT * FROM gameMaps WHERE 1 = 0', schema: Schema.Array(Schema.Unknown), bindValues: {} },
      { deps: [mapId], map: parseJsonRows }
    )
  ) as GameMap[]
  return rows[0] as GameMap | undefined
}

export function usePOIsOnMap(mapId: string | null) {
  return useQuery(
    queryDb(
      mapId
        ? {
            query: 'SELECT * FROM pois WHERE mapRef = $mapId',
            schema: Schema.Array(Schema.Unknown),
            bindValues: { mapId },
          }
        : { query: 'SELECT * FROM pois WHERE 1 = 0', schema: Schema.Array(Schema.Unknown), bindValues: {} },
      { deps: [mapId], map: parseJsonRows }
    )
  ) as POI[]
}

export function usePathsOnMap(mapId: string | null) {
  // Only include paths where BOTH endpoints are POIs on this map.
  return useQuery(
    queryDb(
      mapId
        ? {
            query: `SELECT paths.* FROM paths
                    INNER JOIN pois fp ON paths.fromPoiId = fp.id AND fp.mapRef = $mapId
                    INNER JOIN pois tp ON paths.toPoiId = tp.id AND tp.mapRef = $mapId`,
            schema: Schema.Array(Schema.Unknown),
            bindValues: { mapId },
          }
        : { query: 'SELECT * FROM paths WHERE 1 = 0', schema: Schema.Array(Schema.Unknown), bindValues: {} },
      { deps: [mapId], map: parseJsonRows }
    )
  ) as Path[]
}
