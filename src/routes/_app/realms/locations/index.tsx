import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/realms/locations/')({
  beforeLoad: () => {
    throw redirect({ to: '/realms/locations/pois' })
  },
})
