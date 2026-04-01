import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { Input } from '~/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '~/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '~/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { Dices, Plus, Trash2, Footprints, Search, Users, BookOpen, PenLine, Pencil } from 'lucide-react'
import { rollDice } from '@shared/dice'
import { getCompendiumById, getMonstersBySystemId, searchCompendium, searchCustomEntries } from '@domain/data/compendium'
import { WANDERING_MONSTER_ACTIVITIES } from '@domain/data/wandering-monster-activities'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@infrastructure/dexie/db'
import type { WanderingMonsterEntry } from '@domain/value-objects/WanderingMonster'
import type { CompendiumEntry, CompendiumMonster } from '@domain/entities/Compendium'
import type { NPC } from '@domain/entities/NPC'
import type { POI } from '@domain/entities/POI'

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
}

// --- Stat helpers ---

function getMonsterStats(compendiumId: string | null) {
  if (!compendiumId) return null
  const entry = getCompendiumById(compendiumId)
  if (!entry || entry.kind !== 'monster') return null
  return entry as CompendiumMonster
}

function formatAC(monster: CompendiumMonster): string {
  const d = monster.systemData
  if (d.system === 'shadowdark') return String(d.data.armorClass)
  if (d.system === 'custom') return d.data.ac != null ? String(d.data.ac) : '—'
  if (d.system === 'cairn') {
    const m = d.data.stats.match(/(\d+)\s*armor/i)
    return m ? m[1] : '—'
  }
  return '—'
}

function formatHP(monster: CompendiumMonster): string {
  const d = monster.systemData
  if (d.system === 'shadowdark') return String(d.data.hitPoints)
  if (d.system === 'custom') return d.data.hp != null ? String(d.data.hp) : '—'
  if (d.system === 'cairn') {
    const m = d.data.stats.match(/(\d+)\s*hp/i)
    return m ? m[1] : '—'
  }
  return '—'
}

function formatAtk(monster: CompendiumMonster): string {
  const d = monster.systemData
  if (d.system === 'shadowdark') return d.data.attacks.split(',')[0]?.trim() ?? d.data.attacks
  if (d.system === 'custom') return d.data.attacks || '—'
  if (d.system === 'cairn') return d.data.details[0]?.split('.')[0] ?? '—'
  return '—'
}

function entryAC(entry: WanderingMonsterEntry): string {
  const monster = getMonsterStats(entry.compendiumId)
  if (monster) return formatAC(monster)
  if (entry.customStats?.ac != null) return String(entry.customStats.ac)
  return '—'
}

function entryHP(entry: WanderingMonsterEntry): string {
  const monster = getMonsterStats(entry.compendiumId)
  if (monster) return formatHP(monster)
  if (entry.customStats?.hp != null) return String(entry.customStats.hp)
  return '—'
}

function entryAtk(entry: WanderingMonsterEntry): string {
  const monster = getMonsterStats(entry.compendiumId)
  if (monster) return formatAtk(monster)
  if (entry.customStats?.attacks) return entry.customStats.attacks
  return '—'
}

/** Extract AC/HP/Atk from an NPC's systemBlock */
function npcToCustomStats(npc: NPC) {
  const sb = npc.systemBlock
  if (!sb) return null
  const atkStr = sb.attacks.length > 0
    ? sb.attacks.map((a) => `${a.name} ${a.damage}`).join(', ')
    : ''
  return {
    ac: sb.armor || null,
    hp: sb.hp || null,
    attacks: atkStr,
  }
}

/** Derive source label from entry data */
function entrySource(entry: WanderingMonsterEntry): string {
  if (entry.npcId) return 'Denizen'
  if (entry.compendiumId) {
    return getCompendiumById(entry.compendiumId) ? 'Core Rules' : 'Custom Monster'
  }
  return 'Custom'
}

// --- Main Component ---

