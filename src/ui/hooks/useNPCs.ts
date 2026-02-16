import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@infrastructure/dexie/db'

export function useNPCs(worldId: string | null) {
  return useLiveQuery(
    () => (worldId ? db.npcs.where('worldId').equals(worldId).toArray() : []),
    [worldId]
  ) ?? []
}

export function useNPC(id: string | null) {
  return useLiveQuery(
    () => (id ? db.npcs.get(id) : undefined),
    [id]
  )
}

export function useNPCsByFaction(factionId: string | null) {
  return useLiveQuery(
    () => (factionId ? db.npcs.where('factionIds').equals(factionId).toArray() : []),
    [factionId]
  ) ?? []
}
