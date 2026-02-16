import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@infrastructure/dexie/db'
import { usePOI, useRealmPOIs } from '~/ui/hooks/usePOIs'
import { useRegion, useRegions } from '~/ui/hooks/useRegions'
import { usePOIBreadcrumb } from '~/ui/hooks/usePOIBreadcrumb'
import { usePOIChildren } from '~/ui/hooks/usePOIChildren'
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
import { ServicesList } from '~/components/shared/ServicesList'

import { SettlementTemplate } from '~/components/poi-templates/SettlementTemplate'
import { DungeonTemplate } from '~/components/poi-templates/DungeonTemplate'
import { BuildingTemplate } from '~/components/poi-templates/BuildingTemplate'
import { GenericTemplate } from '~/components/poi-templates/GenericTemplate'
import { NotesPanel } from '~/components/shared/NotesPanel'
import { ImagePicker } from '~/components/shared/ImagePicker'
import { CloudinaryImage } from '~/components/shared/CloudinaryImage'

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
  MapPin,
  Building2,
  Home,
  DoorOpen,
  Castle,
  Skull,
  TreePine,
  Flag,
  Landmark,
  LayoutGrid,
  Map,
  Tent,
  Sparkles,
  ChevronRight,
  CalendarClock,
  MapPinned,
  X,
  Book,
} from 'lucide-react'
import { POI_TYPES, POI_EVENT_TYPES, SEASONS, type PoiType, type POIEventType, type Season } from '@shared/constants'
import type { NoticeType } from '@shared/constants'
import type { POI } from '@domain/entities/POI'
import type { NPC } from '@domain/entities/NPC'
import type { SystemBlock } from '@domain/value-objects/SystemBlock'
import type { Service } from '@domain/value-objects/Service'
import type { EncounterTable } from '@domain/entities/EncounterTable'
import type { CompendiumRef } from '@domain/entities/Compendium'
import { getCompendiumById, searchCompendium } from '@domain/data/compendium'
import { newId } from '@shared/ulid'

