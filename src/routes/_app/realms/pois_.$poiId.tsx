import { createFileRoute, Link } from '@tanstack/react-router'
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
import { executeUpdatePOI } from '@application/use-cases/UpdatePOI'
import { executeDeletePOI } from '@application/use-cases/DeletePOI'
import { executeCreatePOI } from '@application/use-cases/CreatePOI'
import { executeCreatePOIEvent } from '@application/use-cases/CreatePOIEvent'
import { executeDeletePOIEvent } from '@application/use-cases/DeletePOIEvent'
import { executeCreateNPC } from '@application/use-cases/CreateNPC'
import { executeUpdateNPC } from '@application/use-cases/UpdateNPC'
import { executeGenerateNPC } from '@application/use-cases/GenerateNPC'
import { executeCreateGameMap } from '@application/use-cases/CreateGameMap'
import { executeCreateRumor } from '@application/use-cases/CreateRumor'
import { executeUpdateRumor } from '@application/use-cases/UpdateRumor'
import { executeDeleteRumor } from '@application/use-cases/DeleteRumor'
import { executeCreateNotice } from '@application/use-cases/CreateNotice'
import { executeUpdateNotice } from '@application/use-cases/UpdateNotice'
import { executeDeleteNotice } from '@application/use-cases/DeleteNotice'
import { executeCreateEncounterTable } from '@application/use-cases/CreateEncounterTable'
import { executeUpdateEncounterTable } from '@application/use-cases/UpdateEncounterTable'
import { executeRollEncounter } from '@application/use-cases/RollEncounter'
import { NPCEditSheet } from '~/components/shared/NPCEditSheet'
import { MapUploadDialog } from '~/components/map/MapUploadDialog'
import { MultiMapViewer } from '~/components/map/MultiMapViewer'

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
import type { TreasureItem } from '@domain/value-objects/TreasureItem'
import type { Trap } from '@domain/value-objects/Trap'
import type { SessionLogEntry } from '@domain/value-objects/SessionLogEntry'
import type { CompassConnection } from '~/components/shared/CompassRose'
import { CloudinaryImage } from '~/components/shared/CloudinaryImage'
import { OPPOSITE_DIRECTION } from '@shared/constants'

import { ConfirmDialog } from '~/components/shared/ConfirmDialog'
import { TagInput } from '~/components/shared/TagInput'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '~/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '~/components/ui/dialog'
import {
  Pencil,
  Trash2,
  Plus,
  ChevronRight,
  MapPinned,
  X,
  Book,
  Star,
  CheckCircle2,
  CircleDashed,
  Swords,
  Sun,
  Moon,
  CloudMoon,
} from 'lucide-react'
import { POI_TYPE_ICONS } from '@shared/poi-icons'
import { POI_TYPES, POI_EVENT_TYPES, SEASONS, type PoiType, type POIEventType, type Season } from '@shared/constants'
import type { NoticeType } from '@shared/constants'
import type { POI } from '@domain/entities/POI'
import type { NPC } from '@domain/entities/NPC'
import type { SystemBlock } from '@domain/value-objects/SystemBlock'
import type { EncounterTable } from '@domain/entities/EncounterTable'
import type { CompendiumRef } from '@domain/entities/Compendium'
import { getCompendiumById, searchCompendium, searchCustomEntries, customEntryToCompendiumEntry } from '@domain/data/compendium'
import type { CustomCompendiumEntry } from '@domain/entities/CustomCompendiumEntry'
import { newId } from '@shared/ulid'

