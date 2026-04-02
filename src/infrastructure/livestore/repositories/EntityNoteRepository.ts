import type { Store } from '@livestore/livestore'
import type { schema } from '../schema'
import { entityNoteCreated, entityNoteUpdated, entityNoteDeleted } from '../events'
import type { EntityNote } from '@domain/entities/EntityNote'

export class EntityNoteRepository {
  constructor(private store: Store<typeof schema>) {}

  async getByOwner(ownerType: 'poi' | 'region', ownerId: string): Promise<EntityNote[]> {
    return this.store.query({
      query: "SELECT * FROM entityNotes WHERE ownerType = $ownerType AND ownerId = $ownerId ORDER BY sortOrder ASC",
      bindValues: { ownerType, ownerId },
    }) as EntityNote[]
  }

  async create(note: EntityNote): Promise<void> {
    this.store.commit(entityNoteCreated(note as any))
  }

  async update(note: EntityNote): Promise<void> {
    this.store.commit(entityNoteUpdated(note as any))
  }

  async delete(id: string): Promise<void> {
    this.store.commit(entityNoteDeleted({ id }))
  }
}
