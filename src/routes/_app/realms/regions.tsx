import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '~/components/shared/PageHeader'
import { EmptyState } from '~/components/shared/EmptyState'
import { Button } from '~/components/ui/button'
import { Map, Plus } from 'lucide-react'

export const Route = createFileRoute('/_app/realms/regions')({
  component: RegionsPage,
})

function RegionsPage() {
  return (
    <div>
      <PageHeader title="Regions" description="Define the geography of your realm." />
      <EmptyState
        icon={Map}
        title="No regions yet"
        action={
          <Button>
            <Plus className="mr-2 size-4" />
            New Region
          </Button>
        }
      />
    </div>
  )
}
