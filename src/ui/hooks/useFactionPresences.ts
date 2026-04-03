import { queryDb } from '@livestore/livestore'
import { useQuery } from '@livestore/react'
import { factionPresencesTable } from '@infrastructure/livestore/tables'
import type { FactionPresence } from '@domain/entities/FactionPresence'

export function useFactionPresencesByPoi(poiId: string | null) {
  return useQuery(
    queryDb(
      poiId
        ? factionPresencesTable.select().where({ poiId })
        : factionPresencesTable.select().where({ poiId: '' }),
      { deps: poiId ?? '' }
    )
  ) as FactionPresence[]
}

export function useFactionPresencesByFaction(factionId: string | null) {
  return useQuery(
    queryDb(
      factionId
        ? factionPresencesTable.select().where({ factionId })
        : factionPresencesTable.select().where({ factionId: '' }),
      { deps: factionId ?? '' }
    )
  ) as FactionPresence[]
}
