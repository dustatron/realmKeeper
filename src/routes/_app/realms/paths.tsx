import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useUIStore } from '~/ui/stores/uiStore'
import { useRegions } from '~/ui/hooks/useRegions'
import { usePaths } from '~/ui/hooks/usePaths'
import { usePOIs } from '~/ui/hooks/usePOIs'
import { useContainer } from '~/ui/hooks/useContainer'
import { executeCreatePath } from '@application/use-cases/CreatePath'
import { executeUpdatePath } from '@application/use-cases/UpdatePath'
import { executeDeletePath } from '@application/use-cases/DeletePath'
import { calculateTravelTime } from '@application/use-cases/CalculateTravelTime'
import type { Path } from '@domain/entities/Path'
import { PageHeader } from '~/components/shared/PageHeader'
import { EmptyState } from '~/components/shared/EmptyState'
import { ConfirmDialog } from '~/components/shared/ConfirmDialog'
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
import { Route as RouteIcon, Plus, Pencil, Trash2, Clock } from 'lucide-react'

const TERRAIN_OPTIONS = [
  'plains',
  'forest',
  'hills',
  'mountain',
  'swamp',
  'desert',
  'coast',
  'road',
] as const

export const Route = createFileRoute('/_app/realms/paths')({
  component: PathsPage,
})

