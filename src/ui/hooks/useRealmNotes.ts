import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@infrastructure/dexie/db'

export function useRealmNotes(realmId: string | null) {
  return useLiveQuery(
    () => realmId
      ? db.realmNotes.where('realmId').equals(realmId).sortBy('sortOrder')
      : [],
    [realmId]
  ) ?? []
}

export function useMainNote(realmId: string | null) {
  return useLiveQuery(
    () => realmId
      ? db.realmNotes.where('realmId').equals(realmId).filter((n) => n.isMain).first()
      : undefined,
    [realmId]
  )
}
