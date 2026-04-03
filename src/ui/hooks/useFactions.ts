import { queryDb, Schema } from '@livestore/livestore'
import { useQuery } from '@livestore/react'
import { parseJsonRows } from '@shared/parseJsonRow'
import type { Faction } from '@domain/entities/Faction'

export function useFactions(worldId: string | null) {
  const results = useQuery(queryDb({
    query: 'SELECT * FROM factions WHERE worldId = $worldId ORDER BY sortOrder ASC',
    schema: Schema.Array(Schema.Unknown),
    bindValues: { worldId: worldId ?? '' },
  }, { deps: [worldId], map: parseJsonRows })) as Faction[]
  return worldId ? results : []
}

export function useFaction(id: string | null) {
  const results = useQuery(queryDb({
    query: 'SELECT * FROM factions WHERE id = $id LIMIT 1',
    schema: Schema.Array(Schema.Unknown),
    bindValues: { id: id ?? '' },
  }, { deps: [id], map: parseJsonRows })) as Faction[]
  return results[0] as Faction | undefined
}

export function usePartyFaction(worldId: string | null) {
  const results = useQuery(queryDb({
    query: 'SELECT * FROM factions WHERE worldId = $worldId AND isParty = 1 LIMIT 1',
    schema: Schema.Array(Schema.Unknown),
    bindValues: { worldId: worldId ?? '' },
  }, { deps: [worldId], map: parseJsonRows })) as Faction[]
  return (worldId ? results[0] : undefined) as Faction | undefined
}

export function useActiveFactions(worldId: string | null) {
  const results = useQuery(queryDb({
    query: "SELECT * FROM factions WHERE worldId = $worldId AND status = 'active' AND isParty = 0",
    schema: Schema.Array(Schema.Unknown),
    bindValues: { worldId: worldId ?? '' },
  }, { deps: [worldId], map: parseJsonRows })) as Faction[]
  return worldId ? results : []
}
