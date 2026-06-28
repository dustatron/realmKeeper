import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { useUIStore } from '~/ui/stores/uiStore'
import { useRegions } from '~/ui/hooks/useRegions'
import { useStarredPOIs } from '~/ui/hooks/usePOIs'
import { db } from '@infrastructure/dexie/db'
import type { PoiType } from '@shared/constants'
import { EmptyState } from '~/components/shared/EmptyState'
import { Input } from '~/components/ui/input'
import { Badge } from '~/components/ui/badge'
import {
  Compass,
  Search,
  Star,
  Building2,
  Home,
  DoorOpen,
  Castle,
  Skull,
  TreePine,
  Flag,
  LayoutGrid,
  Map,
  Landmark,
  Tent,
  Sparkles,
  MapPin,
} from 'lucide-react'

export const Route = createFileRoute('/_app/realms/locations/starred')({
  component: StarredPOIsPage,
})

const POI_TYPE_ICONS: Record<PoiType, React.ComponentType<{ className?: string }>> = {
  settlement: Building2,
  building: Home,
  interior: DoorOpen,
  fortification: Castle,
  dungeon: Skull,
  natural: TreePine,
  landmark: Flag,
  district: LayoutGrid,
  zone: Map,
  ruin: Landmark,
  camp: Tent,
  shrine: Sparkles,
  other: MapPin,
}

function StarredPOIsPage() {
  const activeRealmId = useUIStore((s) => s.activeRealmId)
  const regions = useRegions(activeRealmId)
  const starredPois = useStarredPOIs(activeRealmId)
  const [searchQuery, setSearchQuery] = useState('')

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return starredPois
    return starredPois.filter(
      (poi) =>
        poi.name.toLowerCase().includes(q) ||
        poi.subtypeLabel?.toLowerCase().includes(q) ||
        poi.tags.some((t) => t.toLowerCase().includes(q))
    )
  }, [starredPois, searchQuery])

  const getPoiTypeColor = (type: PoiType): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (type) {
      case 'settlement': return 'default'
      case 'dungeon': return 'destructive'
      case 'landmark': return 'secondary'
      default: return 'outline'
    }
  }

  if (!activeRealmId) {
    return <EmptyState icon={Compass} title="Select a realm first" />
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search starred POIs..."
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Star}
          title="No starred locations yet"
          description="Star POIs from the Points of Interest tab to see them here"
        />
      ) : (
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground hidden sm:table-cell">Region</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground hidden md:table-cell">Type</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground hidden lg:table-cell">Tags</th>
                <th className="w-8 px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.map((poi, i) => {
                const Icon = POI_TYPE_ICONS[poi.type]
                const region = regions.find((r) => r.id === poi.regionId)
                return (
                  <tr key={poi.id} className={`hover:bg-muted/30 transition-colors group ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                    <td className="px-3 py-2">
                      <Link
                        to="/realms/pois/$poiId"
                        params={{ poiId: poi.id }}
                        className="flex items-center gap-2 font-medium hover:underline"
                      >
                        <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                        <span>{poi.name}</span>
                        <Star className="size-3 fill-yellow-400 text-yellow-400 shrink-0" />
                      </Link>
                      {poi.subtypeLabel && (
                        <div className="ml-5 mt-0.5 text-xs text-muted-foreground">{poi.subtypeLabel}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground text-xs hidden sm:table-cell">
                      {region?.name ?? '—'}
                    </td>
                    <td className="px-3 py-2 hidden md:table-cell">
                      <Badge variant={getPoiTypeColor(poi.type)} className="text-xs">{poi.type}</Badge>
                    </td>
                    <td className="px-3 py-2 hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {poi.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-[10px] px-1 py-0">{tag}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => db.pois.update(poi.id, { starred: false, updatedAt: Date.now() })}
                        className="inline-flex items-center justify-center size-6 rounded hover:bg-muted transition-colors"
                        title="Unstar"
                      >
                        <Star className="size-4 fill-yellow-400 text-yellow-400" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
