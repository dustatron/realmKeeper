import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '~/components/shared/PageHeader'
import { EmptyState } from '~/components/shared/EmptyState'
import { Button } from '~/components/ui/button'
import { Compass, Plus } from 'lucide-react'

export const Route = createFileRoute('/_app/realms/pois')({
  component: POIsPage,
})

function POIsPage() {
  return (
    <div>
      <PageHeader title="Points of Interest" description="Settlements, dungeons, landmarks, and more." />
      <EmptyState
        icon={Compass}
        title="No POIs yet"
        action={
          <Button>
            <Plus className="mr-2 size-4" />
            New POI
          </Button>
        }
      />
    </div>
  )
}
