import { db } from '@infrastructure/dexie/db'
import type { IFactionRepository } from '@application/ports/IFactionRepository'
import type { Faction } from '@domain/entities/Faction'

export class FactionRepository implements IFactionRepository {
  async getById(id: string): Promise<Faction | undefined> {
    return db.factions.get(id)
  }

  async getByRealmId(worldId: string): Promise<Faction[]> {
    return db.factions.where('worldId').equals(worldId).toArray()
  }

  async getPartyFaction(worldId: string): Promise<Faction | undefined> {
    return db.factions
      .where('worldId')
      .equals(worldId)
      .filter((f) => f.isParty)
      .first()
  }

  async getActive(worldId: string): Promise<Faction[]> {
    return db.factions
      .where('worldId')
      .equals(worldId)
      .filter((f) => f.status === 'active')
      .toArray()
  }

  async create(faction: Faction): Promise<void> {
    await db.factions.put(faction)
  }

  async update(faction: Faction): Promise<void> {
    await db.factions.put(faction)
  }

  async delete(id: string): Promise<void> {
    await db.factions.delete(id)
  }
}
