import { queryDb, Schema } from '@livestore/livestore'
import { useQuery } from '@livestore/react'
import { useMemo } from 'react'
import type { POI } from '@domain/entities/POI'

/**
 * Returns an ordered breadcrumb chain from the root POI down to the given POI.
 *
 * Uses a SQLite recursive CTE to walk the parentPoiId chain in a single query,
 * then sorts the flat result by depth so ancestors come first.
 */
export function usePOIBreadcrumb(poiId: string | null): POI[] {
  const rows = useQuery(
    queryDb(
      poiId
        ? {
            query: `WITH RECURSIVE breadcrumb(id, regionId, parentPoiId, name, description, type, subtypeLabel,
                      floor, tags, position, mapRef, markerColor, readAloud, gmNotes, trouble, mood, sensory,
                      services, imageUrl, monsterRefs, magicItemRefs, spellRefs, equipmentRefs, locationSeed,
                      traps, treasure, roomWidth, roomLength, visited, lightLevel, wanderingMonsters,
                      watabouSeed, watabouGenerator, watabouData, sessionLog, spatialDungeon, dungeonGenOptions,
                      starred, createdAt, updatedAt, depth) AS (
                      SELECT *, 0 FROM pois WHERE id = $poiId
                      UNION ALL
                      SELECT p.*, b.depth + 1 FROM pois p
                      INNER JOIN breadcrumb b ON p.id = b.parentPoiId
                    )
                    SELECT * FROM breadcrumb ORDER BY depth DESC`,
            schema: Schema.Array(Schema.Unknown),
            bindValues: { poiId },
          }
        : { query: 'SELECT * FROM pois WHERE 1 = 0', schema: Schema.Array(Schema.Unknown), bindValues: {} },
      { deps: [poiId] }
    )
  ) as (POI & { depth: number })[]

  return useMemo(() => rows.map(({ depth: _depth, ...poi }) => poi as POI), [rows])
}
