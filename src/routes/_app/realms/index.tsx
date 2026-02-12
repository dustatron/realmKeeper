import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '~/components/shared/PageHeader'
import { EmptyState } from '~/components/shared/EmptyState'
import { Button } from '~/components/ui/button'
import { LayoutDashboard, Plus } from 'lucide-react'

export const Route = createFileRoute('/_app/realms/')({
  component: RealmsPage,
})

function RealmsPage() {
  return (
    <div>
      <PageHeader title="Realms" description="Select or create a realm." />
      <EmptyState
        icon={LayoutDashboard}
        title="No realms yet"
        description="Create your first realm to start building your world."
        action={
          <Button>
            <Plus className="mr-2 size-4" />
            New Realm
          </Button>
        }
      />
    </div>
  )
}
