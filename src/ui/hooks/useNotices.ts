import { queryDb, Schema } from '@livestore/livestore'
import { useQuery } from '@livestore/react'
import type { Notice } from '@domain/entities/Notice'

export function useNoticesByPoi(poiId: string | null) {
  return useQuery(queryDb({
    query: poiId
      ? 'SELECT * FROM notices WHERE poiId = $poiId'
      : 'SELECT * FROM notices WHERE 1 = 0',
    schema: Schema.Array(Schema.Unknown),
    bindValues: poiId ? { poiId } : {},
  }, { deps: [poiId] })) as Notice[]
}

export function useNoticesByRegion(regionId: string | null) {
  return useQuery(queryDb({
    query: regionId
      ? 'SELECT * FROM notices WHERE regionId = $regionId'
      : 'SELECT * FROM notices WHERE 1 = 0',
    schema: Schema.Array(Schema.Unknown),
    bindValues: regionId ? { regionId } : {},
  }, { deps: [regionId] })) as Notice[]
}
