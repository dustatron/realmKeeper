import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useUIStore } from '~/ui/stores/uiStore'
import { useRegions } from '~/ui/hooks/useRegions'
import { useContainer } from '~/ui/hooks/useContainer'
import { executeCreateRegion } from '@application/use-cases/CreateRegion'
import { PageHeader } from '~/components/shared/PageHeader'
import { EmptyState } from '~/components/shared/EmptyState'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '~/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { Badge } from '~/components/ui/badge'
import { Map, Plus } from 'lucide-react'

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

  // Create form state
  const [createName, setCreateName] = useState('')
  const [createDescription, setCreateDescription] = useState('')
  const [createTerrain, setCreateTerrain] = useState<string>('plains')

  const resetCreateForm = () => {
    setCreateName('')
    setCreateDescription('')
    setCreateTerrain('plains')
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
          <Link key={region.id} to="/realms/regions/$regionId" params={{ regionId: region.id }}>
            <Card className="cursor-pointer transition-colors hover:bg-accent">
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
          </Link>
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
    </div>
  )
}
