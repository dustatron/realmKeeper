import { queryDb, Schema } from '@livestore/livestore'
import { useQuery } from '@livestore/react'
import { pathsTable } from '@infrastructure/livestore/tables'
import type { Path } from '@domain/entities/Path'

export function usePaths() {
  return useQuery(queryDb(pathsTable.select())) as Path[]
}

export function usePathsByPoi(poiId: string | null) {
  return useQuery(
    queryDb(
      poiId
        ? {
            query: `SELECT DISTINCT * FROM paths
                    WHERE fromPoiId = $poiId OR toPoiId = $poiId`,
            schema: Schema.Array(Schema.Unknown),
            bindValues: { $poiId: poiId },
          }
        : { query: 'SELECT * FROM paths WHERE 1 = 0', schema: Schema.Array(Schema.Unknown), bindValues: {} },
      { deps: [poiId] }
    )
  ) as Path[]
}
