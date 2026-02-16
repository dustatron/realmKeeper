import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useUIStore } from '~/ui/stores/uiStore'
import { useGlobalSearch } from '~/ui/hooks/useGlobalSearch'
import type { SearchableItem } from '~/ui/hooks/useGlobalSearch'
import { PageHeader } from '~/components/shared/PageHeader'
import { EmptyState } from '~/components/shared/EmptyState'
import { FilterBar } from '~/components/shared/FilterBar'
import { Badge } from '~/components/ui/badge'
import { Search as SearchIcon } from 'lucide-react'

export const Route = createFileRoute('/_app/realms/search')({
  component: SearchPage,
})

const typeBadgeColors: Record<SearchableItem['type'], string> = {
  npc: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  faction: 'bg-red-500/15 text-red-700 dark:text-red-400',
  region: 'bg-green-500/15 text-green-700 dark:text-green-400',
  poi: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  note: 'bg-purple-500/15 text-purple-700 dark:text-purple-400',
}

const typeLabels: Record<SearchableItem['type'], string> = {
  npc: 'NPC',
  faction: 'Faction',
  region: 'Region',
  poi: 'POI',
  note: 'Note',
}

function SearchPage() {
  const activeRealmId = useUIStore((s) => s.activeRealmId)
  const [query, setQuery] = useState('')
  const results = useGlobalSearch(activeRealmId, query)

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Search" description="Search across all entities in your realm." />

      <FilterBar search={query} onSearchChange={setQuery} />

      {!query.trim() ? (
        <EmptyState
          icon={SearchIcon}
          title="Type to search"
          description="Search NPCs, factions, regions, POIs, and notes."
        />
      ) : results.length === 0 ? (
        <EmptyState
          icon={SearchIcon}
          title="No results"
          description={`No matches for "${query}".`}
        />
      ) : (
        <div className="space-y-2">
          {results.map((item) => (
            <Link
              key={`${item.type}-${item.id}`}
              to={item.url}
              params={item.params}
              className="block rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className={typeBadgeColors[item.type]}>
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
  )
}
