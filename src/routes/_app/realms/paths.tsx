import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '~/components/shared/PageHeader'
import { EmptyState } from '~/components/shared/EmptyState'
import { Button } from '~/components/ui/button'
import { Route as RouteIcon, Plus } from 'lucide-react'

export const Route = createFileRoute('/_app/realms/paths')({
  component: PathsPage,
})

function PathsPage() {
  return (
    <div>
      <PageHeader title="Paths" description="Travel routes between points of interest." />
      <EmptyState
        icon={RouteIcon}
        title="No paths yet"
        action={
          <Button>
            <Plus className="mr-2 size-4" />
            New Path
          </Button>
        }
      />
    </div>
  )
}
