import { db } from '@infrastructure/dexie/db'
import type { IFactionRelationshipRepository } from '@application/ports/IFactionRelationshipRepository'
import type { FactionRelationship } from '@domain/entities/FactionRelationship'

export class FactionRelationshipRepository
  implements IFactionRelationshipRepository
{
  async getById(id: string): Promise<FactionRelationship | undefined> {
    return db.factionRelationships.get(id)
  }

  async getByFactionId(factionId: string): Promise<FactionRelationship[]> {
    return db.factionRelationships
      .where('factionId')
      .equals(factionId)
      .toArray()
  }

  async getPair(
    factionId: string,
    targetId: string
  ): Promise<FactionRelationship | undefined> {
    return db.factionRelationships
      .where('[factionId+targetId]')
      .equals([factionId, targetId])
      .first()
  }

  async getAllForRealm(
    _worldId: string,
    factionIds: string[]
  ): Promise<FactionRelationship[]> {
    return db.factionRelationships
      .where('factionId')
      .anyOf(factionIds)
      .toArray()
  }

  async create(rel: FactionRelationship): Promise<void> {
    await db.factionRelationships.put(rel)
  }

  async update(rel: FactionRelationship): Promise<void> {
    await db.factionRelationships.put(rel)
  }

  async delete(id: string): Promise<void> {
    await db.factionRelationships.delete(id)
  }
}
