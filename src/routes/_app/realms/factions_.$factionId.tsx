import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useUIStore } from '~/ui/stores/uiStore'
import { useFaction, useFactions } from '~/ui/hooks/useFactions'
import { useRealmDoom } from '~/ui/hooks/useDooms'
import { useNPCs, useNPCsByFaction } from '~/ui/hooks/useNPCs'
import { useRegions } from '~/ui/hooks/useRegions'
import { useRealmPOIs } from '~/ui/hooks/usePOIs'
import { useRelationships } from '~/ui/hooks/useRelationships'
import { useActiveRealm } from '~/ui/hooks/useActiveRealm'
import { useSystemConfig } from '~/ui/hooks/useSystemConfigs'
import { useContainer } from '~/ui/hooks/useContainer'
import { executeUpdateFaction } from '@application/use-cases/UpdateFaction'
import { executeGenerateNPC } from '@application/use-cases/GenerateNPC'
import { executeCreateFactionPresence } from '@application/use-cases/CreateFactionPresence'
import { executeDeleteFactionPresence } from '@application/use-cases/DeleteFactionPresence'
import { executeUpdateRelationship } from '@application/use-cases/UpdateRelationship'
import { executeLinkNPCToFaction } from '@application/use-cases/LinkNPCToFaction'
import { PageHeader } from '~/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '~/components/ui/dialog'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import { Input } from '~/components/ui/input'
import { ArrowLeft, Trash2, Pencil, Crown, CheckCircle2, Circle, Dices, Users, Handshake, ChevronUp, ChevronDown, MapPin, Map, Link2, Footprints, Skull } from 'lucide-react'
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

// Territory presence type → badge tint, so controlled vs contested reads at a glance.
const PRESENCE_TYPE_COLORS: Record<string, string> = {
  controls: 'border-emerald-500/60 text-emerald-400',
  operates: 'border-blue-500/60 text-blue-400',
  contests: 'border-red-500/60 text-red-400',
  patrols: 'border-amber-500/60 text-amber-400',
  hidden: 'border-purple-500/60 text-purple-400',
}

