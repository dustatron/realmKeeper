import type { Store } from '@livestore/livestore'
import type { schema } from '../schema'
import { realmNoteCreated, realmNoteUpdated, realmNoteDeleted } from '../events'
import type { RealmNote } from '@domain/entities/RealmNote'

export class RealmNoteRepository {
  constructor(private store: Store<typeof schema>) {}

  async getById(id: string): Promise<RealmNote | undefined> {
    const rows = this.store.query({ query: 'SELECT * FROM realmNotes WHERE id = $id', bindValues: { $id: id } }) as RealmNote[]
    return rows[0] ?? undefined
  }

  async getByRealmId(worldId: string): Promise<RealmNote[]> {
    return this.store.query({
      query: 'SELECT * FROM realmNotes WHERE worldId = $worldId ORDER BY sortOrder ASC',
      bindValues: { $worldId: worldId },
    }) as RealmNote[]
  }

  async getMainNote(worldId: string): Promise<RealmNote | undefined> {
    const rows = this.store.query({
      query: 'SELECT * FROM realmNotes WHERE worldId = $worldId AND isMain = 1 LIMIT 1',
      bindValues: { $worldId: worldId },
    }) as RealmNote[]
    return rows[0] ?? undefined
  }

  async create(note: RealmNote): Promise<void> {
    this.store.commit(realmNoteCreated(note as any))
  }

  async update(note: RealmNote): Promise<void> {
    this.store.commit(realmNoteUpdated(note as any))
  }

  async delete(id: string): Promise<void> {
    this.store.commit(realmNoteDeleted({ id }))
  }
}
