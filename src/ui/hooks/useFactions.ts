import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@infrastructure/dexie/db'

export function useFactions(worldId: string | null) {
  return useLiveQuery(
    () => worldId
      ? db.factions.where('worldId').equals(worldId).toArray()
          .then((factions) => factions.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)))
      : [],
    [worldId]
  ) ?? []
}

export function useFaction(id: string | null) {
  return useLiveQuery(
    () => (id ? db.factions.get(id) : undefined),
    [id]
  )
}

export function usePartyFaction(worldId: string | null) {
  return useLiveQuery(
    () => worldId
      ? db.factions.where('worldId').equals(worldId).filter((f) => f.isParty).first()
      : undefined,
    [worldId]
  )
}

export function useActiveFactions(worldId: string | null) {
  return useLiveQuery(
    () => worldId
      ? db.factions.where('worldId').equals(worldId).filter((f) => f.status === 'active' && !f.isParty).toArray()
      : [],
    [worldId]
  ) ?? []
}
