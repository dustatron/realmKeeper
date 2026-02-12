import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '~/components/shared/PageHeader'
import { EmptyState } from '~/components/shared/EmptyState'
import { Button } from '~/components/ui/button'
import { Swords, Plus } from 'lucide-react'

export const Route = createFileRoute('/_app/realms/factions')({
  component: FactionsPage,
})

function FactionsPage() {
  return (
    <div>
      <PageHeader title="Factions" description="Manage factions and their relationships." />
      <EmptyState
        icon={Swords}
        title="No factions yet"
        action={
          <Button>
            <Plus className="mr-2 size-4" />
            New Faction
          </Button>
        }
      />
    </div>
  )
}
