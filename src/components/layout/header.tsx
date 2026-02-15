import { useRouterState } from '@tanstack/react-router'
import { Separator } from '~/components/ui/separator'
import { SidebarTrigger } from '~/components/ui/sidebar'
import { ThemeSwitch } from './theme-switch'
import { getSidebarData } from './sidebar-data'
import { isNavCollapsible } from './types'
import { useUIStore } from '~/ui/stores/uiStore'

function usePageTitle(): string | null {
  const { location } = useRouterState()
  const { navGroups } = getSidebarData()
  const path = location.pathname

  for (const group of navGroups) {
    for (const item of group.items) {
      if (isNavCollapsible(item)) {
        for (const sub of item.items) {
          if (path === sub.url) return sub.title
        }
      } else if (path === item.url || (item.url !== '/realms' && path.startsWith(item.url))) {
        return item.title
      }
    }
  }

  // Fallback for detail routes
  if (path.startsWith('/realms/pois/')) return 'Locations'
  if (path.startsWith('/realms/npcs/')) return 'NPCs'
  if (path.startsWith('/realms/factions/')) return 'Factions'
  if (path.startsWith('/realms/maps/')) return 'Maps'
  if (path.startsWith('/realms/events/')) return 'Calendar'

  return null
}

export function Header() {
  const pageTitle = usePageTitle()
  const headerTitle = useUIStore((s) => s.headerTitle)

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex items-center gap-2 min-w-0">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        {headerTitle ? (
          <div className="text-sm font-medium truncate">{headerTitle}</div>
        ) : pageTitle ? (
          <span className="text-sm font-medium">{pageTitle}</span>
        ) : null}
      </div>
      <div className="ml-auto flex items-center gap-2">
        <ThemeSwitch />
      </div>
    </header>
  )
}
