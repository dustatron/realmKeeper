import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useUIStore } from '~/ui/stores/uiStore'
import { useRegions } from '~/ui/hooks/useRegions'
import { useActiveRealm } from '~/ui/hooks/useActiveRealm'
import { useSystemConfig } from '~/ui/hooks/useSystemConfigs'
import { useContainer } from '~/ui/hooks/useContainer'
import { executeCreateRegion } from '@application/use-cases/CreateRegion'
import { executeDeleteRegion } from '@application/use-cases/DeleteRegion'
import { executeGenerateRegion, type GenerateRegionResult } from '@application/use-cases/GenerateRegion'
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
import { Map, Plus, Dices, Trash2, Pencil, RefreshCw, Save, X, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Region } from '@domain/entities/Region'
import type { POI } from '@domain/entities/POI'
import { TERRAIN_OPTIONS } from '@shared/constants'

export const Route = createFileRoute('/_app/realms/locations/regions')({
  component: RegionsPage,
})

const AUTO_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#8b5cf6', '#ec4899', '#78716c', '#166534',
  '#1e293b', '#d97706',
]

function nextAutoColor(existingRegions: Region[]): string {
  const usedColors = new Set(existingRegions.map((r) => r.color).filter(Boolean))
  return AUTO_COLORS.find((c) => !usedColors.has(c)) ?? AUTO_COLORS[existingRegions.length % AUTO_COLORS.length]
}

