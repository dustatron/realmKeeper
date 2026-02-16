import type { IEntityNoteRepository } from '@application/ports/IEntityNoteRepository'
import type { EntityNote } from '@domain/entities/EntityNote'
import { newId } from '@shared/ulid'

export interface CreateEntityNoteInput {
  ownerType: 'poi' | 'region'
  ownerId: string
  worldId: string
  title: string
  content?: string
  sortOrder?: number
}

export async function executeCreateEntityNote(
  input: CreateEntityNoteInput,
  deps: { entityNoteRepo: IEntityNoteRepository }
): Promise<EntityNote> {
  const now = Date.now()
  const note: EntityNote = {
    id: newId(),
    ownerType: input.ownerType,
    ownerId: input.ownerId,
    worldId: input.worldId,
    title: input.title,
    content: input.content ?? '',
    sortOrder: input.sortOrder ?? now,
    createdAt: now,
    updatedAt: now,
  }
  await deps.entityNoteRepo.create(note)
  return note
}
