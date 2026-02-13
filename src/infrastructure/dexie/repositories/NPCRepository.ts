import { db } from '@infrastructure/dexie/db'
import type { INPCRepository } from '@application/ports/INPCRepository'
import type { NPC } from '@domain/entities/NPC'

export class NPCRepository implements INPCRepository {
  async getById(id: string): Promise<NPC | undefined> {
    return db.npcs.get(id)
  }

  async getByRealmId(realmId: string): Promise<NPC[]> {
    return db.npcs.where('realmId').equals(realmId).toArray()
  }

  async getByFactionId(factionId: string): Promise<NPC[]> {
    return db.npcs.where('factionId').equals(factionId).toArray()
  }

  async getByRegionId(regionId: string): Promise<NPC[]> {
    return db.npcs.where('regionId').equals(regionId).toArray()
  }

  async getByPoiId(poiId: string): Promise<NPC[]> {
    return db.npcs.where('poiId').equals(poiId).toArray()
  }

  async getByTag(realmId: string, tag: string): Promise<NPC[]> {
    return db.npcs
      .where('tags')
      .equals(tag)
      .filter((npc) => npc.realmId === realmId)
      .toArray()
  }

  async create(npc: NPC): Promise<void> {
    await db.npcs.put(npc)
  }

  async update(npc: NPC): Promise<void> {
    await db.npcs.put(npc)
  }

  async delete(id: string): Promise<void> {
    await db.npcs.delete(id)
  }
}
