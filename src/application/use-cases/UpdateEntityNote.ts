import type { IEntityNoteRepository } from '@application/ports/IEntityNoteRepository'
import type { EntityNote } from '@domain/entities/EntityNote'

export async function executeUpdateEntityNote(
  note: EntityNote,
  deps: { entityNoteRepo: IEntityNoteRepository }
): Promise<void> {
  await deps.entityNoteRepo.update({ ...note, updatedAt: Date.now() })
}
