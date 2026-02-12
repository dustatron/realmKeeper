import type { FactionRelationship } from '@domain/entities/FactionRelationship'

export interface IFactionRelationshipRepository {
  getById(id: string): Promise<FactionRelationship | undefined>
  getByFactionId(factionId: string): Promise<FactionRelationship[]>
  getPair(factionId: string, targetId: string): Promise<FactionRelationship | undefined>
  getAllForRealm(realmId: string, factionIds: string[]): Promise<FactionRelationship[]>
  create(rel: FactionRelationship): Promise<void>
  update(rel: FactionRelationship): Promise<void>
  delete(id: string): Promise<void>
}
