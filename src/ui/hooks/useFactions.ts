import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@infrastructure/dexie/db'

export function useFactions(realmId: string | null) {
  return useLiveQuery(
    () => (realmId ? db.factions.where('realmId').equals(realmId).toArray() : []),
    [realmId]
  ) ?? []
}

export function useFaction(id: string | null) {
  return useLiveQuery(
    () => (id ? db.factions.get(id) : undefined),
    [id]
  )
}

export function usePartyFaction(realmId: string | null) {
  return useLiveQuery(
    () => realmId
      ? db.factions.where('realmId').equals(realmId).filter((f) => f.isParty).first()
      : undefined,
    [realmId]
  )
}

export function useActiveFactions(realmId: string | null) {
  return useLiveQuery(
    () => realmId
      ? db.factions.where('realmId').equals(realmId).filter((f) => f.status === 'active' && !f.isParty).toArray()
      : [],
    [realmId]
  ) ?? []
}
