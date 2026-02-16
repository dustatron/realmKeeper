import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@infrastructure/dexie/db'
import type { EntityNote } from '@domain/entities/EntityNote'

export function useEntityNotes(ownerType: 'poi' | 'region', ownerId: string | null): EntityNote[] {
  return useLiveQuery(
    () => {
      if (!ownerId) return []
      return db.entityNotes
        .where('[ownerType+ownerId]')
        .equals([ownerType, ownerId])
        .sortBy('sortOrder')
    },
    [ownerType, ownerId]
  ) ?? []
}
