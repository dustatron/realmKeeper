import { useState, useMemo } from 'react'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { Input } from '~/components/ui/input'
import { Dices, Plus, Search } from 'lucide-react'
import type { WanderingMonsterEntry } from '@domain/value-objects/WanderingMonster'
import type { NPC } from '@domain/entities/NPC'
import type { POI } from '@domain/entities/POI'
import { npcToCustomStats } from './wanderingMonsterUtils'

export function NpcDenizensTab({
  npcs,
  poiChildren,
  existingNames,
  onAdd,
}: {
  npcs: NPC[]
  poiChildren: POI[]
  existingNames: Set<string>
  onAdd: (entry: WanderingMonsterEntry) => void
}) {
  const [query, setQuery] = useState('')
  const [randomNpc, setRandomNpc] = useState<NPC | null>(null)

  const poiNameMap = useMemo(
    () => new Map(poiChildren.map((p) => [p.id, p.name])),
    [poiChildren],
  )

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
