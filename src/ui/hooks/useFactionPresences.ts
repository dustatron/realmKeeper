import { queryDb, Schema } from '@livestore/livestore'
import { useQuery } from '@livestore/react'
import type { FactionPresence } from '@domain/entities/FactionPresence'

export function useFactionPresencesByPoi(poiId: string | null) {
  return useQuery(
    queryDb(
      poiId
        ? {
            query: 'SELECT * FROM factionPresences WHERE poiId = $poiId',
            schema: Schema.Array(Schema.Unknown),
            bindValues: { $poiId: poiId },
          }
        : { query: 'SELECT * FROM factionPresences WHERE 1 = 0', schema: Schema.Array(Schema.Unknown), bindValues: {} },
      { deps: [poiId] }
    )
  ) as FactionPresence[]
}

export function useFactionPresencesByFaction(factionId: string | null) {
  return useQuery(
    queryDb(
      factionId
        ? {
            query: 'SELECT * FROM factionPresences WHERE factionId = $factionId',
            schema: Schema.Array(Schema.Unknown),
            bindValues: { $factionId: factionId },
          }
        : {
            query: 'SELECT * FROM factionPresences WHERE 1 = 0',
            schema: Schema.Array(Schema.Unknown),
            bindValues: {},
          },
      { deps: [factionId] }
    )
  ) as FactionPresence[]
}
