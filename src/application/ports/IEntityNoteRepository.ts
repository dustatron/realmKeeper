import type { EntityNote } from '@domain/entities/EntityNote'

export interface IEntityNoteRepository {
  getByOwner(ownerType: 'poi' | 'region', ownerId: string): Promise<EntityNote[]>
  create(note: EntityNote): Promise<void>
  update(note: EntityNote): Promise<void>
  delete(id: string): Promise<void>
}
