import { queryDb, Schema } from '@livestore/livestore'
import { useQuery } from '@livestore/react'
import { parseJsonRows } from '@shared/parseJsonRow'
import type { WorldEvent } from '@domain/entities/WorldEvent'

export function useTimeline(worldId: string | null, limit = 50) {
  return useQuery(queryDb({
    query: worldId
      ? `SELECT * FROM worldEvents WHERE worldId = $worldId ORDER BY createdAt DESC LIMIT ${limit}`
      : 'SELECT * FROM worldEvents WHERE 1 = 0',
    schema: Schema.Array(Schema.Unknown),
    bindValues: worldId ? { worldId } : {},
  }, { deps: [worldId, limit], map: parseJsonRows })) as WorldEvent[]
}

export function useAllEvents(worldId: string | null) {
  return useQuery(queryDb({
    query: worldId
      ? 'SELECT * FROM worldEvents WHERE worldId = $worldId'
      : 'SELECT * FROM worldEvents WHERE 1 = 0',
    schema: Schema.Array(Schema.Unknown),
    bindValues: worldId ? { worldId } : {},
  }, { deps: [worldId], map: parseJsonRows })) as WorldEvent[]
}
