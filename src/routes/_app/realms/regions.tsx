import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useUIStore } from '~/ui/stores/uiStore'
import { useRegions } from '~/ui/hooks/useRegions'
import { useActiveRealm } from '~/ui/hooks/useActiveRealm'
import { useSystemConfig } from '~/ui/hooks/useSystemConfigs'
import { useContainer } from '~/ui/hooks/useContainer'
import { executeCreateRegion } from '@application/use-cases/CreateRegion'
import { executeUpdateRegion } from '@application/use-cases/UpdateRegion'
import { executeDeleteRegion } from '@application/use-cases/DeleteRegion'
import { executeGenerateRegion } from '@application/use-cases/GenerateRegion'
import { PageHeader } from '~/components/shared/PageHeader'
import { EmptyState } from '~/components/shared/EmptyState'
import { ConfirmDialog } from '~/components/shared/ConfirmDialog'
import { TagInput } from '~/components/shared/TagInput'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '~/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '~/components/ui/sheet'
import { ScrollArea } from '~/components/ui/scroll-area'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '~/components/ui/table'
import { Card, CardContent } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { Badge } from '~/components/ui/badge'
import { Map, Plus, Dices, Trash2, Pencil, RefreshCw, Save, X } from 'lucide-react'
import type { Region } from '@domain/entities/Region'

export const Route = createFileRoute('/_app/realms/regions')({
  component: RegionsPage,
})

const TERRAIN_OPTIONS = [
  'plains', 'forest', 'hills', 'mountain', 'swamp',
  'desert', 'coast', 'road', 'tundra', 'other',
] as const

