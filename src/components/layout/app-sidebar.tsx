import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '~/components/ui/sidebar'
import { NavGroup } from './nav-group'
import { RealmSwitcher } from './realm-switcher'
import { getSidebarData } from './sidebar-data'
import { useUIStore } from '~/ui/stores/uiStore'

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const activeRealmId = useUIStore((state) => state.activeRealmId)
  const { navGroups } = getSidebarData(activeRealmId ?? undefined)

  return (
    <Sidebar collapsible="icon" variant="sidebar" {...props}>
      <SidebarHeader>
        <RealmSwitcher />
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((group) => (
          <NavGroup key={group.title} group={group} />
        ))}
      </SidebarContent>
      <SidebarFooter />
      <SidebarRail />
    </Sidebar>
  )
}
