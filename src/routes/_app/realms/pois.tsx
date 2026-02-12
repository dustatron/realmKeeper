import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useUIStore } from '~/ui/stores/uiStore'
import { useRegions } from '~/ui/hooks/useRegions'
import { usePOIs } from '~/ui/hooks/usePOIs'
import { useContainer } from '~/ui/hooks/useContainer'
import { executeCreatePOI } from '@application/use-cases/CreatePOI'
import { executeUpdatePOI } from '@application/use-cases/UpdatePOI'
import { executeDeletePOI } from '@application/use-cases/DeletePOI'
import type { POI } from '@domain/entities/POI'
import { POI_TYPES, type PoiType } from '@shared/constants'
import { PageHeader } from '~/components/shared/PageHeader'
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
import { Compass, Plus, Pencil, Trash2 } from 'lucide-react'

export const Route = createFileRoute('/_app/realms/pois')({
  component: POIsPage,
})

function POIsPage() {
  const activeRealmId = useUIStore((s) => s.activeRealmId)
  const regions = useRegions(activeRealmId)
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(
    regions[0]?.id ?? null
  )
  const pois = usePOIs(selectedRegionId)
  const container = useContainer()

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editingPOI, setEditingPOI] = useState<POI | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deletingPOIId, setDeletingPOIId] = useState<string | null>(null)

  // Create form state
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    type: 'settlement' as PoiType,
    regionId: selectedRegionId ?? '',
    tags: [] as string[],
  })

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    type: 'settlement' as PoiType,
    regionId: '',
    tags: [] as string[],
  })

  // Update selected region when regions load
  if (regions.length > 0 && !selectedRegionId) {
    setSelectedRegionId(regions[0].id)
  }

  const handleCreate = async () => {
    if (!createForm.name.trim()) return
    await executeCreatePOI(
      {
        name: createForm.name,
        description: createForm.description,
        type: createForm.type,
        regionId: createForm.regionId,
        tags: createForm.tags,
      },
      { poiRepo: container.poiRepo }
    )
    setCreateDialogOpen(false)
    setCreateForm({
      name: '',
      description: '',
      type: 'settlement',
      regionId: selectedRegionId ?? '',
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
    setCreateForm({
      name: '',
      description: '',
      type: 'settlement',
      regionId: selectedRegionId ?? '',
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
    return (
      <div>
        <PageHeader title="Points of Interest" description="Settlements, dungeons, landmarks, and more." />
        <EmptyState icon={Compass} title="Select a realm first" />
      </div>
    )
  }

  if (regions.length === 0) {
    return (
      <div>
        <PageHeader title="Points of Interest" description="Settlements, dungeons, landmarks, and more." />
        <EmptyState
          icon={Compass}
          title="Create regions first before adding POIs"
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Points of Interest"
        description="Settlements, dungeons, landmarks, and more."
        actions={
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 size-4" />
            New POI
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

      {/* POI Cards Grid */}
      {pois.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="No POIs yet"
          description="Add points of interest to this region"
          action={
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 size-4" />
              New POI
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pois.map((poi) => (
            <Card
              key={poi.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => openEditSheet(poi)}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle>{poi.name}</CardTitle>
                  <Badge variant={getPoiTypeColor(poi.type)}>{poi.type}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {poi.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {poi.description}
                  </p>
                )}
                {poi.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {poi.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
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
