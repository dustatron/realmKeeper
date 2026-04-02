import { useState, useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { queryDb, Schema } from '@livestore/livestore'
import { useQuery } from '@livestore/react'
import { getCompendiumById, searchCompendium, searchCustomEntries, customEntryToCompendiumEntry } from '@domain/data/compendium'
import type { CustomCompendiumEntry } from '@domain/entities/CustomCompendiumEntry'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Plus, Book, X } from 'lucide-react'
import type { POI } from '@domain/entities/POI'
import type { CompendiumRef } from '@domain/entities/Compendium'

export function CompendiumRefsSection({
  poi,
  systemId,
  worldId,
  onUpdate,
}: {
  poi: POI
  systemId: string | null
  worldId: string | null
  onUpdate: (refs: { monsterRefs: CompendiumRef[]; magicItemRefs: CompendiumRef[]; spellRefs: CompendiumRef[]; equipmentRefs: CompendiumRef[] }) => void
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchKind, setSearchKind] = useState<'all' | 'monster' | 'spell' | 'magicItem' | 'equipment'>('all')
  const [showSearch, setShowSearch] = useState(false)

  const customEntries = useQuery(queryDb({
    query: worldId
      ? 'SELECT * FROM customCompendiumEntries WHERE worldId = $worldId'
      : 'SELECT * FROM customCompendiumEntries WHERE 1 = 0',
    schema: Schema.Array(Schema.Unknown),
    bindValues: worldId ? { $worldId: worldId } : {},
  }, { deps: [worldId] })) as CustomCompendiumEntry[]

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    const kindFilter = searchKind === 'all' ? undefined : searchKind
    const systemResults = searchCompendium(searchQuery, undefined, kindFilter)
    if (systemId) {
      systemResults.sort((a, b) => {
        const aMatch = a.systemId === systemId ? 0 : 1
        const bMatch = b.systemId === systemId ? 0 : 1
        return aMatch - bMatch
      })
    }
    const customResults = searchCustomEntries(customEntries, searchQuery, kindFilter)
    const seen = new Set(systemResults.map((r) => r.id))
    const merged = [...systemResults, ...customResults.filter((r) => !seen.has(r.id))]
    return merged.slice(0, 15)
  }, [searchQuery, systemId, searchKind, customEntries])

  const addRef = (id: string) => {
    const entry = searchResults.find((r) => r.id === id)
    const kind = entry?.kind ?? (searchKind !== 'all' ? searchKind : 'monster')
    const refsKey = kind === 'monster' ? 'monsterRefs' : kind === 'spell' ? 'spellRefs' : kind === 'equipment' ? 'equipmentRefs' : 'magicItemRefs'
    const currentRefs = poi[refsKey] ?? []
    if (currentRefs.some((r) => r.id === id)) return
    onUpdate({ monsterRefs: poi.monsterRefs ?? [], magicItemRefs: poi.magicItemRefs ?? [], spellRefs: poi.spellRefs ?? [], equipmentRefs: poi.equipmentRefs ?? [], [refsKey]: [...currentRefs, { id }] })
    setSearchQuery('')
    setShowSearch(false)
  }

  const removeRef = (kind: 'monster' | 'spell' | 'magicItem' | 'equipment', id: string) => {
    const refsKey = kind === 'monster' ? 'monsterRefs' : kind === 'spell' ? 'spellRefs' : kind === 'equipment' ? 'equipmentRefs' : 'magicItemRefs'
    onUpdate({
      monsterRefs: poi.monsterRefs ?? [],
      magicItemRefs: poi.magicItemRefs ?? [],
      spellRefs: poi.spellRefs ?? [],
      equipmentRefs: poi.equipmentRefs ?? [],
      [refsKey]: (poi[refsKey] ?? []).filter((r) => r.id !== id),
    })
  }

  const updateQuantity = (kind: 'monster' | 'spell' | 'magicItem' | 'equipment', id: string, quantity: number | undefined) => {
    const refsKey = kind === 'monster' ? 'monsterRefs' : kind === 'spell' ? 'spellRefs' : kind === 'equipment' ? 'equipmentRefs' : 'magicItemRefs'
    onUpdate({
      monsterRefs: poi.monsterRefs ?? [],
      magicItemRefs: poi.magicItemRefs ?? [],
      spellRefs: poi.spellRefs ?? [],
      equipmentRefs: poi.equipmentRefs ?? [],
      [refsKey]: (poi[refsKey] ?? []).map((r) => r.id === id ? { ...r, quantity } : r),
    })
  }

  const allRefs = [
    ...(poi.monsterRefs ?? []).map((r) => ({ ...r, kind: 'monster' as const })),
    ...(poi.spellRefs ?? []).map((r) => ({ ...r, kind: 'spell' as const })),
    ...(poi.magicItemRefs ?? []).map((r) => ({ ...r, kind: 'magicItem' as const })),
    ...(poi.equipmentRefs ?? []).map((r) => ({ ...r, kind: 'equipment' as const })),
  ]

  if (allRefs.length === 0 && !showSearch) {
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Book className="size-4" />
            Compendium
          </h4>
          <Button size="sm" variant="outline" onClick={() => setShowSearch(true)}>
            <Plus className="mr-1.5 size-3.5" />
            Link Entry
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">No compendium entries linked.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Book className="size-4" />
          Compendium ({allRefs.length})
        </h4>
        <Button size="sm" variant="outline" onClick={() => setShowSearch(!showSearch)}>
          <Plus className="mr-1.5 size-3.5" />
          Link Entry
        </Button>
      </div>

      {showSearch && (
        <div className="space-y-2 mb-4 p-3 rounded-lg border bg-muted/30">
          <div className="flex gap-2">
            <Select value={searchKind} onValueChange={(v) => setSearchKind(v as 'all' | 'monster' | 'spell' | 'magicItem' | 'equipment')}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="monster">Monsters</SelectItem>
                <SelectItem value="spell">Spells</SelectItem>
                <SelectItem value="magicItem">Magic Items</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search compendium..."
              className="flex-1"
              autoFocus
            />
          </div>
          {searchQuery.trim() && searchResults.length === 0 && (
            <p className="text-xs text-muted-foreground py-2 px-1">No results for "{searchQuery}"</p>
          )}
          {searchResults.length > 0 && (
            <div className="space-y-1">
              {searchResults.map((entry) => {
                const kindBadge = entry.kind === 'monster' ? 'Mon' : entry.kind === 'spell' ? 'Spl' : entry.kind === 'equipment' ? 'Eqp' : 'Mag'
                const sourceBadge = entry.systemId === 'custom' ? 'Custom' : entry.systemId.includes('cairn') ? 'Cairn' : 'SD'
                return (
                  <button
                    key={entry.id}
                    onClick={() => addRef(entry.id)}
                    className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-muted flex items-center justify-between gap-2"
                  >
                    <span className="truncate">{entry.name}</span>
                    <span className="flex items-center gap-1 shrink-0">
                      {searchKind === 'all' && (
                        <Badge variant="secondary" className="text-[10px]">{kindBadge}</Badge>
                      )}
                      <Badge variant="outline" className="text-[10px]">{sourceBadge}</Badge>
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      <div className="space-y-1">
        {allRefs.map((ref) => {
          const systemEntry = getCompendiumById(ref.id)
          const customMatch = !systemEntry ? customEntries.find((c) => c.id === ref.id) : undefined
          const entry = systemEntry ?? (customMatch ? customEntryToCompendiumEntry(customMatch) : undefined)
          if (!entry) return null
          const isCustom = !systemEntry && !!customMatch
          const kindLabel = ref.kind === 'monster' ? 'Monster' : ref.kind === 'spell' ? 'Spell' : ref.kind === 'equipment' ? 'Equipment' : 'Magic Item'
          const kindColor = ref.kind === 'monster' ? 'bg-orange-500/15 text-orange-700 dark:text-orange-400' : ref.kind === 'spell' ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400' : ref.kind === 'equipment' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400' : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
          const detailUrl = isCustom
            ? '/realms/compendium/custom/$entryId'
            : ref.kind === 'monster' ? '/realms/compendium/monsters/$monsterId' : ref.kind === 'spell' ? '/realms/compendium/spells/$spellId' : ref.kind === 'equipment' ? '/realms/compendium/equipment/$equipmentId' : '/realms/compendium/magic-items/$itemId'
          const detailParams = isCustom
            ? { entryId: ref.id }
            : ref.kind === 'monster' ? { monsterId: ref.id } : ref.kind === 'spell' ? { spellId: ref.id } : ref.kind === 'equipment' ? { equipmentId: ref.id } : { itemId: ref.id }

          return (
            <div key={ref.id} className="flex items-center gap-2 px-3 py-2 rounded-md border text-sm">
              <Link to={detailUrl} params={detailParams} className="flex-1 flex items-center gap-2 hover:underline">
                <Badge variant="outline" className={`text-xs ${kindColor}`}>{kindLabel}</Badge>
                <span className="font-medium">{entry.name}</span>
              </Link>
              {(ref.kind === 'monster' || ref.kind === 'equipment') && (
                <Input
                  type="number"
                  min="1"
                  value={ref.quantity ?? ''}
                  onChange={(e) => updateQuantity(ref.kind, ref.id, e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="qty"
                  className="w-16 h-7 text-xs"
                />
              )}
              <Button
                variant="ghost"
                size="sm"
                className="size-7 p-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeRef(ref.kind, ref.id)}
              >
                <X className="size-3.5" />
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
