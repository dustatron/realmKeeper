import { useState } from 'react'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Plus, Trash2, Check, X, Sparkles } from 'lucide-react'
import { newId } from '@shared/ulid'
import { rollDice } from '@shared/dice'
import { rollOnTable } from '@domain/services/RandomTableEngine'
import { trapTableDefs } from '@domain/data/trap-tables'
import type { Trap } from '@domain/value-objects/Trap'

interface TrapSectionProps {
  traps: Trap[]
  onUpdate: (traps: Trap[]) => void
}

const effectTable = trapTableDefs.find((t) => t.id === 'table-trap-effect')!
const triggerTable = trapTableDefs.find((t) => t.id === 'table-trap-trigger')!

export function TrapSection({ traps, onUpdate }: TrapSectionProps) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [dc, setDc] = useState('')
  const [damage, setDamage] = useState('')

  const armed = traps.filter((t) => !t.disarmed).length

  const handleAdd = () => {
    if (!name.trim()) return
    const trap: Trap = {
      id: newId(),
      name: name.trim(),
      description: description.trim(),
      dc: dc ? parseInt(dc) || null : null,
      damage: damage.trim(),
      disarmed: false,
    }
    onUpdate([...traps, trap])
    setName('')
    setDescription('')
    setDc('')
    setDamage('')
    setAdding(false)
  }

  const handleGenerate = () => {
    const effect = rollOnTable(effectTable, rollDice)
    const trigger = rollOnTable(triggerTable, rollDice)
    const trap: Trap = {
      id: newId(),
      name: `${effect.entry.text} Trap`,
      description: `Triggered by ${trigger.entry.text.toLowerCase()}`,
      dc: null,
      damage: '',
      disarmed: false,
    }
    onUpdate([...traps, trap])
  }

  const toggleDisarmed = (id: string) => {
    onUpdate(traps.map((t) => (t.id === id ? { ...t, disarmed: !t.disarmed } : t)))
  }

  const removeTrap = (id: string) => {
    onUpdate(traps.filter((t) => t.id !== id))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          ⚠️ Traps
          {traps.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {armed} armed
            </Badge>
          )}
        </h4>
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="outline" onClick={handleGenerate}>
            <Sparkles className="mr-1.5 size-3.5" />
            Generate
          </Button>
          <Button size="sm" variant="outline" onClick={() => setAdding(!adding)}>
            <Plus className="mr-1.5 size-3.5" />
            Add Trap
          </Button>
        </div>
      </div>

      {/* Add form */}
      {adding && (
        <div className="space-y-2 mb-4 p-3 rounded-lg border bg-muted/30">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Trap name..."
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
          />
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
          />
          <div className="flex gap-2">
            <Input
              type="number"
              min="1"
              value={dc}
              onChange={(e) => setDc(e.target.value)}
              placeholder="DC (optional)"
              className="w-28"
            />
            <Input
              value={damage}
              onChange={(e) => setDamage(e.target.value)}
              placeholder="Damage (e.g. 2d6 fire)"
              className="flex-1"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
              <X className="mr-1 size-3" /> Cancel
            </Button>
            <Button size="sm" onClick={handleAdd} disabled={!name.trim()}>
              <Check className="mr-1 size-3" /> Add
            </Button>
          </div>
        </div>
      )}

      {/* Trap list */}
      {traps.length === 0 && !adding ? (
        <p className="text-sm text-muted-foreground">No traps in this location.</p>
      ) : (
        <div className="space-y-1">
          {traps.map((trap) => {
            const hasDetail = trap.trigger || trap.passiveHint || trap.activeHint || trap.disarmMethods?.length || trap.consequence || trap.targetAttribute
            return (
              <div
                key={trap.id}
                className={`px-3 py-2 rounded-md border text-sm ${trap.disarmed ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleDisarmed(trap.id)}
                    className="shrink-0 hover:scale-110 transition-transform"
                    title={trap.disarmed ? 'Re-arm trap' : 'Disarm trap'}
                  >
                    {trap.disarmed ? '✅' : '💣'}
                  </button>
                  <span className={`font-medium ${trap.disarmed ? 'line-through text-muted-foreground' : ''}`}>
                    {trap.name}
                  </span>
                  {trap.targetAttribute && (
                    <Badge variant="outline" className="text-xs shrink-0">
                      {trap.targetAttribute}
                    </Badge>
                  )}
                  {trap.dc !== null && (
                    <Badge variant="outline" className="text-xs shrink-0">
                      DC {trap.dc}
                    </Badge>
                  )}
                  {trap.damage && (
                    <span className="text-xs text-muted-foreground shrink-0">{trap.damage}</span>
                  )}
                  {!hasDetail && trap.description && (
                    <span className="text-xs text-muted-foreground truncate">{trap.description}</span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="size-6 p-0 ml-auto text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => removeTrap(trap.id)}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
                {hasDetail && (
                  <div className="mt-1.5 ml-7 space-y-0.5 text-xs text-muted-foreground">
                    {trap.description && <p>{trap.description}</p>}
                    {trap.trigger && <p><span className="font-medium text-foreground/70">Trigger:</span> {trap.trigger}</p>}
                    {trap.passiveHint && <p><span className="font-medium text-foreground/70">Passive hint:</span> {trap.passiveHint}</p>}
                    {trap.activeHint && <p><span className="font-medium text-foreground/70">Active hint:</span> {trap.activeHint}</p>}
                    {trap.consequence && <p><span className="font-medium text-foreground/70">Consequence:</span> {trap.consequence}</p>}
                    {trap.disarmMethods && trap.disarmMethods.length > 0 && (
                      <p><span className="font-medium text-foreground/70">Disarm:</span> {trap.disarmMethods.join(', ')}</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
