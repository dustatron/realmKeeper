import { useRouterState } from '@tanstack/react-router'
import { Separator } from '~/components/ui/separator'
import { SidebarTrigger } from '~/components/ui/sidebar'
import { Button } from '~/components/ui/button'
import { Search } from 'lucide-react'
import { ThemeSwitch } from './theme-switch'
import { CloudAuth } from './cloud-auth'
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
  const setSearchOpen = useUIStore((s) => s.setSearchOpen)

  return (
    <header className="sticky top-0 z-40 bg-background flex h-16 shrink-0 items-center gap-2 border-b px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
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
        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-muted-foreground hidden sm:flex"
          onClick={() => setSearchOpen(true)}
        >
          <Search className="size-4" />
          <span className="text-sm">Search</span>
          <kbd className="text-xs bg-muted border px-1.5 py-0.5 rounded leading-none">⌘K</kbd>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden"
          onClick={() => setSearchOpen(true)}
          title="Search"
        >
          <Search className="size-4" />
        </Button>
        <CloudAuth />
        <ThemeSwitch />
      </div>
    </header>
  )
}
