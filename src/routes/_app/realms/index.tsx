import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@infrastructure/dexie/db'
import { PageHeader } from '~/components/shared/PageHeader'
import { EmptyState } from '~/components/shared/EmptyState'
import { ConfirmDialog } from '~/components/shared/ConfirmDialog'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Textarea } from '~/components/ui/textarea'
import { LayoutDashboard, Plus, Trash2, Download, Upload, Crown } from 'lucide-react'
// useRealms replaced by direct useLiveQuery to detect loading vs empty
import { useSystemConfigs } from '~/ui/hooks/useSystemConfigs'
import { useContainer } from '~/ui/hooks/useContainer'
import { useUIStore } from '~/ui/stores/uiStore'
import { executeCreateRealm } from '@application/use-cases/CreateRealm'
import { executeDeleteRealm } from '@application/use-cases/DeleteRealm'
import { executeExportRealm } from '@application/use-cases/ExportRealm'
import { executeImportRealm } from '@application/use-cases/ImportRealm'
import { Dashboard } from '~/components/realm/Dashboard'
import type { RealmExport } from '@application/use-cases/ExportRealm'

export const Route = createFileRoute('/_app/realms/')({
  component: RealmsPage,
})

function RealmsPage() {
  const navigate = useNavigate()
  const container = useContainer()
  const rawRealms = useLiveQuery(() => db.realms.toArray())
  const realmsLoaded = rawRealms !== undefined
  const realms = rawRealms ?? []
  const systemConfigs = useSystemConfigs()
  const setActiveRealmId = useUIStore((state) => state.setActiveRealmId)
  const activeRealmId = useUIStore((state) => state.activeRealmId)

  // Clear stale activeRealmId if the realm no longer exists in DB (e.g. DB was deleted)
  useEffect(() => {
    if (realmsLoaded && activeRealmId && !realms.some((r) => r.id === activeRealmId)) {
      setActiveRealmId(null)
    }
  }, [realmsLoaded, activeRealmId, realms, setActiveRealmId])

  const [showCreate, setShowCreate] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createSystem, setCreateSystem] = useState('')
  const [createDesc, setCreateDesc] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleCreateRealm = async () => {
    if (!createName.trim() || !createSystem) return

    setIsCreating(true)
    try {
      const newRealm = await executeCreateRealm(
        {
          name: createName.trim(),
          systemId: createSystem,
          description: createDesc.trim(),
        },
        {
          realmRepo: container.realmRepo,
          factionRepo: container.factionRepo,
          realmNoteRepo: container.realmNoteRepo,
        }
      )

      setActiveRealmId(newRealm.id)
      setShowCreate(false)
      setCreateName('')
      setCreateSystem('')
      setCreateDesc('')
    } catch (error) {
      console.error('Failed to create realm:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteRealm = async () => {
    if (!deleteTarget) return

    setIsDeleting(true)
    try {
      await executeDeleteRealm(deleteTarget, {
        realmRepo: container.realmRepo,
      })
      setDeleteTarget(null)
    } catch (error) {
      console.error('Failed to delete realm:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleExportRealm = async (realmId: string) => {
    try {
      const data = await executeExportRealm(realmId, {
        realmRepo: container.realmRepo,
        regionRepo: container.regionRepo,
        factionRepo: container.factionRepo,
        npcRepo: container.npcRepo,
        relationshipRepo: container.factionRelationshipRepo,
        worldEventRepo: container.worldEventRepo,
        weatherRepo: container.weatherRepo,
        realmNoteRepo: container.realmNoteRepo,
        poiRepo: container.poiRepo,
        pathRepo: container.pathRepo,
      })

      if (!data) return

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${data.realm.name.toLowerCase().replace(/\s+/g, '-')}-export.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to export realm:', error)
    }
  }

  const handleImportRealm = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const data: RealmExport = JSON.parse(text)

      const newRealmId = await executeImportRealm(data, {
        realmRepo: container.realmRepo,
        regionRepo: container.regionRepo,
        factionRepo: container.factionRepo,
        npcRepo: container.npcRepo,
        relationshipRepo: container.factionRelationshipRepo,
        worldEventRepo: container.worldEventRepo,
        weatherRepo: container.weatherRepo,
        realmNoteRepo: container.realmNoteRepo,
        poiRepo: container.poiRepo,
        pathRepo: container.pathRepo,
      })

      setActiveRealmId(newRealmId)
    } catch (error) {
      console.error('Failed to import realm:', error)
    }

    event.target.value = ''
  }

  const handleRealmClick = (realmId: string) => {
    setActiveRealmId(realmId)
    navigate({ to: '/realms' })
  }

  // Show dashboard when a realm is active and confirmed to exist
  if (activeRealmId && realmsLoaded && realms.some((r) => r.id === activeRealmId)) {
    return <Dashboard realmId={activeRealmId} />
  }

  if (realms.length === 0) {
    return (
      <div>
        <PageHeader title="Realms" description="Select or create a realm." />
        <EmptyState
          icon={LayoutDashboard}
          title="No realms yet"
          description="Create your first realm to start building your world."
          action={
            <div className="flex gap-2">
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="mr-2 size-4" />
                New Realm
              </Button>
              <label htmlFor="import-realm">
                <Button variant="outline" asChild>
                  <span>
                    <Upload className="mr-2 size-4" />
                    Import
                  </span>
                </Button>
              </label>
              <input
                id="import-realm"
                type="file"
                accept="application/json"
                className="hidden"
                onChange={handleImportRealm}
              />
            </div>
          }
        />

        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Realm</DialogTitle>
              <DialogDescription>
                Set up a new realm for your campaign.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="realm-name">Name</Label>
                <Input
                  id="realm-name"
                  placeholder="The Forgotten Realms"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  disabled={isCreating}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="realm-system">System</Label>
                <Select value={createSystem} onValueChange={setCreateSystem} disabled={isCreating}>
                  <SelectTrigger id="realm-system" className="w-full">
                    <SelectValue placeholder="Select a system" />
                  </SelectTrigger>
                  <SelectContent>
                    {systemConfigs.map((system) => (
                      <SelectItem key={system.id} value={system.id}>
                        {system.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="realm-desc">Description (optional)</Label>
                <Textarea
                  id="realm-desc"
                  placeholder="A high fantasy setting with..."
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value)}
                  disabled={isCreating}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)} disabled={isCreating}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateRealm}
                disabled={!createName.trim() || !createSystem || isCreating}
              >
                {isCreating ? 'Creating...' : 'Create Realm'}
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
        title="Realms"
        description="Select or create a realm."
        actions={
          <div className="flex gap-2">
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="mr-2 size-4" />
              New Realm
            </Button>
            <label htmlFor="import-realm-header">
              <Button variant="outline" asChild>
                <span>
                  <Upload className="mr-2 size-4" />
                  Import
                </span>
              </Button>
            </label>
            <input
              id="import-realm-header"
              type="file"
              accept="application/json"
              className="hidden"
              onChange={handleImportRealm}
            />
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {realms.map((realm) => {
          const system = systemConfigs.find((s) => s.id === realm.systemId)
          return (
            <Card
              key={realm.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => handleRealmClick(realm.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-sidebar-primary text-sidebar-primary-foreground flex size-10 items-center justify-center rounded-lg">
                      <Crown className="size-5" />
                    </div>
                    <div className="flex-1">
                      <CardTitle>{realm.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {system?.name ?? realm.systemId}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              {realm.description && (
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {realm.description}
                  </p>
                </CardContent>
              )}
              <CardFooter className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleExportRealm(realm.id)
                  }}
                >
                  <Download className="mr-2 size-3" />
                  Export
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    setDeleteTarget(realm.id)
                  }}
                >
                  <Trash2 className="mr-2 size-3" />
                  Delete
                </Button>
              </CardFooter>
            </Card>
          )
        })}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Realm</DialogTitle>
            <DialogDescription>
              Set up a new realm for your campaign.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="realm-name">Name</Label>
              <Input
                id="realm-name"
                placeholder="The Forgotten Realms"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                disabled={isCreating}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="realm-system">System</Label>
              <Select value={createSystem} onValueChange={setCreateSystem} disabled={isCreating}>
                <SelectTrigger id="realm-system" className="w-full">
                  <SelectValue placeholder="Select a system" />
                </SelectTrigger>
                <SelectContent>
                  {systemConfigs.map((system) => (
                    <SelectItem key={system.id} value={system.id}>
                      {system.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="realm-desc">Description (optional)</Label>
              <Textarea
                id="realm-desc"
                placeholder="A high fantasy setting with..."
                value={createDesc}
                onChange={(e) => setCreateDesc(e.target.value)}
                disabled={isCreating}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} disabled={isCreating}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateRealm}
              disabled={!createName.trim() || !createSystem || isCreating}
            >
              {isCreating ? 'Creating...' : 'Create Realm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Realm"
        description="Are you sure you want to delete this realm? This action cannot be undone and will remove all associated data."
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete'}
        variant="destructive"
        onConfirm={handleDeleteRealm}
      />
    </div>
  )
}
