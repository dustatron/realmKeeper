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
import { executeRerollRegionProblem } from '@application/use-cases/RerollRegionProblem'
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
import { ArrowLeft, RotateCcw, Coins, Check } from 'lucide-react'
import { RegionContentsPanel } from '~/components/regions/RegionContentsPanel'
import { regionDangerTier } from '~/components/regions/regionContents'
import { DataTable, type DataTableColumn } from '~/components/shared/DataTable'
import { getCompendiumById } from '@domain/data/compendium'
import { monsterThreat } from '~/lib/worldgen/compendium-utils'
import type { CompendiumMonster } from '@domain/entities/Compendium'
import type { POI } from '@domain/entities/POI'
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
import type { NPC } from '@domain/entities/NPC'
import type { Faction } from '@domain/entities/Faction'

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

function poiMaxThreat(monsterRefs: POI['monsterRefs']): number {
  let max = 0
  for (const ref of monsterRefs ?? []) {
    const e = getCompendiumById(ref.id)
    if (e?.kind === 'monster') max = Math.max(max, monsterThreat(e as CompendiumMonster))
  }
  return max
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

      // Belt-and-suspenders: also include factions whose HQ POI sits in this
      // region. Fixes existing realms where FactionPresence was never seeded.
      const poiIdSet = new Set(poiIds)
      const hqFactions = basedHere.filter(
        f => f.headquartersPoiId != null && poiIdSet.has(f.headquartersPoiId),
      )

      // Merge regionFactions + hqFactions, then add presence-based factions.
      // Use a plain object for dedup — lucide's Map import shadows the JS Map.
      const merged: Record<string, typeof regionFactions[number]> = {}
      for (const f of regionFactions) merged[f.id] = f
      for (const f of hqFactions) merged[f.id] = f

      if (poiIds.length > 0) {
        const presences = await db.factionPresences.where('poiId').anyOf(poiIds).toArray()
        const presenceOnlyIds = presences
          .map(p => p.factionId)
          .filter(id => !(id in merged))
        if (presenceOnlyIds.length > 0) {
          const presenceFactions = await db.factions.where('id').anyOf(presenceOnlyIds).toArray()
          for (const f of presenceFactions) merged[f.id] = f
        }
      }

      return Object.values(merged)
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

  // Faction presence map: poiId → faction name (first presence per POI)
  const presenceByPoi = useLiveQuery(async () => {
    if (poiIds.length === 0) return {} as Record<string, string>
    const pres = await db.factionPresences.where('poiId').anyOf(poiIds).toArray()
    const facs = await db.factions.where('id').anyOf([...new Set(pres.map(p => p.factionId))]).toArray()
    const nameById: Record<string, string> = {}
    for (const f of facs) nameById[f.id] = f.name
    const out: Record<string, string> = {}
    for (const p of pres) if (!out[p.poiId]) out[p.poiId] = nameById[p.factionId] ?? ''
    return out
  }, [poiIds.join(',')]) ?? {}

  // Columns for the Locations DataTable
  const locationColumns = useMemo<DataTableColumn<POI>[]>(() => [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      sortValue: p => p.name,
      render: p => (
        <Link to="/realms/pois/$poiId" params={{ poiId: p.id }} className="text-primary hover:underline font-medium">
          {p.name}
        </Link>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      sortValue: p => p.type,
      render: p => <Badge variant="outline" className="text-xs">{p.type}</Badge>,
    },
    {
      key: 'danger',
      header: 'Danger',
      sortable: true,
      sortValue: p => poiMaxThreat(p.monsterRefs),
      render: p => {
        const threat = poiMaxThreat(p.monsterRefs)
        const label = threat === 0 ? 'none' : threat >= 5 ? 'perilous' : threat >= 3 ? 'tough' : 'easy'
        const cls = label === 'none'
          ? 'bg-muted text-muted-foreground border-border'
          : label === 'easy' ? 'bg-green-600 text-white'
          : label === 'tough' ? 'bg-amber-600 text-white'
          : 'bg-red-600 text-white'
        return <Badge className={`text-xs ${cls}`}>{label}</Badge>
      },
    },
    {
      key: 'treasure',
      header: 'Treasure',
      sortable: true,
      sortValue: p => (p.treasure ?? []).filter(t => t.notable && !t.collected).length,
      render: p => {
        const count = (p.treasure ?? []).filter(t => t.notable && !t.collected).length
        return (
          <span className="flex items-center gap-1 text-sm">
            <Coins className="size-3.5 text-muted-foreground" />
            {count}
          </span>
        )
      },
    },
    {
      key: 'encounter',
      header: 'Encounter',
      sortable: true,
      sortValue: p => (p.encounterChance != null || (p.wanderingMonsters?.length ?? 0) > 0) ? 1 : 0,
      render: p => {
        const has = p.encounterChance != null || (p.wanderingMonsters?.length ?? 0) > 0
        return has
          ? <Check className="size-4 text-green-500" />
          : <span className="text-muted-foreground text-sm">—</span>
      },
    },
    {
      key: 'faction',
      header: 'Faction',
      sortable: true,
      sortValue: p => presenceByPoi[p.id] ?? '',
      render: p => <span className="text-sm">{presenceByPoi[p.id] ?? '—'}</span>,
    },
    {
      key: 'visited',
      header: 'Visited',
      sortable: true,
      sortValue: p => p.visited ? 1 : 0,
      render: p => p.visited
        ? <Check className="size-4 text-green-500" />
        : <span className="text-muted-foreground text-sm">—</span>,
    },
  ], [presenceByPoi])

  // NPC tab lookup objects (plain Record — not JS Map, which is shadowed by lucide's Map import)
  const poiName = useMemo<Record<string, string>>(
    () => Object.fromEntries(pois.map(p => [p.id, p.name])),
    [pois]
  )
  const factionById = useMemo<Record<string, Faction>>(
    () => Object.fromEntries(factions.map(f => [f.id, f])),
    [factions]
  )

  const DISPOSITION_COLORS: Record<string, string> = {
    hostile: 'bg-red-500/15 text-red-500 border-red-500/30',
    wary: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
    curious: 'bg-gray-400/15 text-gray-400 border-gray-400/30',
    kind: 'bg-blue-500/15 text-blue-500 border-blue-500/30',
    helpful: 'bg-green-500/15 text-green-500 border-green-500/30',
  }

  const npcColumns = useMemo<DataTableColumn<NPC>[]>(() => [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      sortValue: n => n.name,
      render: n => (
        <span className="flex items-center gap-1.5">
          <Link to="/realms/npcs/$npcId" params={{ npcId: n.id }} className="text-primary hover:underline font-medium">
            {n.name}
          </Link>
          {n.lifeStatus !== 'alive' && (
            <Badge variant="destructive" className="text-xs capitalize">{n.lifeStatus}</Badge>
          )}
        </span>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      sortable: true,
      sortValue: n => (n.poiId ? (poiName[n.poiId] ?? '') : ''),
      render: n => n.poiId && poiName[n.poiId]
        ? <Link to="/realms/pois/$poiId" params={{ poiId: n.poiId }} className="text-primary hover:underline text-sm">{poiName[n.poiId]}</Link>
        : <span className="text-muted-foreground text-sm">—</span>,
    },
    {
      key: 'faction',
      header: 'Faction',
      sortable: true,
      sortValue: n => {
        const fId = n.factionIds?.[0]
        return fId ? (factionById[fId]?.name ?? '') : ''
      },
      render: n => {
        const fId = n.factionIds?.[0]
        const faction = fId ? factionById[fId] : undefined
        if (!faction) return <span className="text-muted-foreground text-sm">—</span>
        return (
          <span className="flex items-center gap-1.5">
            <Link to="/realms/factions/$factionId" params={{ factionId: faction.id }} className="text-primary hover:underline text-sm">{faction.name}</Link>
            {faction.leaderNpcId === n.id && (
              <Badge variant="outline" className="text-xs">leader</Badge>
            )}
          </span>
        )
      },
    },
    {
      key: 'disposition',
      header: 'Disposition',
      sortable: true,
      sortValue: n => n.disposition ?? '',
      render: n => n.disposition
        ? <Badge className={`text-xs capitalize ${DISPOSITION_COLORS[n.disposition] ?? ''}`}>{n.disposition}</Badge>
        : <span className="text-muted-foreground text-sm">—</span>,
    },
    {
      key: 'movement',
      header: 'Movement',
      sortable: true,
      sortValue: n => n.movementStatus,
      render: n => <span className="text-sm capitalize">{n.movementStatus}</span>,
    },
    {
      key: 'want',
      header: 'Want',
      render: n => {
        const text = n.want || n.motivation
        return text
          ? <span className="text-sm text-muted-foreground max-w-[16rem] truncate block">{text}</span>
          : <span className="text-muted-foreground text-sm">—</span>
      },
    },
  ], [poiName, factionById])

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

  const handleRerollProblem = async () => {
    if (!region) return
    await executeRerollRegionProblem(region.id, { regionRepo: container.regionRepo })
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

          {/* Problem callout */}
          <div className="flex items-start justify-between gap-2 rounded-md border border-muted bg-muted/40 px-3 py-2 mb-4">
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Problem</span>
              <p className="text-sm mt-0.5">{region.problem || 'No problem set.'}</p>
            </div>
            <Button variant="ghost" size="sm" className="shrink-0 h-7 px-2" onClick={handleRerollProblem}>
              <RotateCcw className="size-3.5 mr-1" />
              Reroll
            </Button>
          </div>

          {/* Danger tier */}
          {(() => {
            const tier = regionDangerTier(pois, region.terrain)
            const tierClass =
              tier === 'easy' ? 'bg-green-600' :
              tier === 'tough' ? 'bg-amber-600' :
              'bg-red-600'
            return (
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Danger</span>
                <Badge className={`text-xs ${tierClass}`}>
                  {tier.charAt(0).toUpperCase() + tier.slice(1)}
                </Badge>
              </div>
            )
          })()}

          {/* Chip groups */}
          {(region.dangers ?? []).length > 0 && (
            <div className="mb-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dangers</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {region.dangers.map((d, i) => (
                  <Badge key={i} variant="secondary">{d}</Badge>
                ))}
              </div>
            </div>
          )}
          {(region.features ?? []).length > 0 && (
            <div className="mb-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Features</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {region.features.map((f, i) => (
                  <Badge key={i} variant="secondary">{f}</Badge>
                ))}
              </div>
            </div>
          )}
          {(region.resources ?? []).length > 0 && (
            <div className="mb-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Resources</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {region.resources.map((r, i) => (
                  <Badge key={i} variant="secondary">{r}</Badge>
                ))}
              </div>
            </div>
          )}
          {(region.settlements ?? []).length > 0 && (
            <div className="mb-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Settlements</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {region.settlements.map((s, i) => (
                  <Badge key={i} variant="secondary">{s}</Badge>
                ))}
              </div>
            </div>
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
          <DataTable
            rows={topLevelPOIs}
            rowKey={p => p.id}
            columns={locationColumns}
            empty={<p className="text-sm text-muted-foreground">No points of interest.</p>}
          />
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
          <DataTable
            rows={npcs}
            rowKey={n => n.id}
            columns={npcColumns}
            empty={<p className="text-sm text-muted-foreground">No NPCs in this region.</p>}
          />
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
