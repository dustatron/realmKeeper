import { useState } from 'react'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { Gem, Plus, Trash2, Check, X, Sparkles, Coins, Diamond, Crown } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { newId } from '@shared/ulid'
import { rollDice } from '@shared/dice'
import { rollOnTable } from '@domain/services/RandomTableEngine'
import { treasureTableDefs } from '@domain/data/treasure-tables'
import type { TreasureItem } from '@domain/value-objects/TreasureItem'

function itemIcon(item: TreasureItem, collected: boolean): string {
  if (collected) return '✅'
  if (item.isMagic && item.name.startsWith('Scroll of')) return '📜'
  if (item.isMagic) return '✨'
  if (item.description?.includes('Damage:')) return '⚔'
  if (item.description?.startsWith('Condition:')) return '🎒'
  return '💰'
}

interface TreasureSectionProps {
  treasure: TreasureItem[]
  onUpdate: (treasure: TreasureItem[]) => void
}

const goldTable = treasureTableDefs.find((t) => t.id === 'table-treasure-gold')!
const gemsTable = treasureTableDefs.find((t) => t.id === 'table-treasure-gems')!
const valuablesTable = treasureTableDefs.find((t) => t.id === 'table-treasure-valuables')!

function generateFromTable(table: typeof goldTable): TreasureItem {
  const result = rollOnTable(table, rollDice)
  // Try to extract value from parenthetical (e.g., "Garnet (100 gp)" → value "100 gp")
  const valueMatch = result.entry.text.match(/\(([^)]+)\)/)
  return {
    id: newId(),
    name: result.entry.text,
    description: `Rolled ${result.diceResult.total} on ${result.tableName}`,
    value: valueMatch ? valueMatch[1] : '',
    quantity: 1,
    collected: false,
  }
}

export function TreasureSection({ treasure, onUpdate }: TreasureSectionProps) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [value, setValue] = useState('')
  const [qty, setQty] = useState('1')
  const [desc, setDesc] = useState('')

  const uncollected = treasure.filter((t) => !t.collected).length

  const handleAdd = () => {
    if (!name.trim()) return
    const item: TreasureItem = {
      id: newId(),
      name: name.trim(),
      description: desc.trim(),
      value: value.trim(),
      quantity: parseInt(qty) || 1,
      collected: false,
    }
    onUpdate([...treasure, item])
    setName('')
    setValue('')
    setQty('1')
    setDesc('')
    setAdding(false)
  }

  const handleGenerate = (table: typeof goldTable) => {
    const item = generateFromTable(table)
    onUpdate([...treasure, item])
  }

  const handleGenerateAll = () => {
    const items = [
      generateFromTable(goldTable),
      generateFromTable(gemsTable),
      generateFromTable(valuablesTable),
    ]
    onUpdate([...treasure, ...items])
  }

  const toggleCollected = (id: string) => {
    onUpdate(treasure.map((t) => (t.id === id ? { ...t, collected: !t.collected } : t)))
  }

  const removeItem = (id: string) => {
    onUpdate(treasure.filter((t) => t.id !== id))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Gem className="size-4" />
          Treasure
          {treasure.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {uncollected} uncollected
            </Badge>
          )}
        </h4>
        <div className="flex items-center gap-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                <Sparkles className="mr-1.5 size-3.5" />
                Generate
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleGenerate(goldTable)}>
                <Coins className="mr-2 size-4 text-yellow-500" />
                Roll Gold ({goldTable.diceFormula})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleGenerate(gemsTable)}>
                <Diamond className="mr-2 size-4 text-blue-500" />
                Roll Gems ({gemsTable.diceFormula})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleGenerate(valuablesTable)}>
                <Crown className="mr-2 size-4 text-purple-500" />
                Roll Valuables ({valuablesTable.diceFormula})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleGenerateAll}>
                <Sparkles className="mr-2 size-4 text-amber-500" />
                Roll All Three
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" variant="outline" onClick={() => setAdding(!adding)}>
            <Plus className="mr-1.5 size-3.5" />
            Add Loot
          </Button>
        </div>
      </div>

      {/* Add form */}
      {adding && (
        <div className="space-y-2 mb-4 p-3 rounded-lg border bg-muted/30">
          <div className="flex gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Item name..."
              className="flex-1"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
            />
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Value (e.g. 50 gp)"
              className="w-32"
            />
            <Input
              type="number"
              min="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="Qty"
              className="w-16"
            />
          </div>
          <Input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Description (optional)"
          />
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

      {/* Treasure list */}
      {treasure.length === 0 && !adding ? (
        <p className="text-sm text-muted-foreground">No treasure in this location.</p>
      ) : (
        <div className="space-y-1">
          {treasure.map((item) => {
            const isScroll = item.name.startsWith('Scroll of')
            const isWeapon = item.description?.includes('Damage:')
            return (
              <div key={item.id} className={`rounded-md border overflow-hidden ${item.collected ? 'opacity-50' : ''}`}>
                {/* Main row */}
                <div className="flex items-center gap-2 px-3 py-2 text-sm">
                  <button
                    onClick={() => toggleCollected(item.id)}
                    className="shrink-0 text-base leading-none hover:scale-110 transition-transform"
                    title={item.collected ? 'Mark as uncollected' : 'Mark as collected'}
                  >
                    {itemIcon(item, item.collected)}
                  </button>
                  <span className={`font-medium flex-1 ${item.collected ? 'line-through text-muted-foreground' : ''}`}>
                    {item.quantity > 1 && `${item.quantity}× `}{item.name}
                  </span>
                  {item.value && (
                    <Badge variant="outline" className="text-xs shrink-0">{item.value}</Badge>
                  )}
                  {isWeapon && item.description && (
                    <span className="text-xs text-muted-foreground shrink-0">
                      {item.description.replace('Damage: ', '').split(' · ')[0]}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="size-6 p-0 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => removeItem(item.id)}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
                {/* Description + link row for magic/scrolls */}
                {item.description && !isWeapon && (
                  <div className="flex items-start justify-between gap-2 px-3 pb-2 border-t border-border/30 pt-1.5">
                    <p className="text-xs text-muted-foreground italic flex-1">{item.description}</p>
                    {item.compendiumId && item.isMagic && !isScroll && (
                      <Link
                        to="/realms/compendium/magic-items/$itemId"
                        params={{ itemId: item.compendiumId }}
                        className="text-xs text-amber-500 hover:underline shrink-0"
                      >
                        Details →
                      </Link>
                    )}
                    {item.compendiumId && item.isMagic && isScroll && (
                      <Link
                        to="/realms/compendium/spells/$spellId"
                        params={{ spellId: item.compendiumId }}
                        className="text-xs text-purple-400 hover:underline shrink-0"
                      >
                        Spell →
                      </Link>
                    )}
                  </div>
                )}
                {/* Condition tag for weapons/gear */}
                {isWeapon && item.description?.includes('Condition:') && (
                  <div className="px-3 pb-1.5">
                    <Badge variant="secondary" className="text-xs">
                      {item.description.split('Condition: ')[1]}
                    </Badge>
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
