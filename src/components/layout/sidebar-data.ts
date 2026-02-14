import {
  Compass,
  LayoutDashboard,
  Map,
  MapPinned,
  NotebookPen,
  Route,
  Scroll,
  Settings,
  Swords,
  TableProperties,
  Users,
} from 'lucide-react'
import type { NavGroup } from './types'

export function getSidebarData(_realmId?: string): { navGroups: NavGroup[] } {
  return {
    navGroups: [
      {
        title: 'Overview',
        items: [
          { title: 'Dashboard', url: '/realms', icon: LayoutDashboard },
          { title: 'Calendar', url: '/realms/calendar', icon: Scroll },
          { title: 'Maps', url: '/realms/maps', icon: MapPinned },
        ],
      },
      {
        title: 'World',
        items: [
          { title: 'Factions', url: '/realms/factions', icon: Swords },
          { title: 'NPCs', url: '/realms/npcs', icon: Users },
          { title: 'Regions', url: '/realms/regions', icon: Map },
          { title: 'POIs', url: '/realms/pois', icon: Compass },
          { title: 'Paths', url: '/realms/paths', icon: Route },
        ],
      },
      {
        title: 'Tools',
        items: [
          { title: 'Tables', url: '/realms/tables', icon: TableProperties },
          { title: 'Notes', url: '/realms/notes', icon: NotebookPen },
          { title: 'Settings', url: '/realms/settings', icon: Settings },
        ],
      },
    ],
  }
}
