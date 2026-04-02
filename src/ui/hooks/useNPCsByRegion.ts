import { queryDb, Schema } from '@livestore/livestore'
import { useQuery } from '@livestore/react'
import type { NPC } from '@domain/entities/NPC'

export function useNPCsByRegion(regionId: string | null) {
  const results = useQuery(queryDb({
    query: 'SELECT * FROM npcs WHERE regionId = $regionId',
    schema: Schema.Array(Schema.Unknown),
    bindValues: { $regionId: regionId ?? '' },
  }, { deps: [regionId] })) as NPC[]
  return regionId ? results : []
}
