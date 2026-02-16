import type { IEntityNoteRepository } from '@application/ports/IEntityNoteRepository'

export async function executeDeleteEntityNote(
  id: string,
  deps: { entityNoteRepo: IEntityNoteRepository }
): Promise<void> {
  await deps.entityNoteRepo.delete(id)
}