function RegionsPage() {
  const activeRealmId = useUIStore((s) => s.activeRealmId)
  const realm = useActiveRealm()
  const systemConfig = useSystemConfig(realm?.systemId ?? null)
  const regions = useRegions(activeRealmId)
  const container = useContainer()
  const navigate = useNavigate()

  // Create dialog
  const [showCreate, setShowCreate] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createDescription, setCreateDescription] = useState('')
  const [createTerrain, setCreateTerrain] = useState<string>('plains')

  // Generate wizard
  const [showGenerate, setShowGenerate] = useState(false)
  const [generateCount, setGenerateCount] = useState(3)
  const [isGenerating, setIsGenerating] = useState(false)
  const [wizardStep, setWizardStep] = useState<1 | 2>(1)
  const [bundles, setBundles] = useState<GenerateRegionResult[]>([])

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
      { worldId: activeRealmId, name: createName.trim(), description: createDescription.trim(), terrain: createTerrain, color: nextAutoColor(regions) },
      { regionRepo: container.regionRepo }
    )
    resetCreateForm()
    setShowCreate(false)
  }

  // ── Edit (navigate to detail page) ─────────────────
  const openEdit = (region: Region) => {
    navigate({ to: '/realms/regions/$regionId', params: { regionId: region.id }, search: { edit: true } })
  }

  // ── Delete ──────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return
    await executeDeleteRegion(deleteTarget, { regionRepo: container.regionRepo })
    setDeleteTarget(null)
  }

  // ── Generate ────────────────────────────────────────
  const handleGenerate = async () => {
    if (!activeRealmId || !systemConfig) return
    setIsGenerating(true)
    try {
      const results: GenerateRegionResult[] = []
      for (let i = 0; i < generateCount; i++) {
        const result = await executeGenerateRegion(
          { worldId: activeRealmId, systemConfig },
          { tableRepo: container.tableRepo }
        )
        results.push(result)
      }
      setBundles(results)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRerollOne = async (index: number) => {
    if (!activeRealmId || !systemConfig) return
    const result = await executeGenerateRegion(
      { worldId: activeRealmId, systemConfig },
      { tableRepo: container.tableRepo }
    )
    setBundles((prev) => prev.map((b, i) => (i === index ? result : b)))
  }

  const handleRemoveBundle = (index: number) => {
    setBundles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUpdateRegion = (index: number, updates: Partial<Region>) => {
    setBundles((prev) => prev.map((b, i) => (i === index ? { ...b, region: { ...b.region, ...updates } } : b)))
  }

  const handleUpdatePoi = (bundleIdx: number, poiIdx: number, updates: Partial<POI>) => {
    setBundles((prev) => prev.map((b, bi) => {
      if (bi !== bundleIdx) return b
      const pois = b.pois.map((p, pi) => (pi === poiIdx ? { ...p, ...updates } : p))
      // Sync region string arrays from POI names
      const settlements = pois.filter((p) => p.type === 'settlement').map((p) => p.subtypeLabel ? `${p.name} (${p.subtypeLabel})` : p.name)
      const features = pois.filter((p) => p.type === 'landmark' || p.type === 'natural').map((p) => p.name)
      const dangers = pois.filter((p) => p.type === 'camp' || p.type === 'dungeon').map((p) => p.name)
      return { ...b, pois, region: { ...b.region, settlements, features, dangers } }
    }))
  }

  const handleRemovePoi = (bundleIdx: number, poiIdx: number) => {
    setBundles((prev) => prev.map((b, bi) => {
      if (bi !== bundleIdx) return b
      const pois = b.pois.filter((_, pi) => pi !== poiIdx)
      const settlements = pois.filter((p) => p.type === 'settlement').map((p) => p.subtypeLabel ? `${p.name} (${p.subtypeLabel})` : p.name)
      const features = pois.filter((p) => p.type === 'landmark' || p.type === 'natural').map((p) => p.name)
      const dangers = pois.filter((p) => p.type === 'camp' || p.type === 'dungeon').map((p) => p.name)
      return { ...b, pois, region: { ...b.region, settlements, features, dangers } }
    }))
  }

  const handleSaveAllGenerated = async () => {
    // Collect existing + already-saved colors to avoid duplication
    const allRegionsSoFar = [...regions]
    for (const bundle of bundles) {
      const color = nextAutoColor(allRegionsSoFar)
      const region = { ...bundle.region, color }
      await container.regionRepo.create(region)
      allRegionsSoFar.push(region)
      for (const poi of bundle.pois) {
        await container.poiRepo.create(poi)
      }
    }
    setBundles([])
    setWizardStep(1)
    setShowGenerate(false)
  }

  const handleOpenGenerate = () => {
    setBundles([])
    setWizardStep(1)
    setShowGenerate(true)
  }

  // ── Guards ──────────────────────────────────────────
  if (!activeRealmId) {
    return <EmptyState icon={Map} title="Select a realm first" />
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={handleOpenGenerate} disabled={!systemConfig}>
          <Dices className="mr-2 size-4" />
          Generate
        </Button>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 size-4" />
          New Region
        </Button>
      </div>

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
              <TableHead className="hidden xl:table-cell">People</TableHead>
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
                <TableCell className="hidden xl:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {(region.people ?? []).slice(0, 2).map((p, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{p}</Badge>
                    ))}
                    {(region.people ?? []).length > 2 && (
                      <span className="text-xs text-muted-foreground">+{region.people.length - 2}</span>
                    )}
                  </div>
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

      {/* ── Generate Wizard ────────────────────────── */}
      <Sheet open={showGenerate} onOpenChange={(open) => { if (!open) { setShowGenerate(false); setBundles([]); setWizardStep(1) } }}>
        <SheetContent className="w-full sm:max-w-2xl flex flex-col h-full">
          <SheetHeader>
            <SheetTitle>Generate Regions — Step {wizardStep} of 2</SheetTitle>
          </SheetHeader>

          {wizardStep === 1 && (
            <>
              {/* Step 1: Count + terrain overview */}
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
                  {isGenerating ? 'Rolling...' : bundles.length > 0 ? 'Re-generate' : 'Generate'}
                </Button>
              </div>

              <ScrollArea className="flex-1 min-h-0">
                <div className="space-y-2 px-4 py-4">
                  {bundles.length === 0 && !isGenerating && (
                    <p className="text-sm text-muted-foreground text-center py-8">Pick a count and hit Generate.</p>
                  )}
                  {bundles.map((bundle, idx) => (
                    <div key={bundle.region.id} className="flex items-center gap-2 rounded-md border p-3">
                      <Input
                        className="flex-1 h-8 font-medium text-sm"
                        value={bundle.region.name}
                        onChange={(e) => handleUpdateRegion(idx, { name: e.target.value })}
                      />
                      <Select
                        value={bundle.region.terrain}
                        onValueChange={(v) => handleUpdateRegion(idx, { terrain: v })}
                      >
                        <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TERRAIN_OPTIONS.map((t) => (
                            <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-xs text-muted-foreground">{bundle.pois.length} POIs</span>
                      <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={() => handleRerollOne(idx)} title="Re-roll">
                        <RefreshCw className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={() => handleRemoveBundle(idx)} title="Remove">
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {bundles.length > 0 && (
                <div className="flex shrink-0 justify-end gap-2 border-t px-4 pt-4 pb-4">
                  <Button variant="outline" onClick={() => { setShowGenerate(false); setBundles([]); setWizardStep(1) }}>Cancel</Button>
                  <Button onClick={() => setWizardStep(2)}>
                    Next <ChevronRight className="ml-1 size-4" />
                  </Button>
                </div>
              )}
            </>
          )}

          {wizardStep === 2 && (
            <>
              {/* Step 2: Full edit with POIs */}
              <ScrollArea className="flex-1 min-h-0">
                <div className="space-y-4 px-4 py-4">
                  {bundles.map((bundle, idx) => (
                    <Card key={bundle.region.id}>
                      <CardContent className="pt-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <Input
                            className="flex-1 font-medium"
                            value={bundle.region.name}
                            onChange={(e) => handleUpdateRegion(idx, { name: e.target.value })}
                          />
                          <Select
                            value={bundle.region.terrain}
                            onValueChange={(v) => handleUpdateRegion(idx, { terrain: v })}
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
                          <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => handleRemoveBundle(idx)} title="Remove">
                            <X className="size-4" />
                          </Button>
                        </div>
                        <Textarea
                          className="text-sm"
                          value={bundle.region.description}
                          onChange={(e) => handleUpdateRegion(idx, { description: e.target.value })}
                          rows={2}
                        />

                        {/* POIs section */}
                        <div>
                          <span className="text-xs font-semibold uppercase text-muted-foreground">Points of Interest</span>
                          <div className="mt-1 space-y-1">
                            {bundle.pois.map((poi, poiIdx) => (
                              <div key={poi.id} className="flex items-center gap-2 rounded border px-2 py-1">
                                <Badge variant="secondary" className="text-[10px] shrink-0">{poi.type}</Badge>
                                <Input
                                  className="h-7 flex-1 text-sm"
                                  value={poi.name}
                                  onChange={(e) => handleUpdatePoi(idx, poiIdx, { name: e.target.value })}
                                />
                                <Button variant="ghost" size="icon" className="size-6 shrink-0" onClick={() => handleRemovePoi(idx, poiIdx)}>
                                  <X className="size-3" />
                                </Button>
                              </div>
                            ))}
                            {bundle.pois.length === 0 && (
                              <p className="text-xs text-muted-foreground italic">No POIs</p>
                            )}
                          </div>
                        </div>

                        {/* Resources (non-POI) */}
                        <div>
                          <span className="text-xs font-semibold uppercase text-muted-foreground">Resources</span>
                          <TagInput tags={bundle.region.resources} onChange={(resources) => handleUpdateRegion(idx, { resources })} placeholder="Add resource..." />
                        </div>

                        {/* People */}
                        <div>
                          <span className="text-xs font-semibold uppercase text-muted-foreground">People</span>
                          <TagInput tags={bundle.region.people ?? []} onChange={(people) => handleUpdateRegion(idx, { people })} placeholder="Add archetype..." />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>

              <div className="flex shrink-0 justify-between gap-2 border-t px-4 pt-4 pb-4">
                <Button variant="outline" onClick={() => setWizardStep(1)}>
                  <ChevronLeft className="mr-1 size-4" /> Back
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { setShowGenerate(false); setBundles([]); setWizardStep(1) }}>Cancel</Button>
                  <Button onClick={handleSaveAllGenerated}>
                    <Save className="mr-2 size-4" />
                    Save All ({bundles.length})
                  </Button>
                </div>
              </div>
            </>
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
