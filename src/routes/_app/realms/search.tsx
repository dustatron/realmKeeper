import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/realms/search')({
  beforeLoad: () => {
    throw redirect({ to: '/realms', search: { tab: 'search' } })
  },
  component: () => null,
})
