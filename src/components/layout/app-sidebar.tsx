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

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  // TODO: get activeRealmId from Zustand store
  const { navGroups } = getSidebarData(undefined)

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
