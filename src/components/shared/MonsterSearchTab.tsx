import { useState, useMemo } from 'react'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { Input } from '~/components/ui/input'
import { Dices, Plus, Search } from 'lucide-react'
import { getMonstersBySystemId, searchCompendium, searchCustomEntries } from '@domain/data/compendium'
import { queryDb, Schema } from '@livestore/livestore'
import { useQuery } from '@livestore/react'
import type { CustomCompendiumEntry } from '@domain/entities/CustomCompendiumEntry'
import type { WanderingMonsterEntry } from '@domain/value-objects/WanderingMonster'
import type { CompendiumMonster } from '@domain/entities/Compendium'
import { bestiaryEntryToWandering, formatAC, formatHP } from './wanderingMonsterUtils'

export function MonsterSearchTab({
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
  const [randomEntry, setRandomEntry] = useState<CompendiumMonster | null>(null)

  const customEntries = useQuery(queryDb({
    query: worldId
      ? 'SELECT * FROM customCompendiumEntries WHERE worldId = $worldId'
      : 'SELECT * FROM customCompendiumEntries WHERE 1 = 0',
    schema: Schema.Array(Schema.Unknown),
    bindValues: worldId ? { worldId } : {},
  }, { deps: [worldId] })) as CustomCompendiumEntry[]

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
    const pick = pool[Math.floor(Math.random() * pool.length)] as CompendiumMonster
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
              <span className="text-xs text-muted-foreground ml-2">
                AC {formatAC(randomEntry)} · HP {formatHP(randomEntry)}
              </span>
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

export function MonsterStatBlock({ monster }: { monster: CompendiumMonster }) {
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
