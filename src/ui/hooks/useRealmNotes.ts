import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@infrastructure/dexie/db'

export function useRealmNotes(worldId: string | null) {
  return useLiveQuery(
    () => worldId
      ? db.realmNotes.where('worldId').equals(worldId).sortBy('sortOrder')
      : [],
    [worldId]
  ) ?? []
}

export function useMainNote(worldId: string | null) {
  return useLiveQuery(
    () => worldId
      ? db.realmNotes.where('worldId').equals(worldId).filter((n) => n.isMain).first()
      : undefined,
    [worldId]
  )
}
