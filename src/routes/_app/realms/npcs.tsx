import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '~/components/shared/PageHeader'
import { EmptyState } from '~/components/shared/EmptyState'
import { Button } from '~/components/ui/button'
import { Users, Plus } from 'lucide-react'

export const Route = createFileRoute('/_app/realms/npcs')({
  component: NPCsPage,
})

function NPCsPage() {
  return (
    <div>
      <PageHeader title="NPCs" description="Create and manage non-player characters." />
      <EmptyState
        icon={Users}
        title="No NPCs yet"
        action={
          <Button>
            <Plus className="mr-2 size-4" />
            Generate NPC
          </Button>
        }
      />
    </div>
  )
}
