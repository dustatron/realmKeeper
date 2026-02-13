import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@infrastructure/dexie/db'

export function useFactionPresencesByPoi(poiId: string | null) {
  return useLiveQuery(
    () => poiId ? db.factionPresences.where('poiId').equals(poiId).toArray() : [],
    [poiId]
  ) ?? []
}

export function useFactionPresencesByFaction(factionId: string | null) {
  return useLiveQuery(
    () => factionId ? db.factionPresences.where('factionId').equals(factionId).toArray() : [],
    [factionId]
  ) ?? []
}
