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
import { ConfirmDialog } from '~/components/shared/ConfirmDialog'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '~/components/ui/sheet'
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
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { POI_TYPES, POI_EVENT_TYPES, SEASONS, type PoiType, type POIEventType, type Season } from '@shared/constants'
import type { POIEvent } from '@domain/entities/POIEvent'

export const Route = createFileRoute('/_app/realms/regions_/$regionId')({
  component: RegionDetailPage,
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

  const [editSheetOpen, setEditSheetOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [createPoiOpen, setCreatePoiOpen] = useState(false)
  const [createFactionOpen, setCreateFactionOpen] = useState(false)
  const [createEventOpen, setCreateEventOpen] = useState(false)
  const [isGeneratingNPC, setIsGeneratingNPC] = useState(false)

  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    terrain: 'plains' as string,
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
      const basedHere = await db.factions.where('realmId').equals(region?.realmId ?? '').toArray()
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
    [regionId, region?.realmId, poiIds.join(',')]
  ) ?? []

  const topLevelPOIs = useMemo(() => pois.filter(p => p.parentPoiId === null), [pois])

  // Set breadcrumb in site header
  useEffect(() => {
    if (!region) return
    setHeaderTitle(
      <div className="flex items-center gap-1.5 text-sm">
        <Link to="/realms/regions" className="text-muted-foreground hover:text-foreground">Regions</Link>
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
    })
    setEditSheetOpen(true)
  }

  const handleEdit = async () => {
    if (!region || !editForm.name.trim()) return
    await executeUpdateRegion(
      { ...region, name: editForm.name, description: editForm.description, terrain: editForm.terrain },
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
        { realmId: realm.id, systemConfig, regionId: region.id },
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
      { realmId: realm.id, name: factionForm.name.trim(), type: factionForm.type || undefined },
      { factionRepo: container.factionRepo }
    )
    // Set the faction's regionId
    await container.factionRepo.update({ ...faction, regionId })
    setCreateFactionOpen(false)
    setFactionForm({ name: '', type: '' })
    navigate({ to: '/realms/factions/$factionId', params: { factionId: faction.id } })
  }

  const handleCreateEvent = async () => {
    if (!realm || !eventForm.name.trim() || !eventForm.poiId) return
    await executeCreatePOIEvent(
      {
        poiId: eventForm.poiId,
        realmId: realm.id,
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

  if (region === undefined) {
    return <div className="py-8 text-center text-muted-foreground">Loading...</div>
  }

  if (region === null) {
    return <div className="py-8 text-center text-muted-foreground">Region not found.</div>
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

      <div className="space-y-4">
        {/* Description */}
        {region.description && (
          <Card>
            <CardContent className="pt-5">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                className="prose prose-sm dark:prose-invert max-w-none"
              >
                {region.description}
              </ReactMarkdown>
            </CardContent>
          </Card>
        )}

        {/* POIs section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="size-4" />
              Points of Interest ({topLevelPOIs.length})
            </CardTitle>
            <Button variant="outline" size="sm" className="h-7" onClick={() => setCreatePoiOpen(true)}>
              <Plus className="mr-1.5 size-3.5" />
              Add
            </Button>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        {/* NPCs section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="size-4" />
              NPCs ({npcs.length})
            </CardTitle>
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
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        {/* Factions section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Swords className="size-4" />
              Factions ({factions.length})
            </CardTitle>
            <Button variant="outline" size="sm" className="h-7" onClick={() => setCreateFactionOpen(true)}>
              <Plus className="mr-1.5 size-3.5" />
              Add
            </Button>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        {/* Events section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarClock className="size-4" />
              Events ({poiEvents.length})
            </CardTitle>
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
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>

      {/* Edit Sheet */}
      <Sheet open={editSheetOpen} onOpenChange={setEditSheetOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Region</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Region name"
              />
            </div>
            <div>
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
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Describe this region..."
                rows={4}
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
              <Button variant="outline" onClick={() => setEditSheetOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEdit} disabled={!editForm.name.trim()}>
                Save
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

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