export function WanderingMonsterTable({
  entries,
  onSave,
  label = 'Wandering Monsters',
  npcs = [],
  poiChildren = [],
  systemId,
  worldId,
}: WanderingMonsterTableProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const [showAddSheet, setShowAddSheet] = useState(false)
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [rollingIdx, setRollingIdx] = useState<number | null>(null)
  const [isRolling, setIsRolling] = useState(false)
  const rollTimers = useRef<ReturnType<typeof setTimeout>[]>([])

  const dieSize = entries.length

  // Clean up timers on unmount
  useEffect(() => {
    return () => rollTimers.current.forEach(clearTimeout)
  }, [])

  const handleRoll = useCallback(() => {
    if (dieSize === 0 || isRolling) return
    // Roll the actual result first
    const { total } = rollDice(`1d${dieSize}`)
    const finalIdx = total - 1

    setIsRolling(true)
    setExpandedIdx(null)
    rollTimers.current.forEach(clearTimeout)
    rollTimers.current = []

    // Slot machine: quick burst then settle
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
    // Final settle
    const settleTimer = setTimeout(() => {
      setRollingIdx(null)
      setIsRolling(false)
      setSelectedIdx(finalIdx)
      setExpandedIdx(finalIdx)
    }, elapsed + 200)
    rollTimers.current.push(settleTimer)
  }, [dieSize, isRolling])

  const addEntry = (entry: WanderingMonsterEntry) => {
    onSave([...entries, entry])
  }

  const updateEntry = (idx: number, entry: WanderingMonsterEntry) => {
    onSave(entries.map((e, i) => i === idx ? entry : e))
  }

  const removeEntry = (idx: number) => {
    onSave(entries.filter((_, i) => i !== idx))
    if (selectedIdx === idx) setSelectedIdx(null)
    if (expandedIdx === idx) setExpandedIdx(null)
    if (editingIdx === idx) setEditingIdx(null)
  }

  return (
    <div className="rounded-lg border border-dashed border-red-500/30 bg-red-500/5 p-3">
      {/* Header */}
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

      {/* Roll table */}
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

      {/* Add Creature Sheet */}
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

      {/* Edit Creature Sheet */}
      {editingIdx != null && entries[editingIdx] && (
        <EditCreatureSheet
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

interface AddCreatureSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (entry: WanderingMonsterEntry) => void
  npcs: NPC[]
  poiChildren: POI[]
  existingNames: Set<string>
  systemId?: string | null
  worldId?: string | null
}

function AddCreatureSheet({
  open,
  onOpenChange,
  onAdd,
  npcs,
  poiChildren,
  existingNames,
  systemId,
  worldId,
}: AddCreatureSheetProps) {
  const [tab, setTab] = useState<string>('bestiary')

  const poiNameMap = useMemo(
    () => new Map(poiChildren.map((p) => [p.id, p.name])),
    [poiChildren],
  )

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
            <BestiaryTab
              onAdd={handleAdd}
              existingNames={existingNames}
              systemId={systemId}
              worldId={worldId}
            />
          </TabsContent>

          <TabsContent value="denizens" className="mt-3">
            <DenizensTab
              npcs={npcs}
              poiNameMap={poiNameMap}
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

// --- Edit Creature Sheet ---

function EditCreatureSheet({
  open,
  onOpenChange,
  entry,
  hasCompendiumStats,
  onSave,
  onDelete,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry: WanderingMonsterEntry
  hasCompendiumStats: boolean
  onSave: (updated: WanderingMonsterEntry) => void
  onDelete: () => void
}) {
  const [name, setName] = useState(entry.name)
  const [creatureType, setCreatureType] = useState(entry.creatureType ?? '')
  const [count, setCount] = useState(entry.count)
  const [activity, setActivity] = useState(entry.activity)
  const [ac, setAc] = useState(entry.customStats?.ac != null ? String(entry.customStats.ac) : '')
  const [hp, setHp] = useState(entry.customStats?.hp != null ? String(entry.customStats.hp) : '')
  const [attacks, setAttacks] = useState(entry.customStats?.attacks ?? '')

  // Reset form when entry changes
  useEffect(() => {
    setName(entry.name)
    setCreatureType(entry.creatureType ?? '')
    setCount(entry.count)
    setActivity(entry.activity)
    setAc(entry.customStats?.ac != null ? String(entry.customStats.ac) : '')
    setHp(entry.customStats?.hp != null ? String(entry.customStats.hp) : '')
    setAttacks(entry.customStats?.attacks ?? '')
  }, [entry])

  const handleSave = () => {
    if (!name.trim()) return
    const customStats = hasCompendiumStats ? entry.customStats : (ac || hp || attacks) ? {
      ac: ac ? parseInt(ac) : null,
      hp: hp ? parseInt(hp) : null,
      attacks,
    } : null
    onSave({
      ...entry,
      name: name.trim(),
      creatureType: creatureType.trim(),
      count: count || '1',
      activity,
      customStats,
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto p-6">
        <SheetHeader>
          <SheetTitle>Edit Creature</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-[1fr_1fr_60px] gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
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

          {/* Stats — editable unless from bestiary */}
          {hasCompendiumStats ? (
            <div className="rounded border border-border/50 bg-muted/30 p-2">
              <p className="text-xs text-muted-foreground">Stats from bestiary (read-only)</p>
              <div className="flex items-center gap-3 text-xs mt-1">
                <span>AC {entryAC(entry)}</span>
                <span>HP {entryHP(entry)}</span>
                <span>Atk: {entryAtk(entry)}</span>
              </div>
            </div>
          ) : (
            <div className="border-t pt-3">
              <label className="text-xs text-muted-foreground font-medium">Stats</label>
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
          )}

          {/* Source badge */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {entry.compendiumId && <Badge variant="outline" className="text-[10px]">📖 Bestiary</Badge>}
            {entry.npcId && <Badge variant="outline" className="text-[10px]">👤 Denizen</Badge>}
            {!entry.compendiumId && !entry.npcId && <Badge variant="outline" className="text-[10px]">✏️ Custom</Badge>}
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={!name.trim()} className="flex-1">
              Save
            </Button>
            <Button variant="destructive" size="sm" onClick={onDelete}>
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// --- Bestiary Tab ---

function bestiaryEntryToWandering(entry: CompendiumEntry): WanderingMonsterEntry {
  const isBuiltIn = !!getCompendiumById(entry.id)
  let customStats: WanderingMonsterEntry['customStats'] = null
  if (!isBuiltIn && entry.kind === 'monster') {
    const m = entry as CompendiumMonster
    const d = m.systemData
    if (d.system === 'custom') {
      customStats = { ac: d.data.ac ?? null, hp: d.data.hp ?? null, attacks: d.data.attacks || '' }
    } else if (d.system === 'shadowdark') {
      customStats = { ac: d.data.armorClass, hp: d.data.hitPoints, attacks: d.data.attacks }
    } else if (d.system === 'cairn') {
      const acM = d.data.stats.match(/(\d+)\s*armor/i)
      const hpM = d.data.stats.match(/(\d+)\s*hp/i)
      customStats = { ac: acM ? parseInt(acM[1]) : null, hp: hpM ? parseInt(hpM[1]) : null, attacks: d.data.details[0]?.split('.')[0] ?? '' }
    }
  }
  return { name: entry.name, creatureType: 'monster', count: '1', activity: '', compendiumId: entry.id, npcId: null, customStats }
}

function BestiaryTab({
  onAdd,
  existingNames,
  systemId,
  worldId,
}: {
  onAdd: (entry: WanderingMonsterEntry) => void
  existingNames: Set<string>
  systemId?: string | null
  worldId?: string | null
}) {
  const [query, setQuery] = useState('')
  const [randomEntry, setRandomEntry] = useState<CompendiumEntry | null>(null)

  const customEntries = useLiveQuery(
    () => worldId ? db.customCompendiumEntries.where('worldId').equals(worldId).toArray() : [],
    [worldId],
  ) ?? []

  const results = useMemo(() => {
    if (!query.trim()) return []
    const systemResults = searchCompendium(query, undefined, 'monster')
    if (systemId) {
      systemResults.sort((a, b) => {
        const aMatch = a.systemId === systemId ? 0 : 1
        const bMatch = b.systemId === systemId ? 0 : 1
        return aMatch - bMatch
      })
    }
    const customResults = searchCustomEntries(customEntries, query, 'monster')
    const seen = new Set(systemResults.map((r) => r.id))
    return [...systemResults, ...customResults.filter((r) => !seen.has(r.id))].slice(0, 20)
  }, [query, systemId, customEntries])

  const handleRandom = () => {
    const pool = systemId ? getMonstersBySystemId(systemId) : []
    if (pool.length === 0) return
    const pick = pool[Math.floor(Math.random() * pool.length)]
    setRandomEntry(pick)
    setQuery('')
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setRandomEntry(null) }}
            placeholder="Search monsters…"
            className="pl-9"
            autoFocus
          />
        </div>
        <Button size="sm" variant="outline" onClick={handleRandom} className="shrink-0 gap-1" title="Random monster">
          <Dices className="size-3.5" />
        </Button>
      </div>

      {/* Random pick */}
      {randomEntry && !query.trim() && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-amber-500">🎲 Random Pick</span>
            <Button size="sm" variant="ghost" className="h-5 px-1.5 text-xs text-muted-foreground" onClick={handleRandom}>
              reroll
            </Button>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="font-medium text-sm">{randomEntry.name}</span>
              {randomEntry.kind === 'monster' && (() => {
                const m = randomEntry as CompendiumMonster
                return (
                  <span className="text-xs text-muted-foreground ml-2">
                    AC {formatAC(m)} · HP {formatHP(m)}
                  </span>
                )
              })()}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 gap-1 h-7"
              disabled={existingNames.has(randomEntry.name.toLowerCase())}
              onClick={() => { onAdd(bestiaryEntryToWandering(randomEntry)); setRandomEntry(null) }}
            >
              <Plus className="size-3" />
              Add
            </Button>
          </div>
        </div>
      )}

      {query.trim() && results.length === 0 && (
        <p className="text-xs text-muted-foreground py-2 text-center">No results for "{query}"</p>
      )}
      {results.length > 0 && (
        <div className="space-y-1 max-h-[400px] overflow-y-auto">
          {results.map((entry) => {
            const monster = entry.kind === 'monster' ? entry as CompendiumMonster : null
            const alreadyAdded = existingNames.has(entry.name.toLowerCase())
            const sourceBadge = entry.systemId === 'custom' ? 'Custom' : entry.systemId.includes('cairn') ? 'Cairn' : 'SD'
            return (
              <button
                key={entry.id}
                onClick={() => { onAdd(bestiaryEntryToWandering(entry)) }}
                disabled={alreadyAdded}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between gap-2 ${
                  alreadyAdded ? 'opacity-40 cursor-not-allowed' : 'hover:bg-muted'
                }`}
              >
                <div className="min-w-0">
                  <span className="font-medium">{entry.name}</span>
                  {monster && (
                    <span className="text-xs text-muted-foreground ml-2">
                      AC {formatAC(monster)} · HP {formatHP(monster)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Badge variant="outline" className="text-[10px]">{sourceBadge}</Badge>
                  {alreadyAdded ? (
                    <span className="text-xs text-muted-foreground">added</span>
                  ) : (
                    <Plus className="size-3.5 text-muted-foreground" />
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// --- Denizens Tab ---

function DenizensTab({
  npcs,
  poiNameMap,
  existingNames,
  onAdd,
}: {
  npcs: NPC[]
  poiNameMap: Map<string, string>
  existingNames: Set<string>
  onAdd: (entry: WanderingMonsterEntry) => void
}) {
  const [query, setQuery] = useState('')
  const [randomNpc, setRandomNpc] = useState<NPC | null>(null)

  const filtered = useMemo(() => {
    if (!query.trim()) return npcs.slice(0, 30)
    const q = query.toLowerCase()
    return npcs
      .filter((n) => n.name.toLowerCase().includes(q) || n.tags.some((t) => t.toLowerCase().includes(q)))
      .slice(0, 30)
  }, [npcs, query])

  const handleSelect = (npc: NPC) => {
    onAdd({
      name: npc.name,
      creatureType: npc.race || '',
      count: '1',
      activity: '',
      compendiumId: null,
      npcId: npc.id,
      customStats: npcToCustomStats(npc),
    })
  }

  const handleRandom = () => {
    if (npcs.length === 0) return
    const pick = npcs[Math.floor(Math.random() * npcs.length)]
    setRandomNpc(pick)
    setQuery('')
  }

  if (npcs.length === 0) {
    return <p className="text-xs text-muted-foreground py-4 text-center">No denizens at this location.</p>
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setRandomNpc(null) }}
            placeholder="Search denizens…"
            className="pl-9"
            autoFocus
          />
        </div>
        <Button size="sm" variant="outline" onClick={handleRandom} className="shrink-0 gap-1" title="Random denizen">
          <Dices className="size-3.5" />
        </Button>
      </div>

      {/* Random pick */}
      {randomNpc && !query.trim() && (() => {
        const stats = npcToCustomStats(randomNpc)
        const roomName = randomNpc.poiId ? poiNameMap.get(randomNpc.poiId) : undefined
        const alreadyAdded = existingNames.has(randomNpc.name.toLowerCase())
        return (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-amber-500">🎲 Random Pick</span>
              <Button size="sm" variant="ghost" className="h-5 px-1.5 text-xs text-muted-foreground" onClick={handleRandom}>
                reroll
              </Button>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="font-medium text-sm">{randomNpc.name}</span>
                {roomName && <span className="text-xs text-muted-foreground ml-2">in {roomName}</span>}
                {stats && (stats.ac || stats.hp) && (
                  <span className="text-xs text-muted-foreground ml-2">
                    {stats.ac ? `AC ${stats.ac}` : ''}{stats.ac && stats.hp ? ' · ' : ''}{stats.hp ? `HP ${stats.hp}` : ''}
                  </span>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 gap-1 h-7"
                disabled={alreadyAdded}
                onClick={() => { handleSelect(randomNpc); setRandomNpc(null) }}
              >
                <Plus className="size-3" />
                Add
              </Button>
            </div>
          </div>
        )
      })()}

      <div className="space-y-1 max-h-[400px] overflow-y-auto">
        {filtered.map((npc) => {
          const alreadyAdded = existingNames.has(npc.name.toLowerCase())
          const roomName = npc.poiId ? poiNameMap.get(npc.poiId) : undefined
          const stats = npcToCustomStats(npc)
          return (
            <button
              key={npc.id}
              onClick={() => handleSelect(npc)}
              disabled={alreadyAdded}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between gap-2 ${
                alreadyAdded ? 'opacity-40 cursor-not-allowed' : 'hover:bg-muted'
              }`}
            >
              <div className="min-w-0">
                <span className="font-medium">{npc.name}</span>
                {roomName && (
                  <span className="text-xs text-muted-foreground ml-2">in {roomName}</span>
                )}
                {stats && (stats.ac || stats.hp) && (
                  <span className="text-xs text-muted-foreground ml-2">
                    {stats.ac ? `AC ${stats.ac}` : ''}{stats.ac && stats.hp ? ' · ' : ''}{stats.hp ? `HP ${stats.hp}` : ''}
                  </span>
                )}
                {npc.tags.length > 0 && (
                  <div className="flex gap-1 mt-0.5">
                    {npc.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
                    ))}
                  </div>
                )}
              </div>
              {alreadyAdded ? (
                <span className="text-xs text-muted-foreground shrink-0">added</span>
              ) : (
                <Plus className="size-3.5 text-muted-foreground shrink-0" />
              )}
            </button>
          )
        })}
      </div>
    </div>
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
    // Reset form
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

// --- Expanded Stat Block ---

function MonsterStatBlock({ monster }: { monster: CompendiumMonster }) {
  const d = monster.systemData

  return (
    <div className="mt-1.5 rounded border border-border/50 bg-background p-2 text-xs space-y-1">
      {d.system === 'shadowdark' && (
        <>
          <div className="flex items-center gap-3 flex-wrap">
            <span>LV {d.data.level}</span>
            <span>AC {d.data.armorClass}{d.data.armorType ? ` (${d.data.armorType})` : ''}</span>
            <span>HP {d.data.hitPoints}</span>
            <span>{d.data.movement}</span>
            <span className="capitalize text-muted-foreground">{d.data.alignment}</span>
          </div>
          <div><span className="font-medium">Atk:</span> {d.data.attacks}</div>
          <div className="flex gap-2 flex-wrap text-muted-foreground">
            <span>S {d.data.strength >= 0 ? `+${d.data.strength}` : d.data.strength}</span>
            <span>D {d.data.dexterity >= 0 ? `+${d.data.dexterity}` : d.data.dexterity}</span>
            <span>C {d.data.constitution >= 0 ? `+${d.data.constitution}` : d.data.constitution}</span>
            <span>I {d.data.intelligence >= 0 ? `+${d.data.intelligence}` : d.data.intelligence}</span>
            <span>W {d.data.wisdom >= 0 ? `+${d.data.wisdom}` : d.data.wisdom}</span>
            <span>Ch {d.data.charisma >= 0 ? `+${d.data.charisma}` : d.data.charisma}</span>
          </div>
          {d.data.traits.length > 0 && (
            <div className="space-y-0.5 pt-0.5 border-t border-border/50">
              {d.data.traits.map((trait) => (
                <div key={trait.name}>
                  <span className="font-semibold">{trait.name}.</span>{' '}
                  <span className="text-muted-foreground">{trait.description}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {d.system === 'cairn' && (
        <>
          <div className="text-muted-foreground">{d.data.stats}</div>
          {d.data.details.map((detail, i) => (
            <div key={i} className="text-muted-foreground [&_strong]:font-semibold [&_strong]:text-foreground [&_em]:italic" dangerouslySetInnerHTML={{ __html: detail }} />
          ))}
        </>
      )}
      {d.system === 'custom' && (
        <div className="flex items-center gap-3 flex-wrap">
          {d.data.cr && <span>CR {d.data.cr}</span>}
          {d.data.ac != null && <span>AC {d.data.ac}</span>}
          {d.data.hp != null && <span>HP {d.data.hp}</span>}
          {d.data.speed && <span>{d.data.speed}</span>}
          {d.data.attacks && <div><span className="font-medium">Atk:</span> {d.data.attacks}</div>}
          {d.data.abilities && <div><span className="font-medium">Abilities:</span> {d.data.abilities}</div>}
        </div>
      )}
      {monster.description && (
        <p className="italic text-muted-foreground pt-0.5 border-t border-border/50 [&_strong]:font-semibold [&_strong]:not-italic [&_strong]:text-foreground" dangerouslySetInnerHTML={{ __html: monster.description }} />
      )}
    </div>
  )
}
