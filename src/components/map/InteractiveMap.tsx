import { useState, useCallback, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useUIStore } from '~/ui/stores/uiStore'
import { useContainer } from '~/ui/hooks/useContainer'
import { usePOIsOnMap, usePathsOnMap, usePOIMaps } from '~/ui/hooks/useGameMaps'
import { useRealmPOIs } from '~/ui/hooks/usePOIs'
import { useRegions } from '~/ui/hooks/useRegions'
import { executePlacePOIOnMap } from '@application/use-cases/PlacePOIOnMap'
import { executeRemovePOIFromMap } from '@application/use-cases/RemovePOIFromMap'
import { executeCreatePOI } from '@application/use-cases/CreatePOI'
import { executeCreatePath } from '@application/use-cases/CreatePath'
import { executeUpdatePOI } from '@application/use-cases/UpdatePOI'
import { MapViewer, type MapMode, type MapViewerHandle } from '~/components/map/MapViewer'
import { MapToolbar } from '~/components/map/MapToolbar'
import { POIPlacementSheet } from '~/components/map/POIPlacementSheet'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '~/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import {
  MapPinned,
  Map as MapIcon,
  Eye,
  ExternalLink,
  Building2,
  Home,
  DoorOpen,
  Castle,
  Skull,
  TreePine,
  Flag,
  LayoutGrid,
  Landmark,
  Tent,
  Sparkles,
  MapPin,
} from 'lucide-react'
import {
  POI_TYPES,
  PATH_TYPES,
  TERRAIN_TYPES,
  type PoiType,
  type PathType,
  type TerrainType,
} from '@shared/constants'
import type { GameMap } from '@domain/entities/GameMap'
import type { POI } from '@domain/entities/POI'

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

interface InteractiveMapProps {
  gameMap: GameMap
  /** Tailwind classes for the outer container. Controls height, etc. */
  className?: string
  /** Inline styles for the outer container (e.g. aspect-ratio) */
  style?: React.CSSProperties
  /** If set, new POIs created from the map will be children of this POI */
  parentPoiId?: string | null
}

