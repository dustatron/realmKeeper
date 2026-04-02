import { queryDb, Schema } from '@livestore/livestore'
import { useQuery } from '@livestore/react'
import type { WorldEvent } from '@domain/entities/WorldEvent'

export function useTimeline(worldId: string | null, limit = 50) {
  return useQuery(queryDb({
    query: worldId
      ? 'SELECT * FROM worldEvents WHERE worldId = $worldId ORDER BY createdAt DESC LIMIT $limit'
      : 'SELECT * FROM worldEvents WHERE 1 = 0',
    schema: Schema.Array(Schema.Unknown),
    bindValues: worldId ? { $worldId: worldId, $limit: limit } : {},
  }, { deps: [worldId, limit] })) as WorldEvent[]
}

export function useAllEvents(worldId: string | null) {
  return useQuery(queryDb({
    query: worldId
      ? 'SELECT * FROM worldEvents WHERE worldId = $worldId'
      : 'SELECT * FROM worldEvents WHERE 1 = 0',
    schema: Schema.Array(Schema.Unknown),
    bindValues: worldId ? { $worldId: worldId } : {},
  }, { deps: [worldId] })) as WorldEvent[]
}
