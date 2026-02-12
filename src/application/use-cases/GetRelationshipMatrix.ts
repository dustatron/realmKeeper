import type { IFactionRelationshipRepository } from '@application/ports/IFactionRelationshipRepository'
import type { IFactionRepository } from '@application/ports/IFactionRepository'
import type { Faction } from '@domain/entities/Faction'
import type { FactionRelationship } from '@domain/entities/FactionRelationship'

export interface RelationshipMatrix {
  factions: Faction[]
  relationships: FactionRelationship[]
  getScore: (factionId: string, targetId: string) => number
}

export async function executeGetRelationshipMatrix(
  realmId: string,
  deps: {
    factionRepo: IFactionRepository
    relationshipRepo: IFactionRelationshipRepository
  }
): Promise<RelationshipMatrix> {
  const factions = await deps.factionRepo.getByRealmId(realmId)
  const factionIds = factions.map((f) => f.id)
  const relationships = await deps.relationshipRepo.getAllForRealm(realmId, factionIds)

  const relMap = new Map<string, number>()
  for (const rel of relationships) {
    relMap.set(`${rel.factionId}:${rel.targetId}`, rel.score)
  }

  return {
    factions,
    relationships,
    getScore: (factionId, targetId) => relMap.get(`${factionId}:${targetId}`) ?? 0,
  }
}
