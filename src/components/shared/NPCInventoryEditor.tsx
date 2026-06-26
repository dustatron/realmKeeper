import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { BookOpen, Coins, Package, Plus, Trash2 } from 'lucide-react'
import { db } from '@infrastructure/dexie/db'
import {
  getCompendiumById,
  searchCompendium,
  searchCustomEntries,
} from '@domain/data/compendium'
import { rollOnTable } from '@domain/services/RandomTableEngine'
import { treasureTableDefs } from '@domain/data/treasure-tables'
import { rollDice } from '@shared/dice'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import type {
  CompendiumEntry,
  CompendiumEquipment,
  CompendiumMagicItem,
} from '@domain/entities/Compendium'
import type { InventoryItem } from '@domain/value-objects/SystemBlock'

type InventoryCompendiumKind = 'magicItem' | 'equipment'
type InventoryCompendiumEntry = CompendiumMagicItem | CompendiumEquipment

interface NPCInventoryEditorProps {
  inventory: InventoryItem[]
  onChange: (inventory: InventoryItem[]) => void
  systemId: string | null | undefined
  worldId: string | null | undefined
}

const goldTable = treasureTableDefs.find((table) => table.id === 'table-treasure-gold')
const gemsTable = treasureTableDefs.find((table) => table.id === 'table-treasure-gems')
const valuablesTable = treasureTableDefs.find((table) => table.id === 'table-treasure-valuables')
const treasureTables = [goldTable, gemsTable, valuablesTable].filter((table): table is NonNullable<typeof table> => Boolean(table))

function isInventoryCompendiumEntry(entry: CompendiumEntry): entry is InventoryCompendiumEntry {
  return entry.kind === 'magicItem' || entry.kind === 'equipment'
}

function sourceLabel(systemId: string): string {
  if (systemId === 'custom') return 'Custom'
  if (systemId.includes('cairn')) return 'Cairn'
  return 'SD'
}

function slotsForEntry(entry: InventoryCompendiumEntry): number {
  if (entry.kind === 'magicItem') return 1
  if (entry.systemData.system === 'shadowdark') return entry.systemData.data.slot
  if (entry.systemData.system === 'cairn') return entry.systemData.data.slots ?? 1
  return 1
}

function valueForEntry(entry: InventoryCompendiumEntry): string | undefined {
  if (entry.kind === 'magicItem') return undefined
  if (entry.systemData.system === 'shadowdark') {
    return `${entry.systemData.data.cost.amount} ${entry.systemData.data.cost.currency}`
  }
  if (entry.systemData.system === 'cairn') return `${entry.systemData.data.cost} gp`
  return entry.systemData.data.cost || undefined
}

function descriptionForEntry(entry: InventoryCompendiumEntry): string {
  if (entry.kind === 'equipment') {
    if (entry.systemData.system === 'shadowdark') {
      const details = [
        entry.systemData.data.itemType,
        entry.systemData.data.damage ? `Damage: ${entry.systemData.data.damage}` : null,
        entry.systemData.data.properties.length > 0 ? entry.systemData.data.properties.join(', ') : null,
      ].filter(Boolean)
      return details.join(' - ') || entry.description
    }
    if (entry.systemData.system === 'cairn') {
      const details = [
        entry.systemData.data.category,
        entry.systemData.data.damage ? `Damage: ${entry.systemData.data.damage}` : null,
        entry.systemData.data.armor != null ? `Armor: ${entry.systemData.data.armor}` : null,
        entry.systemData.data.properties.length > 0 ? entry.systemData.data.properties.join(', ') : null,
      ].filter(Boolean)
      return details.join(' - ') || entry.description
    }
  }
  return entry.description
}

function inventoryItemFromEntry(
  entry: InventoryCompendiumEntry,
  compendiumSource: 'system' | 'custom',
): InventoryItem {
  return {
    name: entry.name,
    slots: slotsForEntry(entry),
    description: descriptionForEntry(entry),
    value: valueForEntry(entry),
    source: 'compendium',
    compendiumId: entry.id,
    compendiumKind: entry.kind,
    compendiumSource,
  }
}

function inventoryItemFromTreasure(table: typeof treasureTables[number]): InventoryItem {
  const result = rollOnTable(table, rollDice)
  const valueMatch = result.entry.text.match(/\(([^)]+)\)/)
  return {
    name: result.entry.text,
    slots: 0,
    description: `Rolled ${result.diceResult.total} on ${result.tableName}`,
    value: valueMatch ? valueMatch[1] : undefined,
    source: 'treasure',
  }
}

function parseSlots(value: string): number {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, parsed)
}

function compendiumBadge(item: InventoryItem) {
  if (item.source === 'treasure') {
    return <Badge variant="outline" className="text-xs">Treasure</Badge>
  }
  if (item.compendiumKind === 'magicItem') {
    return <Badge variant="outline" className="text-xs text-violet-500">Magic</Badge>
  }
  if (item.compendiumKind === 'equipment') {
    return <Badge variant="outline" className="text-xs text-amber-500">Gear</Badge>
  }
  return null
}

export function NPCInventoryItemLink({ item, className }: { item: InventoryItem; className?: string }) {
  if (item.compendiumId && item.compendiumSource === 'custom') {
    return (
      <Link
        to="/realms/compendium/custom/$entryId"
        params={{ entryId: item.compendiumId }}
        className={className}
      >
        {item.name}
      </Link>
    )
  }

  if (item.compendiumId && item.compendiumKind === 'magicItem') {
    return (
      <Link
        to="/realms/compendium/magic-items/$itemId"
        params={{ itemId: item.compendiumId }}
        className={className}
      >
        {item.name}
      </Link>
    )
  }

  if (item.compendiumId && item.compendiumKind === 'equipment') {
    return (
      <Link
        to="/realms/compendium/equipment/$equipmentId"
        params={{ equipmentId: item.compendiumId }}
        className={className}
      >
        {item.name}
      </Link>
    )
  }

  return <span className={className}>{item.name}</span>
}

