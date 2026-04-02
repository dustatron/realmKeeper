import type { Store } from '@livestore/livestore'
import type { IFactionPresenceRepository } from '@application/ports/IFactionPresenceRepository'
import type { FactionPresence } from '@domain/entities/FactionPresence'
import {
  factionPresenceCreated,
  factionPresenceUpdated,
  factionPresenceDeleted,
} from '../events'
import type { schema } from '../schema'
import { factionPresencesTable } from '../tables'

export class FactionPresenceRepository implements IFactionPresenceRepository {
  constructor(private store: Store<typeof schema>) {}

  async getById(id: string): Promise<FactionPresence | undefined> {
    const results = this.store.query(
      factionPresencesTable.select().where({ id })
    ) as FactionPresence[]
    return results[0] ?? undefined
  }

  async getByFactionId(factionId: string): Promise<FactionPresence[]> {
    return this.store.query(
      factionPresencesTable.select().where({ factionId })
    ) as FactionPresence[]
  }

  async getByPoiId(poiId: string): Promise<FactionPresence[]> {
    return this.store.query(
      factionPresencesTable.select().where({ poiId })
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
