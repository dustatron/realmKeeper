import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useUIStore } from '~/ui/stores/uiStore'
import { useRegions } from '~/ui/hooks/useRegions'
import { usePaths } from '~/ui/hooks/usePaths'
import { useRealmPOIs } from '~/ui/hooks/usePOIs'
import { useContainer } from '~/ui/hooks/useContainer'
import { executeCreatePath } from '@application/use-cases/CreatePath'
import { executeUpdatePath } from '@application/use-cases/UpdatePath'
import { executeDeletePath } from '@application/use-cases/DeletePath'
import { calculateTravelTime } from '@application/use-cases/CalculateTravelTime'
import type { Path } from '@domain/entities/Path'
import type { TerrainType, PathType, Direction } from '@shared/constants'
import { TERRAIN_TYPES, PATH_TYPES, DIRECTIONS, DIRECTION_LABELS, OPPOSITE_DIRECTION } from '@shared/constants'
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

export const Route = createFileRoute('/_app/realms/locations/paths')({
  component: PathsPage,
})

function PathsPage() {
  const activeRealmId = useUIStore((s) => s.activeRealmId)
  const regions = useRegions(activeRealmId)
  const paths = usePaths()
  const pois = useRealmPOIs(activeRealmId)
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
    baseTravelWatches: 1,
    terrain: 'plains' as TerrainType,
    type: 'road' as PathType,
    direction: '' as Direction | '',
    hasDoor: false,
    isLocked: false,
    doorDescription: '',
  })

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    fromPoiId: '',
    toPoiId: '',
    baseTravelWatches: 1,
    terrain: 'plains' as TerrainType,
    type: 'road' as PathType,
    direction: '' as Direction | '',
    hasDoor: false,
    isLocked: false,
    doorDescription: '',
  })

  const getPOIName = (poiId: string): string => {
    return pois.find((p) => p.id === poiId)?.name ?? 'Unknown'
  }

  // Filter paths to only those connected to POIs in this realm
  const realmPoiIds = new Set(pois.map((p) => p.id))
  const realmPaths = paths.filter(
    (p) => realmPoiIds.has(p.fromPoiId) || realmPoiIds.has(p.toPoiId)
  )

  const handleCreate = async () => {
    if (!createForm.name.trim() || !createForm.fromPoiId || !createForm.toPoiId) return
    await executeCreatePath(
      {
        name: createForm.name,
        description: createForm.description,
        fromPoiId: createForm.fromPoiId,
        toPoiId: createForm.toPoiId,
        baseTravelWatches: createForm.baseTravelWatches,
        terrain: createForm.terrain,
        type: createForm.type,
        direction: createForm.direction || null,
        hasDoor: createForm.hasDoor,
        isLocked: createForm.isLocked,
        doorDescription: createForm.doorDescription,
      },
      { pathRepo: container.pathRepo }
    )
    setCreateDialogOpen(false)
    setCreateForm({
      name: '',
      description: '',
      fromPoiId: '',
      toPoiId: '',
      baseTravelWatches: 1,
      terrain: 'plains',
      type: 'road',
      direction: '',
      hasDoor: false,
      isLocked: false,
      doorDescription: '',
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
        baseTravelWatches: editForm.baseTravelWatches,
        terrain: editForm.terrain,
        type: editForm.type,
        direction: editForm.direction || null,
        hasDoor: editForm.hasDoor,
        isLocked: editForm.isLocked,
        doorDescription: editForm.doorDescription,
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
      baseTravelWatches: 1,
      terrain: 'plains',
      type: 'road',
      direction: '',
      hasDoor: false,
      isLocked: false,
      doorDescription: '',
    })
    setCreateDialogOpen(true)
  }

  const openEditSheet = (path: Path) => {
    setEditForm({
      name: path.name,
      description: path.description,
      fromPoiId: path.fromPoiId,
      toPoiId: path.toPoiId,
      baseTravelWatches: path.baseTravelWatches,
      terrain: path.terrain,
      type: path.type,
      direction: path.direction ?? '',
      hasDoor: path.hasDoor ?? false,
      isLocked: path.isLocked ?? false,
      doorDescription: path.doorDescription ?? '',
    })
    setEditingPath(path)
  }

  const openDeleteDialog = (pathId: string) => {
    setDeletingPathId(pathId)
    setDeleteConfirmOpen(true)
  }

  if (!activeRealmId) {
    return <EmptyState icon={RouteIcon} title="Select a realm first" />
  }

  if (pois.length === 0) {
    return (
      <EmptyState
        icon={RouteIcon}
        title="Create POIs first before adding paths"
        description="Paths connect points of interest"
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 size-4" />
          New Path
        </Button>
      </div>

      {/* Path Cards Grid */}
      {realmPaths.length === 0 ? (
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
          {realmPaths.map((path) => {
            const travelTime = calculateTravelTime({
              baseTravelWatches: path.baseTravelWatches,
              terrain: path.terrain,
            })
            return (
              <Card
                key={path.id}
                className="cursor-pointer transition-shadow hover:shadow-elevated"
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
                    {path.direction && (
                      <Badge variant="secondary" className="font-mono">{path.direction.toUpperCase()}</Badge>
                    )}
                    <Badge variant="outline">{path.type}</Badge>
                    <Badge variant="secondary">{path.terrain}</Badge>
                    {path.hasDoor && (
                      <span title={path.isLocked ? 'Locked door' : 'Door'}>
                        {path.isLocked ? '🔒' : '🚪'}
                      </span>
                    )}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3" />
                      <span>{travelTime} {travelTime === 1 ? 'watch' : 'watches'}</span>
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
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="create-watches">Travel Watches *</Label>
                <Input
                  id="create-watches"
                  type="number"
                  min="1"
                  value={createForm.baseTravelWatches}
                  onChange={(e) =>
                    setCreateForm((f) => ({
                      ...f,
                      baseTravelWatches: parseInt(e.target.value) || 1,
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="create-type">Path Type</Label>
                <Select
                  value={createForm.type}
                  onValueChange={(value) =>
                    setCreateForm((f) => ({ ...f, type: value as PathType }))
                  }
                >
                  <SelectTrigger id="create-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PATH_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="create-terrain">Terrain</Label>
                <Select
                  value={createForm.terrain}
                  onValueChange={(value) =>
                    setCreateForm((f) => ({ ...f, terrain: value as TerrainType }))
                  }
                >
                  <SelectTrigger id="create-terrain">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TERRAIN_TYPES.map((terrain) => (
                      <SelectItem key={terrain} value={terrain}>
                        {terrain}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="create-direction">Direction</Label>
              <Select
                value={createForm.direction || 'none'}
                onValueChange={(value) =>
                  setCreateForm((f) => ({ ...f, direction: (value === 'none' ? '' : value) as Direction | '' }))
                }
              >
                <SelectTrigger id="create-direction">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {DIRECTIONS.map((d) => (
                    <SelectItem key={d} value={d}>{DIRECTION_LABELS[d]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={createForm.hasDoor}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, hasDoor: e.target.checked, isLocked: e.target.checked ? f.isLocked : false }))
                  }
                  className="rounded"
                />
                🚪 Has Door
              </label>
              {createForm.hasDoor && (
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createForm.isLocked}
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, isLocked: e.target.checked }))
                    }
                    className="rounded"
                  />
                  🔒 Locked
                </label>
              )}
            </div>
            {createForm.hasDoor && (
              <div>
                <Label htmlFor="create-door-desc">Door Description</Label>
                <Input
                  id="create-door-desc"
                  value={createForm.doorDescription}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, doorDescription: e.target.value }))
                  }
                  placeholder="Heavy oak door, iron-banded..."
                />
              </div>
            )}
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
        <SheetContent className="sm:max-w-lg overflow-y-auto p-6">
          <SheetHeader>
            <SheetTitle>Edit Path</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
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
            <div className="space-y-1.5">
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
              <div className="space-y-1.5">
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
              <div className="space-y-1.5">
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
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-watches">Travel Watches *</Label>
                <Input
                  id="edit-watches"
                  type="number"
                  min="1"
                  value={editForm.baseTravelWatches}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      baseTravelWatches: parseInt(e.target.value) || 1,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-type">Path Type</Label>
                <Select
                  value={editForm.type}
                  onValueChange={(value) =>
                    setEditForm((f) => ({ ...f, type: value as PathType }))
                  }
                >
                  <SelectTrigger id="edit-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PATH_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-terrain">Terrain</Label>
                <Select
                  value={editForm.terrain}
                  onValueChange={(value) =>
                    setEditForm((f) => ({ ...f, terrain: value as TerrainType }))
                  }
                >
                  <SelectTrigger id="edit-terrain">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TERRAIN_TYPES.map((terrain) => (
                      <SelectItem key={terrain} value={terrain}>
                        {terrain}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-direction">Direction</Label>
              <Select
                value={editForm.direction || 'none'}
                onValueChange={(value) =>
                  setEditForm((f) => ({ ...f, direction: (value === 'none' ? '' : value) as Direction | '' }))
                }
              >
                <SelectTrigger id="edit-direction">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {DIRECTIONS.map((d) => (
                    <SelectItem key={d} value={d}>{DIRECTION_LABELS[d]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.hasDoor}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, hasDoor: e.target.checked, isLocked: e.target.checked ? f.isLocked : false }))
                  }
                  className="rounded"
                />
                🚪 Has Door
              </label>
              {editForm.hasDoor && (
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.isLocked}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, isLocked: e.target.checked }))
                    }
                    className="rounded"
                  />
                  🔒 Locked
                </label>
              )}
            </div>
            {editForm.hasDoor && (
              <div className="space-y-1.5">
                <Label htmlFor="edit-door-desc">Door Description</Label>
                <Input
                  id="edit-door-desc"
                  value={editForm.doorDescription}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, doorDescription: e.target.value }))
                  }
                  placeholder="Heavy oak door, iron-banded..."
                />
              </div>
            )}
            {/* Show calculated travel time */}
            <div className="rounded-md bg-muted p-3">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="size-4" />
                <span className="font-medium">Calculated Travel Time:</span>
                <span>
                  {calculateTravelTime({
                    baseTravelWatches: editForm.baseTravelWatches,
                    terrain: editForm.terrain,
                  })}{' '}
                  watches
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
