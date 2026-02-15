import { useState } from 'react'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Textarea } from '~/components/ui/textarea'
import { Label } from '~/components/ui/label'
import { Dices, Pencil, Save, X } from 'lucide-react'
import type { EncounterTable } from '@domain/entities/EncounterTable'
import type { EncounterCategory } from '@shared/constants'
import { DEFAULT_ENCOUNTER_ENTRIES } from '@domain/data/default-encounter-tables'

const CATEGORY_LABELS: Record<EncounterCategory, string> = {
  creature: 'Creature',
  signOmen: 'Sign / Omen',
  loss: 'Loss',
  npc: 'NPC',
  discovery: 'Discovery',
  treasure: 'Treasure',
}

const CATEGORY_ORDER: EncounterCategory[] = ['creature', 'signOmen', 'loss', 'npc', 'discovery', 'treasure']

interface EncounterTableUIProps {
  table: EncounterTable | null | undefined
  onRoll: () => Promise<{ category: EncounterCategory; categoryRoll: number; result: string }>
  onSave?: (entries: Pick<EncounterTable, 'creature' | 'signOmen' | 'loss' | 'npc' | 'discovery' | 'treasure'>) => void
}

export function EncounterTableUI({ table, onRoll, onSave }: EncounterTableUIProps) {
  const [lastRoll, setLastRoll] = useState<{ category: EncounterCategory; categoryRoll: number; result: string } | null>(null)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<Record<EncounterCategory, string>>({
    creature: '',
    signOmen: '',
    loss: '',
    npc: '',
    discovery: '',
    treasure: '',
  })

  const handleRoll = async () => {
    const result = await onRoll()
    setLastRoll(result)
  }

  const startEdit = () => {
    const entries = (cat: EncounterCategory) =>
      table?.[cat]?.length ? table[cat] : [...DEFAULT_ENCOUNTER_ENTRIES[cat]]
    setEditForm({
      creature: entries('creature').join('\n'),
      signOmen: entries('signOmen').join('\n'),
      loss: entries('loss').join('\n'),
      npc: entries('npc').join('\n'),
      discovery: entries('discovery').join('\n'),
      treasure: entries('treasure').join('\n'),
    })
    setEditing(true)
  }

  const handleSave = () => {
    if (!onSave) return
    const parse = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean)
    onSave({
      creature: parse(editForm.creature),
      signOmen: parse(editForm.signOmen),
      loss: parse(editForm.loss),
      npc: parse(editForm.npc),
      discovery: parse(editForm.discovery),
      treasure: parse(editForm.treasure),
    })
    setEditing(false)
  }

  const getEntries = (cat: EncounterCategory) =>
    table?.[cat]?.length ? table[cat] : [...DEFAULT_ENCOUNTER_ENTRIES[cat]]

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleRoll}>
          <Dices className="mr-1.5 size-4" />
          Roll Encounter
        </Button>
        {onSave && !editing && (
          <Button size="sm" variant="outline" onClick={startEdit}>
            <Pencil className="mr-1.5 size-3.5" />
            Edit Tables
          </Button>
        )}
        {editing && (
          <>
            <Button size="sm" onClick={handleSave}>
              <Save className="mr-1.5 size-3.5" />
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
              <X className="mr-1.5 size-3.5" />
              Cancel
            </Button>
          </>
        )}
      </div>

      {/* Last roll result */}
      {lastRoll && (
        <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3">
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-amber-600 hover:bg-amber-600 text-white">d6: {lastRoll.categoryRoll}</Badge>
            <Badge variant="outline">{CATEGORY_LABELS[lastRoll.category]}</Badge>
          </div>
          <p className="text-sm font-medium">{lastRoll.result}</p>
        </div>
      )}

      {/* d6 master table */}
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-2 w-10">d6</th>
              <th className="text-left p-2 w-28">Category</th>
              <th className="text-left p-2">Entries</th>
            </tr>
          </thead>
          <tbody>
            {CATEGORY_ORDER.map((cat, i) => {
              const isHighlighted = lastRoll?.category === cat
              return (
                <tr
                  key={cat}
                  className={`border-b last:border-0 ${isHighlighted ? 'bg-amber-500/10' : ''}`}
                >
                  <td className="p-2 font-mono text-muted-foreground">{i + 1}</td>
                  <td className="p-2 font-medium">{CATEGORY_LABELS[cat]}</td>
                  <td className="p-2">
                    {editing ? (
                      <Textarea
                        value={editForm[cat]}
                        onChange={(e) => setEditForm((f) => ({ ...f, [cat]: e.target.value }))}
                        rows={3}
                        className="text-xs"
                        placeholder="One entry per line..."
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {getEntries(cat).join(', ')}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