function PathsPage() {
  const activeRealmId = useUIStore((s) => s.activeRealmId)
  const regions = useRegions(activeRealmId)
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(
    regions[0]?.id ?? null
  )
  const paths = usePaths(selectedRegionId)
  const pois = usePOIs(selectedRegionId)
  const container = useContainer()

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editingPath, setEditingPath] = useState<Path | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deletingPathId, setDeletingPathId] = useState<string | null>(null)

  // Create form state
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    fromPoiId: '',
    toPoiId: '',
    baseTravelDays: 1,
    terrain: 'plains' as string,
    regionId: selectedRegionId ?? '',
  })

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    fromPoiId: '',
    toPoiId: '',
    baseTravelDays: 1,
    terrain: 'plains' as string,
    regionId: '',
  })

  // Update selected region when regions load
  if (regions.length > 0 && !selectedRegionId) {
    setSelectedRegionId(regions[0].id)
  }

  const getPOIName = (poiId: string): string => {
    return pois.find((p) => p.id === poiId)?.name ?? 'Unknown'
  }

  const handleCreate = async () => {
    if (!createForm.name.trim() || !createForm.fromPoiId || !createForm.toPoiId) return
    await executeCreatePath(
      {
        name: createForm.name,
        description: createForm.description,
        fromPoiId: createForm.fromPoiId,
        toPoiId: createForm.toPoiId,
        baseTravelDays: createForm.baseTravelDays,
        terrain: createForm.terrain,
        regionId: createForm.regionId,
      },
      { pathRepo: container.pathRepo }
    )
    setCreateDialogOpen(false)
    setCreateForm({
      name: '',
      description: '',
      fromPoiId: '',
      toPoiId: '',
      baseTravelDays: 1,
      terrain: 'plains',
      regionId: selectedRegionId ?? '',
    })
  }

  const handleEdit = async () => {
    if (!editingPath || !editForm.name.trim() || !editForm.fromPoiId || !editForm.toPoiId) return
    await executeUpdatePath(
      {
        ...editingPath,
        name: editForm.name,
        description: editForm.description,
        fromPoiId: editForm.fromPoiId,
        toPoiId: editForm.toPoiId,
        baseTravelDays: editForm.baseTravelDays,
        terrain: editForm.terrain,
        regionId: editForm.regionId,
      },
      { pathRepo: container.pathRepo }
    )
    setEditingPath(null)
  }

  const handleDelete = async () => {
    if (!deletingPathId) return
    await executeDeletePath(deletingPathId, { pathRepo: container.pathRepo })
    setDeleteConfirmOpen(false)
    setDeletingPathId(null)
    setEditingPath(null)
  }

  const openCreateDialog = () => {
    setCreateForm({
      name: '',
      description: '',
      fromPoiId: '',
      toPoiId: '',
      baseTravelDays: 1,
      terrain: 'plains',
      regionId: selectedRegionId ?? '',
    })
    setCreateDialogOpen(true)
  }

  const openEditSheet = (path: Path) => {
    setEditForm({
      name: path.name,
      description: path.description,
      fromPoiId: path.fromPoiId,
      toPoiId: path.toPoiId,
      baseTravelDays: path.baseTravelDays,
      terrain: path.terrain,
      regionId: path.regionId,
    })
    setEditingPath(path)
  }

  const openDeleteDialog = (pathId: string) => {
    setDeletingPathId(pathId)
    setDeleteConfirmOpen(true)
  }

  if (!activeRealmId) {
    return (
      <div>
        <PageHeader title="Paths" description="Travel routes between points of interest." />
        <EmptyState icon={RouteIcon} title="Select a realm first" />
      </div>
    )
  }

  if (regions.length === 0) {
    return (
      <div>
        <PageHeader title="Paths" description="Travel routes between points of interest." />
        <EmptyState
          icon={RouteIcon}
          title="Create regions first before adding paths"
        />
      </div>
    )
  }

  if (pois.length === 0) {
    return (
      <div className="space-y-4">
        <PageHeader title="Paths" description="Travel routes between points of interest." />
        <div className="flex items-center gap-2">
          <Label htmlFor="region-select">Region:</Label>
          <Select
            value={selectedRegionId ?? undefined}
            onValueChange={(value) => setSelectedRegionId(value)}
          >
            <SelectTrigger id="region-select" className="w-64">
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
        <EmptyState
          icon={RouteIcon}
          title="Create POIs first before adding paths"
          description="Paths connect points of interest"
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Paths"
        description="Travel routes between points of interest."
        actions={
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 size-4" />
            New Path
          </Button>
        }
      />

      {/* Region Selector */}
      <div className="flex items-center gap-2">
        <Label htmlFor="region-select">Region:</Label>
        <Select
          value={selectedRegionId ?? undefined}
          onValueChange={(value) => setSelectedRegionId(value)}
        >
          <SelectTrigger id="region-select" className="w-64">
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

      {/* Path Cards Grid */}
      {paths.length === 0 ? (
        <EmptyState
          icon={RouteIcon}
          title="No paths yet"
          description="Add travel routes between POIs"
          action={
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 size-4" />
              New Path
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {paths.map((path) => {
            const travelTime = calculateTravelTime({
              baseTravelDays: path.baseTravelDays,
              terrain: path.terrain,
            })
            return (
              <Card
                key={path.id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => openEditSheet(path)}
              >
                <CardHeader>
                  <CardTitle className="text-base">{path.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">{getPOIName(path.fromPoiId)}</span>
                    <span className="text-muted-foreground"> → </span>
                    <span className="font-medium">{getPOIName(path.toPoiId)}</span>
                  </div>
                  {path.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {path.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{path.terrain}</Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3" />
                      <span>{travelTime} {travelTime === 1 ? 'day' : 'days'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Path</DialogTitle>
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
                placeholder="Name of the path"
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
                placeholder="Describe this route..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="create-from">From POI *</Label>
                <Select
                  value={createForm.fromPoiId}
                  onValueChange={(value) =>
                    setCreateForm((f) => ({ ...f, fromPoiId: value }))
                  }
                >
                  <SelectTrigger id="create-from">
                    <SelectValue placeholder="Select POI" />
                  </SelectTrigger>
                  <SelectContent>
                    {pois.map((poi) => (
                      <SelectItem key={poi.id} value={poi.id}>
                        {poi.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="create-to">To POI *</Label>
                <Select
                  value={createForm.toPoiId}
                  onValueChange={(value) =>
                    setCreateForm((f) => ({ ...f, toPoiId: value }))
                  }
                >
                  <SelectTrigger id="create-to">
                    <SelectValue placeholder="Select POI" />
                  </SelectTrigger>
                  <SelectContent>
                    {pois.map((poi) => (
                      <SelectItem key={poi.id} value={poi.id}>
                        {poi.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="create-days">Base Travel Days *</Label>
                <Input
                  id="create-days"
                  type="number"
                  min="1"
                  value={createForm.baseTravelDays}
                  onChange={(e) =>
                    setCreateForm((f) => ({
                      ...f,
                      baseTravelDays: parseInt(e.target.value) || 1,
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="create-terrain">Terrain</Label>
                <Select
                  value={createForm.terrain}
                  onValueChange={(value) =>
                    setCreateForm((f) => ({ ...f, terrain: value }))
                  }
                >
                  <SelectTrigger id="create-terrain">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TERRAIN_OPTIONS.map((terrain) => (
                      <SelectItem key={terrain} value={terrain}>
                        {terrain}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                !createForm.name.trim() ||
                !createForm.fromPoiId ||
                !createForm.toPoiId
              }
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Sheet */}
      <Sheet open={!!editingPath} onOpenChange={(open) => !open && setEditingPath(null)}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Path</SheetTitle>
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
                placeholder="Name of the path"
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
                placeholder="Describe this route..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-from">From POI *</Label>
                <Select
                  value={editForm.fromPoiId}
                  onValueChange={(value) =>
                    setEditForm((f) => ({ ...f, fromPoiId: value }))
                  }
                >
                  <SelectTrigger id="edit-from">
                    <SelectValue placeholder="Select POI" />
                  </SelectTrigger>
                  <SelectContent>
                    {pois.map((poi) => (
                      <SelectItem key={poi.id} value={poi.id}>
                        {poi.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-to">To POI *</Label>
                <Select
                  value={editForm.toPoiId}
                  onValueChange={(value) =>
                    setEditForm((f) => ({ ...f, toPoiId: value }))
                  }
                >
                  <SelectTrigger id="edit-to">
                    <SelectValue placeholder="Select POI" />
                  </SelectTrigger>
                  <SelectContent>
                    {pois.map((poi) => (
                      <SelectItem key={poi.id} value={poi.id}>
                        {poi.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-days">Base Travel Days *</Label>
                <Input
                  id="edit-days"
                  type="number"
                  min="1"
                  value={editForm.baseTravelDays}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      baseTravelDays: parseInt(e.target.value) || 1,
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-terrain">Terrain</Label>
                <Select
                  value={editForm.terrain}
                  onValueChange={(value) =>
                    setEditForm((f) => ({ ...f, terrain: value }))
                  }
                >
                  <SelectTrigger id="edit-terrain">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TERRAIN_OPTIONS.map((terrain) => (
                      <SelectItem key={terrain} value={terrain}>
                        {terrain}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            {/* Show calculated travel time */}
            <div className="rounded-md bg-muted p-3">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="size-4" />
                <span className="font-medium">Calculated Travel Time:</span>
                <span>
                  {calculateTravelTime({
                    baseTravelDays: editForm.baseTravelDays,
                    terrain: editForm.terrain,
                  })}{' '}
                  days
                </span>
              </div>
            </div>
          </div>
          <SheetFooter>
            <div className="flex w-full gap-2">
              <Button
                variant="destructive"
                onClick={() => editingPath && openDeleteDialog(editingPath.id)}
                className="mr-auto"
              >
                <Trash2 className="mr-2 size-4" />
                Delete
              </Button>
              <Button variant="outline" onClick={() => setEditingPath(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleEdit}
                disabled={
                  !editForm.name.trim() || !editForm.fromPoiId || !editForm.toPoiId
                }
              >
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
        title="Delete Path"
        description="Are you sure you want to delete this path? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
