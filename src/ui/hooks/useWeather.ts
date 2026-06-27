import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@infrastructure/dexie/db'
import type { Season } from '@shared/constants'
import type { WeatherHistory } from '@domain/entities/WeatherHistory'

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

/** Weather for a specific world date (the realm's current day). Returns the
 *  most recent matching row, null if none, or undefined while loading. */
export function useCurrentWeather(
  worldId: string | null,
  year: number | null,
  season: Season | null,
  day: number | null,
) {
  return useLiveQuery(
    () =>
      worldId && year != null && season != null && day != null
        ? db.weatherHistory
            .where('worldId')
            .equals(worldId)
            .toArray()
            .then(
              (rows): WeatherHistory | null =>
                rows
                  .filter((w) => w.year === year && w.season === season && w.day === day)
                  .sort((a, b) => b.createdAt - a.createdAt)[0] ?? null
            )
        : Promise.resolve<WeatherHistory | null>(null),
    [worldId, year, season, day]
  )
}

export function useAllWeather(worldId: string | null) {
  return useLiveQuery(
    () => worldId
      ? db.weatherHistory.where('worldId').equals(worldId).toArray()
      : [],
    [worldId]
  ) ?? []
}
