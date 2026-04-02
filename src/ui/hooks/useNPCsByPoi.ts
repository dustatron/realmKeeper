import { queryDb, Schema } from '@livestore/livestore'
import { useQuery } from '@livestore/react'
import type { NPC } from '@domain/entities/NPC'

export function useNPCsByPoi(poiId: string | null) {
  const results = useQuery(queryDb({
    query: 'SELECT * FROM npcs WHERE poiId = $poiId',
    schema: Schema.Array(Schema.Unknown),
    bindValues: { $poiId: poiId ?? '' },
  }, { deps: [poiId] })) as NPC[]
  return poiId ? results : []
}
