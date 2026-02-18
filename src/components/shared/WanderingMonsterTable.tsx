import { useState } from 'react'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { Dices, Pencil, Plus, Trash2, Footprints } from 'lucide-react'
import { rollDice } from '@shared/dice'
import { getCompendiumById } from '@domain/data/compendium'
import type { WanderingMonsterEntry } from '@domain/value-objects/WanderingMonster'
import type { CompendiumMonster } from '@domain/entities/Compendium'

interface WanderingMonsterTableProps {
  entries: WanderingMonsterEntry[]
  onSave: (entries: WanderingMonsterEntry[]) => void
  /** Label for the section header */
  label?: string
}

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
    // Cairn stats string like "6 HP, 1 Armor" — extract armor
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
  if (d.system === 'shadowdark') {
    return d.data.attacks.split(',')[0]?.trim() ?? d.data.attacks
  }
  if (d.system === 'custom') return d.data.attacks || '—'
  if (d.system === 'cairn') {
    // First detail line often has attack info
    return d.data.details[0]?.split('.')[0] ?? '—'
  }
  return '—'
}

function formatLevel(monster: CompendiumMonster): string {
  const d = monster.systemData
  if (d.system === 'shadowdark') return String(d.data.level)
  if (d.system === 'custom') return d.data.cr || '—'
  return '—'
}

const EMPTY_ENTRY: WanderingMonsterEntry = { name: '', count: '1', activity: '', compendiumId: null }

export function WanderingMonsterTable({
  entries,
  onSave,
  label = 'Wandering Monsters',
}: WanderingMonsterTableProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editEntries, setEditEntries] = useState<WanderingMonsterEntry[]>([])
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  const dieSize = entries.length

  const handleRoll = () => {
    if (dieSize === 0) return
    const { total } = rollDice(`1d${dieSize}`)
    setSelectedIdx(total - 1)
    setExpandedIdx(total - 1)
  }

  const startEditing = () => {
    const padded = [...entries]
    while (padded.length < 6) padded.push({ ...EMPTY_ENTRY })
    setEditEntries(padded)
    setIsEditing(true)
  }

  const saveEditing = () => {
    const cleaned = editEntries.filter((e) => e.name.trim() !== '')
    onSave(cleaned)
    setIsEditing(false)
    setSelectedIdx(null)
    setExpandedIdx(null)
  }

  const updateEditEntry = (idx: number, patch: Partial<WanderingMonsterEntry>) => {
    setEditEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, ...patch } : e)))
  }

  const addEditRow = () => {
    setEditEntries((prev) => [...prev, { ...EMPTY_ENTRY }])
  }

  const removeEditRow = (idx: number) => {
    setEditEntries((prev) => prev.filter((_, i) => i !== idx))
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
          {!isEditing && (
            <Button
              size="sm"
              variant="ghost"
              onClick={startEditing}
              className="text-muted-foreground h-7 px-2"
            >
              <Pencil className="size-3 mr-1" />
              Edit
            </Button>
          )}
          {!isEditing && dieSize > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleRoll}
              className="gap-1.5 border-red-500/30 text-red-500 hover:bg-red-500/10 hover:text-red-500"
            >
              <Dices className="size-3.5" />
              Roll
            </Button>
          )}
        </div>
      </div>

      {/* Edit mode */}
      {isEditing ? (
        <div className="space-y-2">
          {editEntries.map((entry, i) => (
            <div key={i} className="flex items-start gap-2 rounded border bg-background p-2">
              <span className="text-xs font-mono text-muted-foreground pt-1.5 w-4 shrink-0">{i + 1}.</span>
              <div className="flex-1 grid grid-cols-[1fr_60px] gap-2">
                <input
                  className="text-sm bg-transparent border rounded px-2 py-1"
                  placeholder="Monster name…"
                  value={entry.name}
                  onChange={(e) => updateEditEntry(i, { name: e.target.value })}
                />
                <input
                  className="text-sm bg-transparent border rounded px-2 py-1 text-center"
                  placeholder="#"
                  value={entry.count}
                  onChange={(e) => updateEditEntry(i, { count: e.target.value })}
                />
                <input
                  className="text-sm bg-transparent border rounded px-2 py-1 col-span-2 text-muted-foreground"
                  placeholder="What are they doing…"
                  value={entry.activity}
                  onChange={(e) => updateEditEntry(i, { activity: e.target.value })}
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="size-6 p-0 shrink-0 text-muted-foreground hover:text-destructive mt-0.5"
                onClick={() => removeEditRow(i)}
              >
                <Trash2 className="size-3" />
              </Button>
            </div>
          ))}
          <div className="flex items-center justify-between pt-1">
            <Button size="sm" variant="ghost" onClick={addEditRow} className="h-7 px-2 text-xs gap-1">
              <Plus className="size-3" />
              Add Row
            </Button>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} className="h-7 px-3 text-xs">
                Cancel
              </Button>
              <Button size="sm" onClick={saveEditing} className="h-7 px-3 text-xs">
                Save
              </Button>
            </div>
          </div>
        </div>
      ) : dieSize > 0 ? (
        /* Roll table */
        <div className="overflow-hidden rounded border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
                <th className="px-2 py-1 text-left w-8">#</th>
                <th className="px-2 py-1 text-left">Creature</th>
                <th className="px-2 py-1 text-center w-10">AC</th>
                <th className="px-2 py-1 text-center w-10">HP</th>
                <th className="px-2 py-1 text-left">Atk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {entries.map((entry, i) => {
                const monster = getMonsterStats(entry.compendiumId)
                const isSelected = selectedIdx === i
                const isExpanded = expandedIdx === i
                return (
                  <tr
                    key={i}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-red-500/15 text-foreground'
                        : 'text-muted-foreground hover:bg-muted/30'
                    }`}
                    onClick={() => {
                      setSelectedIdx(isSelected ? null : i)
                      setExpandedIdx(isExpanded ? null : i)
                    }}
                  >
                    <td className="px-2 py-1.5 text-xs font-mono">
                      {isSelected && <span className="mr-0.5">🎲</span>}
                      {i + 1}
                    </td>
                    <td className="px-2 py-1.5">
                      <div className={`font-medium ${isSelected ? 'text-foreground' : 'text-foreground/80'}`}>
                        {entry.count && entry.count !== '1' ? `${entry.count} ` : ''}{entry.name}
                      </div>
                      {entry.activity && (
                        <div className="text-xs italic text-muted-foreground">{entry.activity}</div>
                      )}
                      {/* Expanded stats for selected row */}
                      {isExpanded && monster && (
                        <MonsterStatBlock monster={monster} />
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-center text-xs">{monster ? formatAC(monster) : '—'}</td>
                    <td className="px-2 py-1.5 text-center text-xs">{monster ? formatHP(monster) : '—'}</td>
                    <td className="px-2 py-1.5 text-xs">{monster ? formatAtk(monster) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">
          No wandering monsters set. Click Edit to add entries.
        </p>
      )}
    </div>
  )
}

/** Expanded stat block shown when a row is selected */
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
            <div key={i} className="text-muted-foreground">{detail}</div>
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
        <p className="italic text-muted-foreground pt-0.5 border-t border-border/50">{monster.description}</p>
      )}
    </div>
  )
}
