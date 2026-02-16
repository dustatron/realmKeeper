import type { IRealmNoteRepository } from '@application/ports/IRealmNoteRepository'
import type { RealmNote } from '@domain/entities/RealmNote'
import { newId } from '@shared/ulid'

export interface CreateRealmNoteInput {
  worldId: string
  title: string
  content?: string
}

export async function executeCreateRealmNote(
  input: CreateRealmNoteInput,
  deps: { realmNoteRepo: IRealmNoteRepository }
): Promise<RealmNote> {
  const existing = await deps.realmNoteRepo.getByRealmId(input.worldId)
  const now = Date.now()
  const note: RealmNote = {
    id: newId(),
    worldId: input.worldId,
    title: input.title,
    content: input.content ?? '',
    isMain: false,
    sortOrder: existing.length,
    createdAt: now,
    updatedAt: now,
  }
  await deps.realmNoteRepo.create(note)
  return note
}
