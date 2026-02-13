import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useUIStore } from '~/ui/stores/uiStore'
import { useFaction } from '~/ui/hooks/useFactions'
import { useRegions } from '~/ui/hooks/useRegions'
import { useRealmPOIs } from '~/ui/hooks/usePOIs'
import { useActiveRealm } from '~/ui/hooks/useActiveRealm'
import { useSystemConfig } from '~/ui/hooks/useSystemConfigs'
import { useContainer } from '~/ui/hooks/useContainer'
import { executeCreateFaction } from '@application/use-cases/CreateFaction'
import { executeUpdateFaction } from '@application/use-cases/UpdateFaction'
import { executeDeleteFaction } from '@application/use-cases/DeleteFaction'
import { executeInitializeRelationships } from '@application/use-cases/InitializeRelationships'
import { executeGenerateNPC } from '@application/use-cases/GenerateNPC'
import { rollOnTable } from '@domain/services/RandomTableEngine'
import { rollDice } from '@shared/dice'
import { newId } from '@shared/ulid'
import { PageHeader } from '~/components/shared/PageHeader'
import { ConfirmDialog } from '~/components/shared/ConfirmDialog'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { Dices, Trash2, Plus, Save, X } from 'lucide-react'
import type { TableDef } from '@domain/entities/TableDef'
import type { AgendaGoal, AgendaTimeframe, Advantage, Obstacle } from '@domain/entities/Faction'
import { FACTION_STATUSES } from '@shared/constants'

export const Route = createFileRoute('/_app/realms/factions_/$factionId_/edit')({
  component: FactionEditPage,
})

// ── Helpers ──────────────────────────────────────────────

function findTable(tables: TableDef[], id: string, namePart: string, tag?: string): TableDef | undefined {
  return (
    tables.find((t) => t.id === id) ??
    tables.find((t) => t.name.toLowerCase().includes(namePart)) ??
    (tag ? tables.find((t) => t.tags.includes(tag)) : undefined)
  )
}

function rollField(tables: TableDef[], tableId: string, namePart: string, tag?: string): string {
  const table = findTable(tables, tableId, namePart, tag)
  if (!table) return ''
  return rollOnTable(table, rollDice).entry.text
}

function rollLongTermGoals(tables: TableDef[], count: number): AgendaGoal[] {
  const table = findTable(tables, 'table-cairn-faction-agenda', 'faction agenda', 'faction-agenda')
  if (!table) return []
  const results: AgendaGoal[] = []
  const seen = new Set<string>()
  let attempts = 0
  while (results.length < count && attempts < count * 3) {
    const text = rollOnTable(table, rollDice).entry.text
    if (!seen.has(text)) {
      seen.add(text)
      results.push({ id: newId(), description: text, completed: false, timeframe: 'long-term', progress: 0, segments: 4 })
    }
    attempts++
  }
  return results
}

function rollImmediateGoals(tables: TableDef[], count: number): AgendaGoal[] {
  const table = findTable(tables, 'table-cairn-faction-immediate-agenda', 'faction immediate', 'faction-immediate-agenda')
  if (!table) return []
  const results: AgendaGoal[] = []
  const seen = new Set<string>()
  let attempts = 0
  while (results.length < count && attempts < count * 3) {
    const text = rollOnTable(table, rollDice).entry.text
    if (!seen.has(text)) {
      seen.add(text)
      results.push({ id: newId(), description: text, completed: false, timeframe: 'immediate' })
    }
    attempts++
  }
  return results
}

function rollAdvantages(tables: TableDef[]): Advantage[] {
  const advantageCountRoll = rollDice('1d20').total
  let count: number
  if (advantageCountRoll <= 7) count = 1
  else if (advantageCountRoll <= 12) count = 2
  else if (advantageCountRoll <= 17) count = 3
  else count = 4

  const table = findTable(tables, 'table-cairn-faction-advantage', 'faction advantage', 'faction-advantage')
  if (!table) return []

  const results: Advantage[] = []
  const seen = new Set<string>()
  let attempts = 0
  while (results.length < count && attempts < count * 3) {
    const text = rollOnTable(table, rollDice).entry.text
    if (!seen.has(text)) {
      seen.add(text)
      results.push({ id: newId(), description: text })
    }
    attempts++
  }
  return results
}


