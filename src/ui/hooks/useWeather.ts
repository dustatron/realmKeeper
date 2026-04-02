import { queryDb, Schema } from '@livestore/livestore'
import { useQuery } from '@livestore/react'
import type { WeatherHistory } from '@domain/entities/WeatherHistory'

export function useRecentWeather(worldId: string | null, limit = 7) {
  return useQuery(queryDb({
    query: worldId
      ? `SELECT * FROM weatherHistory WHERE worldId = $worldId ORDER BY createdAt DESC LIMIT ${limit}`
      : 'SELECT * FROM weatherHistory WHERE 1 = 0',
    schema: Schema.Array(Schema.Unknown),
    bindValues: worldId ? { worldId } : {},
  }, { deps: [worldId, limit] })) as WeatherHistory[]
}

export function useAllWeather(worldId: string | null) {
  return useQuery(queryDb({
    query: worldId
      ? 'SELECT * FROM weatherHistory WHERE worldId = $worldId'
      : 'SELECT * FROM weatherHistory WHERE 1 = 0',
    schema: Schema.Array(Schema.Unknown),
    bindValues: worldId ? { worldId } : {},
  }, { deps: [worldId] })) as WeatherHistory[]
}
