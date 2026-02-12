import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@infrastructure/dexie/db'

export function useRelationships(factionIds: string[]) {
  return useLiveQuery(
    () => factionIds.length > 0
      ? db.factionRelationships.where('factionId').anyOf(factionIds).toArray()
      : [],
    [factionIds.join(',')]
  ) ?? []
}

export function useRelationshipPair(factionId: string | null, targetId: string | null) {
  return useLiveQuery(
    () => factionId && targetId
      ? db.factionRelationships.where('[factionId+targetId]').equals([factionId, targetId]).first()
      : undefined,
    [factionId, targetId]
  )
}