const DiceButton = ({ onClick, title: t }: { onClick: () => void; title?: string }) => (
  <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={onClick} title={t ?? 'Re-roll'}>
    <Dices className="size-4" />
  </Button>
)

// ── Component ────────────────────────────────────────────

function FactionEditPage() {
  const { factionId } = Route.useParams()
  const isCreate = factionId === 'new'
  const navigate = useNavigate()
  const activeRealmId = useUIStore((s) => s.activeRealmId)
  const realm = useActiveRealm()
  const systemConfig = useSystemConfig(realm?.systemId ?? null)
  const container = useContainer()
  const existingFaction = useFaction(isCreate ? null : factionId)
  const regions = useRegions(activeRealmId)
  const realmPOIs = useRealmPOIs(activeRealmId)

  // Faction tables for re-roll
  const [factionTables, setFactionTables] = useState<TableDef[]>([])
  useEffect(() => {
    if (systemConfig) {
      container.tableRepo.getTablesBySystemId(systemConfig.id).then(setFactionTables)
    }
  }, [systemConfig, container.tableRepo])

  // Form state
  const [name, setName] = useState('')
  const [type, setType] = useState('')
  const [status, setStatus] = useState<(typeof FACTION_STATUSES)[number]>('active')
  const [description, setDescription] = useState('')
  const [regionId, setRegionId] = useState<string | null>(null)
  const [headquartersPoiId, setHeadquartersPoiId] = useState<string | null>(null)
  const [trait1, setTrait1] = useState('')
  const [trait2, setTrait2] = useState('')
  const [advantages, setAdvantages] = useState<Advantage[]>([])
  const [obstacles, setObstacles] = useState<Obstacle[]>([])
  const [goals, setGoals] = useState<AgendaGoal[]>([])
  const [agentNpcIds, setAgentNpcIds] = useState<string[]>([])

  // Input helpers
  const [newAdvantageInput, setNewAdvantageInput] = useState('')
  const [newObstacleInput, setNewObstacleInput] = useState('')
  const [newImmediateGoalInput, setNewImmediateGoalInput] = useState('')
  const [newLongTermGoalInput, setNewLongTermGoalInput] = useState('')
  const [immediateRollCount, setImmediateRollCount] = useState(2)
  const [longTermRollCount, setLongTermRollCount] = useState(3)

  // UI state
  const [isSaving, setIsSaving] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [loaded, setLoaded] = useState(false)

  // Populate form from existing faction
  useEffect(() => {
    if (existingFaction && !loaded) {
      setName(existingFaction.name)
      setType(existingFaction.type)
      setStatus(existingFaction.status)
      setDescription(existingFaction.description)
      setRegionId(existingFaction.regionId ?? null)
      setHeadquartersPoiId(existingFaction.headquartersPoiId ?? null)
      setTrait1(existingFaction.traits[0] ?? '')
      setTrait2(existingFaction.traits[1] ?? '')
      setAdvantages([...(existingFaction.advantages ?? [])])
      setObstacles([...(existingFaction.obstacles ?? [])])
      setGoals([...existingFaction.agendaGoals])
      setAgentNpcIds([...existingFaction.agentNpcIds])
      setLoaded(true)
    }
  }, [existingFaction, loaded])

  // ── Derived ────────────────────────────────────────────

  const immediateGoals = goals.filter((g) => g.timeframe === 'immediate')
  const longTermGoals = goals.filter((g) => g.timeframe === 'long-term')

  // ── Re-roll handlers ─────────────────────────────────

  const rerollType = () => {
    const val = rollField(factionTables, 'table-cairn-faction-type', 'faction type', 'faction-type')
    if (val) setType(val)
  }

  const rerollTrait1 = () => {
    const val = rollField(factionTables, 'table-cairn-faction-trait', 'faction trait 1', 'faction-trait')
    if (val) setTrait1(val)
  }

  const rerollTrait2 = () => {
    const val = rollField(factionTables, 'table-cairn-faction-trait2', 'faction trait 2', 'faction-trait2')
    if (val) setTrait2(val)
  }

  const rerollAdvantages = () => {
    setAdvantages(rollAdvantages(factionTables))
  }

  const rerollObstacle = () => {
    const val = rollField(factionTables, 'table-cairn-faction-obstacle', 'faction obstacle', 'faction-obstacle')
    if (val) setObstacles([{ id: newId(), description: val }])
  }

  const rerollImmediate = () => {
    const newImmediate = rollImmediateGoals(factionTables, immediateRollCount)
    setGoals((prev) => [...prev.filter((g) => g.timeframe !== 'immediate'), ...newImmediate])
  }

  const rerollLongTerm = () => {
    const newLongTerm = rollLongTermGoals(factionTables, longTermRollCount)
    setGoals((prev) => [...prev.filter((g) => g.timeframe !== 'long-term'), ...newLongTerm])
  }

  // ── Generate All ─────────────────────────────────────

  const handleGenerateAll = async () => {
    if (!activeRealmId || !systemConfig) return
    setIsGenerating(true)
    try {
      const rolledType = rollField(factionTables, 'table-cairn-faction-type', 'faction type', 'faction-type')
      const rolledTrait1 = rollField(factionTables, 'table-cairn-faction-trait', 'faction trait 1', 'faction-trait')
      const rolledTrait2 = rollField(factionTables, 'table-cairn-faction-trait2', 'faction trait 2', 'faction-trait2')
      const rolledAdvantages = rollAdvantages(factionTables)
      const rolledObstacle = rollField(factionTables, 'table-cairn-faction-obstacle', 'faction obstacle', 'faction-obstacle')
      const rolledImmediate = rollImmediateGoals(factionTables, immediateRollCount)
      const rolledLongTerm = rollLongTermGoals(factionTables, longTermRollCount)
      const rolledGoals = [...rolledImmediate, ...rolledLongTerm]

      setType(rolledType)
      setTrait1(rolledTrait1)
      setTrait2(rolledTrait2)
      setAdvantages(rolledAdvantages)
      if (rolledObstacle) setObstacles([{ id: newId(), description: rolledObstacle }])
      setGoals(rolledGoals)

      if (!name.trim()) {
        setName([rolledTrait1, rolledType].filter(Boolean).join(' ') || 'New Faction')
      }

      // Generate agent NPCs
      const numAgents = rollDice('1d3').total
      const newAgentIds: string[] = []
      const tempFactionId = isCreate ? newId() : factionId
      for (let i = 0; i < numAgents; i++) {
        const npc = await executeGenerateNPC(
          { realmId: activeRealmId, systemConfig, factionId: tempFactionId },
          { tableRepo: container.tableRepo }
        )
        await container.npcRepo.create(npc)
        newAgentIds.push(npc.id)
      }
      setAgentNpcIds((prev) => [...prev, ...newAgentIds])
    } finally {
      setIsGenerating(false)
    }
  }

  // ── List field handlers ──────────────────────────────

  const addAdvantage = () => {
    if (!newAdvantageInput.trim()) return
    setAdvantages([...advantages, { id: newId(), description: newAdvantageInput.trim() }])
    setNewAdvantageInput('')
  }

  const removeAdvantage = (id: string) => setAdvantages(advantages.filter((a) => a.id !== id))

  const addObstacle = () => {
    if (!newObstacleInput.trim()) return
    setObstacles([...obstacles, { id: newId(), description: newObstacleInput.trim() }])
    setNewObstacleInput('')
  }

  const removeObstacle = (id: string) => setObstacles(obstacles.filter((o) => o.id !== id))

  const addGoal = (timeframe: AgendaTimeframe) => {
    const input = timeframe === 'immediate' ? newImmediateGoalInput : newLongTermGoalInput
    if (!input.trim()) return
    const goal = { id: newId(), description: input.trim(), completed: false, timeframe, ...(timeframe === 'long-term' ? { progress: 0, segments: 4 } : {}) }
    setGoals([...goals, goal])
    if (timeframe === 'immediate') setNewImmediateGoalInput('')
    else setNewLongTermGoalInput('')
  }

  const removeGoal = (id: string) => setGoals(goals.filter((g) => g.id !== id))
  const toggleGoal = (id: string) => setGoals(goals.map((g) => (g.id === id ? { ...g, completed: !g.completed } : g)))

  // ── Save ─────────────────────────────────────────────

  const handleSave = async () => {
    if (!activeRealmId || !name.trim()) return
    setIsSaving(true)
    try {
      const traits = [trait1, trait2].filter(Boolean)

      if (isCreate) {
        const newFaction = await executeCreateFaction(
          { realmId: activeRealmId, name: name.trim(), description: description.trim(), type: type.trim() },
          { factionRepo: container.factionRepo }
        )
        await executeUpdateFaction(
          { ...newFaction, traits, advantages, obstacles, agendaGoals: goals, agentNpcIds, regionId, headquartersPoiId },
          { factionRepo: container.factionRepo }
        )
        await executeInitializeRelationships(newFaction.id, activeRealmId, {
          factionRepo: container.factionRepo,
          relationshipRepo: container.factionRelationshipRepo,
        })
        // Fix up agent NPCs — they were created with a temp factionId during generate
        for (const npcId of agentNpcIds) {
          const npc = await container.npcRepo.getById(npcId)
          if (npc) {
            await container.npcRepo.update({ ...npc, factionId: newFaction.id })
          }
        }
        navigate({ to: '/realms/factions/$factionId', params: { factionId: newFaction.id } })
      } else if (existingFaction) {
        await executeUpdateFaction(
          { ...existingFaction, name: name.trim(), description: description.trim(), type: type.trim(), status, traits, advantages, obstacles, agendaGoals: goals, agentNpcIds, regionId, headquartersPoiId },
          { factionRepo: container.factionRepo }
        )
        navigate({ to: '/realms/factions/$factionId', params: { factionId } })
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    if (isCreate) {
      navigate({ to: '/realms/factions' })
    } else {
      navigate({ to: '/realms/factions/$factionId', params: { factionId } })
    }
  }

  const handleDelete = async () => {
    await executeDeleteFaction(factionId, { factionRepo: container.factionRepo })
    navigate({ to: '/realms/factions' })
  }

  // ── Loading / Not Found ──────────────────────────────

  if (!isCreate && existingFaction === undefined) {
    return <div className="py-8 text-center text-muted-foreground">Loading...</div>
  }

  if (!isCreate && existingFaction === null) {
    return <div className="py-8 text-center text-muted-foreground">Faction not found.</div>
  }

  // ── Render ───────────────────────────────────────────

  return (
    <div className="space-y-4 pb-20">
      <PageHeader
        title={isCreate ? 'New Faction' : `Edit: ${name || 'Faction'}`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateAll}
              disabled={isGenerating || !systemConfig}
              title="Roll every field + create agent NPCs"
            >
              <Dices className="mr-2 size-4" />
              {isGenerating ? 'Generating...' : 'Generate All'}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              <X className="mr-2 size-4" />
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!name.trim() || isSaving}>
              <Save className="mr-2 size-4" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        }
      />

      {/* ── Identity ──────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Identity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Name + Type row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 grid gap-1.5">
              <Label htmlFor="faction-name">Name</Label>
              <Input id="faction-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="The Silver Order" />
            </div>
            <div className="grid gap-1.5">
              <div className="flex items-center gap-1">
                <Label htmlFor="faction-type">Type</Label>
                <DiceButton onClick={rerollType} title="Roll faction type" />
              </div>
              <Input id="faction-type" value={type} onChange={(e) => setType(e.target.value)} placeholder="Guild, Cult..." />
            </div>
          </div>

          {/* Status + Traits row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {!isCreate && (
              <div className="grid gap-1.5">
                <Label htmlFor="faction-status">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                  <SelectTrigger id="faction-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FACTION_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-1.5">
              <div className="flex items-center gap-1">
                <Label htmlFor="faction-trait1">Trait 1</Label>
                <DiceButton onClick={rerollTrait1} title="Roll trait 1" />
              </div>
              <Input id="faction-trait1" value={trait1} onChange={(e) => setTrait1(e.target.value)} placeholder="Ambitious" />
            </div>
            <div className="grid gap-1.5">
              <div className="flex items-center gap-1">
                <Label htmlFor="faction-trait2">Trait 2</Label>
                <DiceButton onClick={rerollTrait2} title="Roll trait 2" />
              </div>
              <Input id="faction-trait2" value={trait2} onChange={(e) => setTrait2(e.target.value)} placeholder="Secretive" />
            </div>
          </div>

          {/* Region + HQ row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="faction-region">Region</Label>
              <Select value={regionId ?? 'none'} onValueChange={(v) => setRegionId(v === 'none' ? null : v)}>
                <SelectTrigger id="faction-region">
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {regions.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="faction-hq">Headquarters (POI)</Label>
              <Select value={headquartersPoiId ?? 'none'} onValueChange={(v) => setHeadquartersPoiId(v === 'none' ? null : v)}>
                <SelectTrigger id="faction-hq">
                  <SelectValue placeholder="Select POI" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {realmPOIs.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="grid gap-1.5">
            <Label htmlFor="faction-desc">Description</Label>
            <Textarea id="faction-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A secretive order of..." rows={3} />
          </div>
        </CardContent>
      </Card>

      {/* ── Advantages & Obstacles ────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Resources & Challenges</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Advantages */}
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-500">Advantages</h4>
                <DiceButton onClick={rerollAdvantages} title="Roll advantages (1-4)" />
              </div>
              {advantages.map((a) => (
                <div key={a.id} className="flex items-center gap-2 group">
                  <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="flex-1 text-sm">{a.description}</span>
                  <Button variant="ghost" size="sm" className="size-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeAdvantage(a.id)}><Trash2 className="size-3" /></Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input className="h-8 text-sm" value={newAdvantageInput} onChange={(e) => setNewAdvantageInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAdvantage() } }} placeholder="Add advantage..." />
                <Button size="sm" className="h-8" onClick={addAdvantage} disabled={!newAdvantageInput.trim()}><Plus className="size-3" /></Button>
              </div>
            </div>

            {/* Obstacles */}
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-red-500">Obstacles</h4>
                <DiceButton onClick={rerollObstacle} title="Roll obstacle" />
              </div>
              {obstacles.map((o) => (
                <div key={o.id} className="flex items-center gap-2 group">
                  <span className="size-1.5 rounded-full bg-red-500 shrink-0" />
                  <span className="flex-1 text-sm">{o.description}</span>
                  <Button variant="ghost" size="sm" className="size-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeObstacle(o.id)}><Trash2 className="size-3" /></Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input className="h-8 text-sm" value={newObstacleInput} onChange={(e) => setNewObstacleInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addObstacle() } }} placeholder="Add obstacle..." />
                <Button size="sm" className="h-8" onClick={addObstacle} disabled={!newObstacleInput.trim()}><Plus className="size-3" /></Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Agenda ──────────────────────────────── */}
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground pt-2">
        Agenda ({goals.filter((g) => g.completed).length}/{goals.length})
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Immediate */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-1">
              <CardTitle className="text-sm font-semibold text-amber-500">Immediate ({immediateGoals.filter((g) => g.completed).length}/{immediateGoals.length})</CardTitle>
              <div className="ml-auto flex items-center gap-1">
                <select
                  value={immediateRollCount}
                  onChange={(e) => setImmediateRollCount(Number(e.target.value))}
                  className="h-7 w-12 rounded border bg-background px-1 text-xs text-center"
                  title="Number of goals to roll"
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <DiceButton onClick={rerollImmediate} title="Roll immediate goals (d100)" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {immediateGoals.map((g, idx) => (
              <div key={g.id} className="flex items-center gap-2 group">
                <span className="text-xs font-mono text-muted-foreground w-4 shrink-0">{idx + 1}.</span>
                <input
                  type="checkbox"
                  checked={g.completed}
                  onChange={() => toggleGoal(g.id)}
                  className="shrink-0"
                />
                <span className={`flex-1 text-sm ${g.completed ? 'text-muted-foreground line-through' : ''}`}>
                  {g.description}
                </span>
                <Button variant="ghost" size="sm" className="size-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeGoal(g.id)}>
                  <Trash2 className="size-3" />
                </Button>
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <Input className="h-8 text-sm" value={newImmediateGoalInput} onChange={(e) => setNewImmediateGoalInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addGoal('immediate') } }} placeholder="Add immediate goal..." />
              <Button size="sm" className="h-8" onClick={() => addGoal('immediate')} disabled={!newImmediateGoalInput.trim()}><Plus className="size-3" /></Button>
            </div>
          </CardContent>
        </Card>

        {/* Long-Term */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-1">
              <CardTitle className="text-sm font-semibold text-blue-500">Long-Term ({longTermGoals.filter((g) => g.completed).length}/{longTermGoals.length})</CardTitle>
              <div className="ml-auto flex items-center gap-1">
                <select
                  value={longTermRollCount}
                  onChange={(e) => setLongTermRollCount(Number(e.target.value))}
                  className="h-7 w-12 rounded border bg-background px-1 text-xs text-center"
                  title="Number of goals to roll"
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <DiceButton onClick={rerollLongTerm} title="Roll long-term goals" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {longTermGoals.map((g, idx) => (
              <div key={g.id} className="flex items-center gap-2 group">
                <span className="text-xs font-mono text-muted-foreground w-4 shrink-0">{idx + 1}.</span>
                <input
                  type="checkbox"
                  checked={g.completed}
                  onChange={() => toggleGoal(g.id)}
                  className="shrink-0"
                />
                <span className={`flex-1 text-sm ${g.completed ? 'text-muted-foreground line-through' : ''}`}>
                  {g.description}
                </span>
                <select
                  value={g.segments ?? 4}
                  onChange={(e) => setGoals(goals.map((gg) => gg.id === g.id ? { ...gg, segments: Number(e.target.value), progress: Math.min(gg.progress ?? 0, Number(e.target.value)) } : gg))}
                  className="h-6 w-14 rounded border bg-background px-1 text-xs"
                  title="Clock segments"
                >
                  <option value={4}>4</option>
                  <option value={6}>6</option>
                  <option value={8}>8</option>
                  <option value={12}>12</option>
                </select>
                <Button variant="ghost" size="sm" className="size-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeGoal(g.id)}>
                  <Trash2 className="size-3" />
                </Button>
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <Input className="h-8 text-sm" value={newLongTermGoalInput} onChange={(e) => setNewLongTermGoalInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addGoal('long-term') } }} placeholder="Add long-term goal..." />
              <Button size="sm" className="h-8" onClick={() => addGoal('long-term')} disabled={!newLongTermGoalInput.trim()}><Plus className="size-3" /></Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Sticky Footer ────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-10 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto max-w-screen-xl flex items-center gap-2 px-6 py-3">
          {!isCreate && !existingFaction?.isParty && (
            <Button variant="destructive" size="sm" onClick={() => setShowDelete(true)}>
              <Trash2 className="mr-2 size-4" />Delete
            </Button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={!name.trim() || isSaving}>
              <Save className="mr-2 size-4" />
              {isSaving ? 'Saving...' : isCreate ? 'Create Faction' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>

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
