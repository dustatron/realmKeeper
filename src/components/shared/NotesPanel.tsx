import { useCallback, useRef } from 'react'
import { useEntityNotes } from '~/ui/hooks/useEntityNotes'
import { useContainer } from '~/ui/hooks/useContainer'
import { executeCreateEntityNote } from '@application/use-cases/CreateEntityNote'
import { executeUpdateEntityNote } from '@application/use-cases/UpdateEntityNote'
import { WysiwygEditor } from '~/components/shared/WysiwygEditor'

interface NotesPanelProps {
  ownerType: 'poi' | 'region'
  ownerId: string
  worldId: string
}

export function NotesPanel({ ownerType, ownerId, worldId }: NotesPanelProps) {
  const notes = useEntityNotes(ownerType, ownerId)
  const container = useContainer()
  const note = notes[0] ?? null
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const handleChange = useCallback((html: string) => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      if (note) {
        await executeUpdateEntityNote(
          { ...note, content: html },
          { entityNoteRepo: container.entityNoteRepo }
        )
      } else {
        await executeCreateEntityNote(
          { ownerType, ownerId, worldId, title: 'Notes', content: html },
          { entityNoteRepo: container.entityNoteRepo }
        )
      }
    }, 400)
  }, [note, ownerType, ownerId, worldId, container.entityNoteRepo])

  return (
    <WysiwygEditor
      content={note?.content ?? ''}
      onChange={handleChange}
      placeholder="Write your notes here..."
    />
  )
}