export const Route = createFileRoute('/_app/realms/pois_/$poiId')({
  component: POIDetailPage,
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

  // Parent dungeon data — for child rooms that inherit the dungeon map
  const parentPoi = usePOI(poi?.parentPoiId ?? null)
  const parentMaps = usePOIMaps(poi?.parentPoiId ?? null)

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

  const [runMode, setRunMode] = useState(false)
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null)
  const [mapUploadDialogOpen, setMapUploadDialogOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [createChildDialogOpen, setCreateChildDialogOpen] = useState(false)
  const [createEventDialogOpen, setCreateEventDialogOpen] = useState(false)
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null)
  const [editingNPC, setEditingNPC] = useState<NPC | null>(null)
  const [npcEditOpen, setNpcEditOpen] = useState(false)
  const [isGeneratingNPC, setIsGeneratingNPC] = useState(false)


  const [createChildForm, setCreateChildForm] = useState({
    name: '',
    description: '',
    type: 'building' as PoiType,
    subtypeLabel: '',
    floor: null as number | null,
    tags: [] as string[],
  })

  const [eventForm, setEventForm] = useState({
    name: '',
    description: '',
    type: 'festival' as POIEventType,
    season: 'spring' as Season,
    day: 1,
    year: null as number | null,
    watch: null as number | null,
    recurring: false,
    durationWatches: 1,
    effects: '',
    tags: [] as string[],
  })

  const handleDelete = async () => {
    if (!poi) return
    await executeDeletePOI(poi.id, { poiRepo: container.poiRepo })
    setDeleteConfirmOpen(false)
    window.history.back()
  }

  const openCreateChildDialog = () => {
    setCreateChildForm({ name: '', description: '', type: 'building', subtypeLabel: '', floor: null, tags: [] })
    setCreateChildDialogOpen(true)
  }

  const handleCreateChild = async () => {
    if (!poi || !createChildForm.name.trim()) return
    await executeCreatePOI(
      {
        name: createChildForm.name,
        description: createChildForm.description,
        type: createChildForm.type,
        regionId: poi.regionId,
        parentPoiId: poi.id,
        subtypeLabel: createChildForm.subtypeLabel || null,
        floor: createChildForm.floor,
        tags: createChildForm.tags,
      },
      { poiRepo: container.poiRepo }
    )
    setCreateChildDialogOpen(false)
  }

  const openCreateEventDialog = () => {
    setEventForm({ name: '', description: '', type: 'festival', season: 'spring', day: 1, year: null, watch: null, recurring: false, durationWatches: 1, effects: '', tags: [] })
    setCreateEventDialogOpen(true)
  }

  const handleCreateEvent = async () => {
    if (!poi || !region || !eventForm.name.trim()) return
    await executeCreatePOIEvent(
      {
        poiId: poi.id,
        worldId: region.worldId,
        name: eventForm.name,
        description: eventForm.description,
        type: eventForm.type,
        trigger: { year: eventForm.recurring ? null : eventForm.year, season: eventForm.season, day: eventForm.day, watch: eventForm.watch },
        recurring: eventForm.recurring,
        durationWatches: eventForm.durationWatches,
        effects: eventForm.effects,
        tags: eventForm.tags,
      },
      { poiEventRepo: container.poiEventRepo }
    )
    setCreateEventDialogOpen(false)
  }

  const handleDeleteEvent = async () => {
    if (!deletingEventId) return
    await executeDeletePOIEvent(deletingEventId, { poiEventRepo: container.poiEventRepo })
    setDeletingEventId(null)
  }

  const openCreateNPC = () => {
    if (!realm || !systemConfig) return
    const defaultSystemBlock: SystemBlock = {
      stats: systemConfig.statFields.map((f: { key: string }) => ({ key: f.key, value: 10 })),
      hp: 1,
      maxHp: 1,
      armor: 0,
      attacks: [],
      inventory: [],
      abilities: [],
      notes: '',
    }
    const npc: NPC = {
      id: newId(),
      worldId: realm.id,
      name: '',
      factionIds: [],
      regionId: poi?.regionId ?? null,
      poiId: poiId,
      lifeStatus: 'alive',
      movementStatus: 'present',
      description: '',
      traits: [],
      motivation: '',
      appearance: '',
      voice: '',
      want: '',
      tags: [],
      imageUrl: null,
      systemBlock: defaultSystemBlock,
      starred: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
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
      // Preserve the POI context
      generated.poiId = poi.id
      generated.regionId = poi.regionId
      setEditingNPC(generated)
    } finally {
      setIsGeneratingNPC(false)
    }
  }

  const handleUpdateTraps = async (traps: Trap[]) => {
    if (!poi) return
    await executeUpdatePOI({ ...poi, traps }, { poiRepo: container.poiRepo })
  }

  const handleToggleTrapDisarmed = async (trapId: string) => {
    if (!poi) return
    const updatedTraps = poi.traps.map((t) =>
      t.id === trapId ? { ...t, disarmed: !t.disarmed } : t
    )
    await executeUpdatePOI({ ...poi, traps: updatedTraps }, { poiRepo: container.poiRepo })
  }

  const handleUploadMap = async (data: { name: string; imageUrl: string; width: number; height: number }) => {
    if (!poi) return
    await executeCreateGameMap({ ...data, ownerPoiId: poi.id }, { gameMapRepo: container.gameMapRepo })
  }

  // Rumor handlers
  const handleCreateRumor = async (input: { text: string; source: string; isQuestHook: boolean }) => {
    if (!poi || !region) return
    await executeCreateRumor(
      { poiId: poi.id, regionId: poi.regionId, worldId: region.worldId, ...input },
      { rumorRepo: container.rumorRepo }
    )
  }

  const handleToggleRumorUsed = async (rumor: import('@domain/entities/Rumor').Rumor) => {
    await executeUpdateRumor({ ...rumor, isUsed: !rumor.isUsed }, { rumorRepo: container.rumorRepo })
  }

  const handleDeleteRumor = async (id: string) => {
    await executeDeleteRumor(id, { rumorRepo: container.rumorRepo })
  }

  // Notice handlers
  const handleCreateNotice = async (input: { title: string; description: string; type: NoticeType; reward: string }) => {
    if (!poi || !region) return
    await executeCreateNotice(
      { poiId: poi.id, regionId: poi.regionId, worldId: region.worldId, ...input },
      { noticeRepo: container.noticeRepo }
    )
  }

  const handleToggleNoticeUsed = async (notice: import('@domain/entities/Notice').Notice) => {
    await executeUpdateNotice({ ...notice, isUsed: !notice.isUsed }, { noticeRepo: container.noticeRepo })
  }

  const handleDeleteNotice = async (id: string) => {
    await executeDeleteNotice(id, { noticeRepo: container.noticeRepo })
  }

  // Encounter handlers
  const handleRollEncounter = async () => {
    if (!poi || !region) throw new Error('No POI/region')
    return executeRollEncounter(
      { poiId: poi.id, regionId: poi.regionId, worldId: region.worldId },
      { encounterTableRepo: container.encounterTableRepo }
    )
  }

  const handleSaveEncounterTable = async (entries: Pick<EncounterTable, 'creature' | 'signOmen' | 'loss' | 'npc' | 'discovery' | 'treasure' | 'customSections' | 'disabledCategories'>) => {
    if (!poi || !region) return
    if (encounterTable) {
      await executeUpdateEncounterTable(
        { ...encounterTable, ...entries },
        { encounterTableRepo: container.encounterTableRepo }
      )
    } else {
      await executeCreateEncounterTable(
        { ownerPoiId: poi.id, worldId: region.worldId, ...entries },
        { encounterTableRepo: container.encounterTableRepo }
      )
    }
  }

  const handleUpdateNPC = async (npc: NPC) => {
    await executeUpdateNPC(npc, { npcRepo: container.npcRepo })
  }

  const handleUpdateTreasure = async (treasure: TreasureItem[]) => {
    if (!poi) return
    await executeUpdatePOI(
      { ...poi, treasure },
      { poiRepo: container.poiRepo }
    )
  }

  const handleUpdateSessionLog = async (sessionLog: SessionLogEntry[]) => {
    if (!poi) return
    await executeUpdatePOI(
      { ...poi, sessionLog },
      { poiRepo: container.poiRepo }
    )
  }

  const handleLogDungeonEvent = (text: string) => {
    if (!poi) return
    const entry: SessionLogEntry = { id: newId(), text, timestamp: Date.now() }
    handleUpdateSessionLog([entry, ...(poi.sessionLog ?? [])])
  }

  const cycleLightLevel = async () => {
    if (!poi) return
    const cycle: Array<'bright' | 'dim' | 'dark' | null> = [null, 'bright', 'dim', 'dark']
    const idx = cycle.indexOf(poi.lightLevel ?? null)
    const next = cycle[(idx + 1) % cycle.length]
    await db.pois.update(poi.id, { lightLevel: next, updatedAt: Date.now() })
  }

  const handleUpdateCompendiumRefs = async (refs: { monsterRefs: CompendiumRef[]; magicItemRefs: CompendiumRef[]; spellRefs: CompendiumRef[]; equipmentRefs: CompendiumRef[] }) => {
    if (!poi) return
    await executeUpdatePOI(
      { ...poi, ...refs },
      { poiRepo: container.poiRepo }
    )
  }

  // Compute compass connections from paths with direction set
  // (must be before early returns to satisfy hook rules)
  const compassConnections: CompassConnection[] = useMemo(() => {
    if (!poi) return []
    const conns: CompassConnection[] = []
    for (const path of paths) {
      if (!path.direction) continue
      const isFrom = path.fromPoiId === poi.id
      const targetPoiId = isFrom ? path.toPoiId : path.fromPoiId
      const direction = isFrom ? path.direction : OPPOSITE_DIRECTION[path.direction]
      const targetPoi = allPois.find((p) => p.id === targetPoiId)
      if (targetPoi) {
        conns.push({ direction, room: targetPoi, path })
      }
    }
    return conns
  }, [poi, paths, allPois])

  if (poi === undefined) {
    return <div className="py-8 text-center text-muted-foreground">Loading...</div>
  }

  if (poi === null) {
    return <div className="py-8 text-center text-muted-foreground">POI not found.</div>
  }

  const Icon = POI_TYPE_ICONS[poi.type]

  // Notes section
  const notesSection = region ? (
    <NotesPanel ownerType="poi" ownerId={poiId} worldId={region.worldId} />
  ) : null

  // Shared map section
  const mapSection = poiMaps.length > 0 ? (
    <MultiMapViewer
      maps={poiMaps}
      onUpload={handleUploadMap}
      parentPoiId={poiId}
      highlightPoiId={selectedChildId}
    />
  ) : null

  // Parent dungeon map — compact map inherited from parent POI
  const parentMapSection = parentMaps.length > 0 ? (
    <MultiMapViewer
      maps={parentMaps}
      parentPoiId={poi.parentPoiId!}
      highlightPoiId={poiId}
      className="h-[200px] md:h-[300px]"
    />
  ) : null

  // Template selection
  const renderTemplate = () => {
    // Child of a dungeon → use compact room layout
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
          onCreateEvent={openCreateEventDialog}
          onDeleteEvent={(id) => setDeletingEventId(id)}
          onUpdateNPC={handleUpdateNPC}
          compendiumSection={
            <CompendiumRefsSection
              poi={poi}
              systemId={realm?.systemId ?? null}
              worldId={realm?.id ?? null}
              onUpdate={handleUpdateCompendiumRefs}
            />
          }
          trapSection={
            <TrapSection
              traps={poi.traps ?? []}
              onUpdate={handleUpdateTraps}
            />
          }
          treasureSection={
            <TreasureSection
              treasure={poi.treasure ?? []}
              onUpdate={handleUpdateTreasure}
            />
          }
          dungeonEventsPanel={
            <DungeonEventsPanel
              onLogEntry={handleLogDungeonEvent}
              encounterTable={encounterTable}
              onRollEncounter={handleRollEncounter}
              onSaveEncounterTable={handleSaveEncounterTable}
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
            selectedChildId={selectedChildId}
            onSelectChild={setSelectedChildId}
            factionPresences={factionPresences}
            paths={paths}
            rumors={rumors}
            notices={notices}
            encounterTable={encounterTable}
            poiEvents={poiEvents}
            poiMaps={poiMaps}
            onToggleRumorUsed={handleToggleRumorUsed}
            onCreateRumor={handleCreateRumor}
            onDeleteRumor={handleDeleteRumor}
            onToggleNoticeUsed={handleToggleNoticeUsed}
            onCreateNotice={handleCreateNotice}
            onDeleteNotice={handleDeleteNotice}
            onRollEncounter={handleRollEncounter}
            onSaveEncounterTable={handleSaveEncounterTable}
            onCreateChild={openCreateChildDialog}
            onCreateNPC={openCreateNPC}
            onCreateEvent={openCreateEventDialog}
            onDeleteEvent={(id) => setDeletingEventId(id)}
            onToggleTrapDisarmed={handleToggleTrapDisarmed}
            onUpdateNPC={handleUpdateNPC}
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
            onRollEncounter={handleRollEncounter}
            onSaveEncounterTable={handleSaveEncounterTable}
            onCreateChild={openCreateChildDialog}
            onCreateNPC={openCreateNPC}
            onCreateEvent={openCreateEventDialog}
            onDeleteEvent={(id) => setDeletingEventId(id)}
            onToggleTrapDisarmed={handleToggleTrapDisarmed}
            onUpdateNPC={handleUpdateNPC}
            selectedChildId={selectedChildId}
            onSelectChild={setSelectedChildId}
            mapSection={mapSection}
            notesSection={notesSection}
            compendiumSection={
              <CompendiumRefsSection
                poi={poi}
                systemId={realm?.systemId ?? null}
                worldId={realm?.id ?? null}
                onUpdate={handleUpdateCompendiumRefs}
              />
            }
            dungeonEventsPanel={
              <DungeonEventsPanel
                onLogEntry={handleLogDungeonEvent}
                encounterTable={encounterTable}
                onRollEncounter={handleRollEncounter}
                onSaveEncounterTable={handleSaveEncounterTable}
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
            onRollEncounter={handleRollEncounter}
            onSaveEncounterTable={handleSaveEncounterTable}
            onCreateChild={openCreateChildDialog}
            onCreateNPC={openCreateNPC}
            onCreateEvent={openCreateEventDialog}
            onDeleteEvent={(id) => setDeletingEventId(id)}
            onToggleTrapDisarmed={handleToggleTrapDisarmed}
            onUpdateNPC={handleUpdateNPC}
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
            allWorldNPCs={allWorldNPCs}
            factionPresences={factionPresences}
            paths={paths}
            poiEvents={poiEvents}
            encounterTable={encounterTable}
            rumors={rumors}
            onRollEncounter={handleRollEncounter}
            onSaveEncounterTable={handleSaveEncounterTable}
            onCreateRumor={handleCreateRumor}
            onToggleRumorUsed={handleToggleRumorUsed}
            onDeleteRumor={handleDeleteRumor}
            onCreateChild={openCreateChildDialog}
            onCreateNPC={openCreateNPC}
            onToggleTrapDisarmed={handleToggleTrapDisarmed}
            onUpdateNPC={handleUpdateNPC}
            onLinkNPC={async (npcId) => {
              const npc = allWorldNPCs.find((n) => n.id === npcId)
              if (npc) await executeUpdateNPC({ ...npc, poiId: poi.id, regionId: poi.regionId }, { npcRepo: container.npcRepo })
            }}
            onCreateEvent={openCreateEventDialog}
            onDeleteEvent={(id) => setDeletingEventId(id)}
            onUpdateLocationSeed={async (seed) => {
              await executeUpdatePOI({ ...poi, locationSeed: seed }, { poiRepo: container.poiRepo })
            }}
            mapSection={mapSection}
            notesSection={notesSection}
          />
        )
    }
  }

  return (
    <div className="space-y-4">
      {/* POI Image */}
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
        <span className="flex items-center gap-2 mr-auto">
          <Icon className="size-5" />
          <span className="font-medium">{poi.name}</span>
          <Badge variant="outline" className="text-xs">{poi.type}</Badge>
        </span>
        {/* Run mode toggle */}
        <Button
          size="sm"
          variant={runMode ? 'default' : 'outline'}
          onClick={() => setRunMode(!runMode)}
          title={runMode ? 'Exit run mode' : 'Enter run mode'}
        >
          <Swords className="mr-1.5 size-4" />
          {runMode ? 'Browse' : 'Run'}
        </Button>
        {/* Visited toggle */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => db.pois.update(poi.id, { visited: !poi.visited, updatedAt: Date.now() })}
          title={poi.visited ? 'Mark as unvisited' : 'Mark as visited'}
        >
          {poi.visited
            ? <CheckCircle2 className="size-4 text-green-500" />
            : <CircleDashed className="size-4" />}
        </Button>
        {/* Light level toggle */}
        <Button
          size="sm"
          variant="outline"
          onClick={cycleLightLevel}
          title={`Light: ${poi.lightLevel ?? 'not set'}`}
        >
          {poi.lightLevel === 'bright' ? <Sun className="size-4 text-yellow-500" /> :
           poi.lightLevel === 'dim' ? <CloudMoon className="size-4 text-blue-400" /> :
           poi.lightLevel === 'dark' ? <Moon className="size-4 text-slate-500" /> :
           <Sun className="size-4 text-muted-foreground/40" />}
        </Button>
        {/* Star */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => db.pois.update(poi.id, { starred: !poi.starred, updatedAt: Date.now() })}
          title={poi.starred ? 'Unstar' : 'Star'}
        >
          <Star className={`size-4 ${poi.starred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
        </Button>
        <Button size="sm" variant="outline" onClick={() => setMapUploadDialogOpen(true)}>
          <MapPinned className="mr-2 size-4" />
          {poiMaps.length > 0 ? 'Edit Map' : 'Add Map'}
        </Button>
        <Link to="/realms/pois/$poiId/edit" params={{ poiId }}>
          <Button size="sm">
            <Pencil className="mr-2 size-4" />
            Edit
          </Button>
        </Link>
      </div>

      {/* Compass Rose */}
      {compassConnections.length > 0 && (
        <CompassRose currentRoom={poi} connections={compassConnections} />
      )}

      {/* Run Mode vs Browse Mode */}
      {runMode ? (
        <RunModePanel
          poi={poi}
          npcs={npcs}
          paths={paths}
          onRollEncounter={handleRollEncounter}
          onUpdateNPC={handleUpdateNPC}
          onToggleTrapDisarmed={handleToggleTrapDisarmed}
          onUpdateTreasure={handleUpdateTreasure}
        />
      ) : (
        <>
          {/* Template content */}
          {renderTemplate()}

          {/* Compendium Refs — dungeons & dungeon rooms show this inside their template */}
          {poi.type !== 'dungeon' && parentPoi?.type !== 'dungeon' && (
            <CompendiumRefsSection
              poi={poi}
              systemId={realm?.systemId ?? null}
              worldId={realm?.id ?? null}
              onUpdate={handleUpdateCompendiumRefs}
            />
          )}

          {/* Traps — hidden for dungeons (traps live on rooms) and dungeon rooms (shown in their template) */}
          {poi.type !== 'dungeon' && parentPoi?.type !== 'dungeon' && (
            <TrapSection
              traps={poi.traps ?? []}
              onUpdate={handleUpdateTraps}
            />
          )}

          {/* Treasure — hidden for dungeons (treasure lives on rooms) and dungeon rooms (shown in their template) */}
          {poi.type !== 'dungeon' && parentPoi?.type !== 'dungeon' && (
            <TreasureSection
              treasure={poi.treasure ?? []}
              onUpdate={handleUpdateTreasure}
            />
          )}
        </>
      )}

      {/* Session Log — always visible */}
      <SessionLog
        log={poi.sessionLog ?? []}
        onUpdate={handleUpdateSessionLog}
      />

      {/* Create Child Sheet */}
      <Sheet open={createChildDialogOpen} onOpenChange={setCreateChildDialogOpen}>
        <SheetContent side="right" className="sm:max-w-lg overflow-y-auto p-6">
          <SheetHeader>
            <SheetTitle>Add Child Location</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="child-name">Name *</Label>
              <Input
                id="child-name"
                value={createChildForm.name}
                onChange={(e) => setCreateChildForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Name of the location"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="child-description">Description</Label>
              <Textarea
                id="child-description"
                value={createChildForm.description}
                onChange={(e) => setCreateChildForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Describe this location..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="child-type">Type</Label>
                <Select
                  value={createChildForm.type}
                  onValueChange={(value) => setCreateChildForm((f) => ({ ...f, type: value as PoiType }))}
                >
                  <SelectTrigger id="child-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {POI_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="child-subtype">Subtype Label</Label>
                <Input
                  id="child-subtype"
                  value={createChildForm.subtypeLabel}
                  onChange={(e) => setCreateChildForm((f) => ({ ...f, subtypeLabel: e.target.value }))}
                  placeholder="e.g., Tavern, Tower"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="child-floor">Floor (Optional)</Label>
              <Input
                id="child-floor"
                type="number"
                value={createChildForm.floor ?? ''}
                onChange={(e) => {
                  const val = e.target.value
                  setCreateChildForm((f) => ({ ...f, floor: val ? parseInt(val, 10) : null }))
                }}
                placeholder="e.g., 1, 2, -1"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tags</Label>
              <TagInput
                tags={createChildForm.tags}
                onChange={(tags) => setCreateChildForm((f) => ({ ...f, tags }))}
              />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setCreateChildDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateChild} disabled={!createChildForm.name.trim()}>Create</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Create Event Dialog */}
      <Dialog open={createEventDialogOpen} onOpenChange={setCreateEventDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="event-name">Name *</Label>
              <Input id="event-name" value={eventForm.name} onChange={(e) => setEventForm((f) => ({ ...f, name: e.target.value }))} placeholder="Event name" />
            </div>
            <div>
              <Label htmlFor="event-description">Description</Label>
              <Textarea id="event-description" value={eventForm.description} onChange={(e) => setEventForm((f) => ({ ...f, description: e.target.value }))} placeholder="What happens..." rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="event-type">Event Type</Label>
                <Select value={eventForm.type} onValueChange={(v) => setEventForm((f) => ({ ...f, type: v as POIEventType }))}>
                  <SelectTrigger id="event-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {POI_EVENT_TYPES.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="event-season">Season</Label>
                <Select value={eventForm.season} onValueChange={(v) => setEventForm((f) => ({ ...f, season: v as Season }))}>
                  <SelectTrigger id="event-season"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEASONS.map((s) => (<SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="event-day">Day</Label>
                <Input id="event-day" type="number" min="1" value={eventForm.day} onChange={(e) => setEventForm((f) => ({ ...f, day: parseInt(e.target.value) || 1 }))} />
              </div>
              <div>
                <Label htmlFor="event-year">Year</Label>
                <Input id="event-year" type="number" min="1" value={eventForm.year ?? ''} onChange={(e) => { const v = e.target.value; setEventForm((f) => ({ ...f, year: v ? parseInt(v) : null })) }} placeholder="Any" />
              </div>
              <div>
                <Label htmlFor="event-watch">Watch</Label>
                <Input id="event-watch" type="number" min="1" value={eventForm.watch ?? ''} onChange={(e) => { const v = e.target.value; setEventForm((f) => ({ ...f, watch: v ? parseInt(v) : null })) }} placeholder="All day" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="event-duration">Duration (watches)</Label>
                <Input id="event-duration" type="number" min="1" value={eventForm.durationWatches} onChange={(e) => setEventForm((f) => ({ ...f, durationWatches: parseInt(e.target.value) || 1 }))} />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={eventForm.recurring} onChange={(e) => setEventForm((f) => ({ ...f, recurring: e.target.checked }))} className="rounded" />
                  Recurring
                </label>
              </div>
            </div>
            <div>
              <Label htmlFor="event-effects">Effects / GM Notes</Label>
              <Textarea id="event-effects" value={eventForm.effects} onChange={(e) => setEventForm((f) => ({ ...f, effects: e.target.value }))} placeholder="Mechanical effects, NPC reactions..." rows={2} />
            </div>
            <div>
              <Label>Tags</Label>
              <TagInput tags={eventForm.tags} onChange={(tags) => setEventForm((f) => ({ ...f, tags }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateEventDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateEvent} disabled={!eventForm.name.trim()}>Create Event</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Event Confirm */}
      <ConfirmDialog
        open={deletingEventId !== null}
        onOpenChange={(open) => !open && setDeletingEventId(null)}
        title="Delete Event"
        description="Are you sure you want to delete this event?"
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDeleteEvent}
      />

      {/* Delete POI Confirm */}
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

      {/* Map Upload Dialog */}
      <MapUploadDialog
        open={mapUploadDialogOpen}
        onOpenChange={setMapUploadDialogOpen}
        onUpload={handleUploadMap}
      />

      {/* NPC Edit Sheet */}
      {editingNPC && (
        <NPCEditSheet
          npc={editingNPC}
          systemConfig={systemConfig}
          factions={factions}
          regions={regions}
          pois={allPois}
          customRaces={realm?.customRaces}
          open={npcEditOpen}
          onOpenChange={(open) => {
            if (!open) {
              setEditingNPC(null)
              setNpcEditOpen(false)
            }
          }}
          onSave={handleSaveNPC}
          onChange={setEditingNPC}
          onGenerate={handleGenerateNPC}
          isGenerating={isGeneratingNPC}
        />
      )}
    </div>
  )
}

function CompendiumRefsSection({
  poi,
  systemId,
  worldId,
  onUpdate,
}: {
  poi: POI
  systemId: string | null
  worldId: string | null
  onUpdate: (refs: { monsterRefs: CompendiumRef[]; magicItemRefs: CompendiumRef[]; spellRefs: CompendiumRef[]; equipmentRefs: CompendiumRef[] }) => void
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchKind, setSearchKind] = useState<'all' | 'monster' | 'spell' | 'magicItem' | 'equipment'>('all')
  const [showSearch, setShowSearch] = useState(false)

  // Load custom entries for this world
  const customEntries = useLiveQuery(
    () => worldId ? db.customCompendiumEntries.where('worldId').equals(worldId).toArray() : [],
    [worldId]
  ) ?? []

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    const kindFilter = searchKind === 'all' ? undefined : searchKind
    // Search system entries — prefer current system but include all as fallback
    const systemResults = searchCompendium(searchQuery, undefined, kindFilter)
    // Sort: current system first, then others
    if (systemId) {
      systemResults.sort((a, b) => {
        const aMatch = a.systemId === systemId ? 0 : 1
        const bMatch = b.systemId === systemId ? 0 : 1
        return aMatch - bMatch
      })
    }
    const customResults = searchCustomEntries(customEntries, searchQuery, kindFilter)
    // Dedupe by id
    const seen = new Set(systemResults.map((r) => r.id))
    const merged = [...systemResults, ...customResults.filter((r) => !seen.has(r.id))]
    return merged.slice(0, 15)
  }, [searchQuery, systemId, searchKind, customEntries])

  const addRef = (id: string) => {
    // Determine kind from the entry itself (handles "all" mode)
    const entry = searchResults.find((r) => r.id === id)
    const kind = entry?.kind ?? (searchKind !== 'all' ? searchKind : 'monster')
    const refsKey = kind === 'monster' ? 'monsterRefs' : kind === 'spell' ? 'spellRefs' : kind === 'equipment' ? 'equipmentRefs' : 'magicItemRefs'
    const currentRefs = poi[refsKey] ?? []
    if (currentRefs.some((r) => r.id === id)) return
    onUpdate({ monsterRefs: poi.monsterRefs ?? [], magicItemRefs: poi.magicItemRefs ?? [], spellRefs: poi.spellRefs ?? [], equipmentRefs: poi.equipmentRefs ?? [], [refsKey]: [...currentRefs, { id }] })
    setSearchQuery('')
    setShowSearch(false)
  }

  const removeRef = (kind: 'monster' | 'spell' | 'magicItem' | 'equipment', id: string) => {
    const refsKey = kind === 'monster' ? 'monsterRefs' : kind === 'spell' ? 'spellRefs' : kind === 'equipment' ? 'equipmentRefs' : 'magicItemRefs'
    onUpdate({
      monsterRefs: poi.monsterRefs ?? [],
      magicItemRefs: poi.magicItemRefs ?? [],
      spellRefs: poi.spellRefs ?? [],
      equipmentRefs: poi.equipmentRefs ?? [],
      [refsKey]: (poi[refsKey] ?? []).filter((r) => r.id !== id),
    })
  }

  const updateQuantity = (kind: 'monster' | 'spell' | 'magicItem' | 'equipment', id: string, quantity: number | undefined) => {
    const refsKey = kind === 'monster' ? 'monsterRefs' : kind === 'spell' ? 'spellRefs' : kind === 'equipment' ? 'equipmentRefs' : 'magicItemRefs'
    onUpdate({
      monsterRefs: poi.monsterRefs ?? [],
      magicItemRefs: poi.magicItemRefs ?? [],
      spellRefs: poi.spellRefs ?? [],
      equipmentRefs: poi.equipmentRefs ?? [],
      [refsKey]: (poi[refsKey] ?? []).map((r) => r.id === id ? { ...r, quantity } : r),
    })
  }

  const allRefs = [
    ...(poi.monsterRefs ?? []).map((r) => ({ ...r, kind: 'monster' as const })),
    ...(poi.spellRefs ?? []).map((r) => ({ ...r, kind: 'spell' as const })),
    ...(poi.magicItemRefs ?? []).map((r) => ({ ...r, kind: 'magicItem' as const })),
    ...(poi.equipmentRefs ?? []).map((r) => ({ ...r, kind: 'equipment' as const })),
  ]

  if (allRefs.length === 0 && !showSearch) {
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Book className="size-4" />
            Compendium
          </h4>
          <Button size="sm" variant="outline" onClick={() => setShowSearch(true)}>
            <Plus className="mr-1.5 size-3.5" />
            Link Entry
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">No compendium entries linked.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Book className="size-4" />
          Compendium ({allRefs.length})
        </h4>
        <Button size="sm" variant="outline" onClick={() => setShowSearch(!showSearch)}>
          <Plus className="mr-1.5 size-3.5" />
          Link Entry
        </Button>
      </div>

      {/* Search UI */}
      {showSearch && (
        <div className="space-y-2 mb-4 p-3 rounded-lg border bg-muted/30">
          <div className="flex gap-2">
            <Select value={searchKind} onValueChange={(v) => setSearchKind(v as any)}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="monster">Monsters</SelectItem>
                <SelectItem value="spell">Spells</SelectItem>
                <SelectItem value="magicItem">Magic Items</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search compendium..."
              className="flex-1"
              autoFocus
            />
          </div>
          {searchQuery.trim() && searchResults.length === 0 && (
            <p className="text-xs text-muted-foreground py-2 px-1">No results for "{searchQuery}"</p>
          )}
          {searchResults.length > 0 && (
            <div className="space-y-1">
              {searchResults.map((entry) => {
                const kindBadge = entry.kind === 'monster' ? 'Mon' : entry.kind === 'spell' ? 'Spl' : entry.kind === 'equipment' ? 'Eqp' : 'Mag'
                const sourceBadge = entry.systemId === 'custom' ? 'Custom' : entry.systemId.includes('cairn') ? 'Cairn' : 'SD'
                return (
                  <button
                    key={entry.id}
                    onClick={() => addRef(entry.id)}
                    className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-muted flex items-center justify-between gap-2"
                  >
                    <span className="truncate">{entry.name}</span>
                    <span className="flex items-center gap-1 shrink-0">
                      {searchKind === 'all' && (
                        <Badge variant="secondary" className="text-[10px]">{kindBadge}</Badge>
                      )}
                      <Badge variant="outline" className="text-[10px]">{sourceBadge}</Badge>
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Linked refs */}
      <div className="space-y-1">
        {allRefs.map((ref) => {
          const systemEntry = getCompendiumById(ref.id)
          const customMatch = !systemEntry ? customEntries.find((c) => c.id === ref.id) : undefined
          const entry = systemEntry ?? (customMatch ? customEntryToCompendiumEntry(customMatch) : undefined)
          if (!entry) return null
          const isCustom = !systemEntry && !!customMatch
          const kindLabel = ref.kind === 'monster' ? 'Monster' : ref.kind === 'spell' ? 'Spell' : ref.kind === 'equipment' ? 'Equipment' : 'Magic Item'
          const kindColor = ref.kind === 'monster' ? 'bg-orange-500/15 text-orange-700 dark:text-orange-400' : ref.kind === 'spell' ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400' : ref.kind === 'equipment' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400' : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
          const detailUrl = isCustom
            ? '/realms/compendium/custom/$entryId'
            : ref.kind === 'monster' ? '/realms/compendium/monsters/$monsterId' : ref.kind === 'spell' ? '/realms/compendium/spells/$spellId' : ref.kind === 'equipment' ? '/realms/compendium/equipment/$equipmentId' : '/realms/compendium/magic-items/$itemId'
          const detailParams = isCustom
            ? { entryId: ref.id }
            : ref.kind === 'monster' ? { monsterId: ref.id } : ref.kind === 'spell' ? { spellId: ref.id } : ref.kind === 'equipment' ? { equipmentId: ref.id } : { itemId: ref.id }

          return (
            <div key={ref.id} className="flex items-center gap-2 px-3 py-2 rounded-md border text-sm">
              <Link to={detailUrl} params={detailParams} className="flex-1 flex items-center gap-2 hover:underline">
                <Badge variant="outline" className={`text-xs ${kindColor}`}>{kindLabel}</Badge>
                <span className="font-medium">{entry.name}</span>
              </Link>
              {(ref.kind === 'monster' || ref.kind === 'equipment') && (
                <Input
                  type="number"
                  min="1"
                  value={ref.quantity ?? ''}
                  onChange={(e) => updateQuantity(ref.kind, ref.id, e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="qty"
                  className="w-16 h-7 text-xs"
                />
              )}
              <Button
                variant="ghost"
                size="sm"
                className="size-7 p-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeRef(ref.kind, ref.id)}
              >
                <X className="size-3.5" />
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

