import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useUIStore } from '~/ui/stores/uiStore'
import { useFactions, usePartyFaction } from '~/ui/hooks/useFactions'
import { useRelationships } from '~/ui/hooks/useRelationships'
import { useActiveRealm } from '~/ui/hooks/useActiveRealm'
import { useSystemConfig } from '~/ui/hooks/useSystemConfigs'
import { useContainer } from '~/ui/hooks/useContainer'
import { executeDeleteFaction } from '@application/use-cases/DeleteFaction'
import { executeUpdateRelationship } from '@application/use-cases/UpdateRelationship'
import { executeGenerateFaction } from '@application/use-cases/GenerateFaction'
import { executeInitializeRelationships } from '@application/use-cases/InitializeRelationships'
import { PageHeader } from '~/components/shared/PageHeader'
import { EmptyState } from '~/components/shared/EmptyState'
import { ConfirmDialog } from '~/components/shared/ConfirmDialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '~/components/ui/dialog'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '~/components/ui/table'
import { Button } from '~/components/ui/button'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { Badge } from '~/components/ui/badge'
import { Swords, Plus, Crown, Dices, GripVertical, Pencil, Users } from 'lucide-react'
import { FACTION_STATUSES } from '@shared/constants'
import { deriveStatus } from '@domain/value-objects/RelationshipScore'
import type { Faction } from '@domain/entities/Faction'

export const Route = createFileRoute('/_app/realms/factions')({
  component: FactionsPage,
})

function getStatusColor(status: (typeof FACTION_STATUSES)[number]): string {
  switch (status) {
    case 'active':
      return 'bg-green-600'
    case 'dormant':
      return 'bg-yellow-600'
    case 'disbanded':
      return 'bg-orange-600'
    case 'destroyed':
      return 'bg-red-600'
    default:
      return 'bg-gray-600'
  }
}

