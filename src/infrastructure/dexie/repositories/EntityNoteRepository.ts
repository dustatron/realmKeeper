import type { IEntityNoteRepository } from '@application/ports/IEntityNoteRepository'
import type { EntityNote } from '@domain/entities/EntityNote'
import { db } from '../db'

export class EntityNoteRepository implements IEntityNoteRepository {
  async getByOwner(ownerType: 'poi' | 'region', ownerId: string): Promise<EntityNote[]> {
    return db.entityNotes
      .where('[ownerType+ownerId]')
      .equals([ownerType, ownerId])
      .sortBy('sortOrder')
  }

  async create(note: EntityNote): Promise<void> {
    await db.entityNotes.put(note)
  }

  async update(note: EntityNote): Promise<void> {
    await db.entityNotes.put(note)
  }

  async delete(id: string): Promise<void> {
    await db.entityNotes.delete(id)
  }
}