function FactionDetailPage() {
  const { factionId } = Route.useParams()
  const activeRealmId = useUIStore((s) => s.activeRealmId)
  const realm = useActiveRealm()
  const systemConfig = useSystemConfig(realm?.systemId ?? null)
  const container = useContainer()
  const faction = useFaction(factionId)
  const realmDoom = useRealmDoom(activeRealmId)
  const agentNpcs = useNPCsByFaction(factionId)
  const allFactions = useFactions(activeRealmId)
  const regions = useRegions(activeRealmId)
  const realmPOIs = useRealmPOIs(activeRealmId)
  const factionRelationships = useRelationships([factionId])

  const allNPCs = useNPCs(activeRealmId)

  const [isAddingAgent, setIsAddingAgent] = useState(false)
  const [showLinkNPC, setShowLinkNPC] = useState(false)
  const [linkSearch, setLinkSearch] = useState('')
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

  const handleAdjustRelationship = async (targetId: string, delta: number) => {
    await executeUpdateRelationship(factionId, targetId, delta, 'Manual adjustment', {
      relationshipRepo: container.factionRelationshipRepo,
    })
  }

  const handleAddAgent = async () => {
    if (!faction || !activeRealmId || !systemConfig) return
    setIsAddingAgent(true)
    try {
      const npc = await executeGenerateNPC(
        { worldId: activeRealmId, systemConfig, factionId: faction.id },
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

  const handleLinkExistingNPC = async (npcId: string) => {
    if (!faction) return
    await executeLinkNPCToFaction(npcId, factionId, { npcRepo: container.npcRepo })
    if (!faction.agentNpcIds.includes(npcId)) {
      await executeUpdateFaction(
        { ...faction, agentNpcIds: [...faction.agentNpcIds, npcId] },
        { factionRepo: container.factionRepo }
      )
    }
    setShowLinkNPC(false)
    setLinkSearch('')
  }

  const availableNPCs = allNPCs.filter(
    (npc) => !faction?.agentNpcIds.includes(npc.id) &&
      (!linkSearch || npc.name.toLowerCase().includes(linkSearch.toLowerCase()))
  )

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
    <div className="space-y-4">
      <PageHeader
        title={
          <span className="flex flex-col">
            <span className="flex items-center gap-2">
              {f.isParty && <Crown className="size-6 text-amber-500" />}
              {f.name}
            </span>
            {f.description && (
              <span className="text-sm font-normal text-muted-foreground">{f.description}</span>
            )}
          </span>
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
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {f.motivation && (
              <p className="text-sm text-muted-foreground">{f.motivation}</p>
            )}
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

            {/* Leadership + location — "who runs it / where", as scannable chips */}
            {(f.regionId || f.headquartersPoiId || f.leaderNpcId || (f.isParty && f.currentPoiId)) && (
              <div className="flex flex-wrap gap-2 text-xs">
                {f.isParty && (() => {
                  const here = realmPOIs.find((p) => p.id === f.currentPoiId)
                  return here ? (
                    <Link
                      to="/realms/pois/$poiId"
                      params={{ poiId: here.id }}
                      className="inline-flex items-center gap-1.5 rounded-md border bg-muted/30 px-2 py-1 hover:bg-accent transition-colors"
                    >
                      <Footprints className="size-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Location</span>
                      <span className="font-medium text-foreground">{here.name}</span>
                    </Link>
                  ) : null
                })()}
                {(() => {
                  const leader = allNPCs.find((n) => n.id === f.leaderNpcId)
                  return leader ? (
                    <Link
                      to="/realms/npcs/$npcId"
                      params={{ npcId: leader.id }}
                      className="inline-flex items-center gap-1.5 rounded-md border bg-muted/30 px-2 py-1 hover:bg-accent transition-colors"
                    >
                      <Crown className="size-3.5 text-amber-500" />
                      <span className="text-muted-foreground">Leader</span>
                      <span className="font-medium text-foreground">{leader.name}</span>
                    </Link>
                  ) : null
                })()}
                {(() => {
                  const region = regions.find((r) => r.id === f.regionId)
                  return region ? (
                    <Link
                      to="/realms/regions/$regionId"
                      params={{ regionId: region.id }}
                      className="inline-flex items-center gap-1.5 rounded-md border bg-muted/30 px-2 py-1 hover:bg-accent transition-colors"
                    >
                      <Map className="size-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Region</span>
                      <span className="font-medium text-foreground">{region.name}</span>
                    </Link>
                  ) : null
                })()}
                {(() => {
                  const hqPoi = realmPOIs.find((p) => p.id === f.headquartersPoiId)
                  return hqPoi ? (
                    <Link
                      to="/realms/pois/$poiId"
                      params={{ poiId: hqPoi.id }}
                      className="inline-flex items-center gap-1.5 rounded-md border bg-muted/30 px-2 py-1 hover:bg-accent transition-colors"
                    >
                      <MapPin className="size-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">HQ</span>
                      <span className="font-medium text-foreground">{hqPoi.name}</span>
                    </Link>
                  ) : null
                })()}
                {realmDoom?.doomFactionId === f.id && (
                  <Link
                    to="/realms/dooms/$doomId"
                    params={{ doomId: realmDoom.id }}
                    className="inline-flex items-center gap-1.5 rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1 hover:bg-red-500/20 transition-colors"
                  >
                    <Skull className="size-3.5 text-red-500" />
                    <span className="text-red-500 font-medium">Doom</span>
                    <span className="font-medium text-foreground">{realmDoom.name}</span>
                  </Link>
                )}
              </div>
            )}

            {/* GM secret — collapsed by default so it doesn't spoil at a glance */}
            {f.secret && (
              <details className="rounded-md border border-rose-500/30 bg-rose-500/10 text-sm">
                <summary className="cursor-pointer select-none px-3 py-2 font-semibold text-rose-600 dark:text-rose-400">
                  Secret (GM) <span className="font-normal text-muted-foreground">— reveal</span>
                </summary>
                <p className="px-3 pb-2 text-foreground/90">{f.secret}</p>
              </details>
            )}
          </CardContent>
        </Card>

        {/* Agenda — always shown so an empty faction still prompts you to add goals (via Edit) */}
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Agenda</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
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

        {/* Resources: Advantages + Obstacles — reference color, kept below the agenda */}
        <Card>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  {[...factionRelationships]
                    .sort((a, b) => b.score - a.score)
                    .map((rel) => {
                    const targetFaction = allFactions.find((f) => f.id === rel.targetId)
                    const statusLabel = deriveStatus(rel.score)
                    return (
                      <div key={rel.id} className="flex items-center justify-between py-1">
                        <Link
                          to="/realms/factions/$factionId"
                          params={{ factionId: rel.targetId }}
                          className={`text-sm hover:underline font-medium inline-flex items-center gap-1 ${targetFaction?.isParty ? 'text-amber-500' : 'text-primary'}`}
                        >
                          {targetFaction?.isParty && <Crown className="size-3.5 text-amber-500" />}
                          {targetFaction?.name ?? 'Unknown'}
                        </Link>
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6"
                            disabled={rel.score <= -6}
                            onClick={() => handleAdjustRelationship(rel.targetId, -1)}
                          >
                            <ChevronDown className="size-4" />
                          </Button>
                          <span className="text-sm font-mono font-semibold w-7 text-center">
                            {rel.score > 0 ? `+${rel.score}` : rel.score}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6"
                            disabled={rel.score >= 6}
                            onClick={() => handleAdjustRelationship(rel.targetId, 1)}
                          >
                            <ChevronUp className="size-4" />
                          </Button>
                          <Badge variant={rel.score > 0 ? 'secondary' : rel.score < 0 ? 'destructive' : 'outline'} className="text-xs w-20 justify-center">
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
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7"
                  onClick={() => setShowLinkNPC(true)}
                >
                  <Link2 className="mr-1.5 size-3.5" />
                  Link
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7"
                  onClick={handleAddAgent}
                  disabled={isAddingAgent || !systemConfig}
                >
                  <Dices className="mr-1.5 size-3.5" />
                  {isAddingAgent ? '...' : 'Generate'}
                </Button>
              </div>
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
                        {f.leaderNpcId === npc.id && <Crown className="inline size-3.5 text-amber-500 mr-1" />}
                        {npc.name}
                      </Link>
                      <div className="flex items-center gap-1">
                        {f.leaderNpcId === npc.id && <Badge variant="outline" className="text-xs text-amber-500 border-amber-500/50">Leader</Badge>}
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
                          {poi ? (
                            <Link
                              to="/realms/pois/$poiId"
                              params={{ poiId: poi.id }}
                              className="text-sm text-primary hover:underline font-medium"
                            >
                              {poi.name}
                            </Link>
                          ) : (
                            <span className="text-sm text-muted-foreground font-medium">Unknown</span>
                          )}
                          <Badge variant="outline" className={`text-xs ${PRESENCE_TYPE_COLORS[presence.type] ?? ''}`}>
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

      {/* Link Existing NPC Dialog */}
      <Dialog open={showLinkNPC} onOpenChange={(open) => { setShowLinkNPC(open); if (!open) setLinkSearch('') }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Existing NPC</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {allNPCs.length > 10 && (
              <Input
                placeholder="Search NPCs..."
                value={linkSearch}
                onChange={(e) => setLinkSearch(e.target.value)}
              />
            )}
            <div className="max-h-64 overflow-y-auto space-y-1">
              {availableNPCs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No available NPCs to link.</p>
              ) : (
                availableNPCs.map((npc) => (
                  <button
                    key={npc.id}
                    className="flex items-center justify-between w-full py-2 px-2 rounded hover:bg-muted/50 transition-colors text-left"
                    onClick={() => handleLinkExistingNPC(npc.id)}
                  >
                    <span className="text-sm font-medium">{npc.name}</span>
                    <div className="flex items-center gap-1">
                      {npc.factionIds.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {npc.factionIds.length} faction{npc.factionIds.length > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
    </div>
  )
}
