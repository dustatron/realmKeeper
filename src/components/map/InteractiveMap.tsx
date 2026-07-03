import { useState, useCallback, useRef, useMemo, useEffect, type ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useUIStore } from '~/ui/stores/uiStore'
import { useContainer } from '~/ui/hooks/useContainer'
import { usePOIsOnMap, usePathsOnMap, usePOIMaps } from '~/ui/hooks/useGameMaps'
import { useRealmPOIs } from '~/ui/hooks/usePOIs'
import { useRegions } from '~/ui/hooks/useRegions'
import { useRealm } from '~/ui/hooks/useRealms'
import { useFactions } from '~/ui/hooks/useFactions'
import { useNPCsByPoi } from '~/ui/hooks/useNPCsByPoi'
import { useFactionPresencesByPoi } from '~/ui/hooks/useFactionPresences'
import { formatWorldDate, type WorldDate } from '@domain/value-objects/WorldDate'
import { statusPatch } from '@domain/services/poiStatus'
import { executePlacePOIOnMap } from '@application/use-cases/PlacePOIOnMap'
import { executeRemovePOIFromMap } from '@application/use-cases/RemovePOIFromMap'
import { executeCreatePOI } from '@application/use-cases/CreatePOI'
import { executeCreatePath } from '@application/use-cases/CreatePath'
import { executeUpdatePOI } from '@application/use-cases/UpdatePOI'
import { executeUpdateRegion } from '@application/use-cases/UpdateRegion'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@infrastructure/dexie/db'
import { MapViewer, type MapMode, type MapViewerHandle, type MapLayerId } from '~/components/map/MapViewer'
import { MapToolbar } from '~/components/map/MapToolbar'
import { MapLayerControl } from '~/components/map/MapLayerControl'
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '~/components/ui/sheet'
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
  Aperture,
  MapPin,
  Trash2,
  Star,
  CheckCircle2,
  CircleDashed,
  Check,
  CheckCheck,
  ScrollText,
  ShieldAlert,
  User,
  Crown,
  Sun,
  CloudSun,
  Moon,
  Settings2,
} from 'lucide-react'
import {
  POI_TYPES,
  POI_STATUSES,
  EXPLORABLE_POI_TYPES,
  DANGER_LABELS,
  PATH_TYPES,
  TERRAIN_TYPES,
  type PoiType,
  type PoiStatus,
  type PathType,
  type TerrainType,
} from '@shared/constants'
import { colorForTerrain } from './terrainColors'
import type { GameMap } from '@domain/entities/GameMap'
import type { POI } from '@domain/entities/POI'
import type { Region } from '@domain/entities/Region'

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
  portal: Aperture,
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
  /** External highlight (e.g. from a sidebar card selection) */
  highlightPoiId?: string | null
  /** Called when a POI marker is clicked in view mode (for room selection) */
  onPoiSelect?: (poiId: string) => void
  /** Show an in-map control that resets pan/zoom to the map image. */
  showResetControl?: boolean
  /** Optional controls rendered at the left side of the map toolbar. */
  toolbarLeftSlot?: ReactNode
}

