import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@infrastructure/dexie/db'
import type { EncounterTable } from '@domain/entities/EncounterTable'

export function useEncounterTable(
  poiId: string | null,
  regionId: string | null,
  _worldId: string | null
): EncounterTable | undefined | null {
  return useLiveQuery(
    async () => {
      // Cascade: POI → Region
      if (poiId) {
        const poiTable = await db.encounterTables.where('ownerPoiId').equals(poiId).first()
        if (poiTable) return poiTable
      }
      if (regionId) {
        const regionTable = await db.encounterTables.where('ownerRegionId').equals(regionId).first()
        if (regionTable) return regionTable
      }
      return null
    },
    [poiId, regionId]
  )
}
