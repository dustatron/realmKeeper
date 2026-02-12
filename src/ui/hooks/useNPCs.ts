import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@infrastructure/dexie/db'

export function useNPCs(realmId: string | null) {
  return useLiveQuery(
    () => (realmId ? db.npcs.where('realmId').equals(realmId).toArray() : []),
    [realmId]
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
    () => (factionId ? db.npcs.where('factionId').equals(factionId).toArray() : []),
    [factionId]
  ) ?? []
}
