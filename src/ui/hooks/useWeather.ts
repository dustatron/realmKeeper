import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@infrastructure/dexie/db'

export function useRecentWeather(realmId: string | null, limit = 7) {
  return useLiveQuery(
    () => realmId
      ? db.weatherHistory
          .where('realmId')
          .equals(realmId)
          .toArray()
          .then((w) => w.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit))
      : [],
    [realmId, limit]
  ) ?? []
}
