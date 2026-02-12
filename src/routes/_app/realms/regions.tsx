import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useUIStore } from '~/ui/stores/uiStore'
import { useRegions } from '~/ui/hooks/useRegions'
import { useContainer } from '~/ui/hooks/useContainer'
import { executeCreateRegion } from '@application/use-cases/CreateRegion'
import { executeUpdateRegion } from '@application/use-cases/UpdateRegion'
import { executeDeleteRegion } from '@application/use-cases/DeleteRegion'
import { PageHeader } from '~/components/shared/PageHeader'
import { EmptyState } from '~/components/shared/EmptyState'
import { ConfirmDialog } from '~/components/shared/ConfirmDialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '~/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '~/components/ui/sheet'
import { Badge } from '~/components/ui/badge'
import { Map, Plus, Pencil, Trash2 } from 'lucide-react'
import type { Region } from '@domain/entities/Region'

export const Route = createFileRoute('/_app/realms/regions')({
  component: RegionsPage,
})

const TERRAIN_OPTIONS = [
  'plains',
  'forest',
  'hills',
  'mountain',
  'swamp',
  'desert',
  'coast',
  'road',
  'tundra',
  'other',
] as const

function RegionsPage() {
  const activeRealmId = useUIStore((s) => s.activeRealmId)
  const regions = useRegions(activeRealmId)
  const container = useContainer()

  const [showCreate, setShowCreate] = useState(false)
  const [editingRegion, setEditingRegion] = useState<Region | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  // Create form state
  const [createName, setCreateName] = useState('')
  const [createDescription, setCreateDescription] = useState('')
  const [createTerrain, setCreateTerrain] = useState<string>('plains')

  // Edit form state
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editTerrain, setEditTerrain] = useState('')

  const resetCreateForm = () => {
    setCreateName('')
    setCreateDescription('')
    setCreateTerrain('plains')
  }

  const openEditSheet = (region: Region) => {
    setEditingRegion(region)
    setEditName(region.name)
    setEditDescription(region.description)
    setEditTerrain(region.terrain || 'plains')
  }

  const handleCreate = async () => {
    if (!activeRealmId || !createName.trim()) return

    await executeCreateRegion(
      {
        realmId: activeRealmId,
        name: createName.trim(),
        description: createDescription.trim(),
        terrain: createTerrain,
      },
      { regionRepo: container.regionRepo }
    )

    resetCreateForm()
    setShowCreate(false)
  }

  const handleUpdate = async () => {
    if (!editingRegion) return

    await executeUpdateRegion(
      {
        ...editingRegion,
        name: editName.trim(),
        description: editDescription.trim(),
        terrain: editTerrain,
      },
      { regionRepo: container.regionRepo }
    )

    setEditingRegion(null)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return

    await executeDeleteRegion(deleteTarget, { regionRepo: container.regionRepo })
    setDeleteTarget(null)

    if (editingRegion?.id === deleteTarget) {
      setEditingRegion(null)
    }
  }

  if (!activeRealmId) {
    return (
      <div>
        <PageHeader title="Regions" description="Define the geography of your realm." />
        <EmptyState icon={Map} title="Select a realm first" />
      </div>
    )
  }

  if (regions.length === 0) {
    return (
      <div>
        <PageHeader title="Regions" description="Define the geography of your realm." />
        <EmptyState
          icon={Map}
          title="No regions yet"
          action={
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="mr-2 size-4" />
              New Region
            </Button>
          }
        />

        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Region</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="create-name">Name</Label>
                <Input
                  id="create-name"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="The Whispering Woods"
                />
              </div>
              <div>
                <Label htmlFor="create-terrain">Terrain</Label>
                <Select value={createTerrain} onValueChange={setCreateTerrain}>
                  <SelectTrigger id="create-terrain">
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
                <Label htmlFor="create-description">Description</Label>
                <Textarea
                  id="create-description"
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  placeholder="Dense forest with ancient trees..."
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!createName.trim()}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Regions"
        description="Define the geography of your realm."
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 size-4" />
            New Region
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {regions.map((region) => (
          <Card
            key={region.id}
            className="cursor-pointer transition-colors hover:bg-accent"
            onClick={() => openEditSheet(region)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle>{region.name}</CardTitle>
                {region.terrain && (
                  <Badge variant="secondary" className="ml-2">
                    {region.terrain}
                  </Badge>
                )}
              </div>
              {region.description && (
                <CardDescription className="line-clamp-2">
                  {region.description}
                </CardDescription>
              )}
            </CardHeader>
          </Card>
        ))}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Region</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="create-name">Name</Label>
              <Input
                id="create-name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="The Whispering Woods"
              />
            </div>
            <div>
              <Label htmlFor="create-terrain">Terrain</Label>
              <Select value={createTerrain} onValueChange={setCreateTerrain}>
                <SelectTrigger id="create-terrain">
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
              <Label htmlFor="create-description">Description</Label>
              <Textarea
                id="create-description"
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                placeholder="Dense forest with ancient trees..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!createName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={!!editingRegion} onOpenChange={(open) => !open && setEditingRegion(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {editingRegion && (
            <>
              <SheetHeader>
                <SheetTitle>Edit Region</SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-4">
                <div>
                  <Label htmlFor="edit-name">Name</Label>
                  <Input
                    id="edit-name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-terrain">Terrain</Label>
                  <Select value={editTerrain} onValueChange={setEditTerrain}>
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
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleUpdate} disabled={!editName.trim()} className="flex-1">
                    <Pencil className="mr-2 size-4" />
                    Save
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setDeleteTarget(editingRegion.id)
                      setEditingRegion(null)
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Region"
        description="Are you sure you want to delete this region? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
