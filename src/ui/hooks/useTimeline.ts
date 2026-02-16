import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@infrastructure/dexie/db'

export function useTimeline(worldId: string | null, limit = 50) {
  return useLiveQuery(
    () => worldId
      ? db.worldEvents
          .where('worldId')
          .equals(worldId)
          .toArray()
          .then((events) =>
            events.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit)
          )
      : [],
    [worldId, limit]
  ) ?? []
}

export function useAllEvents(worldId: string | null) {
  return useLiveQuery(
    () => worldId
      ? db.worldEvents.where('worldId').equals(worldId).toArray()
      : [],
    [worldId]
  ) ?? []
}
