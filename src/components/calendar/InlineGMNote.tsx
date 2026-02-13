import { useState, useRef, useEffect } from 'react'
import { Pencil } from 'lucide-react'
import type { WorldEvent } from '@domain/entities/WorldEvent'
import type { Season, Watch } from '@shared/constants'
import { newId } from '@shared/ulid'
import { useContainer } from '~/ui/hooks/useContainer'

interface InlineGMNoteProps {
  existingNote: WorldEvent | undefined
  realmId: string
  year: number
  season: Season
  day: number
}

export function InlineGMNote({ existingNote, realmId, year, season, day }: InlineGMNoteProps) {
  const container = useContainer()
  const [isEditing, setIsEditing] = useState(false)
  const [text, setText] = useState(existingNote?.description ?? '')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setText(existingNote?.description ?? '')
  }, [existingNote?.description])

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.selectionStart = textareaRef.current.value.length
    }
  }, [isEditing])

  const save = async () => {
    setIsEditing(false)
    const trimmed = text.trim()

    // Delete note if empty
    if (!trimmed && existingNote) {
      await container.worldEventRepo.delete(existingNote.id)
      return
    }
    if (!trimmed) return

    const noteEvent: WorldEvent = {
      id: existingNote?.id ?? newId(),
      realmId,
      year,
      season,
      day,
      watch: 'morning' as Watch,
      type: 'gm_note',
      title: 'GM Note',
      description: trimmed,
      relatedEntityIds: [],
      createdAt: existingNote?.createdAt ?? Date.now(),
    }
    await container.worldEventRepo.create(noteEvent)
  }

  if (isEditing) {
    return (
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            save()
          }
          if (e.key === 'Escape') {
            setText(existingNote?.description ?? '')
            setIsEditing(false)
          }
        }}
        className="w-full min-h-[2.5rem] rounded border bg-background px-2 py-1 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
        rows={2}
      />
    )
  }

  if (existingNote?.description) {
    return (
      <div
        className="group flex items-start gap-1 cursor-pointer"
        onClick={() => setIsEditing(true)}
      >
        <p className="text-sm text-muted-foreground line-clamp-2 flex-1">{existingNote.description}</p>
        <Pencil className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
      </div>
    )
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
    >
      Add note...
    </button>
  )
}
