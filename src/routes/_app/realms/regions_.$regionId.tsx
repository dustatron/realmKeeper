import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@infrastructure/dexie/db'
import { useRegion } from '~/ui/hooks/useRegions'
import { usePOIs } from '~/ui/hooks/usePOIs'
import { useNPCsByRegion } from '~/ui/hooks/useNPCsByRegion'
import { useActiveRealm } from '~/ui/hooks/useActiveRealm'
import { useSystemConfig } from '~/ui/hooks/useSystemConfigs'
import { useContainer } from '~/ui/hooks/useContainer'
import { useUIStore } from '~/ui/stores/uiStore'
import { executeUpdateRegion } from '@application/use-cases/UpdateRegion'
import { executeDeleteRegion } from '@application/use-cases/DeleteRegion'
import { executeCreatePOI } from '@application/use-cases/CreatePOI'
import { executeCreateFaction } from '@application/use-cases/CreateFaction'
import { executeGenerateNPC } from '@application/use-cases/GenerateNPC'
import { executeCreateNPC } from '@application/use-cases/CreateNPC'
import { executeCreatePOIEvent } from '@application/use-cases/CreatePOIEvent'
import { executeRollEncounter } from '@application/use-cases/RollEncounter'
import { executeCreateEncounterTable } from '@application/use-cases/CreateEncounterTable'
import { executeUpdateEncounterTable } from '@application/use-cases/UpdateEncounterTable'
import { executeRegenerateRegionEncounter } from '@application/use-cases/RegenerateRegionEncounter'
import {
  executeEncounterCascade,
  type CascadeAction,
  type CascadeContext,
  type CascadeUseCaseDeps,
} from '@application/use-cases/RollEncounterCascade'
import { buildRegionEncounterContent } from '@domain/services/worldgen/regionEncounter'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { useEncounterTable } from '~/ui/hooks/useEncounterTable'
import { EncounterCascade } from '~/components/shared/EncounterCascade'
import type { EncounterTable } from '@domain/entities/EncounterTable'
import type { EncounterRollResult } from '@domain/value-objects/EncounterRollResult'
import { ConfirmDialog } from '~/components/shared/ConfirmDialog'
import { TagInput } from '~/components/shared/TagInput'
import { NotesPanel } from '~/components/shared/NotesPanel'
import { WysiwygEditor } from '~/components/shared/WysiwygEditor'
import { ImagePicker } from '~/components/shared/ImagePicker'
import { CloudinaryImage } from '~/components/shared/CloudinaryImage'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '~/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '~/components/ui/dropdown-menu'
import { ArrowLeft } from 'lucide-react'
import { RegionContentsPanel } from '~/components/regions/RegionContentsPanel'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '~/components/ui/dialog'
import {
  ChevronRight,
  Pencil,
  Trash2,
  MapPin,
  Users,
  CalendarClock,
  Compass,
  Swords,
  Plus,
  Dices,
  FileText,
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
} from 'lucide-react'
import { POI_TYPES, POI_EVENT_TYPES, SEASONS, type PoiType, type POIEventType, type Season } from '@shared/constants'
import type { POIEvent } from '@domain/entities/POIEvent'

export const Route = createFileRoute('/_app/realms/regions_/$regionId')({
  component: RegionDetailPage,
  validateSearch: (search: Record<string, unknown>): { edit?: boolean } => ({
    ...(search.edit === 'true' || search.edit === true ? { edit: true } : {}),
  }),
})

const TERRAIN_OPTIONS = ['plains', 'forest', 'hills', 'mountain', 'swamp', 'desert', 'coast', 'road', 'tundra', 'other'] as const

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

