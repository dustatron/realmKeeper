import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '~/components/shared/PageHeader'
import { EmptyState } from '~/components/shared/EmptyState'
import { Scroll } from 'lucide-react'

export const Route = createFileRoute('/_app/realms/calendar')({
  component: CalendarPage,
})

function CalendarPage() {
  return (
    <div>
      <PageHeader title="Calendar" description="Track time, weather, and world events." />
      <EmptyState icon={Scroll} title="No realm selected" />
    </div>
  )
}
