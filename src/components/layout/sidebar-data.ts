import {
  Book,
  LayoutDashboard,
  Map,
  MapPinned,
  NotebookPen,
  Scroll,
  Search,
  Settings,
  Swords,
  TableProperties,
  Users,
} from 'lucide-react'
import type { NavGroup } from './types'

export function getSidebarData(_worldId?: string): { navGroups: NavGroup[] } {
  return {
    navGroups: [
      {
        title: 'Overview',
        items: [
          { title: 'Dashboard', url: '/realms', icon: LayoutDashboard },
          { title: 'Maps', url: '/realms/maps', icon: MapPinned },
          { title: 'Calendar', url: '/realms/calendar', icon: Scroll },
        ],
      },
      {
        title: 'World',
        items: [
          { title: 'Factions', url: '/realms/factions', icon: Swords },
          { title: 'NPCs', url: '/realms/npcs', icon: Users },
          { title: 'Locations', url: '/realms/locations', icon: Map },
        ],
      },
      {
        title: 'Tools',
        items: [
          { title: 'Tables', url: '/realms/tables', icon: TableProperties },
          { title: 'Compendium', url: '/realms/compendium', icon: Book },
          { title: 'Notes', url: '/realms/notes', icon: NotebookPen },
          { title: 'Search', url: '/realms/search', icon: Search },
          { title: 'Settings', url: '/realms/settings', icon: Settings },
        ],
      },
    ],
  }
}
