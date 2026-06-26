import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@infrastructure/dexie/db'
import { usePOI, useRealmPOIs } from '~/ui/hooks/usePOIs'
import { useRegion, useRegions } from '~/ui/hooks/useRegions'
import { usePOIBreadcrumb } from '~/ui/hooks/usePOIBreadcrumb'
import { usePOIChildren } from '~/ui/hooks/usePOIChildren'
import { useNPCs } from '~/ui/hooks/useNPCs'
import { useNPCsByPoi } from '~/ui/hooks/useNPCsByPoi'
import { useNPCsByPoiIds } from '~/ui/hooks/useNPCsByPoiIds'
import { useFactionPresencesByPoi } from '~/ui/hooks/useFactionPresences'
import { useResolvedPaths } from '~/ui/hooks/useResolvedPaths'
import { usePOIMaps } from '~/ui/hooks/useGameMaps'
import { useActiveRealm } from '~/ui/hooks/useActiveRealm'
import { useSystemConfig } from '~/ui/hooks/useSystemConfigs'
import { useFactions } from '~/ui/hooks/useFactions'
import { useRumorsByPoi } from '~/ui/hooks/useRumors'
import { useNoticesByPoi } from '~/ui/hooks/useNotices'
import { useEncounterTable } from '~/ui/hooks/useEncounterTable'
import { useContainer } from '~/ui/hooks/useContainer'
import { useUIStore } from '~/ui/stores/uiStore'
import { usePOIActions } from '~/ui/hooks/usePOIActions'
import { executeDeletePOI } from '@application/use-cases/DeletePOI'
import { executeGetOrCreateTownMap } from '@application/use-cases/GetOrCreateTownMap'
import { executePlacePOIOnMap } from '@application/use-cases/PlacePOIOnMap'
import { pickTownMapForSize } from '~/maps/townMaps'
import { extractTownBuildings } from '~/maps/townMapGeometry'
import { assignPoisToBuildings } from '~/maps/townPoiPlacement'

/** Load a bundled image's natural pixel dimensions. */
function loadImageSize(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = reject
    img.src = url
  })
}
import { executeCreateNPC } from '@application/use-cases/CreateNPC'
import { executeGenerateNPC } from '@application/use-cases/GenerateNPC'
import { NPCEditSheet } from '~/components/shared/NPCEditSheet'
import { MapUploadDialog } from '~/components/map/MapUploadDialog'
import { IMAGE_MAP_GENERATORS } from '~/lib/watabou/generators'
import { MultiMapViewer } from '~/components/map/MultiMapViewer'
import { WatabouMapSection } from '~/components/watabou/WatabouMapSection'
import { SpatialDungeonRenderer } from '~/components/dungeon/SpatialDungeonRenderer'
import { SettlementTemplate } from '~/components/poi-templates/SettlementTemplate'
import { DungeonTemplate } from '~/components/poi-templates/DungeonTemplate'
import { BuildingTemplate } from '~/components/poi-templates/BuildingTemplate'
import { GenericTemplate } from '~/components/poi-templates/GenericTemplate'
import { DungeonRoomTemplate } from '~/components/poi-templates/DungeonRoomTemplate'
import { NotesPanel } from '~/components/shared/NotesPanel'
import { CompassRose } from '~/components/shared/CompassRose'
import { TreasureSection } from '~/components/shared/TreasureSection'
import { TrapSection } from '~/components/shared/TrapSection'
import { DungeonEventsPanel } from '~/components/shared/DungeonEventsPanel'
import { SessionLog } from '~/components/shared/SessionLog'
import { RunModePanel } from '~/components/shared/RunModePanel'
import { CompendiumRefsSection } from '~/components/shared/CompendiumRefsSection'
import { CreateChildSheet } from '~/components/poi/CreateChildSheet'
import { CreateEventDialog } from '~/components/poi/CreateEventDialog'
import { CloudinaryImage } from '~/components/shared/CloudinaryImage'
import { ConfirmDialog } from '~/components/shared/ConfirmDialog'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import {
  Pencil,
  ChevronRight,
  MapPinned,
  Star,
  CheckCircle2,
  CircleDashed,
  Swords,
  Sun,
  Moon,
  CloudMoon,
  Wand2,
} from 'lucide-react'
import { POI_TYPE_ICONS } from '@shared/poi-icons'
import { OPPOSITE_DIRECTION } from '@shared/constants'
import type { NPC } from '@domain/entities/NPC'
import type { SystemBlock } from '@domain/value-objects/SystemBlock'
import type { CompassConnection } from '~/components/shared/CompassRose'
import { newId } from '@shared/ulid'

