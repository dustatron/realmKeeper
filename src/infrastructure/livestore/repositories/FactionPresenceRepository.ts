import type { Store } from '@livestore/livestore'
import type { IFactionPresenceRepository } from '@application/ports/IFactionPresenceRepository'
import type { FactionPresence } from '@domain/entities/FactionPresence'
import {
  factionPresenceCreated,
  factionPresenceUpdated,
  factionPresenceDeleted,
} from '../events'
import type { schema } from '../schema'

export class FactionPresenceRepository implements IFactionPresenceRepository {
  constructor(private store: Store<typeof schema>) {}

  async getById(id: string): Promise<FactionPresence | undefined> {
    const results = this.store.query(
      { query: 'SELECT * FROM factionPresences WHERE id = $id', bindValues: { $id: id } }
    ) as FactionPresence[]
    return results[0] ?? undefined
  }

  async getByFactionId(factionId: string): Promise<FactionPresence[]> {
    return this.store.query(
      { query: 'SELECT * FROM factionPresences WHERE factionId = $factionId', bindValues: { $factionId: factionId } }
    ) as FactionPresence[]
  }

  async getByPoiId(poiId: string): Promise<FactionPresence[]> {
    return this.store.query(
      { query: 'SELECT * FROM factionPresences WHERE poiId = $poiId', bindValues: { $poiId: poiId } }
    ) as FactionPresence[]
  }

  async create(presence: FactionPresence): Promise<void> {
    this.store.commit(factionPresenceCreated(presence as any))
  }

  async update(presence: FactionPresence): Promise<void> {
    this.store.commit(factionPresenceUpdated(presence as any))
  }

  async delete(id: string): Promise<void> {
    this.store.commit(factionPresenceDeleted({ id }))
  }
}
