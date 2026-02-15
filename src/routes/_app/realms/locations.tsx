import { createFileRoute, Link, Outlet, useRouterState } from '@tanstack/react-router'
import { PageHeader } from '~/components/shared/PageHeader'
import { Tabs, TabsList, TabsTrigger } from '~/components/ui/tabs'

export const Route = createFileRoute('/_app/realms/locations')({
  component: LocationsLayout,
})

function LocationsLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const activeTab = pathname.includes('/pois')
    ? 'pois'
    : pathname.includes('/paths')
      ? 'paths'
      : 'regions'

  return (
    <div className="space-y-4">
      <PageHeader title="Locations" />
      <Tabs value={activeTab}>
        <TabsList>
          <TabsTrigger value="pois" asChild>
            <Link to="/realms/locations/pois">Points of Interest</Link>
          </TabsTrigger>
          <TabsTrigger value="regions" asChild>
            <Link to="/realms/locations/regions">Regions</Link>
          </TabsTrigger>
          <TabsTrigger value="paths" asChild>
            <Link to="/realms/locations/paths">Paths</Link>
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <Outlet />
    </div>
  )
}
