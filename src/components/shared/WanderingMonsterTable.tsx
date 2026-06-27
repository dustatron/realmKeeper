import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { Input } from '~/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '~/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '~/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { Dices, Plus, Trash2, Footprints, BookOpen, Users, PenLine, Pencil } from 'lucide-react'
import { rollDice } from '@shared/dice'
import { evaluateEncounterCheck } from '@shared/encounterCheck'
import { WANDERING_MONSTER_ACTIVITIES } from '@domain/data/wandering-monster-activities'
import type { WanderingMonsterEntry } from '@domain/value-objects/WanderingMonster'
import type { NPC } from '@domain/entities/NPC'
import type { POI } from '@domain/entities/POI'
import { getMonsterStats, entryAC, entryHP, entryAtk, entrySource } from './wanderingMonsterUtils'
import { MonsterSearchTab, MonsterStatBlock } from './MonsterSearchTab'
import { NpcDenizensTab } from './NpcDenizensTab'
import { MonsterStatOverrideDialog } from './MonsterStatOverrideDialog'

interface WanderingMonsterTableProps {
  entries: WanderingMonsterEntry[]
  onSave: (entries: WanderingMonsterEntry[]) => void
  label?: string
  /** NPCs at this location and child locations (for Denizens tab) */
  npcs?: NPC[]
  /** Child POIs (for NPC room labels in Denizens tab) */
  poiChildren?: POI[]
  /** System ID for bestiary search prioritization */
  systemId?: string | null
  /** World ID for custom compendium entries */
  worldId?: string | null
  /** Encounter-check chance denominator (1 in N). Enables the Encounter Check button when onSaveEncounterChance is set. */
  encounterChance?: number | null
  onSaveEncounterChance?: (n: number) => void
}

