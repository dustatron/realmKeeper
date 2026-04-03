import { queryDb, Schema } from '@livestore/livestore'
import { useQuery } from '@livestore/react'
import { parseJsonRows } from '@shared/parseJsonRow'
import type { Rumor } from '@domain/entities/Rumor'

export function useRumorsByPoi(poiId: string | null) {
  return useQuery(queryDb({
    query: poiId
      ? 'SELECT * FROM rumors WHERE poiId = $poiId'
      : 'SELECT * FROM rumors WHERE 1 = 0',
    schema: Schema.Array(Schema.Unknown),
    bindValues: poiId ? { poiId } : {},
  }, { deps: [poiId], map: parseJsonRows })) as Rumor[]
}

export function useRumorsByRegion(regionId: string | null) {
  return useQuery(queryDb({
    query: regionId
      ? 'SELECT * FROM rumors WHERE regionId = $regionId'
      : 'SELECT * FROM rumors WHERE 1 = 0',
    schema: Schema.Array(Schema.Unknown),
    bindValues: regionId ? { regionId } : {},
  }, { deps: [regionId], map: parseJsonRows })) as Rumor[]
}
