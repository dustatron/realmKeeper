import type { Store } from '@livestore/livestore'
import type { IFactionRelationshipRepository } from '@application/ports/IFactionRelationshipRepository'
import type { FactionRelationship } from '@domain/entities/FactionRelationship'
import {
  factionRelationshipCreated,
  factionRelationshipUpdated,
  factionRelationshipDeleted,
} from '../events'
import type { schema } from '../schema'

export class FactionRelationshipRepository
  implements IFactionRelationshipRepository
{
  constructor(private store: Store<typeof schema>) {}

  async getById(id: string): Promise<FactionRelationship | undefined> {
    const results = this.store.query(
      { query: 'SELECT * FROM factionRelationships WHERE id = $id', bindValues: { $id: id } }
    ) as FactionRelationship[]
    return results[0] ?? undefined
  }

  async getByFactionId(factionId: string): Promise<FactionRelationship[]> {
    return this.store.query(
      { query: 'SELECT * FROM factionRelationships WHERE factionId = $factionId', bindValues: { $factionId: factionId } }
    ) as FactionRelationship[]
  }

  async getPair(
    factionId: string,
    targetId: string
  ): Promise<FactionRelationship | undefined> {
    const results = this.store.query(
      { query: 'SELECT * FROM factionRelationships WHERE factionId = $factionId AND targetId = $targetId LIMIT 1', bindValues: { $factionId: factionId, $targetId: targetId } }
    ) as FactionRelationship[]
    return results[0] ?? undefined
  }

  async getAllForRealm(
    _worldId: string,
    factionIds: string[]
  ): Promise<FactionRelationship[]> {
    if (factionIds.length === 0) return []
    const placeholders = factionIds.map((id) => `'${id}'`).join(', ')
    return this.store.query(
      { query: `SELECT * FROM factionRelationships WHERE factionId IN (${placeholders})`, bindValues: {} }
    ) as FactionRelationship[]
  }

  async create(rel: FactionRelationship): Promise<void> {
    this.store.commit(factionRelationshipCreated(rel as any))
  }

  async update(rel: FactionRelationship): Promise<void> {
    this.store.commit(factionRelationshipUpdated(rel as any))
  }

  async delete(id: string): Promise<void> {
    this.store.commit(factionRelationshipDeleted({ id }))
  }
}
