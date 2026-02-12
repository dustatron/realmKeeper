import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '~/components/shared/PageHeader'
import { EmptyState } from '~/components/shared/EmptyState'
import { TableProperties } from 'lucide-react'

export const Route = createFileRoute('/_app/realms/tables')({
  component: TablesPage,
})

function TablesPage() {
  return (
    <div>
      <PageHeader title="Random Tables" description="Browse and roll on random tables." />
      <EmptyState icon={TableProperties} title="No tables loaded" />
    </div>
  )
}
