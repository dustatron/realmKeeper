import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '~/components/shared/PageHeader'
import { EmptyState } from '~/components/shared/EmptyState'
import { Button } from '~/components/ui/button'
import { NotebookPen, Plus } from 'lucide-react'

export const Route = createFileRoute('/_app/realms/notes')({
  component: NotesPage,
})

function NotesPage() {
  return (
    <div>
      <PageHeader title="Notes" description="Markdown notes for your realm." />
      <EmptyState
        icon={NotebookPen}
        title="No notes yet"
        action={
          <Button>
            <Plus className="mr-2 size-4" />
            New Note
          </Button>
        }
      />
    </div>
  )
}
