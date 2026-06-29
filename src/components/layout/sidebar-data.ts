import {
  Book,
  Heart,
  LayoutDashboard,
  Map,
  MapPinned,
  NotebookPen,
  Scroll,
  Search,
  Swords,
  TableProperties,
  Users,
} from "lucide-react";
import type { NavGroup } from "./types";

export function getSidebarData(_worldId?: string): { navGroups: NavGroup[] } {
  return {
    navGroups: [
      {
        title: "Overview",
        items: [
          { title: "Dashboard", url: "/realms", icon: LayoutDashboard },
          { title: "Realm Map", url: "/realms/maps", icon: MapPinned },
          { title: "All Maps", url: "/realms/maps/all", icon: Map },
          { title: "Search", url: "/search", icon: Search },
          { title: "Calendar", url: "/realms/calendar", icon: Scroll },
        ],
      },
      {
        title: "World",
        items: [
          { title: "Locations", url: "/realms/locations", icon: Map },
          { title: "NPCs", url: "/realms/npcs", icon: Users },
          { title: "Factions", url: "/realms/factions", icon: Swords },
        ],
      },
      {
        title: "Tools",
        items: [
          { title: "Compendium", url: "/realms/compendium", icon: Book },
          { title: "Tables", url: "/realms/tables", icon: TableProperties },
          { title: "Notes", url: "/realms/notes", icon: NotebookPen },
          { title: "Credits", url: "/credits", icon: Heart },
        ],
      },
    ],
  };
}
