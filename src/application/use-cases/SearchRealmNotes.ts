import type { IRealmNoteRepository } from '@application/ports/IRealmNoteRepository'
import type { RealmNote } from '@domain/entities/RealmNote'

export async function executeSearchRealmNotes(
  worldId: string,
  query: string,
  deps: { realmNoteRepo: IRealmNoteRepository }
): Promise<RealmNote[]> {
  const notes = await deps.realmNoteRepo.getByRealmId(worldId)
  if (!query) return notes
  const q = query.toLowerCase()
  return notes.filter(
    (n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
  )
}
