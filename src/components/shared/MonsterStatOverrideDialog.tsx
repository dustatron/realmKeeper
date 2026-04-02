import { useState, useEffect } from 'react'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { Input } from '~/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '~/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { Trash2 } from 'lucide-react'
import { WANDERING_MONSTER_ACTIVITIES } from '@domain/data/wandering-monster-activities'
import type { WanderingMonsterEntry } from '@domain/value-objects/WanderingMonster'
import { entryAC, entryHP, entryAtk } from './wanderingMonsterUtils'

export function MonsterStatOverrideDialog({
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