export function WanderingMonsterTable({
  entries,
  onSave,
  label = 'Wandering Monsters',
  npcs = [],
  poiChildren = [],
  systemId,
  worldId,
  encounterChance,
  onSaveEncounterChance,
}: WanderingMonsterTableProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const [showAddSheet, setShowAddSheet] = useState(false)
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [rollingIdx, setRollingIdx] = useState<number | null>(null)
  const [isRolling, setIsRolling] = useState(false)
  const rollTimers = useRef<ReturnType<typeof setTimeout>[]>([])
  const [checkResult, setCheckResult] = useState<string | null>(null)
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dieSize = entries.length

  useEffect(() => {
    return () => {
      rollTimers.current.forEach(clearTimeout)
      if (checkTimer.current) clearTimeout(checkTimer.current)
    }
  }, [])

  const handleRoll = useCallback(() => {
    if (dieSize === 0 || isRolling) return
    const { total } = rollDice(`1d${dieSize}`)
    const finalIdx = total - 1

    setIsRolling(true)
    setExpandedIdx(null)
    rollTimers.current.forEach(clearTimeout)
    rollTimers.current = []

    const totalTicks = Math.min(4 + Math.floor(dieSize / 2), 8)
    let elapsed = 0
    for (let i = 0; i < totalTicks; i++) {
      const progress = i / (totalTicks - 1)
      const delay = 50 + progress * progress * 150
      elapsed += delay
      const tickIdx = i < totalTicks - 1
        ? Math.floor(Math.random() * dieSize)
        : finalIdx
      const timer = setTimeout(() => {
        setRollingIdx(tickIdx)
        setSelectedIdx(tickIdx)
      }, elapsed)
      rollTimers.current.push(timer)
    }
    const settleTimer = setTimeout(() => {
      setRollingIdx(null)
      setIsRolling(false)
      setSelectedIdx(finalIdx)
      setExpandedIdx(finalIdx)
    }, elapsed + 200)
    rollTimers.current.push(settleTimer)
  }, [dieSize, isRolling])

  const handleEncounterCheck = useCallback(() => {
    const { roll, chance, triggered } = evaluateEncounterCheck(
      encounterChance ?? null,
      (sides) => rollDice(`1d${sides}`).total,
    )
    if (checkTimer.current) clearTimeout(checkTimer.current)
    if (triggered) {
      setCheckResult(`🎲 Rolled ${roll} (1 in ${chance}) — Encounter! Rolling…`)
      handleRoll()
    } else {
      setCheckResult(`🎲 Rolled ${roll} (1 in ${chance}) — No encounter`)
    }
    checkTimer.current = setTimeout(() => setCheckResult(null), 4000)
  }, [encounterChance, handleRoll])

  const addEntry = (entry: WanderingMonsterEntry) => onSave([...entries, entry])
  const updateEntry = (idx: number, entry: WanderingMonsterEntry) => onSave(entries.map((e, i) => i === idx ? entry : e))
  const removeEntry = (idx: number) => {
    onSave(entries.filter((_, i) => i !== idx))
    if (selectedIdx === idx) setSelectedIdx(null)
    if (expandedIdx === idx) setExpandedIdx(null)
    if (editingIdx === idx) setEditingIdx(null)
  }

  return (
    <div className="rounded-lg border border-dashed border-red-500/30 bg-red-500/5 p-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Footprints className="size-4 text-red-500" />
          {label}
          {dieSize > 0 && (
            <Badge variant="secondary" className="text-xs font-mono">
              1d{dieSize}
            </Badge>
          )}
        </h4>
        {checkResult && (
          <span className="flex-1 text-center text-sm font-semibold text-red-400 truncate px-2">
            {checkResult}
          </span>
        )}
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowAddSheet(true)}
            className="text-muted-foreground h-7 px-2"
          >
            <Plus className="size-3 mr-1" />
            Add
          </Button>
          {onSaveEncounterChance && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">1 in</span>
              <Input
                type="number"
                min={2}
                max={20}
                value={encounterChance ?? 6}
                onChange={(e) => {
                  const n = Math.max(2, Math.min(20, Number(e.target.value) || 6))
                  onSaveEncounterChance(n)
                }}
                className="h-7 w-14 px-1 text-center text-xs"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleEncounterCheck}
                className="gap-1.5 border-red-500/30 text-red-500 hover:bg-red-500/10 hover:text-red-500"
              >
                <Dices className="size-3.5" />
                Encounter Check
              </Button>
            </div>
          )}
          {dieSize > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleRoll}
              disabled={isRolling}
              className="gap-1.5 border-red-500/30 text-red-500 hover:bg-red-500/10 hover:text-red-500"
            >
              <Dices className={`size-3.5 ${isRolling ? 'animate-spin' : ''}`} />
              {isRolling ? 'Rolling…' : 'Roll'}
            </Button>
          )}
        </div>
      </div>

      {dieSize > 0 ? (
        <div className="overflow-hidden rounded border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
                <th className="px-2 py-1 text-left w-8">#</th>
                <th className="px-2 py-1 text-left">Creature</th>
                <th className="px-2 py-1 text-center w-10">AC</th>
                <th className="px-2 py-1 text-center w-10">HP</th>
                <th className="px-2 py-1 text-left">Atk</th>
                <th className="px-2 py-1 w-7"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {entries.map((entry, i) => {
                const monster = getMonsterStats(entry.compendiumId)
                const isSelected = selectedIdx === i
                const isExpanded = expandedIdx === i
                const isRollingHere = rollingIdx === i
                return (
                  <tr
                    key={i}
                    className={`cursor-pointer transition-all duration-75 ${
                      isRollingHere
                        ? 'bg-red-500/25 text-foreground scale-[1.01]'
                        : isSelected && !isRolling
                          ? 'bg-red-500/15 text-foreground'
                          : 'text-muted-foreground hover:bg-muted/30'
                    }`}
                    onClick={() => {
                      if (isRolling) return
                      setSelectedIdx(isSelected ? null : i)
                      setExpandedIdx(isExpanded ? null : i)
                    }}
                  >
                    <td className="px-2 py-1.5 text-xs font-mono align-top">
                      {isRollingHere && <span className="mr-0.5">🎲</span>}
                      {isSelected && !isRolling && !isRollingHere && <span className="mr-0.5">🎲</span>}
                      {i + 1}
                    </td>
                    <td className="px-2 py-1.5 align-top">
                      <div className={`font-medium ${isSelected ? 'text-foreground' : 'text-foreground/80'}`}>
                        {entry.count && entry.count !== '1' ? `${entry.count} ` : ''}{entry.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {[entry.creatureType, entrySource(entry)].filter(Boolean).join(' · ')}
                        {entry.activity && <span className="italic"> · {entry.activity}</span>}
                      </div>
                      {isExpanded && !isRolling && monster && <MonsterStatBlock monster={monster} />}
                      {isExpanded && !isRolling && !monster && entry.customStats && (
                        <div className="mt-1.5 rounded border border-border/50 bg-background p-2 text-xs">
                          <div className="flex items-center gap-3 flex-wrap">
                            {entry.customStats.ac != null && <span>AC {entry.customStats.ac}</span>}
                            {entry.customStats.hp != null && <span>HP {entry.customStats.hp}</span>}
                            {entry.customStats.attacks && <span>Atk: {entry.customStats.attacks}</span>}
                          </div>
                        </div>
                      )}
                      {isExpanded && !isRolling && (
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-xs gap-1"
                            onClick={(e) => { e.stopPropagation(); setEditingIdx(i) }}
                          >
                            <Pencil className="size-3" />
                            Edit
                          </Button>
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-center text-xs align-top">{entryAC(entry)}</td>
                    <td className="px-2 py-1.5 text-center text-xs align-top">{entryHP(entry)}</td>
                    <td className="px-2 py-1.5 text-xs align-top">{entryAtk(entry)}</td>
                    <td className="px-2 py-1.5 align-top">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="size-6 p-0 text-muted-foreground hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); removeEntry(i) }}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">
          No wandering monsters set. Click Add to populate.
        </p>
      )}

      <AddCreatureSheet
        open={showAddSheet}
        onOpenChange={setShowAddSheet}
        onAdd={addEntry}
        npcs={npcs}
        poiChildren={poiChildren}
        existingNames={new Set(entries.map((e) => e.name.toLowerCase()))}
        systemId={systemId}
        worldId={worldId}
      />

      {editingIdx != null && entries[editingIdx] && (
        <MonsterStatOverrideDialog
          open
          onOpenChange={(open) => { if (!open) setEditingIdx(null) }}
          entry={entries[editingIdx]}
          hasCompendiumStats={!!getMonsterStats(entries[editingIdx].compendiumId)}
          onSave={(updated) => { updateEntry(editingIdx, updated); setEditingIdx(null) }}
          onDelete={() => { removeEntry(editingIdx); setEditingIdx(null) }}
        />
      )}
    </div>
  )
}

// --- Add Creature Sheet ---

function AddCreatureSheet({
  open,
  onOpenChange,
  onAdd,
  npcs,
  poiChildren,
  existingNames,
  systemId,
  worldId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (entry: WanderingMonsterEntry) => void
  npcs: NPC[]
  poiChildren: POI[]
  existingNames: Set<string>
  systemId?: string | null
  worldId?: string | null
}) {
  const [tab, setTab] = useState<string>('bestiary')

  const handleAdd = (entry: WanderingMonsterEntry) => {
    onAdd(entry)
    // Don't close — let user add multiple
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto p-6">
        <SheetHeader>
          <SheetTitle>Add Creature</SheetTitle>
        </SheetHeader>
        <Tabs value={tab} onValueChange={setTab} className="mt-4">
          <TabsList variant="line" className="w-full">
            <TabsTrigger value="bestiary">
              <BookOpen className="size-3.5 mr-1" />
              Bestiary
            </TabsTrigger>
            <TabsTrigger value="denizens">
              <Users className="size-3.5 mr-1" />
              Denizens
            </TabsTrigger>
            <TabsTrigger value="custom">
              <PenLine className="size-3.5 mr-1" />
              Custom
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bestiary" className="mt-3">
            <MonsterSearchTab
              onAdd={handleAdd}
              existingNames={existingNames}
              systemId={systemId}
              worldId={worldId}
            />
          </TabsContent>

          <TabsContent value="denizens" className="mt-3">
            <NpcDenizensTab
              npcs={npcs}
              poiChildren={poiChildren}
              existingNames={existingNames}
              onAdd={handleAdd}
            />
          </TabsContent>

          <TabsContent value="custom" className="mt-3">
            <CustomTab onAdd={handleAdd} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}

// --- Custom Tab ---

function CustomTab({ onAdd }: { onAdd: (entry: WanderingMonsterEntry) => void }) {
  const [name, setName] = useState('')
  const [creatureType, setCreatureType] = useState('monster')
  const [count, setCount] = useState('1')
  const [activity, setActivity] = useState('')
  const [ac, setAc] = useState('')
  const [hp, setHp] = useState('')
  const [attacks, setAttacks] = useState('')

  const handleSubmit = () => {
    if (!name.trim()) return
    onAdd({
      name: name.trim(),
      creatureType: creatureType.trim(),
      count: count || '1',
      activity,
      compendiumId: null,
      npcId: null,
      customStats: (ac || hp || attacks) ? {
        ac: ac ? parseInt(ac) : null,
        hp: hp ? parseInt(hp) : null,
        attacks,
      } : null,
    })
    setName('')
    setCreatureType('monster')
    setCount('1')
    setActivity('')
    setAc('')
    setHp('')
    setAttacks('')
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_1fr_60px] gap-2">
        <div>
          <label className="text-xs text-muted-foreground">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Giant Rats" autoFocus />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Type</label>
          <Input value={creatureType} onChange={(e) => setCreatureType(e.target.value)} placeholder="e.g. monster" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Count</label>
          <Input value={count} onChange={(e) => setCount(e.target.value)} placeholder="1d4" />
        </div>
      </div>

      <div>
        <label className="text-xs text-muted-foreground">Activity</label>
        <div className="flex gap-2">
          <Select value="" onValueChange={(v) => setActivity(v)}>
            <SelectTrigger className="w-[160px] text-xs">
              <SelectValue placeholder="Pick…" />
            </SelectTrigger>
            <SelectContent>
              {WANDERING_MONSTER_ACTIVITIES.map((a) => (
                <SelectItem key={a} value={a} className="text-xs">{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={activity}
            onChange={(e) => setActivity(e.target.value)}
            placeholder="or type custom…"
            className="flex-1"
          />
        </div>
      </div>

      <div className="border-t pt-3">
        <label className="text-xs text-muted-foreground font-medium">Stats (optional)</label>
        <div className="grid grid-cols-3 gap-2 mt-1">
          <div>
            <label className="text-xs text-muted-foreground">AC</label>
            <Input type="number" value={ac} onChange={(e) => setAc(e.target.value)} placeholder="—" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">HP</label>
            <Input type="number" value={hp} onChange={(e) => setHp(e.target.value)} placeholder="—" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Attacks</label>
            <Input value={attacks} onChange={(e) => setAttacks(e.target.value)} placeholder="e.g. Bite d6" />
          </div>
        </div>
      </div>

      <Button onClick={handleSubmit} disabled={!name.trim()} className="w-full">
        <Plus className="size-4 mr-1.5" />
        Add to Table
      </Button>
    </div>
  )
}
