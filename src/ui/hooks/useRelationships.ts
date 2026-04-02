import { queryDb, Schema } from '@livestore/livestore'
import { useQuery } from '@livestore/react'
import type { FactionRelationship } from '@domain/entities/FactionRelationship'

export function useRelationships(factionIds: string[]) {
  const placeholders = factionIds.map((_, i) => `$id${i}`).join(', ')
  const bindValues = Object.fromEntries(factionIds.map((id, i) => [`$id${i}`, id]))
  const query = factionIds.length > 0
    ? `SELECT * FROM factionRelationships WHERE factionId IN (${placeholders})`
    : 'SELECT * FROM factionRelationships WHERE 0'
  const results = useQuery(queryDb({
    query,
    schema: Schema.Array(Schema.Unknown),
    bindValues: factionIds.length > 0 ? bindValues : {},
  }, { deps: factionIds.join(',') })) as FactionRelationship[]
  return results
}

export function useRelationshipPair(factionId: string | null, targetId: string | null) {
  const results = useQuery(queryDb({
    query: 'SELECT * FROM factionRelationships WHERE factionId = $factionId AND targetId = $targetId LIMIT 1',
    schema: Schema.Array(Schema.Unknown),
    bindValues: { $factionId: factionId ?? '', $targetId: targetId ?? '' },
  }, { deps: [factionId, targetId] })) as FactionRelationship[]
  return (factionId && targetId ? results[0] : undefined) as FactionRelationship | undefined
}
