import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useUIStore } from '~/ui/stores/uiStore'
import { useRealmNotes, useMainNote } from '~/ui/hooks/useRealmNotes'
import { useContainer } from '~/ui/hooks/useContainer'
import { executeCreateRealmNote } from '@application/use-cases/CreateRealmNote'
import { executeUpdateRealmNote } from '@application/use-cases/UpdateRealmNote'
import { executeDeleteRealmNote } from '@application/use-cases/DeleteRealmNote'
import type { RealmNote } from '@domain/entities/RealmNote'
import { EmptyState } from '~/components/shared/EmptyState'
import { FilterBar } from '~/components/shared/FilterBar'
import { ConfirmDialog } from '~/components/shared/ConfirmDialog'
import { MarkdownField } from '~/components/shared/MarkdownField'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { ScrollArea } from '~/components/ui/scroll-area'
import { Badge } from '~/components/ui/badge'
import { NotebookPen, Plus, Trash2, Pin, FileText } from 'lucide-react'

export const Route = createFileRoute('/_app/realms/notes')({
  component: NotesPage,
})

function NotesPage() {
  const activeRealmId = useUIStore((s) => s.activeRealmId)
  const container = useContainer()
  const allNotes = useRealmNotes(activeRealmId)
  const mainNote = useMainNote(activeRealmId)

  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [newNoteTitle, setNewNoteTitle] = useState('')
  const [creating, setCreating] = useState(false)

  // Filter notes by search query
  const filteredNotes = searchQuery
    ? allNotes.filter(
        (note) =>
          note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          note.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allNotes

  // Get selected note
  const selectedNote = filteredNotes.find((n) => n.id === selectedNoteId) ?? null

  // Auto-select main note if nothing selected
  if (!selectedNoteId && mainNote) {
    setSelectedNoteId(mainNote.id)
  }

  const handleCreateNote = async () => {
    if (!activeRealmId || !newNoteTitle.trim()) return
    setCreating(true)
    try {
      const note = await executeCreateRealmNote(
        { worldId: activeRealmId, title: newNoteTitle.trim() },
        { realmNoteRepo: container.realmNoteRepo }
      )
      setSelectedNoteId(note.id)
      setNewNoteTitle('')
      setCreateDialogOpen(false)
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteNote = async () => {
    if (!selectedNoteId || selectedNote?.isMain) return
    await executeDeleteRealmNote(selectedNoteId, {
      realmNoteRepo: container.realmNoteRepo,
    })
    setDeleteDialogOpen(false)
    setSelectedNoteId(mainNote?.id ?? null)
  }

  if (!activeRealmId) {
    return (
      <div>
        <EmptyState icon={NotebookPen} title="No realm selected" />
      </div>
    )
  }

  if (allNotes.length === 0) {
    return (
      <div>
        <EmptyState
          icon={NotebookPen}
          title="No notes yet"
          action={
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 size-4" />
              New Note
            </Button>
          }
        />
        <CreateNoteDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          title={newNoteTitle}
          onTitleChange={setNewNoteTitle}
          onCreate={handleCreateNote}
          creating={creating}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-[calc(100dvh-12rem)]">
        {/* Note List Sidebar */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex items-center gap-2">
            <FilterBar search={searchQuery} onSearchChange={setSearchQuery} />
            <Button size="icon" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="size-4" />
            </Button>
          </div>

          <ScrollArea className="h-[calc(100dvh-16rem)]">
            <div className="space-y-1">
              {filteredNotes.map((note) => (
                <NoteListItem
                  key={note.id}
                  note={note}
                  selected={selectedNoteId === note.id}
                  onSelect={() => setSelectedNoteId(note.id)}
                />
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Note Content */}
        <div className="lg:col-span-3">
          {selectedNote ? (
            <NoteEditor
              note={selectedNote}
              onDelete={() => setDeleteDialogOpen(true)}
            />
          ) : (
            <EmptyState
              icon={FileText}
              title="No note selected"
              description="Choose a note from the left to view and edit."
            />
          )}
        </div>
      </div>

      {/* Dialogs */}
      <CreateNoteDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        title={newNoteTitle}
        onTitleChange={setNewNoteTitle}
        onCreate={handleCreateNote}
        creating={creating}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Note"
        description="Are you sure you want to delete this note? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDeleteNote}
      />
    </div>
  )
}

function NoteListItem({
  note,
  selected,
  onSelect,
}: {
  note: RealmNote
  selected: boolean
  onSelect: () => void
}) {
  const updatedDate = new Date(note.updatedAt)
  const dateStr = updatedDate.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  })

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-3 rounded-lg border transition-colors ${
        selected
          ? 'bg-primary/10 border-primary'
          : 'bg-card border-border hover:bg-muted/50'
      }`}
    >
      <div className="flex items-start gap-2 mb-1">
        {note.isMain && <Pin className="size-3.5 text-primary shrink-0 mt-0.5" />}
        <span className="font-medium text-sm flex-1 truncate">{note.title}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{dateStr}</span>
        {note.isMain && (
          <Badge variant="outline" className="text-xs">
            Main
          </Badge>
        )}
      </div>
    </button>
  )
}

function NoteEditor({ note, onDelete }: { note: RealmNote; onDelete: () => void }) {
  const container = useContainer()
  const [editTitle, setEditTitle] = useState(note.title)
  const [editContent, setEditContent] = useState(note.content)
  const [saving, setSaving] = useState(false)

  const isDirty = editTitle !== note.title || editContent !== note.content

  const handleSave = async () => {
    if (!isDirty) return
    setSaving(true)
    try {
      await executeUpdateRealmNote(
        { ...note, title: editTitle, content: editContent },
        { realmNoteRepo: container.realmNoteRepo }
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Note title"
            className="text-lg font-semibold"
            disabled={note.isMain}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleSave}
            disabled={!isDirty || saving}
            variant={isDirty ? 'default' : 'outline'}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
          {!note.isMain && (
            <Button variant="ghost" size="icon" onClick={onDelete}>
              <Trash2 className="size-4 text-destructive" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="pr-4">
            <MarkdownField
              value={editContent}
              onChange={setEditContent}
              placeholder="Write your note in Markdown..."
              minRows={20}
            />
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}

function CreateNoteDialog({
  open,
  onOpenChange,
  title,
  onTitleChange,
  onCreate,
  creating,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  onTitleChange: (title: string) => void
  onCreate: () => void
  creating: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Note</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="note-title">Title</Label>
            <Input
              id="note-title"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Enter note title"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !creating && title.trim()) {
                  onCreate()
                }
              }}
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onCreate} disabled={creating || !title.trim()}>
            {creating ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
