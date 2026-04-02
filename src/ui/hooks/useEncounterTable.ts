import { queryDb, Schema } from '@livestore/livestore'
import { useQuery } from '@livestore/react'
import { useMemo } from 'react'
import type { EncounterTable } from '@domain/entities/EncounterTable'

export function useEncounterTable(
  poiId: string | null,
  regionId: string | null,
  _worldId: string | null
): EncounterTable | undefined | null {
  // Cascade: POI → Region. Fetch both, resolve priority in useMemo.
  const poiRows = useQuery(
    queryDb(
      poiId
        ? {
            query: 'SELECT * FROM encounterTables WHERE ownerPoiId = $poiId LIMIT 1',
            schema: Schema.Array(Schema.Unknown),
            bindValues: { $poiId: poiId },
          }
        : { query: 'SELECT * FROM encounterTables WHERE 1 = 0', schema: Schema.Array(Schema.Unknown), bindValues: {} },
      { deps: [poiId] }
    )
  ) as EncounterTable[]

  const regionRows = useQuery(
    queryDb(
      regionId
        ? {
            query: 'SELECT * FROM encounterTables WHERE ownerRegionId = $regionId LIMIT 1',
            schema: Schema.Array(Schema.Unknown),
            bindValues: { $regionId: regionId },
          }
        : { query: 'SELECT * FROM encounterTables WHERE 1 = 0', schema: Schema.Array(Schema.Unknown), bindValues: {} },
      { deps: [regionId] }
    )
  ) as EncounterTable[]

  return useMemo(() => {
    if (poiRows.length > 0) return poiRows[0]
    if (regionRows.length > 0) return regionRows[0]
    return null
  }, [poiRows, regionRows])
}
