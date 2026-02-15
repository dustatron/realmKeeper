import { db } from '@infrastructure/dexie/db'
import type { IRealmRepository } from '@application/ports/IRealmRepository'
import type { Realm } from '@domain/entities/Realm'

export class RealmRepository implements IRealmRepository {
  async getById(id: string): Promise<Realm | undefined> {
    return db.worlds.get(id)
  }

  async getAll(): Promise<Realm[]> {
    return db.worlds.toArray()
  }

  async create(realm: Realm): Promise<void> {
    await db.worlds.put(realm)
  }

  async update(realm: Realm): Promise<void> {
    await db.worlds.put(realm)
  }

  async delete(id: string): Promise<void> {
    await db.worlds.delete(id)
  }
}