function RegionDetailPage() {
  const { regionId } = Route.useParams()
  const navigate = useNavigate()
  const region = useRegion(regionId)
  const realm = useActiveRealm()
  const systemConfig = useSystemConfig(realm?.systemId ?? null)
  const pois = usePOIs(regionId)
  const npcs = useNPCsByRegion(regionId)
  const container = useContainer()
  const setHeaderTitle = useUIStore((s) => s.setHeaderTitle)

  const { edit: editFromSearch } = Route.useSearch()

  const [editSheetOpen, setEditSheetOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [createPoiOpen, setCreatePoiOpen] = useState(false)
  const [createFactionOpen, setCreateFactionOpen] = useState(false)
  const [assignFactionOpen, setAssignFactionOpen] = useState(false)
  const [assignFactionId, setAssignFactionId] = useState<string>('')
  const [createEventOpen, setCreateEventOpen] = useState(false)
  const [isGeneratingNPC, setIsGeneratingNPC] = useState(false)

  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    terrain: 'plains' as string,
    imageUrl: null as string | null,
    people: [] as string[],
  })

  const [poiForm, setPoiForm] = useState({ name: '', type: 'settlement' as PoiType })
  const [factionForm, setFactionForm] = useState({ name: '', type: '' })
  const [eventForm, setEventForm] = useState({
    name: '',
    type: 'custom' as POIEventType,
    poiId: '',
    description: '',
    season: (realm?.currentSeason ?? 'spring') as Season,
    day: realm?.currentDay ?? 1,
  })

  // POI event data
  const poiIds = pois.map(p => p.id)
  const poiEvents = useLiveQuery(
    async () => {
      if (poiIds.length === 0) return []
      return db.poiEvents.where('poiId').anyOf(poiIds).toArray()
    },
    [poiIds.join(',')]
  ) ?? []

  // Factions in this region (based here or with presence at POIs)
  const factions = useLiveQuery(
    async () => {
      if (!regionId) return []
      const basedHere = await db.factions.where('worldId').equals(region?.worldId ?? '').toArray()
      const regionFactions = basedHere.filter(f => f.regionId === regionId)

      if (poiIds.length === 0) return regionFactions
      const presences = await db.factionPresences.where('poiId').anyOf(poiIds).toArray()
      const presenceFactionIds = new Set(presences.map(p => p.factionId))
      const regionFactionIds = new Set(regionFactions.map(f => f.id))
      const presenceOnlyIds = [...presenceFactionIds].filter(id => !regionFactionIds.has(id))
      if (presenceOnlyIds.length === 0) return regionFactions
      const presenceFactions = await db.factions.where('id').anyOf(presenceOnlyIds).toArray()
      return [...regionFactions, ...presenceFactions]
    },
    [regionId, region?.worldId, poiIds.join(',')]
  ) ?? []

  // Realm factions not already in this region (for "assign existing" dialog)
  const factionIds = new Set(factions.map(f => f.id))
  const unassignedFactions = useLiveQuery(
    async () => {
      if (!realm) return []
      const all = await db.factions.where('worldId').equals(realm.id).toArray()
      return all.filter(f => f.regionId !== regionId && !factionIds.has(f.id))
    },
    [realm?.id, regionId, [...factionIds].join(',')]
  ) ?? []

  const topLevelPOIs = useMemo(() => pois.filter(p => p.parentPoiId === null), [pois])

  // Encounter table for this region
  const encounterTable = useEncounterTable(null, regionId, region?.worldId ?? null)

  // Auto-open edit mode from ?edit=true search param
  useEffect(() => {
    if (editFromSearch && region && !editSheetOpen) {
      setEditForm({
        name: region.name,
        description: region.description,
        terrain: region.terrain || 'plains',
        imageUrl: region.imageUrl,
        people: region.people ?? [],
      })
      setEditSheetOpen(true)
    }
  }, [editFromSearch, region?.id])

  // Set breadcrumb in site header
  useEffect(() => {
    if (!region) return
    setHeaderTitle(
      <div className="flex items-center gap-1.5 text-sm">
        <Link to="/realms/locations/regions" className="text-muted-foreground hover:text-foreground">Regions</Link>
        <ChevronRight className="size-3 text-muted-foreground" />
        <span className="font-medium">{region.name}</span>
      </div>
    )
    return () => setHeaderTitle(null)
  }, [region, setHeaderTitle])

  const openEditSheet = () => {
    if (!region) return
    setEditForm({
      name: region.name,
      description: region.description,
      terrain: region.terrain || 'plains',
      imageUrl: region.imageUrl,
      people: region.people ?? [],
    })
    setEditSheetOpen(true)
  }

  const handleEdit = async () => {
    if (!region || !editForm.name.trim()) return
    await executeUpdateRegion(
      { ...region, name: editForm.name, description: editForm.description, terrain: editForm.terrain, imageUrl: editForm.imageUrl, people: editForm.people },
      { regionRepo: container.regionRepo }
    )
    setEditSheetOpen(false)
  }

  const handleDelete = async () => {
    if (!region) return
    await executeDeleteRegion(region.id, { regionRepo: container.regionRepo })
    setDeleteConfirmOpen(false)
    window.history.back()
  }

  const handleCreatePOI = async () => {
    if (!region || !poiForm.name.trim()) return
    const poi = await executeCreatePOI(
      { regionId: region.id, name: poiForm.name.trim(), type: poiForm.type },
      { poiRepo: container.poiRepo }
    )
    setCreatePoiOpen(false)
    setPoiForm({ name: '', type: 'settlement' })
    navigate({ to: '/realms/pois/$poiId', params: { poiId: poi.id } })
  }

  const handleGenerateNPC = async () => {
    if (!region || !realm || !systemConfig) return
    setIsGeneratingNPC(true)
    try {
      const npc = await executeGenerateNPC(
        { worldId: realm.id, systemConfig, regionId: region.id },
        { tableRepo: container.tableRepo }
      )
      await executeCreateNPC(npc, { npcRepo: container.npcRepo })
      navigate({ to: '/realms/npcs/$npcId', params: { npcId: npc.id } })
    } finally {
      setIsGeneratingNPC(false)
    }
  }

  const handleCreateFaction = async () => {
    if (!realm || !factionForm.name.trim()) return
    const faction = await executeCreateFaction(
      { worldId: realm.id, name: factionForm.name.trim(), type: factionForm.type || undefined },
      { factionRepo: container.factionRepo }
    )
    // Set the faction's regionId
    await container.factionRepo.update({ ...faction, regionId })
    setCreateFactionOpen(false)
    setFactionForm({ name: '', type: '' })
    navigate({ to: '/realms/factions/$factionId', params: { factionId: faction.id } })
  }

  const handleAssignFaction = async () => {
    if (!assignFactionId) return
    const faction = await db.factions.get(assignFactionId)
    if (!faction) return
    await container.factionRepo.update({ ...faction, regionId })
    setAssignFactionOpen(false)
    setAssignFactionId('')
  }

  const handleCreateEvent = async () => {
    if (!realm || !eventForm.name.trim() || !eventForm.poiId) return
    await executeCreatePOIEvent(
      {
        poiId: eventForm.poiId,
        worldId: realm.id,
        name: eventForm.name.trim(),
        description: eventForm.description,
        type: eventForm.type,
        trigger: { year: null, season: eventForm.season, day: eventForm.day, watch: null },
        recurring: false,
        durationWatches: 1,
      },
      { poiEventRepo: container.poiEventRepo }
    )
    setCreateEventOpen(false)
    setEventForm({ name: '', type: 'custom', poiId: '', description: '', season: realm?.currentSeason ?? 'spring', day: realm?.currentDay ?? 1 })
  }

  const handleRollEncounter = async () => {
    if (!region) throw new Error('No region')
    return executeRollEncounter(
      { poiId: null, regionId: region.id, worldId: region.worldId },
      { encounterTableRepo: container.encounterTableRepo }
    )
  }

  const handleSaveEncounterTable = async (entries: Pick<EncounterTable, 'creature' | 'signOmen' | 'loss' | 'npc' | 'discovery' | 'treasure' | 'customSections' | 'disabledCategories'>) => {
    if (!region) return
    if (encounterTable) {
      await executeUpdateEncounterTable(
        { ...encounterTable, ...entries },
        { encounterTableRepo: container.encounterTableRepo }
      )
    } else {
      await executeCreateEncounterTable(
        { ownerRegionId: region.id, worldId: region.worldId, ...entries },
        { encounterTableRepo: container.encounterTableRepo }
      )
    }
  }

  // Lazily create a persistable region-owned encounter-table row when none
  // exists, so the cascade's lastResult can be saved. Mirrors the POI hook.
  const handleEncounterCascade = async (action: CascadeAction): Promise<EncounterRollResult> => {
    if (!region || !systemConfig) throw new Error('Missing context for encounter cascade')
    const table = encounterTable ?? await (async () => {
      const content = buildRegionEncounterContent({
        region: { terrain: region.terrain },
        pois,
        factions: factions ?? [],
        systemId: systemConfig.id,
        rng: new SeededRandom(`${region.id}-encounter`),
      })
      return executeCreateEncounterTable(
        { ownerRegionId: region.id, worldId: region.worldId, ...content },
        { encounterTableRepo: container.encounterTableRepo }
      )
    })()
    const ctx: CascadeContext = {
      table,
      poiId: null,
      regionId: region.id,
      worldId: region.worldId,
      systemConfig,
      regionPois: pois.map((p) => ({ id: p.id, name: p.name })),
    }
    const deps: CascadeUseCaseDeps = {
      encounterTableRepo: container.encounterTableRepo,
      tableRepo: container.tableRepo,
    }
    return executeEncounterCascade(action, ctx, deps)
  }

  const handleRegenerateEncounter = async () => {
    if (!region || !systemConfig) return
    await executeRegenerateRegionEncounter(
      { regionId: region.id, worldId: region.worldId, systemId: systemConfig.id },
      {
        encounterTableRepo: container.encounterTableRepo,
        poiRepo: container.poiRepo,
        factionRepo: container.factionRepo,
        regionRepo: container.regionRepo,
      },
    )
  }

  if (region === undefined) {
    return <div className="py-8 text-center text-muted-foreground">Loading...</div>
  }

  if (region === null) {
    return <div className="py-8 text-center text-muted-foreground">Region not found.</div>
  }

  if (editSheetOpen) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setEditSheetOpen(false)}>
            <ArrowLeft className="mr-1.5 size-4" />
            Back
          </Button>
          <span className="font-medium mr-auto">Edit Region</span>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => { setEditSheetOpen(false); setDeleteConfirmOpen(true) }}
          >
            <Trash2 className="mr-2 size-4" />
            Delete
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditSheetOpen(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleEdit} disabled={!editForm.name.trim()}>
            Save
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Name *</Label>
            <Input
              id="edit-name"
              value={editForm.name}
              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Region name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-terrain">Terrain</Label>
            <Select
              value={editForm.terrain}
              onValueChange={(value) => setEditForm((f) => ({ ...f, terrain: value }))}
            >
              <SelectTrigger id="edit-terrain">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TERRAIN_OPTIONS.map((terrain) => (
                  <SelectItem key={terrain} value={terrain}>
                    {terrain.charAt(0).toUpperCase() + terrain.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Description</Label>
          <WysiwygEditor
            content={editForm.description}
            onChange={(html) => setEditForm((f) => ({ ...f, description: html }))}
            placeholder="Describe this region..."
          />
        </div>

        <div className="space-y-1.5">
          <Label>Image</Label>
          <ImagePicker
            imageUrl={editForm.imageUrl}
            onImageChange={(url) => setEditForm((f) => ({ ...f, imageUrl: url }))}
          />
        </div>

        <div className="space-y-1.5">
          <Label>People</Label>
          <TagInput
            tags={editForm.people}
            onChange={(people) => setEditForm((f) => ({ ...f, people }))}
            placeholder="Add archetype..."
          />
        </div>

        <ConfirmDialog
          open={deleteConfirmOpen}
          onOpenChange={setDeleteConfirmOpen}
          title="Delete Region"
          description="Are you sure you want to delete this region? This action cannot be undone."
          confirmLabel="Delete"
          variant="destructive"
          onConfirm={handleDelete}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-2 mr-auto">
          <Compass className="size-5" />
          <span className="font-medium">{region.name}</span>
          {region.terrain && (
            <Badge variant="secondary">{region.terrain}</Badge>
          )}
        </span>
        <Button size="sm" onClick={openEditSheet}>
          <Pencil className="mr-2 size-4" />
          Edit
        </Button>
      </div>

      {/* Tabs layout */}
      <Tabs defaultValue="overview">
        <TabsList variant="line" className="w-full">
          <TabsTrigger value="overview">
            <Compass className="size-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="locations">
            <MapPin className="size-4" />
            Locations ({topLevelPOIs.length})
          </TabsTrigger>
          <TabsTrigger value="npcs">
            <Users className="size-4" />
            NPCs ({npcs.length})
          </TabsTrigger>
          <TabsTrigger value="factions">
            <Swords className="size-4" />
            Factions ({factions.length})
          </TabsTrigger>
          <TabsTrigger value="encounters">
            <Dices className="size-4" />
            Encounters
          </TabsTrigger>
          <TabsTrigger value="events">
            <CalendarClock className="size-4" />
            Events ({poiEvents.length})
          </TabsTrigger>
          <TabsTrigger value="notes">
            <FileText className="size-4" />
            Notes
          </TabsTrigger>
        </TabsList>

        {/* Overview tab */}
        <TabsContent value="overview" className="pt-3">
          {region.imageUrl && (
            <CloudinaryImage
              src={region.imageUrl}
              alt={region.name}
              width={800}
              className="w-full max-h-64 rounded-lg border object-cover mb-4"
            />
          )}
          {region.description ? (
            <div
              className="tiptap prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: region.description }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">No description.</p>
          )}

          {(region.people ?? []).length > 0 && (
            <div className="mt-4">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">People</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {region.people.map((p, i) => (
                  <Badge key={i} variant="secondary">{p}</Badge>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4">
            <RegionContentsPanel pois={pois} npcs={npcs} />
          </div>
        </TabsContent>

        {/* Locations tab */}
        <TabsContent value="locations" className="pt-3">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold">Points of Interest</h4>
            <Button variant="outline" size="sm" className="h-7" onClick={() => setCreatePoiOpen(true)}>
              <Plus className="mr-1.5 size-3.5" />
              Add
            </Button>
          </div>
          {topLevelPOIs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No points of interest.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {topLevelPOIs.map((poi) => {
                const Icon = POI_TYPE_ICONS[poi.type]
                return (
                  <Link
                    key={poi.id}
                    to="/realms/pois/$poiId"
                    params={{ poiId: poi.id }}
                    className="block"
                  >
                    <Card className="cursor-pointer transition-colors hover:bg-accent h-full">
                      <CardHeader className="pb-2">
                        <div className="flex items-start gap-2">
                          <Icon className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{poi.name}</div>
                            <Badge variant="outline" className="text-xs mt-1">
                              {poi.type}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      {poi.description && (
                        <CardContent className="pt-0">
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {poi.description}
                          </p>
                        </CardContent>
                      )}
                    </Card>
                  </Link>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* NPCs tab */}
        <TabsContent value="npcs" className="pt-3">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold">NPCs</h4>
            <Button
              variant="outline"
              size="sm"
              className="h-7"
              onClick={handleGenerateNPC}
              disabled={isGeneratingNPC || !systemConfig}
            >
              <Dices className="mr-1.5 size-3.5" />
              {isGeneratingNPC ? '...' : 'Generate'}
            </Button>
          </div>
          {npcs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No NPCs in this region.</p>
          ) : (
            <div className="space-y-1">
              {npcs.map((npc) => (
                <div key={npc.id} className="flex items-center justify-between py-1">
                  <Link
                    to="/realms/npcs/$npcId"
                    params={{ npcId: npc.id }}
                    className="text-sm text-primary hover:underline font-medium"
                  >
                    {npc.name}
                  </Link>
                  <div className="flex items-center gap-1">
                    {npc.traits.slice(0, 2).map((trait) => (
                      <Badge key={trait} variant="secondary" className="text-xs">{trait}</Badge>
                    ))}
                    {npc.lifeStatus !== 'alive' && (
                      <Badge variant="destructive" className="text-xs">
                        {npc.lifeStatus.charAt(0).toUpperCase() + npc.lifeStatus.slice(1)}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Factions tab */}
        <TabsContent value="factions" className="pt-3">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold">Factions</h4>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-7">
                  <Plus className="mr-1.5 size-3.5" />
                  Add
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setCreateFactionOpen(true)}>Create New</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setAssignFactionOpen(true)}>Assign Existing</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {factions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No factions in this region.</p>
          ) : (
            <div className="space-y-1">
              {factions.map((faction) => (
                <div key={faction.id} className="flex items-center justify-between py-1">
                  <Link
                    to="/realms/factions/$factionId"
                    params={{ factionId: faction.id }}
                    className="text-sm text-primary hover:underline font-medium"
                  >
                    {faction.name}
                  </Link>
                  <div className="flex items-center gap-1">
                    {faction.type && (
                      <Badge variant="outline" className="text-xs">{faction.type}</Badge>
                    )}
                    <Badge
                      className={`text-xs ${
                        faction.status === 'active' ? 'bg-green-600' :
                        faction.status === 'dormant' ? 'bg-yellow-600' :
                        faction.status === 'disbanded' ? 'bg-orange-600' :
                        faction.status === 'destroyed' ? 'bg-red-600' : 'bg-gray-600'
                      }`}
                    >
                      {faction.status.charAt(0).toUpperCase() + faction.status.slice(1)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Encounters tab */}
        <TabsContent value="encounters" className="space-y-6 pt-3">
          <EncounterCascade
            table={encounterTable}
            onRollCascade={handleEncounterCascade}
            onSaveTable={handleSaveEncounterTable}
            onRoll={handleRollEncounter}
            onRegenerateFromRegion={handleRegenerateEncounter}
          />
        </TabsContent>

        {/* Events tab */}
        <TabsContent value="events" className="pt-3">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold">Events</h4>
            <Button
              variant="outline"
              size="sm"
              className="h-7"
              onClick={() => {
                setEventForm({ name: '', type: 'custom', poiId: '', description: '', season: realm?.currentSeason ?? 'spring', day: realm?.currentDay ?? 1 })
                setCreateEventOpen(true)
              }}
              disabled={pois.length === 0}
            >
              <Plus className="mr-1.5 size-3.5" />
              Add
            </Button>
          </div>
          {poiEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events scheduled.</p>
          ) : (
            <div className="space-y-2">
              {poiEvents.map((event) => {
                const eventPoi = pois.find(p => p.id === event.poiId)
                return (
                  <div
                    key={event.id}
                    className="flex items-start gap-2 rounded-md border p-2"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{event.name}</span>
                        <Badge variant="outline" className="text-xs">{event.type}</Badge>
                        {event.isActive && <Badge className="text-xs bg-green-600">Active</Badge>}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {eventPoi && (
                          <span className="text-xs text-muted-foreground">at {eventPoi.name}</span>
                        )}
                        {event.description && (
                          <span className="text-xs text-muted-foreground line-clamp-1">
                            — {event.description}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* Notes tab */}
        <TabsContent value="notes" className="pt-3">
          <NotesPanel ownerType="region" ownerId={regionId} worldId={region.worldId} />
        </TabsContent>
      </Tabs>



      {/* Create POI Dialog */}
      <Dialog open={createPoiOpen} onOpenChange={setCreatePoiOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Point of Interest</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="poi-name">Name *</Label>
              <Input
                id="poi-name"
                value={poiForm.name}
                onChange={(e) => setPoiForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="The Iron Keep"
              />
            </div>
            <div>
              <Label htmlFor="poi-type">Type</Label>
              <Select
                value={poiForm.type}
                onValueChange={(v) => setPoiForm((f) => ({ ...f, type: v as PoiType }))}
              >
                <SelectTrigger id="poi-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POI_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreatePoiOpen(false)}>Cancel</Button>
            <Button onClick={handleCreatePOI} disabled={!poiForm.name.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Faction Dialog */}
      <Dialog open={createFactionOpen} onOpenChange={setCreateFactionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Faction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="faction-name">Name *</Label>
              <Input
                id="faction-name"
                value={factionForm.name}
                onChange={(e) => setFactionForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="The Shadow Guild"
              />
            </div>
            <div>
              <Label htmlFor="faction-type">Type</Label>
              <Input
                id="faction-type"
                value={factionForm.type}
                onChange={(e) => setFactionForm((f) => ({ ...f, type: e.target.value }))}
                placeholder="Guild, Military, Religious..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateFactionOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateFaction} disabled={!factionForm.name.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Existing Faction Dialog */}
      <Dialog open={assignFactionOpen} onOpenChange={(open) => { setAssignFactionOpen(open); if (!open) setAssignFactionId('') }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Faction to Region</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {unassignedFactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No unassigned factions available.</p>
            ) : (
              <div>
                <Label>Faction</Label>
                <Select value={assignFactionId} onValueChange={setAssignFactionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a faction..." />
                  </SelectTrigger>
                  <SelectContent>
                    {unassignedFactions.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAssignFactionOpen(false); setAssignFactionId('') }}>Cancel</Button>
            <Button onClick={handleAssignFaction} disabled={!assignFactionId}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Event Dialog */}
      <Dialog open={createEventOpen} onOpenChange={setCreateEventOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="event-name">Name *</Label>
              <Input
                id="event-name"
                value={eventForm.name}
                onChange={(e) => setEventForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Goblin Ambush"
              />
            </div>
            <div>
              <Label htmlFor="event-poi">Location (POI) *</Label>
              <Select
                value={eventForm.poiId}
                onValueChange={(v) => setEventForm((f) => ({ ...f, poiId: v }))}
              >
                <SelectTrigger id="event-poi">
                  <SelectValue placeholder="Select a POI" />
                </SelectTrigger>
                <SelectContent>
                  {pois.map((poi) => (
                    <SelectItem key={poi.id} value={poi.id}>{poi.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="event-type">Type</Label>
              <Select
                value={eventForm.type}
                onValueChange={(v) => setEventForm((f) => ({ ...f, type: v as POIEventType }))}
              >
                <SelectTrigger id="event-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POI_EVENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="event-season">Season</Label>
                <Select
                  value={eventForm.season}
                  onValueChange={(v) => setEventForm((f) => ({ ...f, season: v as Season }))}
                >
                  <SelectTrigger id="event-season">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEASONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="event-day">Day</Label>
                <Input
                  id="event-day"
                  type="number"
                  min={1}
                  value={eventForm.day}
                  onChange={(e) => setEventForm((f) => ({ ...f, day: parseInt(e.target.value) || 1 }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="event-description">Description</Label>
              <Textarea
                id="event-description"
                value={eventForm.description}
                onChange={(e) => setEventForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="What happens..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateEventOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateEvent} disabled={!eventForm.name.trim() || !eventForm.poiId}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Region"
        description="Are you sure you want to delete this region? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