function SortableRow({ faction, onClick, onEditClick }: {
  faction: Faction
  onClick: () => void
  onEditClick: (e: React.MouseEvent) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: faction.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={`cursor-pointer hover:bg-muted/50 ${isDragging ? 'opacity-50 bg-muted' : ''}`}
      onClick={onClick}
    >
      <TableCell className="w-8 px-1">
        <button
          className="cursor-grab touch-none p-1 text-muted-foreground hover:text-foreground active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
      </TableCell>
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          {faction.isParty && <Crown className="size-4 text-primary" />}
          <div className="flex flex-col">
            <span>{faction.name}</span>
            {faction.description && (
              <span className="text-xs font-normal text-muted-foreground">{faction.description}</span>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>{faction.type || '—'}</TableCell>
      <TableCell>
        {faction.traits.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {faction.traits.map((trait) => (
              <Badge key={trait} variant="secondary" className="text-xs">
                {trait}
              </Badge>
            ))}
          </div>
        ) : '—'}
      </TableCell>
      <TableCell>
        <Badge className={getStatusColor(faction.status)}>
          {faction.status}
        </Badge>
      </TableCell>
      <TableCell className="text-center">{faction.advantages.length}</TableCell>
      <TableCell className="text-center">{faction.obstacles.length}</TableCell>
      <TableCell className="text-center">
        {faction.agendaGoals.filter((g) => g.completed).length}/{faction.agendaGoals.length}
      </TableCell>
      <TableCell className="text-center">{faction.agentNpcIds.length}</TableCell>
      <TableCell className="w-8">
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={onEditClick}
        >
          <Pencil className="size-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  )
}

function StaticRow({ faction, onClick, onEditClick }: {
  faction: Faction
  onClick: () => void
  onEditClick: (e: React.MouseEvent) => void
}) {
  return (
    <TableRow
      className="cursor-pointer hover:bg-muted/50 border-primary/30"
      onClick={onClick}
    >
      <TableCell className="w-8 px-1">
        <div className="p-1 text-muted-foreground/30">
          <GripVertical className="size-4" />
        </div>
      </TableCell>
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          <Crown className="size-4 text-primary" />
          <div className="flex flex-col">
            <span>{faction.name}</span>
            {faction.description && (
              <span className="text-xs font-normal text-muted-foreground">{faction.description}</span>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>{faction.type || '—'}</TableCell>
      <TableCell>
        {faction.traits.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {faction.traits.map((trait) => (
              <Badge key={trait} variant="secondary" className="text-xs">
                {trait}
              </Badge>
            ))}
          </div>
        ) : '—'}
      </TableCell>
      <TableCell>
        <Badge className={getStatusColor(faction.status)}>
          {faction.status}
        </Badge>
      </TableCell>
      <TableCell className="text-center">{faction.advantages.length}</TableCell>
      <TableCell className="text-center">{faction.obstacles.length}</TableCell>
      <TableCell className="text-center">
        {faction.agendaGoals.filter((g) => g.completed).length}/{faction.agendaGoals.length}
      </TableCell>
      <TableCell className="text-center">{faction.agentNpcIds.length}</TableCell>
      <TableCell className="w-8">
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={onEditClick}
        >
          <Pencil className="size-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  )
}

function FactionsPage() {
  const activeRealmId = useUIStore((s) => s.activeRealmId)
  const factions = useFactions(activeRealmId)
  const partyFaction = usePartyFaction(activeRealmId)
  const realm = useActiveRealm()
  const systemConfig = useSystemConfig(realm?.systemId ?? null)
  const container = useContainer()
  const navigate = useNavigate()

  const factionIds = factions.map((f) => f.id)
  const relationships = useRelationships(factionIds)

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  // Relationship editing
  const [relationshipDialog, setRelationshipDialog] = useState<{
    factionId: string
    targetId: string
    currentScore: number
  } | null>(null)
  const [relationshipReason, setRelationshipReason] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const nonPartyFactions = factions.filter((f) => !f.isParty)

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = nonPartyFactions.findIndex((f) => f.id === active.id)
    const newIndex = nonPartyFactions.findIndex((f) => f.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(nonPartyFactions, oldIndex, newIndex)

    // Persist new sort orders
    for (let i = 0; i < reordered.length; i++) {
      const faction = reordered[i]
      if (faction.sortOrder !== i + 1) {
        await container.factionRepo.update({ ...faction, sortOrder: i + 1 })
      }
    }
  }

  const handleGenerateFaction = async () => {
    if (!activeRealmId || !systemConfig) return
    setIsGenerating(true)
    try {
      const result = await executeGenerateFaction(
        { worldId: activeRealmId, systemConfig },
        { tableRepo: container.tableRepo }
      )

      await container.factionRepo.create(result.faction)

      for (const npc of result.agentNpcs) {
        await container.npcRepo.create(npc)
      }

      await executeInitializeRelationships(result.faction.id, activeRealmId, {
        factionRepo: container.factionRepo,
        relationshipRepo: container.factionRelationshipRepo,
      })

      navigate({ to: '/realms/factions/$factionId', params: { factionId: result.faction.id } })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await executeDeleteFaction(deleteTarget, { factionRepo: container.factionRepo })
    setDeleteTarget(null)
  }

  const handleAdjustRelationship = async (delta: number) => {
    if (!relationshipDialog || !relationshipReason.trim()) return

    await executeUpdateRelationship(
      relationshipDialog.factionId,
      relationshipDialog.targetId,
      delta,
      relationshipReason.trim(),
      { relationshipRepo: container.factionRelationshipRepo }
    )

    setRelationshipDialog(null)
    setRelationshipReason('')
  }

  const getRelationshipScore = (factionId: string, targetId: string): number => {
    const rel = relationships.find(
      (r) => r.factionId === factionId && r.targetId === targetId
    )
    return rel?.score ?? 0
  }

  const getScoreCellStyle = (score: number): string => {
    if (score <= -4) return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
    if (score === -3) return 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-400'
    if (score === -2) return 'bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400'
    if (score === -1) return 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
    if (score === 0) return 'bg-gray-50 text-gray-500 dark:bg-gray-800/40 dark:text-gray-400'
    if (score === 1) return 'bg-lime-50 text-lime-700 dark:bg-lime-950/60 dark:text-lime-400'
    if (score === 2) return 'bg-green-50 text-green-700 dark:bg-green-950/60 dark:text-green-400'
    if (score === 3) return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
    if (score >= 4) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
    return 'bg-gray-50 text-gray-500'
  }

  if (!activeRealmId) {
    return (
      <div>
        <EmptyState icon={Swords} title="Select a realm first" />
      </div>
    )
  }

  if (factions.length === 0) {
    return (
      <div>
        <EmptyState
          icon={Swords}
          title="No factions yet"
          action={
            <div className="flex gap-2">
              <Button onClick={handleGenerateFaction} variant="outline" disabled={isGenerating}>
                <Dices className="mr-2 size-4" />
                {isGenerating ? 'Generating...' : 'Generate Faction'}
              </Button>
              <Link to="/realms/factions/$factionId/edit" params={{ factionId: 'new' }}>
                <Button>
                  <Plus className="mr-2 size-4" />
                  New Faction
                </Button>
              </Link>
            </div>
          }
        />
      </div>
    )
  }

  return (
    <div className="-mt-3">
      <PageHeader
        actions={
          <div className="flex gap-2">
            <Button onClick={handleGenerateFaction} variant="outline" disabled={isGenerating}>
              <Dices className="mr-2 size-4" />
              {isGenerating ? 'Generating...' : 'Generate Faction'}
            </Button>
            <Link to="/realms/factions/$factionId/edit" params={{ factionId: 'new' }}>
              <Button>
                <Plus className="mr-2 size-4" />
                New Faction
              </Button>
            </Link>
          </div>
        }
      />

      <Tabs defaultValue="list" className="w-full">
        <TabsList>
          <TabsTrigger value="list">Factions</TabsTrigger>
          <TabsTrigger value="matrix">Relationship Matrix</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Traits</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Adv</TableHead>
                <TableHead className="text-center">Obs</TableHead>
                <TableHead className="text-center">Goals</TableHead>
                <TableHead className="text-center"><Users className="size-3.5 mx-auto" /></TableHead>
                <TableHead className="w-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partyFaction && (
                <StaticRow
                  faction={partyFaction}
                  onClick={() => navigate({ to: '/realms/factions/$factionId', params: { factionId: partyFaction.id } })}
                  onEditClick={(e) => {
                    e.stopPropagation()
                    navigate({ to: '/realms/factions/$factionId/edit', params: { factionId: partyFaction.id } })
                  }}
                />
              )}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={nonPartyFactions.map((f) => f.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {nonPartyFactions.map((faction) => (
                    <SortableRow
                      key={faction.id}
                      faction={faction}
                      onClick={() => navigate({ to: '/realms/factions/$factionId', params: { factionId: faction.id } })}
                      onEditClick={(e) => {
                        e.stopPropagation()
                        navigate({ to: '/realms/factions/$factionId/edit', params: { factionId: faction.id } })
                      }}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="matrix">
          {factions.length < 2 ? (
            <div className="py-8 text-center text-muted-foreground">
              Create at least two factions to view the relationship matrix.
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Click any cell to adjust the relationship score between two factions. Rows show how the row faction feels toward the column faction.
              </p>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="border-r border-b p-2 text-left font-medium">Faction</th>
                      {factions.map((f) => (
                        <th
                          key={f.id}
                          className="border-r border-b p-2 text-center font-medium"
                          title={f.name}
                        >
                          <div className="max-w-[100px] truncate">{f.name}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {factions.map((faction) => (
                      <tr key={faction.id}>
                        <th
                          className="border-r border-b p-2 text-left font-medium bg-muted/30"
                          title={faction.name}
                        >
                          <div className="max-w-[120px] truncate">{faction.name}</div>
                        </th>
                        {factions.map((target) => {
                          if (faction.id === target.id) {
                            return (
                              <td key={target.id} className="border-r border-b p-2 text-center bg-muted/20 text-muted-foreground">
                                --
                              </td>
                            )
                          }

                          const score = getRelationshipScore(faction.id, target.id)
                          const cellStyle = getScoreCellStyle(score)
                          const label = deriveStatus(score)

                          return (
                            <td
                              key={target.id}
                              className={`cursor-pointer border-r border-b p-2 text-center transition-opacity hover:opacity-70 ${cellStyle}`}
                              onClick={() =>
                                setRelationshipDialog({
                                  factionId: faction.id,
                                  targetId: target.id,
                                  currentScore: score,
                                })
                              }
                              title={`${faction.name} -> ${target.name}: ${label} (${score > 0 ? '+' : ''}${score})`}
                            >
                              <div className="font-semibold">{score > 0 ? `+${score}` : score}</div>
                              <div className="text-[10px] opacity-75 leading-tight">{label}</div>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="font-medium">Scale:</span>
                <span className="flex items-center gap-1"><span className="inline-block size-3 rounded bg-red-100 dark:bg-red-950 border" /> -6 Blood Feud</span>
                <span className="flex items-center gap-1"><span className="inline-block size-3 rounded bg-orange-50 dark:bg-orange-950/60 border" /> -2 Distrust</span>
                <span className="flex items-center gap-1"><span className="inline-block size-3 rounded bg-gray-50 dark:bg-gray-800/40 border" /> 0 Neutral</span>
                <span className="flex items-center gap-1"><span className="inline-block size-3 rounded bg-green-50 dark:bg-green-950/60 border" /> +2 Respect</span>
                <span className="flex items-center gap-1"><span className="inline-block size-3 rounded bg-emerald-100 dark:bg-emerald-950 border" /> +6 Unbreakable</span>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog
        open={!!relationshipDialog}
        onOpenChange={(open) => {
          if (!open) {
            setRelationshipDialog(null)
            setRelationshipReason('')
          }
        }}
      >
        <DialogContent>
          {relationshipDialog && (
            <>
              <DialogHeader>
                <DialogTitle>Adjust Relationship</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="rounded-md bg-muted p-4">
                  <div className="text-sm font-medium">Current Score:</div>
                  <div className="text-2xl font-bold">
                    {relationshipDialog.currentScore > 0 ? '+' : ''}
                    {relationshipDialog.currentScore}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {deriveStatus(relationshipDialog.currentScore)}
                  </div>
                </div>
                <div>
                  <Label htmlFor="rel-reason">Reason for change</Label>
                  <Textarea
                    id="rel-reason"
                    value={relationshipReason}
                    onChange={(e) => setRelationshipReason(e.target.value)}
                    placeholder="e.g., Conflict over territory"
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={() => handleAdjustRelationship(-1)}
                  disabled={!relationshipReason.trim() || relationshipDialog.currentScore <= -6}
                >
                  -1
                </Button>
                <Button
                  onClick={() => handleAdjustRelationship(1)}
                  disabled={!relationshipReason.trim() || relationshipDialog.currentScore >= 6}
                >
                  +1
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Faction"
        description="Are you sure you want to delete this faction? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
