import type { Store } from '@livestore/livestore'
import type { IFactionRepository } from '@application/ports/IFactionRepository'
import type { Faction } from '@domain/entities/Faction'
import {
  factionCreated,
  factionUpdated,
  factionDeleted,
} from '../events'
import type { schema } from '../schema'
import { factionsTable } from '../tables'

export class FactionRepository implements IFactionRepository {
  constructor(private store: Store<typeof schema>) {}

  async getById(id: string): Promise<Faction | undefined> {
    const results = this.store.query(
      factionsTable.select().where({ id })
    ) as Faction[]
    return results[0] ?? undefined
  }

  async getByRealmId(worldId: string): Promise<Faction[]> {
    return this.store.query(
      factionsTable.select().where({ worldId })
    ) as Faction[]
  }

  async getPartyFaction(worldId: string): Promise<Faction | undefined> {
    const results = this.store.query(
      { query: 'SELECT * FROM factions WHERE worldId = $worldId AND isParty = 1 LIMIT 1', bindValues: { worldId } }
    ) as Faction[]
    return results[0] ?? undefined
  }

  async getActive(worldId: string): Promise<Faction[]> {
    return this.store.query(
      { query: "SELECT * FROM factions WHERE worldId = $worldId AND status = 'active'", bindValues: { worldId } }
    ) as Faction[]
  }

  async create(faction: Faction): Promise<void> {
    this.store.commit(factionCreated(faction as any))
  }

  async update(faction: Faction): Promise<void> {
    this.store.commit(factionUpdated(faction as any))
  }

  async delete(id: string): Promise<void> {
    this.store.commit(factionDeleted({ id }))
  }
}
