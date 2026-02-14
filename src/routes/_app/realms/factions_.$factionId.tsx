import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useUIStore } from '~/ui/stores/uiStore'
import { useFaction, useFactions } from '~/ui/hooks/useFactions'
import { useNPCsByFaction } from '~/ui/hooks/useNPCs'
import { useRegions } from '~/ui/hooks/useRegions'
import { useRealmPOIs } from '~/ui/hooks/usePOIs'
import { useRelationships } from '~/ui/hooks/useRelationships'
import { useActiveRealm } from '~/ui/hooks/useActiveRealm'
import { useSystemConfig } from '~/ui/hooks/useSystemConfigs'
import { useContainer } from '~/ui/hooks/useContainer'
import { executeUpdateFaction } from '@application/use-cases/UpdateFaction'
import { executeDeleteFaction } from '@application/use-cases/DeleteFaction'
import { executeGenerateNPC } from '@application/use-cases/GenerateNPC'
import { executeCreateFactionPresence } from '@application/use-cases/CreateFactionPresence'
import { executeDeleteFactionPresence } from '@application/use-cases/DeleteFactionPresence'
import { PageHeader } from '~/components/shared/PageHeader'
import { ConfirmDialog } from '~/components/shared/ConfirmDialog'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '~/components/ui/dialog'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import { ArrowLeft, Trash2, Pencil, Crown, CheckCircle2, Circle, Dices, Users, Handshake, ChevronUp, ChevronDown, MapPin } from 'lucide-react'
import { ProgressClock } from '~/components/shared/ProgressClock'
import { FACTION_STATUSES, FACTION_PRESENCE_TYPES, type FactionPresenceType } from '@shared/constants'
import { deriveStatus } from '@domain/value-objects/RelationshipScore'
import { db } from '@infrastructure/dexie/db'

export const Route = createFileRoute('/_app/realms/factions_/$factionId')({
  component: FactionDetailPage,
})

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-600',
  dormant: 'bg-yellow-600',
  disbanded: 'bg-orange-600',
  destroyed: 'bg-red-600',
}

