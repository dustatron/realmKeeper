import { queryDb, Schema } from '@livestore/livestore'
import { useQuery } from '@livestore/react'
import type { Region } from '@domain/entities/Region'

export function useRegions(worldId: string | null) {
  const results = useQuery(queryDb({
    query: 'SELECT * FROM regions WHERE worldId = $worldId',
    schema: Schema.Array(Schema.Unknown),
    bindValues: { $worldId: worldId ?? '' },
  }, { deps: [worldId] })) as Region[]
  return worldId ? results : []
}

export function useRegion(id: string | null) {
  const results = useQuery(queryDb({
    query: 'SELECT * FROM regions WHERE id = $id LIMIT 1',
    schema: Schema.Array(Schema.Unknown),
    bindValues: { $id: id ?? '' },
  }, { deps: [id] })) as Region[]
  return results[0] as Region | undefined
}