export const Route = createFileRoute('/_app/realms/pois_/$poiId')({
  component: POIDetailPage,
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
  const systemConfig = useSystemConfig(realm?.systemId ?? null)
  const factions = useFactions(realm?.id ?? null)
  const regions = useRegions(realm?.id ?? null)
  const allPois = useRealmPOIs(realm?.id ?? null)
  const container = useContainer()
  const setHeaderTitle = useUIStore((s) => s.setHeaderTitle)

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

  const [selectedChildId, setSelectedChildId] = useState<string | null>(null)
  const [mapUploadDialogOpen, setMapUploadDialogOpen] = useState(false)
  const [editSheetOpen, setEditSheetOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [createChildDialogOpen, setCreateChildDialogOpen] = useState(false)
  const [createEventDialogOpen, setCreateEventDialogOpen] = useState(false)
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null)
  const [editingNPC, setEditingNPC] = useState<NPC | null>(null)
  const [npcEditOpen, setNpcEditOpen] = useState(false)
  const [isGeneratingNPC, setIsGeneratingNPC] = useState(false)

  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    type: 'settlement' as PoiType,
    regionId: '',
    parentPoiId: null as string | null,
    subtypeLabel: '',
    floor: null as number | null,
    tags: [] as string[],
    readAloud: '',
    gmNotes: '',
    trouble: '',
    mood: '',
    sensory: '',
    services: [] as Service[],
    imageUrl: null as string | null,
  })

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

  const openEditSheet = () => {
    if (!poi) return
    setEditForm({
      name: poi.name,
      description: poi.description,
      type: poi.type,
      regionId: poi.regionId,
      parentPoiId: poi.parentPoiId,
      subtypeLabel: poi.subtypeLabel ?? '',
      floor: poi.floor,
      tags: poi.tags,
      readAloud: poi.readAloud,
      gmNotes: poi.gmNotes,
      trouble: poi.trouble,
      mood: poi.mood,
      sensory: poi.sensory,
      services: poi.services,
      imageUrl: poi.imageUrl,
    })
    setEditSheetOpen(true)
  }

  const handleEdit = async () => {
    if (!poi || !editForm.name.trim()) return
    await executeUpdatePOI(
      {
        ...poi,
        name: editForm.name,
        description: editForm.description,
        type: editForm.type,
        regionId: editForm.regionId,
        parentPoiId: editForm.parentPoiId,
        subtypeLabel: editForm.subtypeLabel || null,
        floor: editForm.floor,
        tags: editForm.tags,
        readAloud: editForm.readAloud,
        gmNotes: editForm.gmNotes,
        trouble: editForm.trouble,
        mood: editForm.mood,
        sensory: editForm.sensory,
        services: editForm.services,
        imageUrl: editForm.imageUrl,
      },
      { poiRepo: container.poiRepo }
    )
    setEditSheetOpen(false)
  }

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
      factionId: null,
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
        { worldId: realm.id, systemConfig, regionId: poi.regionId },
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

  const handleSaveEncounterTable = async (entries: Pick<EncounterTable, 'creature' | 'signOmen' | 'loss' | 'npc' | 'discovery' | 'treasure'>) => {
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

  const handleUpdateCompendiumRefs = async (refs: { monsterRefs: CompendiumRef[]; magicItemRefs: CompendiumRef[]; spellRefs: CompendiumRef[] }) => {
    if (!poi) return
    await executeUpdatePOI(
      { ...poi, ...refs },
      { poiRepo: container.poiRepo }
    )
  }

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

  // Template selection
  const renderTemplate = () => {
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
            factionPresences={factionPresences}
            encounterTable={encounterTable}
            onRollEncounter={handleRollEncounter}
            onSaveEncounterTable={handleSaveEncounterTable}
            onCreateChild={openCreateChildDialog}
            onCreateNPC={openCreateNPC}
            mapSection={mapSection}
            notesSection={notesSection}
          />
        )
      case 'building':
      case 'interior':
        return (
          <BuildingTemplate
            poi={poi}
            children={children}
            npcs={npcs}
            onCreateChild={openCreateChildDialog}
            onCreateNPC={openCreateNPC}
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
            factionPresences={factionPresences}
            paths={paths}
            poiEvents={poiEvents}
            onCreateChild={openCreateChildDialog}
            onCreateNPC={openCreateNPC}
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
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-2 mr-auto">
          <Icon className="size-5" />
          <span className="font-medium">{poi.name}</span>
          <Badge variant="outline" className="text-xs">{poi.type}</Badge>
        </span>
        <Button size="sm" variant="outline" onClick={() => setMapUploadDialogOpen(true)}>
          <MapPinned className="mr-2 size-4" />
          {poiMaps.length > 0 ? 'Edit Map' : 'Add Map'}
        </Button>
        <Button size="sm" onClick={openEditSheet}>
          <Pencil className="mr-2 size-4" />
          Edit
        </Button>
      </div>

      {/* Template content */}
      {renderTemplate()}

      {/* Compendium Refs */}
      <CompendiumRefsSection
        poi={poi}
        systemId={realm?.systemId ?? null}
        onUpdate={handleUpdateCompendiumRefs}
      />

      {/* Events section (shared across non-settlement templates) */}
      {poi.type !== 'settlement' && poiEvents.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <CalendarClock className="size-4" />
              Events ({poiEvents.length})
            </h4>
            <Button size="sm" variant="outline" onClick={openCreateEventDialog}>
              <Plus className="mr-1.5 size-3.5" />
              Add Event
            </Button>
          </div>
          <div className="space-y-2">
            {poiEvents.map((event) => (
              <div key={event.id} className="flex items-start gap-2 rounded-md border p-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{event.name}</span>
                    <Badge variant="outline" className="text-xs">{event.type}</Badge>
                    {event.isActive && <Badge className="text-xs bg-green-600">Active</Badge>}
                    {event.recurring && <Badge variant="secondary" className="text-xs">Recurring</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {event.trigger.season.charAt(0).toUpperCase() + event.trigger.season.slice(1)} Day {event.trigger.day}
                    {event.trigger.year !== null && `, Year ${event.trigger.year}`}
                    {event.trigger.watch !== null && `, Watch ${event.trigger.watch}`}
                    {' · '}{event.durationWatches} watch{event.durationWatches !== 1 ? 'es' : ''}
                  </div>
                  {event.description && (
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-1">{event.description}</div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-7 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => setDeletingEventId(event.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Sheet */}
      <Sheet open={editSheetOpen} onOpenChange={setEditSheetOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto p-6">
          <SheetHeader>
            <SheetTitle>Edit Point of Interest</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Name of the POI"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Describe this location..."
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Image</Label>
              <ImagePicker
                imageUrl={editForm.imageUrl}
                onImageChange={(url) => setEditForm((f) => ({ ...f, imageUrl: url }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-type">Type</Label>
                <Select
                  value={editForm.type}
                  onValueChange={(value) => setEditForm((f) => ({ ...f, type: value as PoiType }))}
                >
                  <SelectTrigger id="edit-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {POI_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-subtype">Subtype Label</Label>
                <Input
                  id="edit-subtype"
                  value={editForm.subtypeLabel}
                  onChange={(e) => setEditForm((f) => ({ ...f, subtypeLabel: e.target.value }))}
                  placeholder="e.g., Tavern, Tower"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-mood">Mood</Label>
                <Input
                  id="edit-mood"
                  value={editForm.mood}
                  onChange={(e) => setEditForm((f) => ({ ...f, mood: e.target.value }))}
                  placeholder="prosperous, fearful, lawless..."
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-floor">Floor</Label>
                <Input
                  id="edit-floor"
                  type="number"
                  value={editForm.floor ?? ''}
                  onChange={(e) => {
                    const val = e.target.value
                    setEditForm((f) => ({ ...f, floor: val ? parseInt(val, 10) : null }))
                  }}
                  placeholder="e.g., 1, 2, -1"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-trouble">Trouble</Label>
              <Input
                id="edit-trouble"
                value={editForm.trouble}
                onChange={(e) => setEditForm((f) => ({ ...f, trouble: e.target.value }))}
                placeholder="Current tension or conflict..."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-readaloud">Read Aloud</Label>
              <Textarea
                id="edit-readaloud"
                value={editForm.readAloud}
                onChange={(e) => setEditForm((f) => ({ ...f, readAloud: e.target.value }))}
                placeholder="Player-facing description to read aloud..."
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-sensory">Sensory Details</Label>
              <Input
                id="edit-sensory"
                value={editForm.sensory}
                onChange={(e) => setEditForm((f) => ({ ...f, sensory: e.target.value }))}
                placeholder="Sights, sounds, smells..."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-gmnotes">GM Notes</Label>
              <Textarea
                id="edit-gmnotes"
                value={editForm.gmNotes}
                onChange={(e) => setEditForm((f) => ({ ...f, gmNotes: e.target.value }))}
                placeholder="Secrets, hidden info..."
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Services</Label>
              <ServicesList
                services={editForm.services}
                editable
                onChange={(services) => setEditForm((f) => ({ ...f, services }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tags</Label>
              <TagInput
                tags={editForm.tags}
                onChange={(tags) => setEditForm((f) => ({ ...f, tags }))}
              />
            </div>
          </div>
          <SheetFooter>
            <div className="flex w-full items-center gap-2">
              <Button
                variant="destructive"
                size="sm"
                className="mr-auto"
                onClick={() => { setEditSheetOpen(false); setDeleteConfirmOpen(true) }}
              >
                <Trash2 className="mr-2 size-4" />
                Delete
              </Button>
              <Button variant="outline" onClick={() => setEditSheetOpen(false)}>Cancel</Button>
              <Button onClick={handleEdit} disabled={!editForm.name.trim()}>Save</Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

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
  onUpdate,
}: {
  poi: POI
  systemId: string | null
  onUpdate: (refs: { monsterRefs: CompendiumRef[]; magicItemRefs: CompendiumRef[]; spellRefs: CompendiumRef[] }) => void
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchKind, setSearchKind] = useState<'monster' | 'spell' | 'magicItem'>('monster')
  const [showSearch, setShowSearch] = useState(false)

  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || !systemId) return []
    return searchCompendium(searchQuery, systemId, searchKind).slice(0, 10)
  }, [searchQuery, systemId, searchKind])

  const addRef = (id: string) => {
    const refsKey = searchKind === 'monster' ? 'monsterRefs' : searchKind === 'spell' ? 'spellRefs' : 'magicItemRefs'
    const currentRefs = poi[refsKey]
    if (currentRefs.some((r) => r.id === id)) return
    onUpdate({ monsterRefs: poi.monsterRefs, magicItemRefs: poi.magicItemRefs, spellRefs: poi.spellRefs, [refsKey]: [...currentRefs, { id }] })
    setSearchQuery('')
    setShowSearch(false)
  }

  const removeRef = (kind: 'monster' | 'spell' | 'magicItem', id: string) => {
    const refsKey = kind === 'monster' ? 'monsterRefs' : kind === 'spell' ? 'spellRefs' : 'magicItemRefs'
    onUpdate({
      monsterRefs: poi.monsterRefs,
      magicItemRefs: poi.magicItemRefs,
      spellRefs: poi.spellRefs,
      [refsKey]: poi[refsKey].filter((r) => r.id !== id),
    })
  }

  const updateQuantity = (kind: 'monster' | 'spell' | 'magicItem', id: string, quantity: number | undefined) => {
    const refsKey = kind === 'monster' ? 'monsterRefs' : kind === 'spell' ? 'spellRefs' : 'magicItemRefs'
    onUpdate({
      monsterRefs: poi.monsterRefs,
      magicItemRefs: poi.magicItemRefs,
      spellRefs: poi.spellRefs,
      [refsKey]: poi[refsKey].map((r) => r.id === id ? { ...r, quantity } : r),
    })
  }

  const allRefs = [
    ...poi.monsterRefs.map((r) => ({ ...r, kind: 'monster' as const })),
    ...poi.spellRefs.map((r) => ({ ...r, kind: 'spell' as const })),
    ...poi.magicItemRefs.map((r) => ({ ...r, kind: 'magicItem' as const })),
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
                <SelectItem value="monster">Monsters</SelectItem>
                <SelectItem value="spell">Spells</SelectItem>
                <SelectItem value="magicItem">Magic Items</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search compendium..."
              className="flex-1"
            />
          </div>
          {searchResults.length > 0 && (
            <div className="space-y-1">
              {searchResults.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => addRef(entry.id)}
                  className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-muted flex items-center justify-between"
                >
                  <span>{entry.name}</span>
                  <Badge variant="outline" className="text-xs">{entry.systemId.includes('cairn') ? 'Cairn' : 'SD'}</Badge>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Linked refs */}
      <div className="space-y-1">
        {allRefs.map((ref) => {
          const entry = getCompendiumById(ref.id)
          if (!entry) return null
          const kindLabel = ref.kind === 'monster' ? 'Monster' : ref.kind === 'spell' ? 'Spell' : 'Magic Item'
          const kindColor = ref.kind === 'monster' ? 'bg-orange-500/15 text-orange-700 dark:text-orange-400' : ref.kind === 'spell' ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400' : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
          const detailUrl = ref.kind === 'monster' ? '/realms/compendium/monsters/$monsterId' : ref.kind === 'spell' ? '/realms/compendium/spells/$spellId' : '/realms/compendium/magic-items/$itemId'
          const detailParams = ref.kind === 'monster' ? { monsterId: ref.id } : ref.kind === 'spell' ? { spellId: ref.id } : { itemId: ref.id }

          return (
            <div key={ref.id} className="flex items-center gap-2 px-3 py-2 rounded-md border text-sm">
              <Link to={detailUrl} params={detailParams} className="flex-1 flex items-center gap-2 hover:underline">
                <Badge variant="outline" className={`text-xs ${kindColor}`}>{kindLabel}</Badge>
                <span className="font-medium">{entry.name}</span>
              </Link>
              {ref.kind === 'monster' && (
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