export const Route = createFileRoute('/_app/realms/pois_/$poiId')({
  component: POIDetailPage,
  validateSearch: (search: Record<string, unknown>): { room?: string; tab?: string } => ({
    room: typeof search.room === 'string' ? search.room : undefined,
    tab: typeof search.tab === 'string' ? search.tab : undefined,
  }),
})

function POIDetailPage() {
  const { poiId } = Route.useParams()
  const poi = usePOI(poiId)
  const region = useRegion(poi?.regionId ?? null)
  const breadcrumb = usePOIBreadcrumb(poiId)
  const children = usePOIChildren(poiId)
  const npcs = useNPCsByPoi(poiId)
  const childNPCs = useNPCsByPoiIds(children.map((c) => c.id))
  const factionPresences = useFactionPresencesByPoi(poiId)
  const paths = useResolvedPaths(poiId)
  const poiEvents = useLiveQuery(
    () => (poiId ? db.poiEvents.where('poiId').equals(poiId).toArray() : []),
    [poiId]
  ) ?? []
  const poiMaps = usePOIMaps(poiId)
  const rumors = useRumorsByPoi(poiId)
  const notices = useNoticesByPoi(poiId)
  const encounterTable = useEncounterTable(poiId, poi?.regionId ?? null, null)
  const realm = useActiveRealm()
  const allWorldNPCs = useNPCs(realm?.id ?? null)
  const systemConfig = useSystemConfig(realm?.systemId ?? null)
  const factions = useFactions(realm?.id ?? null)
  const regions = useRegions(realm?.id ?? null)
  const allPois = useRealmPOIs(realm?.id ?? null)
  const container = useContainer()
  const setHeaderTitle = useUIStore((s) => s.setHeaderTitle)

  const parentPoi = usePOI(poi?.parentPoiId ?? null)
  const parentMaps = usePOIMaps(poi?.parentPoiId ?? null)

  const actions = usePOIActions(poi, region, encounterTable, container)

  // Local UI state
  const [runMode, setRunMode] = useState(false)
  const [mapUploadDialogOpen, setMapUploadDialogOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [createChildOpen, setCreateChildOpen] = useState(false)
  const [createEventOpen, setCreateEventOpen] = useState(false)
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null)
  const [editingNPC, setEditingNPC] = useState<NPC | null>(null)
  const [npcEditOpen, setNpcEditOpen] = useState(false)
  const [isGeneratingNPC, setIsGeneratingNPC] = useState(false)
  const [isCreatingTownMap, setIsCreatingTownMap] = useState(false)
  const [townMapError, setTownMapError] = useState<string | null>(null)

  // Breadcrumb in site header
  useEffect(() => {
    if (!poi) return
    setHeaderTitle(
      <div className="flex items-center gap-1.5 text-sm">
        <Link to="/realms/locations/pois" className="text-muted-foreground hover:text-foreground">
          POIs
        </Link>
        {region && (
          <>
            <ChevronRight className="size-3 text-muted-foreground" />
            <Link to="/realms/regions/$regionId" params={{ regionId: region.id }} className="text-muted-foreground hover:text-foreground">{region.name}</Link>
          </>
        )}
        {breadcrumb.slice(0, -1).map((ancestor) => (
          <span key={ancestor.id} className="flex items-center gap-1.5">
            <ChevronRight className="size-3 text-muted-foreground" />
            <Link
              to="/realms/pois/$poiId"
              params={{ poiId: ancestor.id }}
              className="text-muted-foreground hover:text-foreground"
            >
              {ancestor.name}
            </Link>
          </span>
        ))}
        <ChevronRight className="size-3 text-muted-foreground" />
        <span className="font-medium">{poi.name}</span>
      </div>
    )
    return () => setHeaderTitle(null)
  }, [poi, region, breadcrumb, setHeaderTitle])

  const navigate = useNavigate({ from: Route.fullPath })
  const { room: selectedChildId, tab: activeTab } = Route.useSearch()

  const setSelectedChildId = (id: string | null) => {
    navigate({ search: (prev) => ({ ...prev, room: id ?? undefined }), replace: true, resetScroll: false })
  }

  const setActiveTab = (tab: string) => {
    navigate({ search: (prev) => ({ ...prev, tab }), replace: true })
  }

  const handleDelete = async () => {
    if (!poi) return
    await executeDeletePOI(poi.id, { poiRepo: container.poiRepo })
    setDeleteConfirmOpen(false)
    window.history.back()
  }

  const openCreateNPC = () => {
    if (!realm || !systemConfig) return
    const defaultSystemBlock: SystemBlock = {
      stats: systemConfig.statFields.map((f: { key: string }) => ({ key: f.key, value: 10 })),
      hp: 1, maxHp: 1, armor: 0, attacks: [], inventory: [], abilities: [], notes: '',
    }
    const npc: NPC = {
      id: newId(), worldId: realm.id, name: '', factionIds: [],
      regionId: poi?.regionId ?? null, poiId: poiId, lifeStatus: 'alive',
      movementStatus: 'present', description: '', traits: [], motivation: '',
      appearance: '', voice: '', want: '', tags: [], imageUrl: null,
      systemBlock: defaultSystemBlock, starred: false,
      createdAt: Date.now(), updatedAt: Date.now(),
    }
    setEditingNPC(npc)
    setNpcEditOpen(true)
  }

  const handleSaveNPC = async () => {
    if (!editingNPC) return
    await executeCreateNPC(editingNPC, { npcRepo: container.npcRepo })
    setEditingNPC(null)
    setNpcEditOpen(false)
  }

  const handleGenerateNPC = async () => {
    if (!realm || !systemConfig || !poi) return
    setIsGeneratingNPC(true)
    try {
      const generated = await executeGenerateNPC(
        { worldId: realm.id, systemConfig, regionId: poi.regionId, customRaces: realm.customRaces },
        { tableRepo: container.tableRepo }
      )
      generated.poiId = poi.id
      generated.regionId = poi.regionId
      setEditingNPC(generated)
    } finally {
      setIsGeneratingNPC(false)
    }
  }

  const handleCreateTownMap = async () => {
    if (!poi) return

    setTownMapError(null)
    setIsCreatingTownMap(true)
    try {
      const picked = pickTownMapForSize(poi.id, children.length)
      if (!picked) throw new Error('No bundled town maps are available.')

      const { width, height } = await loadImageSize(picked.imageUrl)
      const townMap = await executeGetOrCreateTownMap(
        { poiId: poi.id, name: poi.name, imageUrl: picked.imageUrl, width, height },
        { gameMapRepo: container.gameMapRepo },
      )

      const response = await fetch(picked.jsonUrl)
      if (!response.ok) throw new Error(`Town geometry failed to load: ${response.status}`)

      const buildings = extractTownBuildings(await response.json(), { width, height })
      if (buildings.length === 0) throw new Error('Town geometry has no usable buildings.')

      const assignments = assignPoisToBuildings({
        pois: children,
        buildings,
        mapId: townMap.id,
        imageSize: { width, height },
      })

      await Promise.all(assignments.map((assignment) =>
        executePlacePOIOnMap(
          { poiId: assignment.poiId, mapId: townMap.id, position: assignment.position },
          { poiRepo: container.poiRepo },
        ),
      ))

      navigate({ to: '/realms/maps/$mapId', params: { mapId: townMap.id } })
    } catch (err) {
      setTownMapError(err instanceof Error ? err.message : 'Town map creation failed.')
    } finally {
      setIsCreatingTownMap(false)
    }
  }

  const compassConnections: CompassConnection[] = useMemo(() => {
    if (!poi) return []
    const conns: CompassConnection[] = []
    for (const path of paths) {
      if (!path.direction) continue
      const isFrom = path.fromPoiId === poi.id
      const targetPoiId = isFrom ? path.toPoiId : path.fromPoiId
      const direction = isFrom ? path.direction : OPPOSITE_DIRECTION[path.direction]
      const targetPoi = allPois.find((p) => p.id === targetPoiId)
      if (targetPoi) conns.push({ direction, room: targetPoi, path })
    }
    return conns
  }, [poi, paths, allPois])

  if (poi === undefined) return <div className="py-8 text-center text-muted-foreground">Loading...</div>
  if (poi === null) return <div className="py-8 text-center text-muted-foreground">POI not found.</div>

  const Icon = POI_TYPE_ICONS[poi.type]
  // POI type implies a default generator; the user can still pick either in the Add Map dialog.
  const impliedGenerator = poi.type === 'settlement' ? 'mfcg' as const : poi.type === 'dungeon' ? 'opd' as const : null
  // Render whatever generator was actually saved on this POI, regardless of type.
  const activeWatabouGenerator = poi.watabouGenerator ?? impliedGenerator

  const notesSection = region ? <NotesPanel ownerType="poi" ownerId={poiId} worldId={region.worldId} /> : null

  const multiMapViewer = poiMaps.length > 0 ? (
    <MultiMapViewer
      maps={poiMaps}
      onUpload={actions.handleUploadMap}
      parentPoiId={poiId}
      highlightPoiId={selectedChildId}
      onPoiSelect={setSelectedChildId}
    />
  ) : null

  const watabouInline = activeWatabouGenerator && poi.watabouData ? (
    <WatabouMapSection
      data={poi.watabouData}
      seed={poi.watabouSeed}
      generator={activeWatabouGenerator}
      onImport={actions.handleImportWatabou}
      onClear={actions.handleClearWatabou}
    />
  ) : null

  const spatialDungeonMap = poi.type === 'dungeon' && poi.spatialDungeon ? (() => {
    const roomPoiMap = poi.spatialDungeon.roomPoiMap ?? {}
    const roomIdToPoiId = new Map(Object.entries(roomPoiMap))
    return (
      <SpatialDungeonRenderer
        dungeon={poi.spatialDungeon}
        selectedRoomPoiId={selectedChildId ?? undefined}
        roomIdToPoiId={roomIdToPoiId}
        onRoomClick={(childPoiId) => setSelectedChildId(childPoiId)}
        onDungeonChange={actions.handleUpdateSpatialDungeon}
        className="h-[300px] md:h-[400px]"
      />
    )
  })() : null

  const mapSection = (multiMapViewer || watabouInline || spatialDungeonMap) ? (
    <>{spatialDungeonMap}{multiMapViewer}{watabouInline}</>
  ) : null

  const parentMapSection = parentMaps.length > 0 ? (
    <MultiMapViewer
      maps={parentMaps}
      parentPoiId={poi.parentPoiId!}
      highlightPoiId={poiId}
      className="h-[200px] md:h-[300px]"
    />
  ) : null

  const compendiumSection = (
    <CompendiumRefsSection
      poi={poi}
      systemId={realm?.systemId ?? null}
      worldId={realm?.id ?? null}
      onUpdate={actions.handleUpdateCompendiumRefs}
    />
  )

  const renderTemplate = () => {
    if (parentPoi?.type === 'dungeon') {
      return (
        <DungeonRoomTemplate
          poi={poi}
          npcs={npcs}
          factionPresences={factionPresences}
          paths={paths}
          poiEvents={poiEvents}
          parentMapSection={parentMapSection}
          onCreateNPC={openCreateNPC}
          onCreateEvent={() => setCreateEventOpen(true)}
          onDeleteEvent={(id) => setDeletingEventId(id)}
          onUpdateNPC={actions.handleUpdateNPC}
          compendiumSection={compendiumSection}
          trapSection={<TrapSection traps={poi.traps ?? []} onUpdate={actions.handleUpdateTraps} />}
          treasureSection={<TreasureSection treasure={poi.treasure ?? []} onUpdate={actions.handleUpdateTreasure} />}
          dungeonEventsPanel={
            <DungeonEventsPanel
              onLogEntry={actions.handleLogDungeonEvent}
              encounterTable={encounterTable}
              onRollEncounter={actions.handleRollEncounter}
              onSaveEncounterTable={actions.handleSaveEncounterTable}
            />
          }
          notesSection={notesSection}
        />
      )
    }

    switch (poi.type) {
      case 'settlement':
        return (
          <SettlementTemplate
            poi={poi}
            children={children}
            npcs={npcs}
            childNPCs={childNPCs}
            selectedChildId={selectedChildId ?? null}
            onSelectChild={setSelectedChildId}
            factionPresences={factionPresences}
            paths={paths}
            rumors={rumors}
            notices={notices}
            encounterTable={encounterTable}
            poiEvents={poiEvents}
            poiMaps={poiMaps}
            onToggleRumorUsed={actions.handleToggleRumorUsed}
            onCreateRumor={actions.handleCreateRumor}
            onDeleteRumor={actions.handleDeleteRumor}
            onToggleNoticeUsed={actions.handleToggleNoticeUsed}
            onCreateNotice={actions.handleCreateNotice}
            onDeleteNotice={actions.handleDeleteNotice}
            onRollEncounter={actions.handleRollEncounter}
            onSaveEncounterTable={actions.handleSaveEncounterTable}
            onCreateChild={() => setCreateChildOpen(true)}
            onCreateNPC={openCreateNPC}
            onCreateEvent={() => setCreateEventOpen(true)}
            onDeleteEvent={(id) => setDeletingEventId(id)}
            onToggleTrapDisarmed={actions.handleToggleTrapDisarmed}
            onUpdateNPC={actions.handleUpdateNPC}
            mapSection={mapSection}
            notesSection={notesSection}
          />
        )
      case 'dungeon':
        return (
          <DungeonTemplate
            poi={poi}
            children={children}
            npcs={npcs}
            childNPCs={childNPCs}
            factionPresences={factionPresences}
            paths={paths}
            poiEvents={poiEvents}
            encounterTable={encounterTable}
            onRollEncounter={actions.handleRollEncounter}
            onSaveEncounterTable={actions.handleSaveEncounterTable}
            onCreateChild={() => setCreateChildOpen(true)}
            onCreateNPC={openCreateNPC}
            onCreateEvent={() => setCreateEventOpen(true)}
            onDeleteEvent={(id) => setDeletingEventId(id)}
            onToggleTrapDisarmed={actions.handleToggleTrapDisarmed}
            onUpdateNPC={actions.handleUpdateNPC}
            selectedChildId={selectedChildId ?? null}
            onSelectChild={setSelectedChildId}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            mapSection={mapSection}
            notesSection={notesSection}
            systemId={realm?.systemId ?? null}
            worldId={realm?.id ?? null}
            compendiumSection={compendiumSection}
            dungeonEventsPanel={
              <DungeonEventsPanel
                onLogEntry={actions.handleLogDungeonEvent}
                encounterTable={encounterTable}
                onRollEncounter={actions.handleRollEncounter}
                onSaveEncounterTable={actions.handleSaveEncounterTable}
              />
            }
          />
        )
      case 'building':
      case 'interior':
        return (
          <BuildingTemplate
            poi={poi}
            children={children}
            npcs={npcs}
            factionPresences={factionPresences}
            paths={paths}
            poiEvents={poiEvents}
            encounterTable={encounterTable}
            onRollEncounter={actions.handleRollEncounter}
            onSaveEncounterTable={actions.handleSaveEncounterTable}
            onCreateChild={() => setCreateChildOpen(true)}
            onCreateNPC={openCreateNPC}
            onCreateEvent={() => setCreateEventOpen(true)}
            onDeleteEvent={(id) => setDeletingEventId(id)}
            onToggleTrapDisarmed={actions.handleToggleTrapDisarmed}
            onUpdateNPC={actions.handleUpdateNPC}
            mapSection={mapSection}
            notesSection={notesSection}
          />
        )
      default:
        return (
          <GenericTemplate
            poi={poi}
            children={children}
            npcs={npcs}
            childNPCs={childNPCs}
            allWorldNPCs={allWorldNPCs}
            factionPresences={factionPresences}
            paths={paths}
            poiEvents={poiEvents}
            encounterTable={encounterTable}
            rumors={rumors}
            onRollEncounter={actions.handleRollEncounter}
            onSaveEncounterTable={actions.handleSaveEncounterTable}
            onCreateRumor={actions.handleCreateRumor}
            onToggleRumorUsed={actions.handleToggleRumorUsed}
            onDeleteRumor={actions.handleDeleteRumor}
            onCreateChild={() => setCreateChildOpen(true)}
            onCreateNPC={openCreateNPC}
            onToggleTrapDisarmed={actions.handleToggleTrapDisarmed}
            onUpdateNPC={actions.handleUpdateNPC}
            onLinkNPC={async (npcId) => {
              const npc = allWorldNPCs.find((n) => n.id === npcId)
              if (npc) await actions.handleUpdateNPC({ ...npc, poiId: poi.id, regionId: poi.regionId })
            }}
            onCreateEvent={() => setCreateEventOpen(true)}
            onDeleteEvent={(id) => setDeletingEventId(id)}
            onUpdateLocationSeed={actions.handleUpdateLocationSeed}
            mapSection={mapSection}
            notesSection={notesSection}
          />
        )
    }
  }

  return (
    <div className="space-y-4">
      {poi.imageUrl && (
        <CloudinaryImage
          src={poi.imageUrl}
          alt={poi.name}
          width={800}
          className="w-full max-h-64 rounded-lg border object-cover"
        />
      )}

      {/* Action bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="flex items-center gap-2 mr-auto flex-wrap">
          <Icon className="size-5" />
          <span className="font-medium">{poi.name}</span>
          <Badge variant="outline" className="text-xs">{poi.type}</Badge>
          {poi.type === 'dungeon' && poi.spatialDungeon && (
            <>
              <Badge variant="secondary" className="text-xs capitalize">{poi.spatialDungeon.theme.replace(/_/g, ' ')}</Badge>
              <Badge variant="secondary" className="text-xs">Depth {poi.spatialDungeon.depth}</Badge>
              <Badge variant="secondary" className="text-xs capitalize">{poi.spatialDungeon.size}</Badge>
            </>
          )}
        </span>
        <Button size="sm" variant={runMode ? 'default' : 'outline'} onClick={() => setRunMode(!runMode)} title={runMode ? 'Exit run mode' : 'Enter run mode'}>
          <Swords className="mr-1.5 size-4" />
          {runMode ? 'Browse' : 'Run'}
        </Button>
        <Button size="sm" variant="outline" onClick={() => db.pois.update(poi.id, { visited: !poi.visited, updatedAt: Date.now() })} title={poi.visited ? 'Mark as unvisited' : 'Mark as visited'}>
          {poi.visited ? <CheckCircle2 className="size-4 text-green-500" /> : <CircleDashed className="size-4" />}
        </Button>
        <Button size="sm" variant="outline" onClick={actions.cycleLightLevel} title={`Light: ${poi.lightLevel ?? 'not set'}`}>
          {poi.lightLevel === 'bright' ? <Sun className="size-4 text-yellow-500" /> :
           poi.lightLevel === 'dim' ? <CloudMoon className="size-4 text-blue-400" /> :
           poi.lightLevel === 'dark' ? <Moon className="size-4 text-slate-500" /> :
           <Sun className="size-4 text-muted-foreground/40" />}
        </Button>
        <Button size="sm" variant="outline" onClick={() => db.pois.update(poi.id, { starred: !poi.starred, updatedAt: Date.now() })} title={poi.starred ? 'Unstar' : 'Star'}>
          <Star className={`size-4 ${poi.starred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
        </Button>
        {poi.type === 'dungeon' && (
          <Link to="/realms/pois/$poiId/generate-dungeon" params={{ poiId }}>
            <Button size="sm" variant="outline">
              <Wand2 className="mr-2 size-4" />
              {poi.spatialDungeon ? 'Regenerate' : 'Generate'}
            </Button>
          </Link>
        )}
        <Button size="sm" variant="outline" onClick={() => setMapUploadDialogOpen(true)}>
          <MapPinned className="mr-2 size-4" />
          {poiMaps.length > 0 ? 'Edit Map' : 'Add Map'}
        </Button>
        {poi.type === 'settlement' && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleCreateTownMap}
            disabled={isCreatingTownMap}
          >
            <MapPinned className="mr-2 size-4" />
            {isCreatingTownMap ? 'Creating...' : 'Town Map'}
          </Button>
        )}
        <Link to="/realms/pois/$poiId/edit" params={{ poiId }}>
          <Button size="sm">
            <Pencil className="mr-2 size-4" />
            Edit
          </Button>
        </Link>
      </div>

      {townMapError && (
        <p className="text-sm text-destructive">{townMapError}</p>
      )}

      {compassConnections.length > 0 && (
        <CompassRose currentRoom={poi} connections={compassConnections} />
      )}

      {runMode ? (
        <RunModePanel
          poi={poi}
          npcs={npcs}
          paths={paths}
          onRollEncounter={actions.handleRollEncounter}
          onUpdateNPC={actions.handleUpdateNPC}
          onToggleTrapDisarmed={actions.handleToggleTrapDisarmed}
          onUpdateTreasure={actions.handleUpdateTreasure}
        />
      ) : (
        <>
          {renderTemplate()}
          {poi.type !== 'dungeon' && parentPoi?.type !== 'dungeon' && compendiumSection}
          {poi.type !== 'dungeon' && parentPoi?.type !== 'dungeon' && (
            <TrapSection traps={poi.traps ?? []} onUpdate={actions.handleUpdateTraps} />
          )}
          {poi.type !== 'dungeon' && parentPoi?.type !== 'dungeon' && (
            <TreasureSection treasure={poi.treasure ?? []} onUpdate={actions.handleUpdateTreasure} />
          )}
        </>
      )}

      <SessionLog log={poi.sessionLog ?? []} onUpdate={actions.handleUpdateSessionLog} />

      {/* Dialogs */}
      {poi && <CreateChildSheet open={createChildOpen} onOpenChange={setCreateChildOpen} parentPoi={poi} />}
      {poi && region && (
        <CreateEventDialog
          open={createEventOpen}
          onOpenChange={setCreateEventOpen}
          poi={poi}
          region={region}
          deletingEventId={deletingEventId}
          onDeleteConfirmClose={() => setDeletingEventId(null)}
        />
      )}

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete POI"
        description={`Are you sure you want to delete "${poi.name}"? ${
          children.length > 0 || npcs.length > 0
            ? `This will affect ${children.length} child location(s) and ${npcs.length} NPC(s).`
            : 'This action cannot be undone.'
        }`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />

      <MapUploadDialog
        open={mapUploadDialogOpen}
        onOpenChange={setMapUploadDialogOpen}
        onUpload={actions.handleUploadMap}
        enableGenerate
        defaultGenerator={poi.watabouGenerator ?? impliedGenerator ?? undefined}
        onWatabouImport={actions.handleImportWatabou}
        imageGenerators={IMAGE_MAP_GENERATORS}
        existingWatabouData={poi.watabouData}
        existingSeed={poi.watabouSeed}
      />

      {editingNPC && (
        <NPCEditSheet
          npc={editingNPC}
          systemConfig={systemConfig ?? null}
          factions={factions}
          regions={regions}
          pois={allPois}
          customRaces={realm?.customRaces}
          open={npcEditOpen}
          onOpenChange={(open) => { if (!open) { setEditingNPC(null); setNpcEditOpen(false) } }}
          onSave={handleSaveNPC}
          onChange={setEditingNPC}
          onGenerate={handleGenerateNPC}
          isGenerating={isGeneratingNPC}
        />
      )}
    </div>
  )
}