export function NPCInventoryEditor({
  inventory,
  onChange,
  systemId,
  worldId,
}: NPCInventoryEditorProps) {
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchKind, setSearchKind] = useState<InventoryCompendiumKind>('equipment')

  const customEntries = useLiveQuery(
    () => (worldId ? db.customCompendiumEntries.where('worldId').equals(worldId).toArray() : []),
    [worldId],
  ) ?? []

  const searchResults = useMemo(() => {
    const query = searchQuery.trim()
    if (!query) return []

    const systemResults = searchCompendium(query, undefined, searchKind)
      .filter(isInventoryCompendiumEntry)
      .sort((a, b) => {
        if (!systemId) return 0
        const aMatch = a.systemId === systemId ? 0 : 1
        const bMatch = b.systemId === systemId ? 0 : 1
        return aMatch - bMatch
      })

    const customResults = searchCustomEntries(customEntries, query, searchKind)
      .filter(isInventoryCompendiumEntry)

    const seen = new Set(systemResults.map((entry) => entry.id))
    return [...systemResults, ...customResults.filter((entry) => !seen.has(entry.id))].slice(0, 12)
  }, [customEntries, searchKind, searchQuery, systemId])

  const addManualItem = () => {
    onChange([...inventory, { name: '', slots: 1, description: '', source: 'manual' }])
  }

  const addCompendiumItem = (entry: InventoryCompendiumEntry) => {
    const compendiumSource = getCompendiumById(entry.id) ? 'system' : 'custom'
    onChange([...inventory, inventoryItemFromEntry(entry, compendiumSource)])
    setSearchQuery('')
    setShowSearch(false)
  }

  const addTreasure = (table: typeof treasureTables[number]) => {
    onChange([...inventory, inventoryItemFromTreasure(table)])
  }

  const addTreasureSet = () => {
    onChange([...inventory, ...treasureTables.map(inventoryItemFromTreasure)])
  }

  const updateInventoryItem = (index: number, updates: Partial<InventoryItem>) => {
    onChange(inventory.map((item, itemIndex) => (itemIndex === index ? { ...item, ...updates } : item)))
  }

  const removeInventoryItem = (index: number) => {
    onChange(inventory.filter((_, itemIndex) => itemIndex !== index))
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label className="flex items-center gap-2">
          <Package className="size-4" />
          Inventory
        </Label>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" size="sm" variant="outline">
                <Coins className="mr-1 size-3" />
                Treasure
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {treasureTables.map((table) => (
                <DropdownMenuItem key={table.id} onClick={() => addTreasure(table)}>
                  {table.name.replace('Treasure: ', '')}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem onClick={addTreasureSet}>
                Treasure set
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setShowSearch((value) => !value)}
          >
            <BookOpen className="mr-1 size-3" />
            Compendium
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={addManualItem}>
            <Plus className="mr-1 size-3" />
            Add
          </Button>
        </div>
      </div>

      {showSearch && (
        <div className="space-y-2 rounded-md border bg-muted/30 p-2">
          <div className="flex gap-2">
            <Select value={searchKind} onValueChange={(value) => setSearchKind(value as InventoryCompendiumKind)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equipment">Gear</SelectItem>
                <SelectItem value="magicItem">Magic Items</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search compendium..."
              className="flex-1"
              autoFocus
            />
          </div>
          {searchQuery.trim() && searchResults.length === 0 && (
            <p className="px-1 py-2 text-xs text-muted-foreground">No matches.</p>
          )}
          {searchResults.length > 0 && (
            <div className="space-y-1">
              {searchResults.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => addCompendiumItem(entry)}
                  className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted"
                >
                  <span className="min-w-0 truncate">{entry.name}</span>
                  <span className="flex shrink-0 items-center gap-1">
                    <Badge variant="secondary" className="text-[10px]">
                      {entry.kind === 'magicItem' ? 'Magic' : 'Gear'}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {sourceLabel(entry.systemId)}
                    </Badge>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {inventory.length === 0 ? (
        <p className="text-sm text-muted-foreground">No inventory items yet.</p>
      ) : (
        <div className="space-y-2">
          {inventory.map((item, index) => (
            <div key={`${item.name}:${index}`} className="rounded-md border p-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Input
                      placeholder="Item name"
                      value={item.name}
                      onChange={(event) => updateInventoryItem(index, { name: event.target.value })}
                    />
                    <div className="hidden shrink-0 items-center gap-1 sm:flex">
                      {compendiumBadge(item)}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      type="number"
                      min={0}
                      placeholder="Slots"
                      value={item.slots}
                      onChange={(event) => updateInventoryItem(index, { slots: parseSlots(event.target.value) })}
                    />
                    <Input
                      className="col-span-2"
                      placeholder="Description"
                      value={item.description}
                      onChange={(event) => updateInventoryItem(index, { description: event.target.value })}
                    />
                  </div>
                  {(item.compendiumId || item.value) && (
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {compendiumBadge(item)}
                      {item.value && <Badge variant="outline">{item.value}</Badge>}
                      {item.compendiumId && (
                        <NPCInventoryItemLink
                          item={item}
                          className="font-medium text-muted-foreground hover:text-foreground hover:underline"
                        />
                      )}
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => removeInventoryItem(index)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
