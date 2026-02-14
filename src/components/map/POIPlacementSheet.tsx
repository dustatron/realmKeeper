import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '~/components/ui/sheet'
import {
  Building2,
  Home,
  DoorOpen,
  Castle,
  Skull,
  TreePine,
  Flag,
  LayoutGrid,
  Map as MapIcon,
  Landmark,
  Tent,
  Sparkles,
  MapPin,
  Plus,
  X,
} from 'lucide-react'
import type { POI } from '@domain/entities/POI'
import type { PoiType } from '@shared/constants'

const POI_TYPE_ICONS: Record<PoiType, React.ComponentType<{ className?: string }>> = {
  settlement: Building2,
  building: Home,
  interior: DoorOpen,
  fortification: Castle,
  dungeon: Skull,
  natural: TreePine,
  landmark: Flag,
  district: LayoutGrid,
  zone: MapIcon,
  ruin: Landmark,
  camp: Tent,
  shrine: Sparkles,
  other: MapPin,
}

interface POIPlacementSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  placedPois: POI[]
  unplacedPois: POI[]
  onSelectPoi: (poi: POI) => void
  onRemovePoi: (poiId: string) => void
  onCreatePoi: () => void
  selectedPoiId?: string | null
}

export function POIPlacementSheet({
  open,
  onOpenChange,
  placedPois,
  unplacedPois,
  onSelectPoi,
  onRemovePoi,
  onCreatePoi,
  selectedPoiId,
}: POIPlacementSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-80 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Place POIs</SheetTitle>
        </SheetHeader>
        <div className="space-y-6 py-4">
          <Button size="sm" className="w-full" onClick={onCreatePoi}>
            <Plus className="mr-2 size-4" />
            Create New POI
          </Button>

          {/* Unplaced POIs */}
          <div>
            <h4 className="text-sm font-semibold mb-2 text-muted-foreground">
              Unplaced ({unplacedPois.length})
            </h4>
            {unplacedPois.length > 0 ? (
              <div className="space-y-1">
                {unplacedPois.map((poi) => {
                  const Icon = POI_TYPE_ICONS[poi.type]
                  return (
                    <button
                      key={poi.id}
                      className={`w-full flex items-center gap-2 rounded-md p-2 text-left hover:bg-accent transition-colors ${
                        selectedPoiId === poi.id ? 'bg-accent ring-1 ring-primary' : ''
                      }`}
                      onClick={() => onSelectPoi(poi)}
                    >
                      <Icon className="size-4 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate flex-1">{poi.name}</span>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {poi.type}
                      </Badge>
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">All POIs placed on map.</p>
            )}
          </div>

          {/* Placed POIs */}
          {placedPois.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2 text-muted-foreground">
                Placed ({placedPois.length})
              </h4>
              <div className="space-y-1">
                {placedPois.map((poi) => {
                  const Icon = POI_TYPE_ICONS[poi.type]
                  return (
                    <div
                      key={poi.id}
                      className="flex items-center gap-2 rounded-md p-2"
                    >
                      <Icon className="size-4 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate flex-1">{poi.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="size-6 p-0 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => onRemovePoi(poi.id)}
                        title="Remove from map"
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
