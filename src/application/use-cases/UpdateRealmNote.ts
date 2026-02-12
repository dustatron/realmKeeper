import type { IRealmNoteRepository } from '@application/ports/IRealmNoteRepository'
import type { RealmNote } from '@domain/entities/RealmNote'

export async function executeUpdateRealmNote(
  note: RealmNote,
  deps: { realmNoteRepo: IRealmNoteRepository }
): Promise<void> {
  await deps.realmNoteRepo.update({ ...note, updatedAt: Date.now() })
}
