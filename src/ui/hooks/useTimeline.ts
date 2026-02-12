import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@infrastructure/dexie/db'

export function useTimeline(realmId: string | null, limit = 50) {
  return useLiveQuery(
    () => realmId
      ? db.worldEvents
          .where('realmId')
          .equals(realmId)
          .toArray()
          .then((events) =>
            events.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit)
          )
      : [],
    [realmId, limit]
  ) ?? []
}
