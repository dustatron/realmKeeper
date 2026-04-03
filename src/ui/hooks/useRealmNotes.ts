import { queryDb, Schema } from '@livestore/livestore'
import { useQuery } from '@livestore/react'
import { parseJsonRows } from '@shared/parseJsonRow'
import type { RealmNote } from '@domain/entities/RealmNote'

export function useRealmNotes(worldId: string | null) {
  return useQuery(queryDb({
    query: worldId
      ? 'SELECT * FROM realmNotes WHERE worldId = $worldId ORDER BY sortOrder ASC'
      : 'SELECT * FROM realmNotes WHERE 1 = 0',
    schema: Schema.Array(Schema.Unknown),
    bindValues: worldId ? { worldId } : {},
  }, { deps: [worldId], map: parseJsonRows })) as RealmNote[]
}

export function useMainNote(worldId: string | null) {
  const results = useQuery(queryDb({
    query: worldId
      ? 'SELECT * FROM realmNotes WHERE worldId = $worldId AND isMain = 1 LIMIT 1'
      : 'SELECT * FROM realmNotes WHERE 1 = 0',
    schema: Schema.Array(Schema.Unknown),
    bindValues: worldId ? { worldId } : {},
  }, { deps: [worldId], map: parseJsonRows })) as RealmNote[]
  return results[0] ?? undefined
}
