import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { useUIStore } from '~/ui/stores/uiStore'
import { useRegions } from '~/ui/hooks/useRegions'
import { useStarredPOIs } from '~/ui/hooks/usePOIs'
import { db } from '@infrastructure/dexie/db'
import type { POI } from '@domain/entities/POI'
import type { PoiType } from '@shared/constants'
import { EmptyState } from '~/components/shared/EmptyState'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
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

  const poisByRegionMap = useMemo(() => {
    const mapObj: Record<string, POI[]> = {}
    filtered.forEach((poi) => {
      if (!mapObj[poi.regionId]) mapObj[poi.regionId] = []
      mapObj[poi.regionId].push(poi)
    })
    return mapObj
  }, [filtered])

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
        <div className="space-y-6">
          {Object.entries(poisByRegionMap).map(([regionId, regionPois]) => {
            const region = regions.find((r) => r.id === regionId)
            if (!region) return null

            return (
              <div key={regionId} className="space-y-3">
                <h3 className="text-lg font-semibold">{region.name}</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {regionPois.map((poi) => {
                    const Icon = POI_TYPE_ICONS[poi.type]

                    return (
                      <Link
                        key={poi.id}
                        to="/realms/pois/$poiId"
                        params={{ poiId: poi.id }}
                        className="block"
                      >
                        <Card className="cursor-pointer transition-shadow hover:shadow-elevated h-full">
                          <CardHeader>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2 flex-1">
                                <Icon className="size-5 text-muted-foreground shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <CardTitle className="text-base">{poi.name}</CardTitle>
                                  {poi.subtypeLabel && (
                                    <CardDescription className="mt-0.5 text-xs">
                                      {poi.subtypeLabel}
                                    </CardDescription>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  db.pois.update(poi.id, { starred: false, updatedAt: Date.now() })
                                }}
                                className="shrink-0 p-1 rounded-md hover:bg-muted transition-colors"
                                title="Unstar"
                              >
                                <Star className="size-4 fill-yellow-400 text-yellow-400" />
                              </button>
                              <Badge variant={getPoiTypeColor(poi.type)}>{poi.type}</Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            {poi.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {poi.description}
                              </p>
                            )}
                            {poi.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {poi.tags.map((tag) => (
                                  <Badge key={tag} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
