import {
  Compass,
  LayoutDashboard,
  Map,
  NotebookPen,
  Route,
  Scroll,
  Swords,
  TableProperties,
  Users,
} from 'lucide-react'
import type { NavGroup } from './types'

export function getSidebarData(realmId?: string): { navGroups: NavGroup[] } {
  const base = realmId ? `/realms/${realmId}` : '/realms'

  return {
    navGroups: [
      {
        title: 'Overview',
        items: [
          { title: 'Dashboard', url: base, icon: LayoutDashboard },
          { title: 'Calendar', url: `${base}/calendar`, icon: Scroll },
        ],
      },
      {
        title: 'World',
        items: [
          { title: 'Factions', url: `${base}/factions`, icon: Swords },
          { title: 'NPCs', url: `${base}/npcs`, icon: Users },
          { title: 'Regions', url: `${base}/regions`, icon: Map },
          { title: 'POIs', url: `${base}/pois`, icon: Compass },
          { title: 'Paths', url: `${base}/paths`, icon: Route },
        ],
      },
      {
        title: 'Tools',
        items: [
          { title: 'Tables', url: `${base}/tables`, icon: TableProperties },
          { title: 'Notes', url: `${base}/notes`, icon: NotebookPen },
        ],
      },
    ],
  }
}
