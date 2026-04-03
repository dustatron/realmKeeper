import { queryDb } from '@livestore/livestore'
import { useQuery } from '@livestore/react'
import { npcsTable } from '@infrastructure/livestore/tables'
import type { NPC } from '@domain/entities/NPC'

export function useNPCsByPoi(poiId: string | null) {
  const results = useQuery(
    queryDb(
      poiId
        ? npcsTable.select().where({ poiId })
        : npcsTable.select().where({ poiId: '' }),
      { deps: poiId ?? '' }
    )
  ) as NPC[]
  return poiId ? results : []
}
