import { db } from '@infrastructure/dexie/db'
import type { IRealmNoteRepository } from '@application/ports/IRealmNoteRepository'
import type { RealmNote } from '@domain/entities/RealmNote'

export class RealmNoteRepository implements IRealmNoteRepository {
  async getById(id: string): Promise<RealmNote | undefined> {
    return db.realmNotes.get(id)
  }

  async getByRealmId(worldId: string): Promise<RealmNote[]> {
    return db.realmNotes.where('worldId').equals(worldId).sortBy('sortOrder')
  }

  async getMainNote(worldId: string): Promise<RealmNote | undefined> {
    return db.realmNotes
      .where('worldId')
      .equals(worldId)
      .filter((n) => n.isMain)
      .first()
  }

  async create(note: RealmNote): Promise<void> {
    await db.realmNotes.put(note)
  }

  async update(note: RealmNote): Promise<void> {
    await db.realmNotes.put(note)
  }

  async delete(id: string): Promise<void> {
    await db.realmNotes.delete(id)
  }
}
