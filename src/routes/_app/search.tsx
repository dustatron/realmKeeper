import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useGlobalSearch } from "~/ui/hooks/useGlobalSearch";
import type { SearchableItem } from "~/ui/hooks/useGlobalSearch";
import { useUIStore } from "~/ui/stores/uiStore";
import { PageHeader } from "~/components/shared/PageHeader";
import { FilterBar } from "~/components/shared/FilterBar";
import { EmptyState } from "~/components/shared/EmptyState";
import { SearchFilterToggles } from "~/components/shared/SearchFilterToggles";
import type { FilterOption } from "~/components/shared/SearchFilterToggles";
import { Badge } from "~/components/ui/badge";
import {
  Search as SearchIcon,
  Users,
  MapPin,
  Swords,
  BookOpen,
  Gem,
  Sparkles,
  Bug,
  Shield,
} from "lucide-react";

export const Route = createFileRoute("/_app/search")({
  component: SearchPage,
  validateSearch: (
    search: Record<string, unknown>,
  ): { q?: string; filters?: string[] } => ({
    q: typeof search.q === "string" ? search.q : undefined,
    filters: Array.isArray(search.filters)
      ? search.filters.filter((f): f is string => typeof f === "string")
      : undefined,
  }),
});

const SEARCH_FILTER_OPTIONS: FilterOption[] = [
  { value: "npc", label: "NPC", icon: Users },
  { value: "poi", label: "POI", icon: MapPin },
  { value: "faction", label: "Faction", icon: Swords },
  { value: "beasts", label: "Beasts", icon: Bug },
  { value: "equipment", label: "Equipment", icon: Shield },
  { value: "core-rules", label: "Core Rules", icon: BookOpen },
  { value: "magic-items", label: "Magic Items", icon: Gem },
  { value: "custom", label: "Custom", icon: Sparkles },
];

const typeBadgeColors: Record<SearchableItem["type"], string> = {
  npc: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  faction: "bg-red-500/15 text-red-700 dark:text-red-400",
  region: "bg-green-500/15 text-green-700 dark:text-green-400",
  poi: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  note: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  monster: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  spell: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400",
  magicItem: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  equipment: "bg-slate-500/15 text-slate-700 dark:text-slate-400",
};

const typeLabels: Record<SearchableItem["type"], string> = {
  npc: "NPC",
  faction: "Faction",
  region: "Region",
  poi: "POI",
  note: "Note",
  monster: "Monster",
  spell: "Spell",
  magicItem: "Magic Item",
  equipment: "Equipment",
};

function SearchPage() {
  const activeRealmId = useUIStore((state) => state.activeRealmId);
  const navigate = useNavigate({ from: "/search" });
  const { q: searchQuery = "", filters: searchFilters = [] } =
    Route.useSearch();
  const searchResults = useGlobalSearch(activeRealmId ?? "", searchQuery);

  const setSearchQuery = (value: string) => {
    navigate({
      search: (prev) => ({ ...prev, q: value || undefined }),
      replace: true,
    });
  };

  const setSearchFilters = (value: string[]) => {
    navigate({
      search: (prev) => ({
        ...prev,
        filters: value.length > 0 ? value : undefined,
      }),
      replace: true,
    });
  };

  const filteredSearchResults = useMemo(() => {
    if (searchFilters.length === 0) return searchResults;
    return searchResults.filter((item) => {
      for (const f of searchFilters) {
        if (f === "npc" && item.type === "npc") return true;
        if (f === "poi" && item.type === "poi") return true;
        if (f === "faction" && item.type === "faction") return true;
        if (f === "beasts" && item.type === "monster") return true;
        if (f === "equipment" && item.type === "equipment") return true;
        if (
          f === "core-rules" &&
          ["monster", "spell", "equipment"].includes(item.type) &&
          !item.url.includes("/custom/")
        )
          return true;
        if (
          f === "magic-items" &&
          item.type === "magicItem" &&
          !item.url.includes("/custom/")
        )
          return true;
        if (f === "custom" && item.url.includes("/custom/")) return true;
      }
      return false;
    });
  }, [searchResults, searchFilters]);

  if (!activeRealmId) {
    return (
      <div className="p-6">
        <EmptyState
          icon={SearchIcon}
          title="No realm selected"
          description="Select a realm first to search its contents."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      <PageHeader
        title="Search"
        description="Search NPCs, factions, locations, compendium, and notes."
      />

      <div className="space-y-3">
        <FilterBar search={searchQuery} onSearchChange={setSearchQuery} />
        <SearchFilterToggles
          type="multiple"
          value={searchFilters}
          onChange={setSearchFilters}
          options={SEARCH_FILTER_OPTIONS}
        />
      </div>

      {!searchQuery.trim() ? (
        <EmptyState
          icon={SearchIcon}
          title="Type to search"
          description="Search NPCs, factions, regions, POIs, and notes."
        />
      ) : filteredSearchResults.length === 0 ? (
        <EmptyState
          icon={SearchIcon}
          title="No results"
          description={`No matches for "${searchQuery}"${searchFilters.length > 0 ? " with selected filters" : ""}.`}
        />
      ) : (
        <div className="space-y-2">
          {filteredSearchResults.map((item) => (
            <Link
              key={`${item.type}-${item.id}`}
              to={item.url}
              params={item.params}
              search={item.search ?? {}}
              className="block rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-2 mb-1">
                <Badge
                  variant="outline"
                  className={typeBadgeColors[item.type]}
                >
                  {typeLabels[item.type]}
                </Badge>
                <span className="font-medium">{item.name}</span>
              </div>
              {item.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {item.description.slice(0, 200)}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
