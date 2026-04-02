import { queryDb, Schema } from '@livestore/livestore'
import { useQuery } from '@livestore/react'
import type { NPC } from '@domain/entities/NPC'

export function useNPCsByPoiIds(poiIds: string[]) {
  const placeholders = poiIds.map((_, i) => `$id${i}`).join(', ')
  const bindValues = Object.fromEntries(poiIds.map((id, i) => [`id${i}`, id]))
  const query = poiIds.length > 0
    ? `SELECT * FROM npcs WHERE poiId IN (${placeholders})`
    : 'SELECT * FROM npcs WHERE 0'
  const results = useQuery(queryDb({
    query,
    schema: Schema.Array(Schema.Unknown),
    bindValues: poiIds.length > 0 ? bindValues : {},
  }, { deps: poiIds.join(',') })) as NPC[]
  return results
}
