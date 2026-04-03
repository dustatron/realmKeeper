import { queryDb } from '@livestore/livestore'
import { useQuery } from '@livestore/react'
import { poisTable } from '@infrastructure/livestore/tables'
import { parseJsonRows } from '@shared/parseJsonRow'
import type { POI } from '@domain/entities/POI'

export function usePOIChildren(parentPoiId: string | null) {
  return useQuery(
    queryDb(
      parentPoiId
        ? poisTable.select().where({ parentPoiId })
        : poisTable.select().where({ parentPoiId: '' }),
      { deps: parentPoiId ?? '', map: parseJsonRows }
    )
  ) as POI[]
}
