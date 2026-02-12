import type { IRealmNoteRepository } from '@application/ports/IRealmNoteRepository'
import type { RealmNote } from '@domain/entities/RealmNote'

export async function executeSearchRealmNotes(
  realmId: string,
  query: string,
  deps: { realmNoteRepo: IRealmNoteRepository }
): Promise<RealmNote[]> {
  const notes = await deps.realmNoteRepo.getByRealmId(realmId)
  if (!query) return notes
  const q = query.toLowerCase()
  return notes.filter(
    (n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
  )
}
