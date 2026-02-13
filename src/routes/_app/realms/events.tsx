import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/realms/events')({
  beforeLoad: () => {
    throw redirect({ to: '/realms/calendar' })
  },
  component: () => null,
})
