import { db } from '@infrastructure/dexie/db'
import type { IDoomRepository } from '@application/ports/IDoomRepository'
import type { Doom } from '@domain/entities/Doom'

export class DoomRepository implements IDoomRepository {
  async getById(id: string): Promise<Doom | undefined> {
    return db.dooms.get(id)
  }

  async getByRealmId(worldId: string): Promise<Doom[]> {
    return db.dooms.where('worldId').equals(worldId).toArray()
  }

  async create(doom: Doom): Promise<void> {
    await db.dooms.put(doom)
  }

  async update(doom: Doom): Promise<void> {
    await db.dooms.put(doom)
  }

  async delete(id: string): Promise<void> {
    await db.dooms.delete(id)
  }
}
