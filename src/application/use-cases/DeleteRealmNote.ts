import type { IRealmNoteRepository } from '@application/ports/IRealmNoteRepository'

export async function executeDeleteRealmNote(
  noteId: string,
  deps: { realmNoteRepo: IRealmNoteRepository }
): Promise<void> {
  await deps.realmNoteRepo.delete(noteId)
}