function RegionsPage() {
  const activeRealmId = useUIStore((s) => s.activeRealmId)
  const realm = useActiveRealm()
  const systemConfig = useSystemConfig(realm?.systemId ?? null)
  const regions = useRegions(activeRealmId)
  const container = useContainer()

  // Create dialog
  const [showCreate, setShowCreate] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createDescription, setCreateDescription] = useState('')
  const [createTerrain, setCreateTerrain] = useState<string>('plains')

  // Edit sheet
  const [editingRegion, setEditingRegion] = useState<Region | null>(null)

  // Generate drawer
  const [showGenerate, setShowGenerate] = useState(false)
  const [generateCount, setGenerateCount] = useState(3)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedRegions, setGeneratedRegions] = useState<Region[]>([])

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  // ── Create ──────────────────────────────────────────
  const resetCreateForm = () => {
    setCreateName('')
    setCreateDescription('')
    setCreateTerrain('plains')
  }

  const handleCreate = async () => {
    if (!activeRealmId || !createName.trim()) return
    await executeCreateRegion(
      { realmId: activeRealmId, name: createName.trim(), description: createDescription.trim(), terrain: createTerrain },
      { regionRepo: container.regionRepo }
    )
    resetCreateForm()
    setShowCreate(false)
  }

  // ── Edit ────────────────────────────────────────────
  const openEdit = (region: Region) => {
    setEditingRegion({ ...region })
  }

  const handleSaveEdit = async () => {
    if (!editingRegion) return
    await executeUpdateRegion(editingRegion, { regionRepo: container.regionRepo })
    setEditingRegion(null)
  }

  // ── Delete ──────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return
    await executeDeleteRegion(deleteTarget, { regionRepo: container.regionRepo })
    setDeleteTarget(null)
    if (editingRegion?.id === deleteTarget) setEditingRegion(null)
  }

  // ── Generate ────────────────────────────────────────
  const handleGenerate = async () => {
    if (!activeRealmId || !systemConfig) return
    setIsGenerating(true)
    try {
      const results: Region[] = []
      for (let i = 0; i < generateCount; i++) {
        const region = await executeGenerateRegion(
          { realmId: activeRealmId, systemConfig },
          { tableRepo: container.tableRepo }
        )
        results.push(region)
      }
      setGeneratedRegions(results)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRerollOne = async (index: number) => {
    if (!activeRealmId || !systemConfig) return
    const region = await executeGenerateRegion(
      { realmId: activeRealmId, systemConfig },
      { tableRepo: container.tableRepo }
    )
    setGeneratedRegions((prev) => prev.map((r, i) => (i === index ? region : r)))
  }

  const handleRemoveGenerated = (index: number) => {
    setGeneratedRegions((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUpdateGenerated = (index: number, updates: Partial<Region>) => {
    setGeneratedRegions((prev) => prev.map((r, i) => (i === index ? { ...r, ...updates } : r)))
  }

  const handleSaveAllGenerated = async () => {
    for (const region of generatedRegions) {
      await container.regionRepo.create(region)
    }
    setGeneratedRegions([])
    setShowGenerate(false)
  }

  const handleOpenGenerate = () => {
    setGeneratedRegions([])
    setShowGenerate(true)
  }

  // ── Guards ──────────────────────────────────────────
  if (!activeRealmId) {
    return (
      <div>
        <PageHeader title="Regions" />
        <EmptyState icon={Map} title="Select a realm first" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Regions"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleOpenGenerate} disabled={!systemConfig}>
              <Dices className="mr-2 size-4" />
              Generate
            </Button>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="mr-2 size-4" />
              New Region
            </Button>
          </div>
        }
      />

      {regions.length === 0 ? (
        <EmptyState
          icon={Map}
          title="No regions yet"
          action={
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleOpenGenerate} disabled={!systemConfig}>
                <Dices className="mr-2 size-4" />
                Generate
              </Button>
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="mr-2 size-4" />
                New Region
              </Button>
            </div>
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Terrain</TableHead>
              <TableHead className="hidden sm:table-cell">Settlements</TableHead>
              <TableHead className="hidden md:table-cell">Features</TableHead>
              <TableHead className="hidden lg:table-cell">Dangers</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {regions.map((region) => (
              <TableRow key={region.id} className="cursor-pointer" onClick={() => openEdit(region)}>
                <TableCell className="font-medium">
                  <Link
                    to="/realms/regions/$regionId"
                    params={{ regionId: region.id }}
                    className="text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {region.name}
                  </Link>
                </TableCell>
                <TableCell>
                  {region.terrain && (
                    <Badge variant="secondary" className="text-xs">
                      {region.terrain.charAt(0).toUpperCase() + region.terrain.slice(1)}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {(region.settlements ?? []).slice(0, 2).map((s, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{s.split(' (')[0]}</Badge>
                    ))}
                    {(region.settlements ?? []).length > 2 && (
                      <span className="text-xs text-muted-foreground">+{region.settlements.length - 2}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <span className="text-sm text-muted-foreground">{(region.features ?? []).length}</span>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <span className="text-sm text-muted-foreground">{(region.dangers ?? []).length}</span>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="size-7" onClick={(e) => { e.stopPropagation(); openEdit(region) }}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="size-7" onClick={(e) => { e.stopPropagation(); setDeleteTarget(region.id) }}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* ── Create Dialog ──────────────────────────── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Region</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="create-name">Name</Label>
              <Input id="create-name" value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="The Whispering Woods" />
            </div>
            <div>
              <Label htmlFor="create-terrain">Terrain</Label>
              <Select value={createTerrain} onValueChange={setCreateTerrain}>
                <SelectTrigger id="create-terrain"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TERRAIN_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="create-description">Description</Label>
              <Textarea id="create-description" value={createDescription} onChange={(e) => setCreateDescription(e.target.value)} placeholder="Dense forest with ancient trees..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!createName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Sheet ─────────────────────────────── */}
      <Sheet open={!!editingRegion} onOpenChange={(open) => !open && setEditingRegion(null)}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col h-full">
          {editingRegion && (
            <>
              <SheetHeader>
                <SheetTitle>Edit Region</SheetTitle>
              </SheetHeader>
              <ScrollArea className="flex-1 min-h-0">
                <div className="space-y-4 px-4 py-4">
                  <div>
                    <Label htmlFor="edit-name">Name</Label>
                    <Input id="edit-name" value={editingRegion.name} onChange={(e) => setEditingRegion({ ...editingRegion, name: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="edit-terrain">Terrain</Label>
                    <Select value={editingRegion.terrain || 'plains'} onValueChange={(v) => setEditingRegion({ ...editingRegion, terrain: v })}>
                      <SelectTrigger id="edit-terrain"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TERRAIN_OPTIONS.map((t) => (
                          <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="edit-description">Description</Label>
                    <Textarea id="edit-description" value={editingRegion.description} onChange={(e) => setEditingRegion({ ...editingRegion, description: e.target.value })} rows={3} />
                  </div>
                  <div>
                    <Label>Features</Label>
                    <TagInput tags={editingRegion.features ?? []} onChange={(features) => setEditingRegion({ ...editingRegion, features })} placeholder="Add feature..." />
                  </div>
                  <div>
                    <Label>Dangers</Label>
                    <TagInput tags={editingRegion.dangers ?? []} onChange={(dangers) => setEditingRegion({ ...editingRegion, dangers })} placeholder="Add danger..." />
                  </div>
                  <div>
                    <Label>Settlements</Label>
                    <TagInput tags={editingRegion.settlements ?? []} onChange={(settlements) => setEditingRegion({ ...editingRegion, settlements })} placeholder="Add settlement..." />
                  </div>
                  <div>
                    <Label>Resources</Label>
                    <TagInput tags={editingRegion.resources ?? []} onChange={(resources) => setEditingRegion({ ...editingRegion, resources })} placeholder="Add resource..." />
                  </div>
                </div>
              </ScrollArea>
              <div className="flex shrink-0 gap-2 border-t px-4 pt-4 pb-4">
                <Button onClick={handleSaveEdit} disabled={!editingRegion.name.trim()} className="flex-1">
                  <Save className="mr-2 size-4" />Save
                </Button>
                <Button variant="destructive" onClick={() => { setDeleteTarget(editingRegion.id); setEditingRegion(null) }}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Generate Drawer ────────────────────────── */}
      <Sheet open={showGenerate} onOpenChange={(open) => { if (!open) { setShowGenerate(false); setGeneratedRegions([]) } }}>
        <SheetContent className="w-full sm:max-w-2xl flex flex-col h-full">
          <SheetHeader>
            <SheetTitle>Generate Regions</SheetTitle>
          </SheetHeader>

          {/* Controls */}
          <div className="flex items-center gap-3 px-4 py-3 border-b">
            <Label htmlFor="gen-count" className="shrink-0">Count</Label>
            <select
              id="gen-count"
              value={generateCount}
              onChange={(e) => setGenerateCount(Number(e.target.value))}
              className="h-8 w-16 rounded border bg-background px-2 text-sm"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <Button onClick={handleGenerate} disabled={isGenerating || !systemConfig} size="sm">
              <Dices className="mr-2 size-4" />
              {isGenerating ? 'Rolling...' : generatedRegions.length > 0 ? 'Re-generate' : 'Generate'}
            </Button>
          </div>

          {/* Generated regions */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-4 px-4 py-4">
              {generatedRegions.length === 0 && !isGenerating && (
                <p className="text-sm text-muted-foreground text-center py-8">Pick a count and hit Generate.</p>
              )}
              {generatedRegions.map((region, idx) => (
                <Card key={region.id}>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Input
                        className="flex-1 font-medium"
                        value={region.name}
                        onChange={(e) => handleUpdateGenerated(idx, { name: e.target.value })}
                      />
                      <Select
                        value={region.terrain}
                        onValueChange={(v) => handleUpdateGenerated(idx, { terrain: v })}
                      >
                        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TERRAIN_OPTIONS.map((t) => (
                            <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => handleRerollOne(idx)} title="Re-roll">
                        <RefreshCw className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => handleRemoveGenerated(idx)} title="Remove">
                        <X className="size-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">{region.description}</p>
                    <div className="space-y-2">
                      <div>
                        <span className="text-xs font-semibold uppercase text-muted-foreground">Features</span>
                        <TagInput tags={region.features} onChange={(features) => handleUpdateGenerated(idx, { features })} placeholder="Add feature..." />
                      </div>
                      <div>
                        <span className="text-xs font-semibold uppercase text-muted-foreground">Dangers</span>
                        <TagInput tags={region.dangers} onChange={(dangers) => handleUpdateGenerated(idx, { dangers })} placeholder="Add danger..." />
                      </div>
                      <div>
                        <span className="text-xs font-semibold uppercase text-muted-foreground">Settlements</span>
                        <TagInput tags={region.settlements} onChange={(settlements) => handleUpdateGenerated(idx, { settlements })} placeholder="Add settlement..." />
                      </div>
                      <div>
                        <span className="text-xs font-semibold uppercase text-muted-foreground">Resources</span>
                        <TagInput tags={region.resources} onChange={(resources) => handleUpdateGenerated(idx, { resources })} placeholder="Add resource..." />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>

          {/* Footer */}
          {generatedRegions.length > 0 && (
            <div className="flex shrink-0 justify-end gap-2 border-t px-4 pt-4 pb-4">
              <Button variant="outline" onClick={() => { setShowGenerate(false); setGeneratedRegions([]) }}>Cancel</Button>
              <Button onClick={handleSaveAllGenerated}>
                <Save className="mr-2 size-4" />
                Save All ({generatedRegions.length})
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Delete Confirm ─────────────────────────── */}
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
