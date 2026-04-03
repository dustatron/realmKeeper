import { queryDb } from '@livestore/livestore'
import { useQuery } from '@livestore/react'
import { npcsTable } from '@infrastructure/livestore/tables'
import { parseJsonRows } from '@shared/parseJsonRow'
import type { NPC } from '@domain/entities/NPC'

export function useNPCsByRegion(regionId: string | null) {
  const results = useQuery(
    queryDb(
      regionId
        ? npcsTable.select().where({ regionId })
        : npcsTable.select().where({ regionId: '' }),
      { deps: regionId ?? '', map: parseJsonRows }
    )
  ) as NPC[]
  return regionId ? results : []
}
