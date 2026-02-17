import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/realms/settings')({
  beforeLoad: () => {
    throw redirect({ to: '/realms', search: { tab: 'settings' } })
  },
  component: () => null,
})