export function InteractiveMap({ gameMap, className, style, parentPoiId }: InteractiveMapProps) {
  const navigate = useNavigate()
  const activeRealmId = useUIStore((s) => s.activeRealmId)
  const container = useContainer()
  const poisOnMap = usePOIsOnMap(gameMap.id)
  const pathsOnMap = usePathsOnMap(gameMap.id)
  const allPois = useRealmPOIs(activeRealmId)
  const regions = useRegions(activeRealmId)

  const mapHandleRef = useRef<MapViewerHandle | null>(null)
  const showLabels = useUIStore((s) => s.mapShowLabels)
  const setShowLabels = useUIStore((s) => s.setMapShowLabels)
  const savedViewState = useUIStore((s) => s.mapViewStates[gameMap.id])
  const setMapViewState = useUIStore((s) => s.setMapViewState)
  const [mode, setMode] = useState<MapMode>('view')
  const [placementSheetOpen, setPlacementSheetOpen] = useState(false)
  const [selectedPoiForPlacement, setSelectedPoiForPlacement] = useState<POI | null>(null)
  const [poiPopup, setPoiPopup] = useState<POI | null>(null)

  // Create POI state
  const [createPoiDialogOpen, setCreatePoiDialogOpen] = useState(false)
  const [pendingPosition, setPendingPosition] = useState<{ x: number; y: number } | null>(null)
  const [createPoiForm, setCreatePoiForm] = useState({
    name: '',
    description: '',
    type: 'settlement' as PoiType,
    regionId: '',
  })

  // Draw-path state
  const [drawPathFrom, setDrawPathFrom] = useState<POI | null>(null)
  const [drawPathTo, setDrawPathTo] = useState<POI | null>(null)
  const [pathDialogOpen, setPathDialogOpen] = useState(false)
  const [pathForm, setPathForm] = useState({
    name: '',
    type: 'road' as PathType,
    terrain: 'plains' as TerrainType,
    baseTravelWatches: 3,
  })

  const scopedPois = parentPoiId
    ? allPois.filter((p) => p.parentPoiId === parentPoiId)
    : allPois
  const unplacedPois = scopedPois.filter((p) => !p.mapRef || p.mapRef !== gameMap.id)

  const handlePoiClick = useCallback(
    (poi: POI) => {
      if (mode === 'draw-path') {
        if (!drawPathFrom) {
          setDrawPathFrom(poi)
        } else if (poi.id !== drawPathFrom.id) {
          setDrawPathTo(poi)
          setPathDialogOpen(true)
        }
        return
      }
      setPoiPopup(poi)
    },
    [mode, drawPathFrom],
  )

  const handleMapClick = useCallback(
    async (position: { x: number; y: number }) => {
      if (mode !== 'place-poi') return
      if (selectedPoiForPlacement) {
        await executePlacePOIOnMap(
          { poiId: selectedPoiForPlacement.id, mapId: gameMap.id, position },
          { poiRepo: container.poiRepo },
        )
        setSelectedPoiForPlacement(null)
      } else {
        setPendingPosition(position)
        setCreatePoiForm({
          name: '',
          description: '',
          type: 'settlement',
          regionId: regions[0]?.id ?? '',
        })
        setCreatePoiDialogOpen(true)
      }
    },
    [mode, selectedPoiForPlacement, gameMap.id, container.poiRepo, regions],
  )

  const handlePoiDrag = useCallback(
    async (poiId: string, position: { x: number; y: number }) => {
      await executePlacePOIOnMap(
        { poiId, mapId: gameMap.id, position },
        { poiRepo: container.poiRepo },
      )
    },
    [gameMap.id, container.poiRepo],
  )

  const handleRemovePoi = useCallback(
    async (poiId: string) => {
      await executeRemovePOIFromMap(poiId, { poiRepo: container.poiRepo })
    },
    [container.poiRepo],
  )

  const handleOpenCreatePoiDialog = () => {
    setCreatePoiForm({
      name: '',
      description: '',
      type: 'settlement',
      regionId: regions[0]?.id ?? '',
    })
    setPendingPosition(null)
    setCreatePoiDialogOpen(true)
  }

  const handleCreatePoi = async () => {
    if (!createPoiForm.name.trim() || !createPoiForm.regionId) return
    const newPoi = await executeCreatePOI(
      {
        name: createPoiForm.name,
        description: createPoiForm.description,
        type: createPoiForm.type,
        regionId: createPoiForm.regionId,
        parentPoiId: parentPoiId ?? undefined,
        mapRef: gameMap.id,
        position: pendingPosition,
      },
      { poiRepo: container.poiRepo },
    )
    setCreatePoiDialogOpen(false)
    if (!pendingPosition) {
      setSelectedPoiForPlacement(newPoi)
    }
    setPendingPosition(null)
  }

  const handleModeChange = (newMode: MapMode) => {
    setMode(newMode)
    if (newMode === 'place-poi') {
      setPlacementSheetOpen(true)
    } else {
      setPlacementSheetOpen(false)
      setSelectedPoiForPlacement(null)
    }
    if (newMode !== 'draw-path') {
      setDrawPathFrom(null)
      setDrawPathTo(null)
    }
  }

  const handleCreatePath = async () => {
    if (!drawPathFrom || !drawPathTo) return
    await executeCreatePath(
      {
        fromPoiId: drawPathFrom.id,
        toPoiId: drawPathTo.id,
        name: pathForm.name || `${drawPathFrom.name} → ${drawPathTo.name}`,
        type: pathForm.type,
        terrain: pathForm.terrain,
        baseTravelWatches: pathForm.baseTravelWatches,
      },
      { pathRepo: container.pathRepo },
    )
    setPathDialogOpen(false)
    setDrawPathFrom(null)
    setDrawPathTo(null)
    setPathForm({ name: '', type: 'road', terrain: 'plains', baseTravelWatches: 3 })
  }

  return (
    <div className={`flex flex-col ${className ?? ''}`} style={style}>
      {/* Status hints */}
      {(mode === 'place-poi' || mode === 'draw-path') && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-b bg-muted/50">
          {mode === 'place-poi' && selectedPoiForPlacement && (
            <Badge variant="secondary">Click map to place: {selectedPoiForPlacement.name}</Badge>
          )}
          {mode === 'place-poi' && !selectedPoiForPlacement && (
            <Badge variant="outline">Click map to create new POI, or select one from sidebar</Badge>
          )}
          {mode === 'draw-path' && !drawPathFrom && (
            <Badge variant="outline">Click a POI to start drawing a path</Badge>
          )}
          {mode === 'draw-path' && drawPathFrom && !drawPathTo && (
            <Badge variant="secondary">Click second POI to draw path from: {drawPathFrom.name}</Badge>
          )}
        </div>
      )}

      <MapToolbar
        mode={mode}
        showLabels={showLabels}
        onModeChange={handleModeChange}
        onToggleLabels={() => setShowLabels(!showLabels)}
        onUpload={() => {}}
        onZoomToFit={() => mapHandleRef.current?.zoomToFit()}
      />

      <div className="flex-1 relative">
        <MapViewer
          map={gameMap}
          pois={poisOnMap}
          paths={pathsOnMap}
          mode={mode}
          showLabels={showLabels}
          initialViewState={savedViewState}
          onViewStateChange={(zoom, center) => setMapViewState(gameMap.id, zoom, center)}
          selectedPoiId={selectedPoiForPlacement?.id}
          onReady={(handle) => { mapHandleRef.current = handle }}
          onPoiClick={handlePoiClick}
          onMapClick={handleMapClick}
          onPoiDrag={handlePoiDrag}
        />
      </div>

      <POIPlacementSheet
        open={placementSheetOpen}
        onOpenChange={setPlacementSheetOpen}
        placedPois={poisOnMap}
        unplacedPois={unplacedPois}
        onSelectPoi={setSelectedPoiForPlacement}
        onRemovePoi={handleRemovePoi}
        onCreatePoi={handleOpenCreatePoiDialog}
        selectedPoiId={selectedPoiForPlacement?.id}
      />

      {/* POI Popup Dialog */}
      <POIPopupDialog
        poi={poiPopup}
        onClose={() => setPoiPopup(null)}
        onNavigateToPoi={(poiId) => navigate({ to: '/realms/pois/$poiId', params: { poiId } })}
        onNavigateToMap={(mId) => navigate({ to: '/realms/maps/$mapId', params: { mapId: mId } })}
        onChangeType={async (poi, newType) => {
          await executeUpdatePOI({ ...poi, type: newType }, { poiRepo: container.poiRepo })
          setPoiPopup({ ...poi, type: newType })
        }}
        onChangeColor={async (poi, color) => {
          await executeUpdatePOI({ ...poi, markerColor: color }, { poiRepo: container.poiRepo })
          setPoiPopup({ ...poi, markerColor: color })
        }}
      />

      {/* Create POI Dialog */}
      <Dialog open={createPoiDialogOpen} onOpenChange={setCreatePoiDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New POI</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="imap-poi-name">Name *</Label>
              <Input
                id="imap-poi-name"
                value={createPoiForm.name}
                onChange={(e) => setCreatePoiForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Name of the location"
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="imap-poi-desc">Description</Label>
              <Textarea
                id="imap-poi-desc"
                value={createPoiForm.description}
                onChange={(e) => setCreatePoiForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Describe this location..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select value={createPoiForm.type} onValueChange={(v) => setCreatePoiForm((f) => ({ ...f, type: v as PoiType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {POI_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Region *</Label>
                <Select value={createPoiForm.regionId} onValueChange={(v) => setCreatePoiForm((f) => ({ ...f, regionId: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {regions.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {pendingPosition && (
              <p className="text-xs text-muted-foreground">
                Will be placed at ({Math.round(pendingPosition.x)}, {Math.round(pendingPosition.y)})
              </p>
            )}
            {!pendingPosition && (
              <p className="text-xs text-muted-foreground">After creating, click the map to place it.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreatePoiDialogOpen(false); setPendingPosition(null) }}>Cancel</Button>
            <Button onClick={handleCreatePoi} disabled={!createPoiForm.name.trim() || !createPoiForm.regionId}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Path Dialog */}
      <Dialog open={pathDialogOpen} onOpenChange={(open) => {
        if (!open) { setPathDialogOpen(false); setDrawPathFrom(null); setDrawPathTo(null) }
      }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Path</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="text-sm">
              <span className="font-medium">{drawPathFrom?.name}</span>{' → '}<span className="font-medium">{drawPathTo?.name}</span>
            </div>
            <div>
              <Label>Name</Label>
              <Input value={pathForm.name} onChange={(e) => setPathForm((f) => ({ ...f, name: e.target.value }))} placeholder={`${drawPathFrom?.name ?? ''} → ${drawPathTo?.name ?? ''}`} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select value={pathForm.type} onValueChange={(v) => setPathForm((f) => ({ ...f, type: v as PathType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PATH_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Terrain</Label>
                <Select value={pathForm.terrain} onValueChange={(v) => setPathForm((f) => ({ ...f, terrain: v as TerrainType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TERRAIN_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Travel Time (watches)</Label>
              <Input type="number" min="1" value={pathForm.baseTravelWatches} onChange={(e) => setPathForm((f) => ({ ...f, baseTravelWatches: parseInt(e.target.value) || 1 }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPathDialogOpen(false); setDrawPathFrom(null); setDrawPathTo(null); setPathForm({ name: '', type: 'road', terrain: 'plains', baseTravelWatches: 3 }) }}>Cancel</Button>
            <Button onClick={handleCreatePath}>Create Path</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── POI Popup Dialog (shows when clicking a marker) ─────────────────

const MARKER_COLORS = [
  null, // default/theme
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#78716c', // stone
  '#1e293b', // slate
  '#ffffff', // white
]

function POIPopupDialog({
  poi,
  onClose,
  onNavigateToPoi,
  onNavigateToMap,
  onChangeType,
  onChangeColor,
}: {
  poi: POI | null
  onClose: () => void
  onNavigateToPoi: (poiId: string) => void
  onNavigateToMap: (mapId: string) => void
  onChangeType: (poi: POI, newType: PoiType) => void
  onChangeColor: (poi: POI, color: string | null) => void
}) {
  const poiMaps = usePOIMaps(poi?.id ?? null)

  if (!poi) return null

  const CurrentIcon = POI_TYPE_ICONS[poi.type] || MapPin

  return (
    <Dialog open={!!poi} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CurrentIcon className="size-4" />
            {poi.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {poi.description && (
            <p className="text-sm text-muted-foreground line-clamp-3">{poi.description}</p>
          )}

          {/* Icon / Type picker */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground mb-1.5">Icon</h4>
            <div className="flex flex-wrap gap-1">
              {POI_TYPES.map((t) => {
                const Icon = POI_TYPE_ICONS[t]
                return (
                  <button
                    key={t}
                    className={`flex items-center justify-center size-8 rounded-md transition-colors ${
                      poi.type === t
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent text-muted-foreground'
                    }`}
                    onClick={() => onChangeType(poi, t)}
                    title={t}
                  >
                    <Icon className="size-4" />
                  </button>
                )
              })}
            </div>
          </div>

          {/* Color picker */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground mb-1.5">Color</h4>
            <div className="flex flex-wrap gap-1">
              {MARKER_COLORS.map((c) => (
                <button
                  key={c ?? 'default'}
                  className={`size-6 rounded-full border-2 transition-transform hover:scale-110 ${
                    (poi.markerColor ?? null) === c
                      ? 'border-foreground scale-110'
                      : 'border-transparent'
                  }`}
                  style={c ? { backgroundColor: c } : undefined}
                  onClick={() => onChangeColor(poi, c)}
                  title={c ?? 'Default'}
                >
                  {!c && (
                    <span className="flex items-center justify-center size-full rounded-full bg-primary text-primary-foreground text-[9px] font-bold">A</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {poiMaps.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-1.5">Maps</h4>
              <div className="space-y-1">
                {poiMaps.map((m) => (
                  <button
                    key={m.id}
                    className="w-full flex items-center gap-2 rounded-md p-2 text-left hover:bg-accent transition-colors text-sm"
                    onClick={() => {
                      onClose()
                      onNavigateToMap(m.id)
                    }}
                  >
                    <MapIcon className="size-4 text-muted-foreground" />
                    <span className="truncate">{m.name}</span>
                    <ExternalLink className="size-3 text-muted-foreground ml-auto" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button
            size="sm"
            onClick={() => {
              onClose()
              onNavigateToPoi(poi.id)
            }}
          >
            <Eye className="mr-2 size-4" />
            View Details
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