export function InteractiveMap({
  gameMap,
  className,
  style,
  parentPoiId,
  highlightPoiId,
  onPoiSelect,
  showResetControl = true,
  toolbarLeftSlot,
}: InteractiveMapProps) {
  const navigate = useNavigate()
  const activeRealmId = useUIStore((s) => s.activeRealmId)
  const container = useContainer()
  // Load realm-scoped data by the MAP's own realm, not the global active realm —
  // otherwise regions/POIs vanish whenever you view a map whose realm isn't the
  // active one (e.g. right after generating, or navigating in from elsewhere).
  const mapRealmId = gameMap.ownerRealmId ?? activeRealmId
  const poisOnMap = usePOIsOnMap(gameMap.id)
  const pathsOnMap = usePathsOnMap(gameMap.id)
  const allPois = useRealmPOIs(mapRealmId)
  const isRealmMap = !gameMap.ownerPoiId
  const regions = useRegions(mapRealmId)
  const realm = useRealm(mapRealmId)
  // Trade-graph connections for the dashed trade-route layer. worldId === realm id
  // (same convention used by useRegions/useRealmPOIs). Scoped to 'supplies' here
  // since that's the only kind the map draws.
  const connections = useLiveQuery(
    async () => {
      if (!mapRealmId) return []
      const all = await db.connections.where('worldId').equals(mapRealmId).toArray()
      return all.filter((c) => c.kind === 'supplies')
    },
    [mapRealmId],
  ) ?? []
  const factions = useFactions(mapRealmId)
  const factionNames = useMemo(
    () => Object.fromEntries(factions.map((f) => [f.id, f.name])),
    [factions],
  )
  const currentWorldDate: WorldDate | null = realm
    ? { year: realm.currentYear, season: realm.currentSeason, day: realm.currentDay }
    : null

  const mapHandleRef = useRef<MapViewerHandle | null>(null)
  const showLabels = useUIStore((s) => s.mapShowLabels)
  const setShowLabels = useUIStore((s) => s.setMapShowLabels)
  const showRegions = useUIStore((s) => s.mapShowRegions)
  const setShowRegions = useUIStore((s) => s.setMapShowRegions)
  const savedViewState = useUIStore((s) => s.mapViewStates[gameMap.id])
  const setMapViewState = useUIStore((s) => s.setMapViewState)
  const [mode, setMode] = useState<MapMode>('view')
  // Overlay layer visibility (rivers/trade/roads/portals/wealth/resources/treasure).
  const [layers, setLayers] = useState<Record<MapLayerId, boolean>>({
    rivers: true,
    trade: false, // economic overlay — off by default; roads are the base
    roads: true,
    portals: true,
    wealth: true,
    resources: true,
    treasure: true,
  })
  const [selectedPoiForPlacement, setSelectedPoiForPlacement] = useState<POI | null>(null)
  const [poiPopup, setPoiPopup] = useState<POI | null>(null)
  const [poiSelectMode, setPoiSelectMode] = useState(!!onPoiSelect)
  const [regionPopup, setRegionPopup] = useState<Region | null>(null)

  // Create POI state
  const [createPoiDialogOpen, setCreatePoiDialogOpen] = useState(false)
  const [pendingPosition, setPendingPosition] = useState<{ x: number; y: number } | null>(null)
  const defaultPoiType: PoiType = parentPoiId ? 'building' : 'settlement'
  const [createPoiForm, setCreatePoiForm] = useState<{
    name: string
    description: string
    type: PoiType
    regionId: string
  }>({
    name: '',
    description: '',
    type: defaultPoiType,
    regionId: '',
  })

  // Unplaced POI search
  const [unplacedSearch, setUnplacedSearch] = useState('')

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

  // Draw-region state
  const [regionDialogOpen, setRegionDialogOpen] = useState(false)
  const [pendingBoundary, setPendingBoundary] = useState<{ x: number; y: number }[] | null>(null)
  const [selectedRegionId, setSelectedRegionId] = useState('')

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
      if (onPoiSelect && poiSelectMode) {
        onPoiSelect(poi.id)
      } else {
        setPoiPopup(poi)
      }
    },
    [mode, drawPathFrom, onPoiSelect, poiSelectMode],
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
          type: defaultPoiType,
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

  const handleRegionBoundaryDrawn = useCallback(
    (vertices: { x: number; y: number }[]) => {
      setPendingBoundary(vertices)
      setSelectedRegionId(regions[0]?.id ?? '')
      setRegionDialogOpen(true)
    },
    [regions],
  )

  const handleAssignRegionBoundary = async () => {
    if (!pendingBoundary || !selectedRegionId) return
    const region = regions.find((r) => r.id === selectedRegionId)
    if (!region) return
    await executeUpdateRegion(
      { ...region, boundary: pendingBoundary },
      { regionRepo: container.regionRepo },
    )
    setRegionDialogOpen(false)
    setPendingBoundary(null)
    setSelectedRegionId('')
    setMode('view')
  }

  const handleModeChange = (newMode: MapMode) => {
    setMode(newMode)
    if (newMode !== 'place-poi') {
      setCreatePoiDialogOpen(false)
      setSelectedPoiForPlacement(null)
    }
    if (newMode !== 'draw-path') {
      setDrawPathFrom(null)
      setDrawPathTo(null)
    }
    if (newMode !== 'draw-region') {
      setPendingBoundary(null)
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

  // Fullscreen toggles the whole map area (toolbar included) so the exit
  // control stays reachable. Lifted here from MapViewer so the toolbar can own it.
  const rootRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])
  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen()
    else rootRef.current?.requestFullscreen()
  }

  return (
    <div ref={rootRef} className={`flex flex-col bg-background ${className ?? ''}`} style={style}>
      {/* Status hints */}
      {(mode === 'place-poi' || mode === 'draw-path' || mode === 'draw-region') && (
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
          {mode === 'draw-region' && (
            <Badge variant="outline">Click to place vertices. Click first vertex or double-click to close polygon.</Badge>
          )}
        </div>
      )}

      <MapToolbar
        mode={mode}
        showLabels={showLabels}
        showRegions={showRegions}
        showResources={layers.resources}
        hideRegionControls={!isRealmMap}
        onModeChange={handleModeChange}
        onToggleLabels={() => setShowLabels(!showLabels)}
        onToggleResources={() => setLayers((l) => ({ ...l, resources: !l.resources }))}
        onToggleRegions={() => setShowRegions(!showRegions)}
        onUpload={() => {}}
        onZoomToFit={() => mapHandleRef.current?.zoomToFit()}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        poiSelectMode={onPoiSelect ? poiSelectMode : undefined}
        onTogglePoiSelectMode={onPoiSelect ? () => setPoiSelectMode((v) => !v) : undefined}
        leftSlot={toolbarLeftSlot}
      />

      <div className="flex-1 relative">
        {/* P4 overlay-layer toggles. Only meaningful for hex realm maps (the
            data lives on hex cells / generated POIs); hidden on town/dungeon. */}
        {gameMap.kind === 'hex' && (
          <div className="absolute right-2 top-32 z-10">
            <MapLayerControl layers={layers} onChange={setLayers} />
          </div>
        )}
        <MapViewer
          map={gameMap}
          pois={poisOnMap}
          paths={pathsOnMap}
          regions={isRealmMap ? regions : undefined}
          connections={connections}
          layers={layers}
          mode={mode}
          showLabels={showLabels}
          showRegions={showRegions}
          initialViewState={savedViewState}
          onViewStateChange={(zoom, center) => setMapViewState(gameMap.id, zoom, center)}
          selectedPoiId={selectedPoiForPlacement?.id}
          highlightPoiId={highlightPoiId}
          onReady={(handle) => { mapHandleRef.current = handle }}
          onPoiClick={handlePoiClick}
          onMapClick={handleMapClick}
          onPoiDrag={handlePoiDrag}
          onRegionBoundaryDrawn={handleRegionBoundaryDrawn}
          onRegionClick={setRegionPopup}
          showResetControl={showResetControl}
        />
      </div>

      {/* POI Popup (centered dialog) */}
      <POIPopupDialog
        poi={poiPopup}
        currentWorldDate={currentWorldDate}
        factionNames={factionNames}
        onClose={() => setPoiPopup(null)}
        onNavigateToPoi={(poiId) => navigate({ to: '/realms/pois/$poiId', params: { poiId } })}
        onNavigateToMap={(mId) => navigate({ to: '/realms/maps/$mapId', params: { mapId: mId } })}
        onNavigateToNpc={(npcId) => navigate({ to: '/realms/npcs/$npcId', params: { npcId } })}
        onUpdatePoi={async (poi, patch) => {
          // Read the live record first so toggling status/star can't clobber
          // fields that changed elsewhere (faction turns, occupant updates).
          const current = (await container.poiRepo.getById(poi.id)) ?? poi
          const next = { ...current, ...patch }
          await executeUpdatePOI(next, { poiRepo: container.poiRepo })
          setPoiPopup(next)
        }}
        onRemoveFromMap={handleRemovePoi}
      />

      {/* Region Popup Dialog */}
      <RegionPopupDialog
        region={regionPopup}
        allRegions={regions}
        onClose={() => setRegionPopup(null)}
        onChangeColor={async (region, color) => {
          await executeUpdateRegion({ ...region, color }, { regionRepo: container.regionRepo })
          setRegionPopup({ ...region, color })
        }}
        onChangeTerrain={async (region, terrain) => {
          await executeUpdateRegion({ ...region, terrain }, { regionRepo: container.regionRepo })
          setRegionPopup({ ...region, terrain })
        }}
        onDeleteBoundary={async (region) => {
          await executeUpdateRegion({ ...region, boundary: null }, { regionRepo: container.regionRepo })
          setRegionPopup(null)
        }}
        onReassignBoundary={async (fromRegion, toRegionId) => {
          const toRegion = regions.find((r) => r.id === toRegionId)
          if (!toRegion) return
          // Move boundary from one region to another
          await executeUpdateRegion({ ...toRegion, boundary: fromRegion.boundary }, { regionRepo: container.regionRepo })
          await executeUpdateRegion({ ...fromRegion, boundary: null }, { regionRepo: container.regionRepo })
          setRegionPopup(null)
        }}
        onNavigateToRegion={(regionId) => {
          setRegionPopup(null)
          navigate({ to: '/realms/regions/$regionId', params: { regionId } })
        }}
      />

      {/* Place & Create POI Sheet */}
      <Sheet open={createPoiDialogOpen} onOpenChange={setCreatePoiDialogOpen}>
        <SheetContent side="right" className="w-96 sm:max-w-lg p-6 overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{mode === 'place-poi' ? 'Place POIs' : 'Create New POI'}</SheetTitle>
          </SheetHeader>
          <div className="space-y-6 py-4">
            {/* Unplaced POIs — select one to place on map */}
            {unplacedPois.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 text-muted-foreground">
                  Unplaced ({unplacedPois.length})
                </h4>
                {unplacedPois.length > 5 && (
                  <Input
                    placeholder="Search POIs…"
                    value={unplacedSearch}
                    onChange={(e) => setUnplacedSearch(e.target.value)}
                    className="mb-2 h-8 text-sm"
                  />
                )}
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {unplacedPois.filter((p) => {
                    if (!unplacedSearch) return true
                    const q = unplacedSearch.toLowerCase()
                    return p.name.toLowerCase().includes(q) || p.type.toLowerCase().includes(q)
                  }).map((uPoi) => {
                    const UIcon = POI_TYPE_ICONS[uPoi.type]
                    return (
                      <button
                        key={uPoi.id}
                        className={`w-full flex items-center gap-2 rounded-md p-2 text-left hover:bg-accent transition-colors ${
                          selectedPoiForPlacement?.id === uPoi.id ? 'bg-accent ring-1 ring-primary' : ''
                        }`}
                        onClick={async () => {
                          if (pendingPosition) {
                            await executePlacePOIOnMap(
                              { poiId: uPoi.id, mapId: gameMap.id, position: pendingPosition },
                              { poiRepo: container.poiRepo },
                            )
                            setPendingPosition(null)
                            setCreatePoiDialogOpen(false)
                          } else {
                            setSelectedPoiForPlacement(uPoi)
                            if (mode !== 'place-poi') setMode('place-poi')
                          }
                        }}
                      >
                        <UIcon className="size-4 text-muted-foreground shrink-0" />
                        <span className="text-sm truncate flex-1">{uPoi.name}</span>
                        <Badge variant="outline" className="text-xs shrink-0">{uPoi.type}</Badge>
                      </button>
                    )
                  })}
                </div>
                {selectedPoiForPlacement && (
                  <p className="text-xs text-muted-foreground mt-2">Click the map to place "{selectedPoiForPlacement.name}"</p>
                )}
              </div>
            )}

            {/* Divider */}
            {unplacedPois.length > 0 && <div className="border-t" />}

            {/* Create new POI form */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">Create New POI</h4>
              <div>
                <Label htmlFor="imap-poi-name">Name *</Label>
                <Input
                  id="imap-poi-name"
                  value={createPoiForm.name}
                  onChange={(e) => setCreatePoiForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Name of the location"
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
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => { setCreatePoiDialogOpen(false); setPendingPosition(null) }}>Cancel</Button>
            <Button onClick={handleCreatePoi} disabled={!createPoiForm.name.trim() || !createPoiForm.regionId}>Create</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Create Path Dialog */}
      <Dialog open={pathDialogOpen} onOpenChange={(open) => {
        if (!open) { setPathDialogOpen(false); setDrawPathFrom(null); setDrawPathTo(null) }
      }}>
        <DialogContent className="sm:max-w-lg p-6">
          <DialogHeader><DialogTitle>Create Path</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="text-sm">
              <span className="font-medium">{drawPathFrom?.name}</span>{' → '}<span className="font-medium">{drawPathTo?.name}</span>
            </div>
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={pathForm.name} onChange={(e) => setPathForm((f) => ({ ...f, name: e.target.value }))} placeholder={`${drawPathFrom?.name ?? ''} → ${drawPathTo?.name ?? ''}`} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={pathForm.type} onValueChange={(v) => setPathForm((f) => ({ ...f, type: v as PathType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PATH_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Terrain</Label>
                <Select value={pathForm.terrain} onValueChange={(v) => setPathForm((f) => ({ ...f, terrain: v as TerrainType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TERRAIN_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
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

      {/* Assign Region Boundary Dialog */}
      <Dialog open={regionDialogOpen} onOpenChange={(open) => {
        if (!open) { setRegionDialogOpen(false); setPendingBoundary(null) }
      }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Region Boundary</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Polygon drawn with {pendingBoundary?.length ?? 0} vertices. Choose which region to assign it to.
            </p>
            <div>
              <Label>Region</Label>
              <Select value={selectedRegionId} onValueChange={setSelectedRegionId}>
                <SelectTrigger><SelectValue placeholder="Select region…" /></SelectTrigger>
                <SelectContent>
                  {regions.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}{r.boundary ? ' (replace existing)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRegionDialogOpen(false); setPendingBoundary(null) }}>Cancel</Button>
            <Button onClick={handleAssignRegionBoundary} disabled={!selectedRegionId}>Assign</Button>
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

const LIGHT_ICONS: Record<'bright' | 'dim' | 'dark', React.ComponentType<{ className?: string }>> = {
  bright: Sun,
  dim: CloudSun,
  dark: Moon,
}

const STATUS_META: Record<PoiStatus, { label: string; icon: React.ComponentType<{ className?: string }>; active: string }> = {
  unexplored: { label: 'Unexplored', icon: CircleDashed, active: 'border-input bg-accent text-foreground' },
  explored: { label: 'Explored', icon: Check, active: 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  cleared: { label: 'Cleared', icon: CheckCheck, active: 'border-slate-400 bg-slate-400/10 text-slate-600 dark:text-slate-300' },
}

function POIPopupDialog({
  poi,
  currentWorldDate,
  factionNames,
  onClose,
  onNavigateToPoi,
  onNavigateToMap,
  onNavigateToNpc,
  onUpdatePoi,
  onRemoveFromMap,
}: {
  poi: POI | null
  currentWorldDate: WorldDate | null
  factionNames: Record<string, string>
  onClose: () => void
  onNavigateToPoi: (poiId: string) => void
  onNavigateToMap: (mapId: string) => void
  onNavigateToNpc: (npcId: string) => void
  onUpdatePoi: (poi: POI, patch: Partial<POI>) => void
  onRemoveFromMap: (poiId: string) => void
}) {
  const poiMaps = usePOIMaps(poi?.id ?? null)
  const npcs = useNPCsByPoi(poi?.id ?? null)
  const presences = useFactionPresencesByPoi(poi?.id ?? null)
  const [showCustomize, setShowCustomize] = useState(false)

  if (!poi) return null

  const CurrentIcon = POI_TYPE_ICONS[poi.type] || MapPin
  const explorable = EXPLORABLE_POI_TYPES.includes(poi.type)
  const LightIcon = poi.lightLevel ? LIGHT_ICONS[poi.lightLevel] : null

  const setStatus = (status: PoiStatus) => {
    onUpdatePoi(poi, statusPatch(poi, status, currentWorldDate))
  }

  // Compact status control shown in the title row. Explorable sites cycle
  // unexplored→explored→cleared; everything else toggles visited on/off.
  const onStatusClick = () =>
    setStatus(
      explorable
        ? poi.status === 'unexplored' ? 'explored' : poi.status === 'explored' ? 'cleared' : 'unexplored'
        : poi.status === 'unexplored' ? 'explored' : 'unexplored',
    )
  const statusActive = explorable ? poi.status !== 'unexplored' : poi.visited
  const StatusIcon = explorable ? STATUS_META[poi.status].icon : poi.visited ? CheckCircle2 : CircleDashed
  const statusLabel = explorable ? STATUS_META[poi.status].label : poi.visited ? 'Visited' : 'Visit'
  const statusPillColor = !statusActive
    ? 'border-input text-muted-foreground hover:bg-accent'
    : poi.status === 'cleared'
      ? 'border-slate-400 text-slate-600 dark:text-slate-300'
      : 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
  const statusTitle = explorable
    ? `Status: ${STATUS_META[poi.status].label} — tap to cycle`
    : poi.visited ? 'Visited — tap to unmark' : 'Not visited — tap to mark'

  return (
    <Dialog open={!!poi} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-md gap-0 overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 pr-6">
            <CurrentIcon className="size-5 shrink-0" />
            <DialogTitle className="max-w-[40%] shrink-0 truncate text-lg leading-tight">{poi.name}</DialogTitle>
            {/* Subtype tag, centered in the title bar */}
            <div className="flex flex-1 justify-center">
              <Badge variant="outline" className="capitalize">{poi.subtypeLabel || poi.type}</Badge>
            </div>
            {/* Simple POIs get a compact visited toggle next to the star.
                Explorable sites use the 3-state buttons in the body instead. */}
            {!explorable && (
              <button
                type="button"
                onClick={onStatusClick}
                title={statusTitle}
                aria-label={statusTitle}
                aria-pressed={statusActive}
                className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium transition-colors ${statusPillColor}`}
              >
                <StatusIcon className="size-3.5" />{statusLabel}
              </button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              onClick={() => onUpdatePoi(poi, { starred: !poi.starred })}
              title={poi.starred ? 'Unstar' : 'Star'}
              aria-pressed={poi.starred}
            >
              <Star className={`size-4 ${poi.starred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
            </Button>
          </div>
          {(poi.lightLevel || poi.dangerLevel != null || poi.lastVisitedDate) && (
            <div className="flex flex-wrap items-center gap-1.5 pl-7">
              {poi.lightLevel && LightIcon && (
                <Badge variant="outline" className="gap-1 capitalize">
                  <LightIcon className="size-3" />{poi.lightLevel}
                </Badge>
              )}
              {poi.dangerLevel != null && (
                <Badge
                  variant="outline"
                  className={`gap-1 ${poi.dangerLevel >= 4 ? 'border-red-500 text-red-600 dark:text-red-400' : ''}`}
                >
                  <ShieldAlert className="size-3" />{DANGER_LABELS[poi.dangerLevel] ?? `Danger ${poi.dangerLevel}`}
                </Badge>
              )}
              {poi.lastVisitedDate && (
                <span className="text-xs text-muted-foreground">
                  Last visited {formatWorldDate(poi.lastVisitedDate)}
                </span>
              )}
            </div>
          )}
        </DialogHeader>

        <div className="space-y-3 pt-3">
          {/* Exploration status — 3-state segmented control for explorable sites */}
          {explorable && (
            <div className="grid grid-cols-3 gap-1">
              {POI_STATUSES.map((s) => {
                const meta = STATUS_META[s]
                const Icon = meta.icon
                const active = poi.status === s
                return (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    aria-pressed={active}
                    className={`flex items-center justify-center gap-1 rounded-md border py-2 text-xs font-medium transition-colors ${
                      active ? meta.active : 'border-input text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    <Icon className="size-3.5" />{meta.label}
                  </button>
                )
              })}
            </div>
          )}

          {/* Read-aloud hero (falls back to description) */}
          {poi.readAloud ? (
            <div className="rounded-md border-l-4 border-primary bg-muted/50 p-3">
              <div className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase text-muted-foreground">
                <ScrollText className="size-3" /> Read aloud
              </div>
              <p className="whitespace-pre-wrap text-sm italic">{poi.readAloud}</p>
            </div>
          ) : poi.description ? (
            <p className="text-sm text-muted-foreground">{poi.description}</p>
          ) : null}

          {/* Trouble / mood */}
          {poi.trouble && (
            <p className="text-sm">
              <span className="font-semibold text-destructive">Trouble: </span>{poi.trouble}
            </p>
          )}
          {poi.mood && (
            <p className="text-sm"><span className="font-semibold">Mood: </span>{poi.mood}</p>
          )}

          {/* Who's here now */}
          {(poi.currentOccupant || npcs.length > 0 || presences.length > 0) && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground">Here now</h4>
              {poi.currentOccupant && (
                <p className="flex items-center gap-1.5 text-sm">
                  <Crown className="size-3.5 text-amber-500" />{poi.currentOccupant}
                </p>
              )}
              {(npcs.length > 0 || presences.length > 0) && (
                <div className="flex flex-wrap gap-1">
                  {npcs.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => { onClose(); onNavigateToNpc(n.id) }}
                      className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-xs hover:bg-accent"
                    >
                      <User className="size-3" />{n.name}
                    </button>
                  ))}
                  {presences.map((p) => (
                    <Badge key={p.id} variant="secondary" className="gap-1 text-xs" title={p.type}>
                      <Flag className="size-3" />{factionNames[p.factionId] ?? 'Faction'}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Facts row */}
          {(poi.services.length > 0 || poi.encounterChance != null) && (
            <div className="flex flex-wrap gap-1.5">
              {poi.services.map((s, i) => (
                <Badge key={`${s.name}-${i}`} variant="outline" className="text-xs">{s.name}</Badge>
              ))}
              {poi.encounterChance != null && (
                <Badge variant="outline" className="gap-1 text-xs">
                  <Skull className="size-3" />1-in-{poi.encounterChance}
                </Badge>
              )}
            </div>
          )}

          {/* Child maps */}
          {poiMaps.length > 0 && (
            <div className="space-y-1">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground">Maps</h4>
              {poiMaps.map((m) => (
                <button
                  key={m.id}
                  className="flex w-full items-center gap-2 rounded-md p-2 text-left text-sm transition-colors hover:bg-accent"
                  onClick={() => { onClose(); onNavigateToMap(m.id) }}
                >
                  <MapIcon className="size-4 text-muted-foreground" />
                  <span className="truncate">{m.name}</span>
                  <ExternalLink className="ml-auto size-3 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}

          {/* Customize marker (prep-time edits, hidden by default) */}
          <div className="border-t pt-2">
            <button
              onClick={() => setShowCustomize((v) => !v)}
              className="flex w-full items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              <Settings2 className="size-3.5" /> Customize marker
            </button>
            {showCustomize && (
              <div className="mt-2 space-y-3">
                <div>
                  <h4 className="mb-1.5 text-xs font-semibold text-muted-foreground">Icon</h4>
                  <div className="flex flex-wrap gap-1">
                    {POI_TYPES.map((t) => {
                      const Icon = POI_TYPE_ICONS[t]
                      return (
                        <button
                          key={t}
                          className={`flex size-9 items-center justify-center rounded-md transition-colors ${
                            poi.type === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'
                          }`}
                          onClick={() => {
                            // Switching to a non-explorable type strands a 'cleared'
                            // status (no UI to reach it), so normalize it down to 'explored'.
                            const patch: Partial<POI> = { type: t }
                            if (poi.status === 'cleared' && !EXPLORABLE_POI_TYPES.includes(t)) {
                              Object.assign(patch, statusPatch(poi, 'explored', currentWorldDate))
                            }
                            onUpdatePoi(poi, patch)
                          }}
                          title={t}
                        >
                          <Icon className="size-4" />
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <h4 className="mb-1.5 text-xs font-semibold text-muted-foreground">Color</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {MARKER_COLORS.map((c) => (
                      <button
                        key={c ?? 'default'}
                        className={`size-7 rounded-full border-2 transition-transform hover:scale-110 ${
                          (poi.markerColor ?? null) === c ? 'scale-110 border-foreground' : 'border-transparent'
                        }`}
                        style={c ? { backgroundColor: c } : undefined}
                        onClick={() => onUpdatePoi(poi, { markerColor: c })}
                        title={c ?? 'Default'}
                      >
                        {!c && (
                          <span className="flex size-full items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">A</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => { onRemoveFromMap(poi.id); onClose() }}
                >
                  <MapPinned className="mr-2 size-4" /> Unplace from map
                </Button>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-row gap-2 pt-3">
          <Button variant="outline" size="sm" className="flex-1" onClick={onClose}>
            Close
          </Button>
          <Button
            size="sm"
            className="flex-1"
            onClick={() => { onClose(); onNavigateToPoi(poi.id) }}
          >
            <Eye className="mr-2 size-4" /> View Details
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Region Popup Dialog (shows when clicking a region polygon) ──────


const REGION_PALETTE = [
  null, // terrain default
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#78716c',
  '#166534',
  '#1e293b',
]

function RegionPopupDialog({
  region,
  allRegions,
  onClose,
  onChangeColor,
  onChangeTerrain,
  onDeleteBoundary,
  onReassignBoundary,
  onNavigateToRegion,
}: {
  region: Region | null
  allRegions: Region[]
  onClose: () => void
  onChangeColor: (region: Region, color: string | null) => void
  onChangeTerrain: (region: Region, terrain: string) => void
  onDeleteBoundary: (region: Region) => void
  onReassignBoundary: (fromRegion: Region, toRegionId: string) => void
  onNavigateToRegion: (regionId: string) => void
}) {
  const [showCustomize, setShowCustomize] = useState(false)

  if (!region) return null

  const terrainDefault = colorForTerrain(region.terrain)
  const otherRegions = allRegions.filter((r) => r.id !== region.id)

  return (
    <Dialog open={!!region} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-md gap-0 overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 pr-6">
            <span
              className="size-4 shrink-0 rounded-full border border-background"
              style={{ backgroundColor: region.color ?? terrainDefault }}
            />
            <DialogTitle className="max-w-[45%] shrink-0 truncate text-lg leading-tight">{region.name}</DialogTitle>
            {/* Terrain tag, centered in the title bar */}
            <div className="flex flex-1 justify-center">
              <Badge variant="outline" className="capitalize">{region.terrain}</Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 pt-3">
          {region.description && (
            <p className="text-sm text-muted-foreground">{region.description}</p>
          )}

          {/* Customize region (prep-time edits, hidden by default) */}
          <div className="border-t pt-2">
            <button
              onClick={() => setShowCustomize((v) => !v)}
              className="flex w-full items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              <Settings2 className="size-3.5" /> Customize region
            </button>
            {showCustomize && (
              <div className="mt-2 space-y-3">
                {/* Region reassign */}
                {otherRegions.length > 0 && (
                  <div>
                    <h4 className="mb-1.5 text-xs font-semibold text-muted-foreground">Assign to Region</h4>
                    <Select value={region.id} onValueChange={(v) => onReassignBoundary(region, v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={region.id}>{region.name} (current)</SelectItem>
                        {otherRegions.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name}{r.boundary ? ' (replace boundary)' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Terrain picker */}
                <div>
                  <h4 className="mb-1.5 text-xs font-semibold text-muted-foreground">Terrain</h4>
                  <Select value={region.terrain} onValueChange={(v) => onChangeTerrain(region, v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(TERRAIN_TYPES.includes(region.terrain as TerrainType)
                        ? TERRAIN_TYPES
                        : [region.terrain, ...TERRAIN_TYPES]
                      ).filter(Boolean).map((t) => (
                        <SelectItem key={t} value={t}>
                          <span className="flex items-center gap-2">
                            <span className="inline-block size-3 rounded-full" style={{ backgroundColor: colorForTerrain(t) }} />
                            {t}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Color picker */}
                <div>
                  <h4 className="mb-1.5 text-xs font-semibold text-muted-foreground">Color</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {REGION_PALETTE.map((c) => {
                      const isSelected = (region.color ?? null) === c
                      const displayColor = c ?? terrainDefault
                      return (
                        <button
                          key={c ?? 'default'}
                          className={`size-7 rounded-full border-2 transition-transform hover:scale-110 ${
                            isSelected ? 'scale-110 border-foreground' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: displayColor }}
                          onClick={() => onChangeColor(region, c)}
                          title={c ?? `Terrain default (${region.terrain})`}
                        >
                          {!c && (
                            <span className="flex size-full items-center justify-center rounded-full text-[9px] font-bold text-white">T</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <Button variant="destructive" size="sm" onClick={() => onDeleteBoundary(region)}>
                  <Trash2 className="mr-2 size-4" /> Delete Boundary
                </Button>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-row gap-2 pt-3">
          <Button variant="outline" size="sm" className="flex-1" onClick={onClose}>
            Close
          </Button>
          <Button
            size="sm"
            className="flex-1"
            onClick={() => { onClose(); onNavigateToRegion(region.id) }}
          >
            <Eye className="mr-2 size-4" /> View Details
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
