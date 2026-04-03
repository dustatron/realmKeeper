import { queryDb, Schema } from '@livestore/livestore'
import { useQuery } from '@livestore/react'
import { useMemo } from 'react'
import { parseJsonRows } from '@shared/parseJsonRow'
import type { Path } from '@domain/entities/Path'
import type { POI } from '@domain/entities/POI'

export interface ResolvedPath extends Path {
  fromName: string
  toName: string
}

export function useResolvedPaths(poiId: string | null): ResolvedPath[] {
  const paths = useQuery(
    queryDb(
      poiId
        ? {
            query: `SELECT DISTINCT * FROM paths
                    WHERE fromPoiId = $poiId OR toPoiId = $poiId`,
            schema: Schema.Array(Schema.Unknown),
            bindValues: { poiId },
          }
        : { query: 'SELECT * FROM paths WHERE 1 = 0', schema: Schema.Array(Schema.Unknown), bindValues: {} },
      { deps: [poiId], map: parseJsonRows }
    )
  ) as Path[]

  // Collect all referenced POI ids from current path results so we can name them.
  // We pass them as a comma-separated literal since LiveStore raw queries don't
  // support array bind params.
  const poiIdList = useMemo(() => {
    const ids = new Set<string>()
    for (const p of paths) {
      ids.add(p.fromPoiId)
      ids.add(p.toPoiId)
    }
    return [...ids]
  }, [paths])

  const poiIdLiteral = poiIdList.map((id) => `'${id.replace(/'/g, "''")}'`).join(',')

  const pois = useQuery(
    queryDb(
      poiIdList.length > 0
        ? {
            query: `SELECT id, name FROM pois WHERE id IN (${poiIdLiteral})`,
            schema: Schema.Array(Schema.Unknown),
            bindValues: {},
          }
        : { query: 'SELECT id, name FROM pois WHERE 1 = 0', schema: Schema.Array(Schema.Unknown), bindValues: {} },
      { deps: [poiIdLiteral], map: parseJsonRows }
    )
  ) as Pick<POI, 'id' | 'name'>[]

  return useMemo(() => {
    const nameMap = new Map(pois.map((p) => [p.id, p.name]))
    return paths.map((p) => ({
      ...p,
      fromName: nameMap.get(p.fromPoiId) ?? p.fromPoiId.slice(0, 8),
      toName: nameMap.get(p.toPoiId) ?? p.toPoiId.slice(0, 8),
    }))
  }, [paths, pois])
}
