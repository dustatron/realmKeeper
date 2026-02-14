import { db } from '@infrastructure/dexie/db'
import type { IFactionPresenceRepository } from '@application/ports/IFactionPresenceRepository'
import type { FactionPresence } from '@domain/entities/FactionPresence'

export class FactionPresenceRepository implements IFactionPresenceRepository {
  async getById(id: string): Promise<FactionPresence | undefined> {
    return db.factionPresences.get(id)
  }

  async getByFactionId(factionId: string): Promise<FactionPresence[]> {
    return db.factionPresences.where('factionId').equals(factionId).toArray()
  }

  async getByPoiId(poiId: string): Promise<FactionPresence[]> {
    return db.factionPresences.where('poiId').equals(poiId).toArray()
  }

  async create(presence: FactionPresence): Promise<void> {
    await db.factionPresences.put(presence)
  }

  async update(presence: FactionPresence): Promise<void> {
    await db.factionPresences.put(presence)
  }

  async delete(id: string): Promise<void> {
    await db.factionPresences.delete(id)
  }
}