function FactionDetailPage() {
  const { factionId } = Route.useParams()
  const activeRealmId = useUIStore((s) => s.activeRealmId)
  const realm = useActiveRealm()
  const systemConfig = useSystemConfig(realm?.systemId ?? null)
  const container = useContainer()
  const faction = useFaction(factionId)
  const agentNpcs = useNPCsByFaction(factionId)
  const allFactions = useFactions(activeRealmId)
  const regions = useRegions(activeRealmId)
  const realmPOIs = useRealmPOIs(activeRealmId)
  const factionRelationships = useRelationships([factionId])

  const [showDelete, setShowDelete] = useState(false)
  const [isAddingAgent, setIsAddingAgent] = useState(false)
  const [showAddPresence, setShowAddPresence] = useState(false)
  const [presenceForm, setPresenceForm] = useState({
    poiId: '',
    type: 'controls' as FactionPresenceType,
    notes: '',
  })

  const factionPresences = useLiveQuery(
    async () => {
      if (!factionId) return []
      return await db.factionPresences.where('factionId').equals(factionId).toArray()
    },
    [factionId]
  ) ?? []

  const handleDelete = async () => {
    await executeDeleteFaction(factionId, { factionRepo: container.factionRepo })
    window.history.back()
  }

  const handleToggleGoal = async (goalId: string) => {
    if (!faction) return
    const updatedGoals = faction.agendaGoals.map((g) =>
      g.id === goalId ? { ...g, completed: !g.completed } : g
    )
    await executeUpdateFaction(
      { ...faction, agendaGoals: updatedGoals },
      { factionRepo: container.factionRepo }
    )
  }

  const handleClockChange = async (goalId: string, newProgress: number) => {
    if (!faction) return
    const updatedGoals = faction.agendaGoals.map((g) => {
      if (g.id !== goalId) return g
      const segments = g.segments ?? 4
      const clamped = Math.max(0, Math.min(segments, newProgress))
      return { ...g, progress: clamped, completed: clamped >= segments }
    })
    await executeUpdateFaction(
      { ...faction, agendaGoals: updatedGoals },
      { factionRepo: container.factionRepo }
    )
  }

  const handleAddAgent = async () => {
    if (!faction || !activeRealmId || !systemConfig) return
    setIsAddingAgent(true)
    try {
      const npc = await executeGenerateNPC(
        { realmId: activeRealmId, systemConfig, factionId: faction.id },
        { tableRepo: container.tableRepo }
      )
      await container.npcRepo.create(npc)
      await executeUpdateFaction(
        { ...faction, agentNpcIds: [...faction.agentNpcIds, npc.id] },
        { factionRepo: container.factionRepo }
      )
    } finally {
      setIsAddingAgent(false)
    }
  }

  const handleAddPresence = async () => {
    if (!presenceForm.poiId) return
    await executeCreateFactionPresence(
      {
        factionId,
        poiId: presenceForm.poiId,
        type: presenceForm.type,
        notes: presenceForm.notes,
      },
      { factionPresenceRepo: container.factionPresenceRepo }
    )
    setShowAddPresence(false)
    setPresenceForm({ poiId: '', type: 'controls', notes: '' })
  }

  const handleDeletePresence = async (presenceId: string) => {
    await executeDeleteFactionPresence(presenceId, { factionPresenceRepo: container.factionPresenceRepo })
  }

  if (faction === undefined) {
    return <div className="py-8 text-center text-muted-foreground">Loading...</div>
  }

  if (faction === null) {
    return <div className="py-8 text-center text-muted-foreground">Faction not found.</div>
  }

  const f = faction
  const immediateGoals = f.agendaGoals.filter((g) => g.timeframe === 'immediate')
  const longTermGoals = f.agendaGoals.filter((g) => g.timeframe === 'long-term')

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            {f.isParty && <Crown className="size-6 text-amber-500" />}
            {f.name}
          </span>
        }
        actionsLeft={
          !f.isParty ? (
            <Button size="sm" variant="destructive" onClick={() => setShowDelete(true)}>
              <Trash2 className="mr-2 size-4" />
              Delete
            </Button>
          ) : undefined
        }
        actions={
          <div className="flex items-center gap-2">
            <Link to="/realms/factions">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 size-4" />
                Back
              </Button>
            </Link>
            <Link to="/realms/factions/$factionId/edit" params={{ factionId }}>
              <Button size="sm">
                <Pencil className="mr-2 size-4" />
                Edit
              </Button>
            </Link>
          </div>
        }
      />

      <div className="space-y-4">
        {/* Overview — one card for identity + resources */}
        <Card>
          <CardContent className="pt-5 space-y-4">
            {/* Top row: Type + Status + Traits inline */}
            <div className="flex flex-wrap items-center gap-2">
              {f.type && <Badge variant="outline" className="text-xs">{f.type}</Badge>}
              <Select
                value={f.status}
                onValueChange={async (v) => {
                  await executeUpdateFaction(
                    { ...f, status: v as typeof f.status },
                    { factionRepo: container.factionRepo }
                  )
                }}
              >
                <SelectTrigger className="w-auto h-7 px-2 border-0 gap-1">
                  <Badge className={STATUS_COLORS[f.status] ?? 'bg-gray-600'}>
                    {f.status.charAt(0).toUpperCase() + f.status.slice(1)}
                  </Badge>
                </SelectTrigger>
                <SelectContent>
                  {FACTION_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {f.traits.map((trait) => (
                <Badge key={trait} variant="secondary">{trait}</Badge>
              ))}
            </div>

            {/* Location row */}
            {(f.regionId || f.headquartersPoiId) && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                {(() => {
                  const region = regions.find((r) => r.id === f.regionId)
                  return region ? (
                    <span className="text-muted-foreground">Region: <span className="text-foreground font-medium">{region.name}</span></span>
                  ) : null
                })()}
                {(() => {
                  const hqPoi = realmPOIs.find((p) => p.id === f.headquartersPoiId)
                  return hqPoi ? (
                    <span className="text-muted-foreground">HQ: <span className="text-foreground font-medium">{hqPoi.name}</span></span>
                  ) : null
                })()}
              </div>
            )}

            {/* Description */}
            {f.description && (
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">{f.description}</p>
            )}

            {/* Advantages + Obstacles side by side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-500 mb-2">Advantages ({(f.advantages ?? []).length})</h4>
                {(f.advantages ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">None</p>
                ) : (
                  <ul className="space-y-1">
                    {f.advantages.map((a) => (
                      <li key={a.id} className="text-sm flex items-center gap-2">
                        <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
                        {a.description}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-red-500 mb-2">Obstacles ({(f.obstacles ?? []).length})</h4>
                {(f.obstacles ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">None</p>
                ) : (
                  <ul className="space-y-1">
                    {f.obstacles.map((o) => (
                      <li key={o.id} className="text-sm flex items-center gap-2">
                        <span className="size-1.5 rounded-full bg-red-500 shrink-0" />
                        {o.description}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Agenda */}
        {f.agendaGoals.length > 0 && (
          <>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Agenda</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Immediate */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-amber-500">
                    Immediate ({immediateGoals.filter((g) => g.completed).length}/{immediateGoals.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-1">
                  {immediateGoals.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No immediate goals.</p>
                  ) : (
                    immediateGoals.map((g, idx) => (
                      <div
                        key={g.id}
                        className="flex items-center gap-2 py-1.5 px-1 rounded cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => handleToggleGoal(g.id)}
                      >
                        <span className="text-xs font-mono text-muted-foreground w-4 shrink-0">{idx + 1}.</span>
                        {g.completed
                          ? <CheckCircle2 className="size-4 text-green-500 shrink-0" />
                          : <Circle className="size-4 text-muted-foreground shrink-0" />}
                        <span className={`text-sm ${g.completed ? 'text-muted-foreground line-through' : ''}`}>
                          {g.description}
                        </span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Long-Term */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-blue-500">
                    Long-Term ({longTermGoals.filter((g) => g.completed).length}/{longTermGoals.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-1">
                  {longTermGoals.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No long-term goals.</p>
                  ) : (
                    longTermGoals.map((g, idx) => {
                      const prog = g.progress ?? 0
                      const segs = g.segments ?? 4
                      return (
                        <div
                          key={g.id}
                          className="flex items-center gap-2 py-2 px-1 rounded"
                        >
                          <span className="text-xs font-mono text-muted-foreground w-4 shrink-0">{idx + 1}.</span>
                          <div className="flex items-center gap-1 shrink-0">
                            <div className="flex flex-col">
                              <button
                                onClick={() => handleClockChange(g.id, prog + 1)}
                                disabled={prog >= segs}
                                className="p-0.5 rounded hover:bg-muted/60 text-muted-foreground hover:text-green-500 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                              >
                                <ChevronUp className="size-4" />
                              </button>
                              <button
                                onClick={() => handleClockChange(g.id, prog - 1)}
                                disabled={prog <= 0}
                                className="p-0.5 rounded hover:bg-muted/60 text-muted-foreground hover:text-red-500 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                              >
                                <ChevronDown className="size-4" />
                              </button>
                            </div>
                            <ProgressClock
                              segments={segs}
                              progress={prog}
                              size={28}
                              className="shrink-0"
                            />
                          </div>
                          <span className={`text-sm ${g.completed ? 'text-muted-foreground line-through' : ''}`}>
                            {g.description}
                          </span>
                        </div>
                      )
                    })
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Relationships + Agents side by side on larger screens */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Relationships */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Handshake className="size-4" />
                Relationships
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {factionRelationships.length === 0 ? (
                <p className="text-sm text-muted-foreground">No relationships.</p>
              ) : (
                <div className="space-y-1">
                  {factionRelationships.map((rel) => {
                    const targetFaction = allFactions.find((f) => f.id === rel.targetId)
                    const statusLabel = deriveStatus(rel.score)
                    return (
                      <div key={rel.id} className="flex items-center justify-between py-1">
                        <Link
                          to="/realms/factions/$factionId"
                          params={{ factionId: rel.targetId }}
                          className="text-sm text-primary hover:underline font-medium"
                        >
                          {targetFaction?.name ?? 'Unknown'}
                        </Link>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono font-semibold">
                            {rel.score > 0 ? `+${rel.score}` : rel.score}
                          </span>
                          <Badge variant={rel.score > 0 ? 'secondary' : rel.score < 0 ? 'destructive' : 'outline'} className="text-xs w-16 justify-center">
                            {statusLabel}
                          </Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Agent NPCs */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="size-4" />
                Agents ({agentNpcs.length})
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="h-7"
                onClick={handleAddAgent}
                disabled={isAddingAgent || !systemConfig}
              >
                <Dices className="mr-1.5 size-3.5" />
                {isAddingAgent ? '...' : 'Add'}
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              {agentNpcs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No agents.</p>
              ) : (
                <div className="space-y-1">
                  {agentNpcs.map((npc) => (
                    <div key={npc.id} className="flex items-center justify-between py-1">
                      <Link
                        to="/realms/npcs/$npcId"
                        params={{ npcId: npc.id }}
                        className="text-sm text-primary hover:underline font-medium"
                      >
                        {npc.name}
                      </Link>
                      <div className="flex items-center gap-1">
                        {npc.traits.slice(0, 2).map((trait) => (
                          <Badge key={trait} variant="secondary" className="text-xs">{trait}</Badge>
                        ))}
                        {npc.lifeStatus !== 'alive' && <Badge variant="destructive" className="text-xs">{npc.lifeStatus.charAt(0).toUpperCase() + npc.lifeStatus.slice(1)}</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Locations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="size-4" />
              Locations ({factionPresences.length})
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="h-7"
              onClick={() => setShowAddPresence(true)}
            >
              Add Presence
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {factionPresences.length === 0 ? (
              <p className="text-sm text-muted-foreground">No locations.</p>
            ) : (
              <div className="space-y-2">
                {factionPresences.map((presence) => {
                  const poi = realmPOIs.find((p) => p.id === presence.poiId)
                  return (
                    <div key={presence.id} className="flex items-start gap-2 py-2 border-b last:border-0">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Link
                            to="/realms/pois"
                            className="text-sm text-primary hover:underline font-medium"
                          >
                            {poi?.name ?? 'Unknown'}
                          </Link>
                          <Badge variant="outline" className="text-xs">
                            {presence.type}
                          </Badge>
                        </div>
                        {presence.notes && (
                          <p className="text-xs text-muted-foreground">{presence.notes}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 shrink-0"
                        onClick={() => handleDeletePresence(presence.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Presence Dialog */}
      <Dialog open={showAddPresence} onOpenChange={setShowAddPresence}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Faction Presence</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="presence-poi">Location (POI) *</Label>
              <Select
                value={presenceForm.poiId}
                onValueChange={(value) =>
                  setPresenceForm((f) => ({ ...f, poiId: value }))
                }
              >
                <SelectTrigger id="presence-poi">
                  <SelectValue placeholder="Select a POI" />
                </SelectTrigger>
                <SelectContent>
                  {realmPOIs.map((poi) => (
                    <SelectItem key={poi.id} value={poi.id}>
                      {poi.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="presence-type">Presence Type</Label>
              <Select
                value={presenceForm.type}
                onValueChange={(value) =>
                  setPresenceForm((f) => ({ ...f, type: value as FactionPresenceType }))
                }
              >
                <SelectTrigger id="presence-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FACTION_PRESENCE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="presence-notes">Notes</Label>
              <Textarea
                id="presence-notes"
                value={presenceForm.notes}
                onChange={(e) =>
                  setPresenceForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Additional details..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddPresence(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddPresence} disabled={!presenceForm.poiId}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Delete Faction"
        description="Are you sure you want to delete this faction? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
