import type { RealmNote } from '@domain/entities/RealmNote'

export interface IRealmNoteRepository {
  getById(id: string): Promise<RealmNote | undefined>
  getByRealmId(worldId: string): Promise<RealmNote[]>
  getMainNote(worldId: string): Promise<RealmNote | undefined>
  create(note: RealmNote): Promise<void>
  update(note: RealmNote): Promise<void>
  delete(id: string): Promise<void>
}
