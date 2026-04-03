import { queryDb, Schema } from '@livestore/livestore'
import { useQuery } from '@livestore/react'
import { parseJsonRows } from '@shared/parseJsonRow'
import type { EntityNote } from '@domain/entities/EntityNote'

export function useEntityNotes(ownerType: 'poi' | 'region', ownerId: string | null): EntityNote[] {
  return useQuery(
    queryDb(
      ownerId
        ? {
            query: `SELECT * FROM entityNotes
                    WHERE ownerType = $ownerType AND ownerId = $ownerId
                    ORDER BY sortOrder ASC`,
            schema: Schema.Array(Schema.Unknown),
            bindValues: { ownerType, ownerId },
          }
        : { query: 'SELECT * FROM entityNotes WHERE 1 = 0', schema: Schema.Array(Schema.Unknown), bindValues: {} },
      { deps: [ownerType, ownerId], map: parseJsonRows }
    )
  ) as EntityNote[]
}
