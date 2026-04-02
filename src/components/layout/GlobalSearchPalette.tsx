import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useGlobalSearch, type SearchableItem } from '~/ui/hooks/useGlobalSearch'
import { useUIStore } from '~/ui/stores/uiStore'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '~/components/ui/command'
import { Badge } from '~/components/ui/badge'
import {
  Users,
  MapPin,
  Swords,
  Sword,
  Wand2,
  Gem,
  Shield,
  FileText,
  Map,
} from 'lucide-react'

type ItemType = SearchableItem['type']

const TYPE_CONFIG: Record<ItemType, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  npc:       { label: 'NPC',        icon: Users,    color: 'text-blue-500' },
  faction:   { label: 'Faction',    icon: Swords,   color: 'text-red-500' },
  region:    { label: 'Region',     icon: Map,      color: 'text-green-500' },
  poi:       { label: 'Location',   icon: MapPin,   color: 'text-amber-500' },
  note:      { label: 'Note',       icon: FileText, color: 'text-purple-500' },
  monster:   { label: 'Monster',    icon: Sword,    color: 'text-orange-500' },
  spell:     { label: 'Spell',      icon: Wand2,    color: 'text-indigo-500' },
  magicItem: { label: 'Magic Item', icon: Gem,      color: 'text-emerald-500' },
  equipment: { label: 'Equipment',  icon: Shield,   color: 'text-slate-500' },
}

const GROUPS: { label: string; types: ItemType[] }[] = [
  { label: 'World',      types: ['npc', 'faction', 'region', 'poi', 'note'] },
  { label: 'Compendium', types: ['monster', 'spell', 'magicItem', 'equipment'] },
]

export function GlobalSearchPalette() {
  const [query, setQuery] = useState('')
  const open = useUIStore((s) => s.searchOpen)
  const setOpen = useUIStore((s) => s.setSearchOpen)
  const activeRealmId = useUIStore((s) => s.activeRealmId)
  const navigate = useNavigate()

  const results = useGlobalSearch(activeRealmId, query)

  const handleSelect = (item: SearchableItem) => {
    setOpen(false)
    setQuery('')
    navigate({ to: item.url as never, params: item.params as never, search: (item.search ?? {}) as never })
  }

  const handleOpenChange = (v: boolean) => {
    setOpen(v)
    if (!v) setQuery('')
  }

  const grouped = GROUPS.map((g) => ({
    ...g,
    items: results.filter((r) => g.types.includes(r.type)),
  })).filter((g) => g.items.length > 0)

  return (
    <CommandDialog
      open={open}
      onOpenChange={handleOpenChange}
      shouldFilter={false}
      title="Search"
      description="Search your realm"
      className="max-w-xl"
    >
      <CommandInput
        placeholder="Search NPCs, locations, monsters…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList className="max-h-96">
        {query.trim() === '' ? (
          <CommandEmpty>Start typing to search your realm.</CommandEmpty>
        ) : results.length === 0 ? (
          <CommandEmpty>No results for "{query}"</CommandEmpty>
        ) : (
          grouped.map((group) => (
            <CommandGroup key={group.label} heading={group.label}>
              {group.items.map((item) => {
                const cfg = TYPE_CONFIG[item.type]
                const Icon = cfg.icon
                return (
                  <CommandItem
                    key={`${item.type}-${item.id}`}
                    value={`${item.type}-${item.id}`}
                    onSelect={() => handleSelect(item)}
                    className="gap-3"
                  >
                    <Icon className={`size-4 shrink-0 ${cfg.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{item.name}</div>
                      {item.description && (
                        <div className="text-xs text-muted-foreground truncate">
                          {item.description.slice(0, 80)}
                        </div>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {cfg.label}
                    </Badge>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          ))
        )}
      </CommandList>
    </CommandDialog>
  )
}
