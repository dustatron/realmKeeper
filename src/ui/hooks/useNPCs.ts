import { queryDb, Schema } from '@livestore/livestore'
import { useQuery } from '@livestore/react'
import type { NPC } from '@domain/entities/NPC'

export function useNPCs(worldId: string | null) {
  const results = useQuery(queryDb({
    query: 'SELECT * FROM npcs WHERE worldId = $worldId',
    schema: Schema.Array(Schema.Unknown),
    bindValues: { $worldId: worldId ?? '' },
  }, { deps: [worldId] })) as NPC[]
  return worldId ? results : []
}

export function useNPC(id: string | null) {
  const results = useQuery(queryDb({
    query: 'SELECT * FROM npcs WHERE id = $id LIMIT 1',
    schema: Schema.Array(Schema.Unknown),
    bindValues: { $id: id ?? '' },
  }, { deps: [id] })) as NPC[]
  return results[0] as NPC | undefined
}

export function useStarredNPCs(worldId: string | null) {
  const results = useQuery(queryDb({
    query: 'SELECT * FROM npcs WHERE worldId = $worldId AND starred = 1',
    schema: Schema.Array(Schema.Unknown),
    bindValues: { $worldId: worldId ?? '' },
  }, { deps: [worldId] })) as NPC[]
  return worldId ? results : []
}

export function useNPCsByFaction(factionId: string | null) {
  const results = useQuery(queryDb({
    query: 'SELECT * FROM npcs WHERE EXISTS (SELECT 1 FROM json_each(factionIds) WHERE value = $factionId)',
    schema: Schema.Array(Schema.Unknown),
    bindValues: { $factionId: factionId ?? '' },
  }, { deps: [factionId] })) as NPC[]
  return factionId ? results : []
}
