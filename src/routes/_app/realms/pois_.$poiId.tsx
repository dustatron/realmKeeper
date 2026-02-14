import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@infrastructure/dexie/db'
import { usePOI, useRealmPOIs } from '~/ui/hooks/usePOIs'
import { useRegion } from '~/ui/hooks/useRegions'
import { usePOIBreadcrumb } from '~/ui/hooks/usePOIBreadcrumb'
import { usePOIChildren } from '~/ui/hooks/usePOIChildren'
import { useNPCsByPoi } from '~/ui/hooks/useNPCsByPoi'
import { useFactionPresencesByPoi } from '~/ui/hooks/useFactionPresences'
import { useFaction } from '~/ui/hooks/useFactions'
import { usePathsByPoi } from '~/ui/hooks/usePaths'
import { usePOIMaps } from '~/ui/hooks/useGameMaps'
import { useContainer } from '~/ui/hooks/useContainer'
import { executeUpdatePOI } from '@application/use-cases/UpdatePOI'
import { executeDeletePOI } from '@application/use-cases/DeletePOI'
import { executeCreatePOI } from '@application/use-cases/CreatePOI'
import { executeCreatePOIEvent } from '@application/use-cases/CreatePOIEvent'
import { executeDeletePOIEvent } from '@application/use-cases/DeletePOIEvent'
import { executeCreateGameMap } from '@application/use-cases/CreateGameMap'
import { MapUploadDialog } from '~/components/map/MapUploadDialog'
import { InteractiveMap } from '~/components/map/InteractiveMap'
import { PageHeader } from '~/components/shared/PageHeader'
import { EmptyState } from '~/components/shared/EmptyState'
import { ConfirmDialog } from '~/components/shared/ConfirmDialog'
import { TagInput } from '~/components/shared/TagInput'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
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
  ArrowLeft,
  Pencil,
  Trash2,
  Plus,
  MapPin,
  Users,
  Flag,
  Route as RouteIcon,
  Building2,
  Home,
  DoorOpen,
  Castle,
  Skull,
  TreePine,
  Landmark,
  LayoutGrid,
  Map,
  Tent,
  Sparkles,
  ChevronRight,
  CalendarClock,
  MapPinned,
  ExternalLink,
} from 'lucide-react'
import { POI_TYPES, POI_EVENT_TYPES, SEASONS, type PoiType, type POIEventType, type Season } from '@shared/constants'
import type { POI } from '@domain/entities/POI'
import type { POIEvent } from '@domain/entities/POIEvent'

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
  const factionPresences = useFactionPresencesByPoi(poiId)
  const paths = usePathsByPoi(poiId)
  const poiEvents = useLiveQuery(
    () => (poiId ? db.poiEvents.where('poiId').equals(poiId).toArray() : []),
    [poiId]
  ) ?? []
  const poiMaps = usePOIMaps(poiId)
  const container = useContainer()

  const [mapUploadDialogOpen, setMapUploadDialogOpen] = useState(false)
  const [editSheetOpen, setEditSheetOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [createChildDialogOpen, setCreateChildDialogOpen] = useState(false)
  const [createEventDialogOpen, setCreateEventDialogOpen] = useState(false)
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null)

  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    type: 'settlement' as PoiType,
    regionId: '',
    parentPoiId: null as string | null,
    subtypeLabel: '',
    floor: null as number | null,
    tags: [] as string[],
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

  const openCreateEventDialog = () => {
    setEventForm({
      name: '',
      description: '',
      type: 'festival',
      season: 'spring',
      day: 1,
      year: null,
      watch: null,
      recurring: false,
      durationWatches: 1,
      effects: '',
      tags: [],
    })
    setCreateEventDialogOpen(true)
  }

  const handleCreateEvent = async () => {
    if (!poi || !region || !eventForm.name.trim()) return
    await executeCreatePOIEvent(
      {
        poiId: poi.id,
        realmId: region.realmId,
        name: eventForm.name,
        description: eventForm.description,
        type: eventForm.type,
        trigger: {
          year: eventForm.recurring ? null : eventForm.year,
          season: eventForm.season,
          day: eventForm.day,
          watch: eventForm.watch,
        },
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
    })
    setEditSheetOpen(true)
  }

  const openCreateChildDialog = () => {
    setCreateChildForm({
      name: '',
      description: '',
      type: 'building',
      subtypeLabel: '',
      floor: null,
      tags: [],
    })
    setCreateChildDialogOpen(true)
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
      },
      { poiRepo: container.poiRepo }
    )
    setEditSheetOpen(false)
  }

  const handleDelete = async () => {
    if (!poi) return
    await executeDeletePOI(poi.id, { poiRepo: container.poiRepo })
    setDeleteConfirmOpen(false)
    // Navigate back
    window.history.back()
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

  const handleUploadMap = async (data: { name: string; imageBlob: Blob; width: number; height: number }) => {
    if (!poi) return
    await executeCreateGameMap(
      { ...data, ownerPoiId: poi.id },
      { gameMapRepo: container.gameMapRepo }
    )
  }

  const getPoiTypeColor = (type: PoiType): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (type) {
      case 'settlement':
        return 'default'
      case 'dungeon':
        return 'destructive'
      case 'landmark':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  // Group children by floor if any have floor values
  const childrenByFloor = children.reduce((acc, child) => {
    const floor = child.floor ?? 'unspecified'
    if (!acc[floor]) acc[floor] = []
    acc[floor].push(child)
    return acc
  }, {} as Record<string | number, POI[]>)

  const hasFloors = children.some((c) => c.floor !== null)

  if (poi === undefined) {
    return <div className="py-8 text-center text-muted-foreground">Loading...</div>
  }

  if (poi === null) {
    return <div className="py-8 text-center text-muted-foreground">POI not found.</div>
  }

  const Icon = POI_TYPE_ICONS[poi.type]

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {region && (
          <>
            <span>{region.name}</span>
            <ChevronRight className="size-4" />
          </>
        )}
        {breadcrumb.slice(0, -1).map((ancestor) => (
          <div key={ancestor.id} className="flex items-center gap-2">
            <Link
              to="/realms/pois/$poiId"
              params={{ poiId: ancestor.id }}
              className="hover:text-foreground"
            >
              {ancestor.name}
            </Link>
            <ChevronRight className="size-4" />
          </div>
        ))}
        <span className="text-foreground font-medium">{poi.name}</span>
      </div>

      {/* Page Header */}
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <Icon className="size-6" />
            {poi.name}
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link to="/realms/pois">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 size-4" />
                Back to POIs
              </Button>
            </Link>
            <Button size="sm" variant="outline" onClick={() => setMapUploadDialogOpen(true)}>
              <MapPinned className="mr-2 size-4" />
              Add Map
            </Button>
            <Button size="sm" onClick={openEditSheet}>
              <Pencil className="mr-2 size-4" />
              Edit
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setDeleteConfirmOpen(true)}>
              <Trash2 className="mr-2 size-4" />
              Delete
            </Button>
          </div>
        }
      />

      {/* Inline Map Viewer */}
      {poiMaps.length > 0 && (
        <POIDetailMap gameMap={poiMaps[0]} poiMaps={poiMaps} parentPoiId={poiId} />
      )}

      <div className="space-y-4">
        {/* POI Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Location Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground w-24">Type</span>
              <Badge variant={getPoiTypeColor(poi.type)}>{poi.type}</Badge>
              {poi.subtypeLabel && (
                <Badge variant="outline">{poi.subtypeLabel}</Badge>
              )}
            </div>
            {poi.floor !== null && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground w-24">Floor</span>
                <Badge variant="outline">Floor {poi.floor}</Badge>
              </div>
            )}
            {poi.description && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Description</span>
                <p className="text-sm mt-1 whitespace-pre-wrap">{poi.description}</p>
              </div>
            )}
            {poi.tags.length > 0 && (
              <div className="flex items-start gap-2">
                <span className="text-sm font-medium text-muted-foreground w-24 pt-0.5">Tags</span>
                <div className="flex flex-wrap gap-1">
                  {poi.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* What's Here Panel */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">What's Here</CardTitle>
              <Button size="sm" variant="outline" onClick={openCreateChildDialog}>
                <Plus className="mr-2 size-4" />
                Add Location
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Child Locations */}
            {children.length > 0 ? (
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <MapPin className="size-4" />
                  Child Locations ({children.length})
                </h4>
                {hasFloors ? (
                  <div className="space-y-4">
                    {Object.entries(childrenByFloor)
                      .sort(([a], [b]) => {
                        if (a === 'unspecified') return 1
                        if (b === 'unspecified') return -1
                        return Number(b) - Number(a)
                      })
                      .map(([floor, floorChildren]) => (
                        <div key={floor}>
                          <div className="text-xs font-medium text-muted-foreground mb-2">
                            {floor === 'unspecified' ? 'Unspecified Floor' : `Floor ${floor}`}
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {floorChildren.map((child) => {
                              const ChildIcon = POI_TYPE_ICONS[child.type]
                              return (
                                <Link
                                  key={child.id}
                                  to="/realms/pois/$poiId"
                                  params={{ poiId: child.id }}
                                  className="block"
                                >
                                  <div className="flex items-center gap-2 rounded-md border p-2 hover:bg-accent transition-colors">
                                    <ChildIcon className="size-4 text-muted-foreground shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium truncate">{child.name}</div>
                                      {child.subtypeLabel && (
                                        <div className="text-xs text-muted-foreground truncate">
                                          {child.subtypeLabel}
                                        </div>
                                      )}
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                      {child.type}
                                    </Badge>
                                  </div>
                                </Link>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {children.map((child) => {
                      const ChildIcon = POI_TYPE_ICONS[child.type]
                      return (
                        <Link
                          key={child.id}
                          to="/realms/pois/$poiId"
                          params={{ poiId: child.id }}
                          className="block"
                        >
                          <div className="flex items-center gap-2 rounded-md border p-2 hover:bg-accent transition-colors">
                            <ChildIcon className="size-4 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{child.name}</div>
                              {child.subtypeLabel && (
                                <div className="text-xs text-muted-foreground truncate">
                                  {child.subtypeLabel}
                                </div>
                              )}
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {child.type}
                            </Badge>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                No child locations yet.
              </div>
            )}

            {/* NPCs Present */}
            {npcs.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Users className="size-4" />
                  NPCs Present ({npcs.length})
                </h4>
                <div className="space-y-2">
                  {npcs.map((npc) => (
                    <Link
                      key={npc.id}
                      to="/realms/npcs/$npcId"
                      params={{ npcId: npc.id }}
                      className="block"
                    >
                      <div className="flex items-center gap-2 rounded-md border p-2 hover:bg-accent transition-colors">
                        <div className="flex-1">
                          <div className="text-sm font-medium">{npc.name}</div>
                          {npc.description && (
                            <div className="text-xs text-muted-foreground line-clamp-1">
                              {npc.description}
                            </div>
                          )}
                        </div>
                        {npc.lifeStatus !== 'alive' && (
                          <Badge variant="destructive" className="text-xs">
                            {npc.lifeStatus}
                          </Badge>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Faction Presence */}
            {factionPresences.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Flag className="size-4" />
                  Faction Presence ({factionPresences.length})
                </h4>
                <div className="space-y-2">
                  {factionPresences.map((presence) => (
                    <FactionPresenceCard key={presence.id} presenceId={presence.factionId} type={presence.type} notes={presence.notes} />
                  ))}
                </div>
              </div>
            )}

            {/* Connected Paths */}
            {paths.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <RouteIcon className="size-4" />
                  Connected Paths ({paths.length})
                </h4>
                <div className="space-y-2">
                  {paths.map((path) => {
                    const isFrom = path.fromPoiId === poi.id
                    const otherPoiId = isFrom ? path.toPoiId : path.fromPoiId
                    return (
                      <div
                        key={path.id}
                        className="flex items-center gap-2 rounded-md border p-2"
                      >
                        <Badge variant="outline" className="text-xs">
                          {path.type}
                        </Badge>
                        <div className="flex-1 text-sm">
                          {isFrom ? 'To' : 'From'} POI {otherPoiId.slice(0, 8)}...
                        </div>
                        {path.baseTravelWatches && (
                          <span className="text-xs text-muted-foreground">
                            {path.baseTravelWatches} watches
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Maps */}
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <MapPinned className="size-4" />
                Maps ({poiMaps.length})
              </h4>
              {poiMaps.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {poiMaps.map((m) => (
                    <Link
                      key={m.id}
                      to="/realms/maps/$mapId"
                      params={{ mapId: m.id }}
                      className="block"
                    >
                      <div className="flex items-center gap-2 rounded-md border p-2 hover:bg-accent transition-colors">
                        <MapPinned className="size-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{m.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {m.width} × {m.height}px
                          </div>
                        </div>
                        <ExternalLink className="size-3 text-muted-foreground shrink-0" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No maps uploaded.</div>
              )}
              {poi.mapRef && (
                <div className="mt-2">
                  <Link
                    to="/realms/maps/$mapId"
                    params={{ mapId: poi.mapRef }}
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <MapPinned className="size-3.5" />
                    View on parent map
                  </Link>
                </div>
              )}
            </div>

            {/* Events */}
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
              {poiEvents.length > 0 ? (
                <div className="space-y-2">
                  {poiEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start gap-2 rounded-md border p-2"
                    >
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
              ) : (
                <div className="text-sm text-muted-foreground">No events scheduled.</div>
              )}
            </div>

            {/* Empty State */}
            {npcs.length === 0 && factionPresences.length === 0 && paths.length === 0 && children.length === 0 && poiEvents.length === 0 && (
              <EmptyState
                icon={MapPin}
                title="Nothing here yet"
                description="Add child locations, NPCs, or faction presences to populate this location"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Sheet */}
      <Sheet open={editSheetOpen} onOpenChange={setEditSheetOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Point of Interest</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Name of the POI"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Describe this location..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-type">Type</Label>
                <Select
                  value={editForm.type}
                  onValueChange={(value) =>
                    setEditForm((f) => ({ ...f, type: value as PoiType }))
                  }
                >
                  <SelectTrigger id="edit-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POI_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-subtype">Subtype Label</Label>
                <Input
                  id="edit-subtype"
                  value={editForm.subtypeLabel}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, subtypeLabel: e.target.value }))
                  }
                  placeholder="e.g., Tavern, Tower"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-floor">Floor (Optional)</Label>
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
            <div>
              <Label>Tags</Label>
              <TagInput
                tags={editForm.tags}
                onChange={(tags) => setEditForm((f) => ({ ...f, tags }))}
              />
            </div>
          </div>
          <SheetFooter>
            <div className="flex w-full gap-2">
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

      {/* Create Child Dialog */}
      <Dialog open={createChildDialogOpen} onOpenChange={setCreateChildDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Child Location</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="child-name">Name *</Label>
              <Input
                id="child-name"
                value={createChildForm.name}
                onChange={(e) =>
                  setCreateChildForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Name of the location"
              />
            </div>
            <div>
              <Label htmlFor="child-description">Description</Label>
              <Textarea
                id="child-description"
                value={createChildForm.description}
                onChange={(e) =>
                  setCreateChildForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Describe this location..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="child-type">Type</Label>
                <Select
                  value={createChildForm.type}
                  onValueChange={(value) =>
                    setCreateChildForm((f) => ({ ...f, type: value as PoiType }))
                  }
                >
                  <SelectTrigger id="child-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POI_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="child-subtype">Subtype Label</Label>
                <Input
                  id="child-subtype"
                  value={createChildForm.subtypeLabel}
                  onChange={(e) =>
                    setCreateChildForm((f) => ({ ...f, subtypeLabel: e.target.value }))
                  }
                  placeholder="e.g., Tavern, Tower"
                />
              </div>
            </div>
            <div>
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
            <div>
              <Label>Tags</Label>
              <TagInput
                tags={createChildForm.tags}
                onChange={(tags) => setCreateChildForm((f) => ({ ...f, tags }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateChildDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateChild} disabled={!createChildForm.name.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Event Dialog */}
      <Dialog open={createEventDialogOpen} onOpenChange={setCreateEventDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="event-name">Name *</Label>
              <Input
                id="event-name"
                value={eventForm.name}
                onChange={(e) => setEventForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Event name"
              />
            </div>
            <div>
              <Label htmlFor="event-description">Description</Label>
              <Textarea
                id="event-description"
                value={eventForm.description}
                onChange={(e) => setEventForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="What happens..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="event-type">Event Type</Label>
                <Select
                  value={eventForm.type}
                  onValueChange={(v) => setEventForm((f) => ({ ...f, type: v as POIEventType }))}
                >
                  <SelectTrigger id="event-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POI_EVENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                      <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="event-day">Day</Label>
                <Input
                  id="event-day"
                  type="number"
                  min="1"
                  value={eventForm.day}
                  onChange={(e) => setEventForm((f) => ({ ...f, day: parseInt(e.target.value) || 1 }))}
                />
              </div>
              <div>
                <Label htmlFor="event-year">Year</Label>
                <Input
                  id="event-year"
                  type="number"
                  min="1"
                  value={eventForm.year ?? ''}
                  onChange={(e) => {
                    const v = e.target.value
                    setEventForm((f) => ({ ...f, year: v ? parseInt(v) : null }))
                  }}
                  placeholder="Any"
                />
              </div>
              <div>
                <Label htmlFor="event-watch">Watch</Label>
                <Input
                  id="event-watch"
                  type="number"
                  min="1"
                  value={eventForm.watch ?? ''}
                  onChange={(e) => {
                    const v = e.target.value
                    setEventForm((f) => ({ ...f, watch: v ? parseInt(v) : null }))
                  }}
                  placeholder="All day"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="event-duration">Duration (watches)</Label>
                <Input
                  id="event-duration"
                  type="number"
                  min="1"
                  value={eventForm.durationWatches}
                  onChange={(e) => setEventForm((f) => ({ ...f, durationWatches: parseInt(e.target.value) || 1 }))}
                />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={eventForm.recurring}
                    onChange={(e) => setEventForm((f) => ({ ...f, recurring: e.target.checked }))}
                    className="rounded"
                  />
                  Recurring
                </label>
              </div>
            </div>
            <div>
              <Label htmlFor="event-effects">Effects / GM Notes</Label>
              <Textarea
                id="event-effects"
                value={eventForm.effects}
                onChange={(e) => setEventForm((f) => ({ ...f, effects: e.target.value }))}
                placeholder="Mechanical effects, NPC reactions..."
                rows={2}
              />
            </div>
            <div>
              <Label>Tags</Label>
              <TagInput
                tags={eventForm.tags}
                onChange={(tags) => setEventForm((f) => ({ ...f, tags }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateEventDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateEvent} disabled={!eventForm.name.trim()}>
              Create Event
            </Button>
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

      {/* Delete Confirm Dialog */}
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
    </div>
  )
}

function POIDetailMap({ gameMap, poiMaps, parentPoiId }: { gameMap: import('@domain/entities/GameMap').GameMap; poiMaps: import('@domain/entities/GameMap').GameMap[]; parentPoiId: string }) {
  const [activeMapIndex, setActiveMapIndex] = useState(0)
  const activeMap = poiMaps[activeMapIndex] ?? gameMap

  return (
    <Card className="overflow-hidden">
      {poiMaps.length > 1 && (
        <div className="flex items-center gap-1 px-3 pt-3">
          {poiMaps.map((m, i) => (
            <Button
              key={m.id}
              variant={i === activeMapIndex ? 'secondary' : 'ghost'}
              size="sm"
              className="text-xs"
              onClick={() => setActiveMapIndex(i)}
            >
              {m.name}
            </Button>
          ))}
        </div>
      )}
      <CardContent className="p-0">
        <InteractiveMap gameMap={activeMap} className="h-[300px] md:h-[500px]" parentPoiId={parentPoiId} />
      </CardContent>
    </Card>
  )
}

function FactionPresenceCard({ presenceId, type, notes }: { presenceId: string; type: string; notes: string }) {
  const faction = useFaction(presenceId)

  if (!faction) return null

  const typeColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    controls: 'default',
    operates: 'secondary',
    contests: 'destructive',
    patrols: 'outline',
    hidden: 'outline',
  }

  return (
    <Link
      to="/realms/factions/$factionId"
      params={{ factionId: faction.id }}
      className="block"
    >
      <div className="flex items-start gap-2 rounded-md border p-2 hover:bg-accent transition-colors">
        <div className="flex-1">
          <div className="text-sm font-medium">{faction.name}</div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={typeColors[type] ?? 'outline'} className="text-xs">
              {type}
            </Badge>
          </div>
          {notes && (
            <div className="text-xs text-muted-foreground mt-1">{notes}</div>
          )}
        </div>
      </div>
    </Link>
  )
}
