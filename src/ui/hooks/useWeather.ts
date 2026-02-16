import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@infrastructure/dexie/db'

export function useRecentWeather(worldId: string | null, limit = 7) {
  return useLiveQuery(
    () => worldId
      ? db.weatherHistory
          .where('worldId')
          .equals(worldId)
          .toArray()
          .then((w) => w.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit))
      : [],
    [worldId, limit]
  ) ?? []
}

export function useAllWeather(worldId: string | null) {
  return useLiveQuery(
    () => worldId
      ? db.weatherHistory.where('worldId').equals(worldId).toArray()
      : [],
    [worldId]
  ) ?? []
}
