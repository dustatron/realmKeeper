import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { useUIStore } from '~/ui/stores/uiStore'
import { useRegions } from '~/ui/hooks/useRegions'
import { usePOIs, useRealmPOIs } from '~/ui/hooks/usePOIs'
import { useContainer } from '~/ui/hooks/useContainer'
import { executeCreatePOI } from '@application/use-cases/CreatePOI'
import { executeUpdatePOI } from '@application/use-cases/UpdatePOI'
import { executeDeletePOI } from '@application/use-cases/DeletePOI'
import type { POI } from '@domain/entities/POI'
import { POI_TYPES, type PoiType } from '@shared/constants'
import { EmptyState } from '~/components/shared/EmptyState'
import { ConfirmDialog } from '~/components/shared/ConfirmDialog'
import { TagInput } from '~/components/shared/TagInput'
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
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
import { Badge } from '~/components/ui/badge'
import {
  Compass,
  Plus,
  Search,
  Pencil,
  Trash2,
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
  MapPin,
} from 'lucide-react'

export const Route = createFileRoute('/_app/realms/locations/pois')({
  component: POIsPage,
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

function POIsPage() {
  const activeRealmId = useUIStore((s) => s.activeRealmId)
  const regions = useRegions(activeRealmId)
  const [selectedRegionId, setSelectedRegionId] = useState<string>('all')
  const poisByRegion = usePOIs(selectedRegionId === 'all' ? null : selectedRegionId)
  const allPois = useRealmPOIs(activeRealmId)
  const pois = selectedRegionId === 'all' ? allPois : poisByRegion
  const container = useContainer()

  const [searchQuery, setSearchQuery] = useState('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editingPOI, setEditingPOI] = useState<POI | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deletingPOIId, setDeletingPOIId] = useState<string | null>(null)

  // Create form state
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    type: 'settlement' as PoiType,
    regionId: '',
    parentPoiId: null as string | null,
    subtypeLabel: '',
    floor: null as number | null,
    tags: [] as string[],
  })

  // Edit form state
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

  // Filter top-level POIs, with search
  const topLevelPois = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return pois.filter((poi) => poi.parentPoiId === null)
    // When searching, include all POIs (not just top-level) so child matches surface
    return pois.filter((poi) =>
      poi.name.toLowerCase().includes(q) ||
      poi.subtypeLabel?.toLowerCase().includes(q) ||
      poi.tags.some((t) => t.toLowerCase().includes(q))
    )
  }, [pois, searchQuery])

  // Group by region
  const poisByRegionMap = useMemo(() => {
    const mapObj: Record<string, POI[]> = {}
    topLevelPois.forEach((poi) => {
      if (!mapObj[poi.regionId]) {
        mapObj[poi.regionId] = []
      }
      mapObj[poi.regionId].push(poi)
    })
    return mapObj
  }, [topLevelPois])

  // Get child count for a POI
  const getChildCount = (poiId: string) => {
    return pois.filter((p) => p.parentPoiId === poiId).length
  }

  const handleCreate = async () => {
    if (!createForm.name.trim()) return
    await executeCreatePOI(
      {
        name: createForm.name,
        description: createForm.description,
        type: createForm.type,
        regionId: createForm.regionId,
        parentPoiId: createForm.parentPoiId,
        subtypeLabel: createForm.subtypeLabel || null,
        floor: createForm.floor,
        tags: createForm.tags,
      },
      { poiRepo: container.poiRepo }
    )
    setCreateDialogOpen(false)
    setCreateForm({
      name: '',
      description: '',
      type: 'settlement',
      regionId: '',
      parentPoiId: null,
      subtypeLabel: '',
      floor: null,
      tags: [],
    })
  }

  const handleEdit = async () => {
    if (!editingPOI || !editForm.name.trim()) return
    await executeUpdatePOI(
      {
        ...editingPOI,
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
    setEditingPOI(null)
  }

  const handleDelete = async () => {
    if (!deletingPOIId) return
    await executeDeletePOI(deletingPOIId, { poiRepo: container.poiRepo })
    setDeleteConfirmOpen(false)
    setDeletingPOIId(null)
    setEditingPOI(null)
  }

  const openCreateDialog = () => {
    const defaultRegion = selectedRegionId !== 'all' ? selectedRegionId : (regions[0]?.id ?? '')
    setCreateForm({
      name: '',
      description: '',
      type: 'settlement',
      regionId: defaultRegion,
      parentPoiId: null,
      subtypeLabel: '',
      floor: null,
      tags: [],
    })
    setCreateDialogOpen(true)
  }

  const openEditSheet = (poi: POI) => {
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
    setEditingPOI(poi)
  }

  const openDeleteDialog = (poiId: string) => {
    setDeletingPOIId(poiId)
    setDeleteConfirmOpen(true)
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

  if (!activeRealmId) {
    return <EmptyState icon={Compass} title="Select a realm first" />
  }

  if (regions.length === 0) {
    return (
      <EmptyState
        icon={Compass}
        title="Create regions first before adding POIs"
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="region-select">Region:</Label>
          <Select
            value={selectedRegionId}
            onValueChange={(value) => setSelectedRegionId(value)}
          >
            <SelectTrigger id="region-select" className="w-48">
              <SelectValue placeholder="All Regions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Regions</SelectItem>
              {regions.map((region) => (
                <SelectItem key={region.id} value={region.id}>
                  {region.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search POIs..."
            className="pl-9"
          />
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 size-4" />
          New POI
        </Button>
      </div>

      {/* POI Cards Grid - Grouped by Region */}
      {topLevelPois.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="No POIs yet"
          description="Add points of interest to your realm"
          action={
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 size-4" />
              New POI
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {Object.entries(poisByRegionMap).map(([regionId, regionPois]: [string, POI[]]) => {
            const region = regions.find((r) => r.id === regionId)
            if (!region) return null

            return (
              <div key={regionId} className="space-y-3">
                {selectedRegionId === 'all' && (
                  <h3 className="text-lg font-semibold">{region.name}</h3>
                )}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {regionPois.map((poi: POI) => {
                    const Icon = POI_TYPE_ICONS[poi.type]
                    const childCount = getChildCount(poi.id)

                    return (
                      <Link
                        key={poi.id}
                        to="/realms/pois/$poiId"
                        params={{ poiId: poi.id }}
                        className="block"
                      >
                        <Card className="cursor-pointer transition-shadow hover:shadow-md h-full">
                          <CardHeader>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2 flex-1">
                                <Icon className="size-5 text-muted-foreground shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <CardTitle className="text-base">{poi.name}</CardTitle>
                                  {poi.subtypeLabel && (
                                    <CardDescription className="mt-0.5 text-xs">
                                      {poi.subtypeLabel}
                                    </CardDescription>
                                  )}
                                </div>
                              </div>
                              <Badge variant={getPoiTypeColor(poi.type)}>{poi.type}</Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            {poi.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {poi.description}
                              </p>
                            )}
                            {childCount > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {childCount} {childCount === 1 ? 'location' : 'locations'}
                              </Badge>
                            )}
                            {poi.floor !== null && (
                              <Badge variant="outline" className="text-xs">
                                Floor {poi.floor}
                              </Badge>
                            )}
                            {poi.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {poi.tags.map((tag: string) => (
                                  <Badge key={tag} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Point of Interest</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="create-name">Name *</Label>
              <Input
                id="create-name"
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Name of the POI"
              />
            </div>
            <div>
              <Label htmlFor="create-description">Description</Label>
              <Textarea
                id="create-description"
                value={createForm.description}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Describe this location..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="create-type">Type</Label>
                <Select
                  value={createForm.type}
                  onValueChange={(value) =>
                    setCreateForm((f) => ({ ...f, type: value as PoiType }))
                  }
                >
                  <SelectTrigger id="create-type">
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
                <Label htmlFor="create-subtype">Subtype Label</Label>
                <Input
                  id="create-subtype"
                  value={createForm.subtypeLabel}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, subtypeLabel: e.target.value }))
                  }
                  placeholder="e.g., Tavern, Tower"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="create-region">Region</Label>
              <Select
                value={createForm.regionId}
                onValueChange={(value) =>
                  setCreateForm((f) => ({ ...f, regionId: value }))
                }
              >
                <SelectTrigger id="create-region">
                  <SelectValue placeholder="Select a region" />
                </SelectTrigger>
                <SelectContent>
                  {regions.map((region) => (
                    <SelectItem key={region.id} value={region.id}>
                      {region.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="create-parent">Parent POI (Optional)</Label>
              <Select
                value={createForm.parentPoiId ?? 'none'}
                onValueChange={(value) =>
                  setCreateForm((f) => ({ ...f, parentPoiId: value === 'none' ? null : value }))
                }
              >
                <SelectTrigger id="create-parent">
                  <SelectValue placeholder="None (top-level)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (top-level)</SelectItem>
                  {pois.map((poi) => (
                    <SelectItem key={poi.id} value={poi.id}>
                      {poi.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="create-floor">Floor (Optional)</Label>
              <Input
                id="create-floor"
                type="number"
                value={createForm.floor ?? ''}
                onChange={(e) => {
                  const val = e.target.value
                  setCreateForm((f) => ({ ...f, floor: val ? parseInt(val, 10) : null }))
                }}
                placeholder="e.g., 1, 2, -1"
              />
            </div>
            <div>
              <Label>Tags</Label>
              <TagInput
                tags={createForm.tags}
                onChange={(tags) => setCreateForm((f) => ({ ...f, tags }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!createForm.name.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Sheet */}
      <Sheet open={!!editingPOI} onOpenChange={(open) => !open && setEditingPOI(null)}>
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
              <Label htmlFor="edit-region">Region</Label>
              <Select
                value={editForm.regionId}
                onValueChange={(value) =>
                  setEditForm((f) => ({ ...f, regionId: value }))
                }
              >
                <SelectTrigger id="edit-region">
                  <SelectValue placeholder="Select a region" />
                </SelectTrigger>
                <SelectContent>
                  {regions.map((region) => (
                    <SelectItem key={region.id} value={region.id}>
                      {region.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-parent">Parent POI (Optional)</Label>
              <Select
                value={editForm.parentPoiId ?? 'none'}
                onValueChange={(value) =>
                  setEditForm((f) => ({ ...f, parentPoiId: value === 'none' ? null : value }))
                }
              >
                <SelectTrigger id="edit-parent">
                  <SelectValue placeholder="None (top-level)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (top-level)</SelectItem>
                  {pois
                    .filter((p) => p.id !== editingPOI?.id) // Don't allow self-parenting
                    .map((poi) => (
                      <SelectItem key={poi.id} value={poi.id}>
                        {poi.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
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
              <Button
                variant="destructive"
                onClick={() => editingPOI && openDeleteDialog(editingPOI.id)}
                className="mr-auto"
              >
                <Trash2 className="mr-2 size-4" />
                Delete
              </Button>
              <Button variant="outline" onClick={() => setEditingPOI(null)}>
                Cancel
              </Button>
              <Button onClick={handleEdit} disabled={!editForm.name.trim()}>
                Save
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete POI"
        description="Are you sure you want to delete this point of interest? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
