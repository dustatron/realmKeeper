import { queryDb, Schema } from '@livestore/livestore'
import { useQuery } from '@livestore/react'
import type { POI } from '@domain/entities/POI'

export function usePOIChildren(parentPoiId: string | null) {
  return useQuery(
    queryDb(
      parentPoiId
        ? {
            query: 'SELECT * FROM pois WHERE parentPoiId = $parentPoiId',
            schema: Schema.Array(Schema.Unknown),
            bindValues: { parentPoiId },
          }
        : { query: 'SELECT * FROM pois WHERE 1 = 0', schema: Schema.Array(Schema.Unknown), bindValues: {} },
      { deps: [parentPoiId] }
    )
  ) as POI[]
}
