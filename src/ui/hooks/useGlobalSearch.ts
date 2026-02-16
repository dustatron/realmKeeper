import { useMemo } from 'react'
import Fuse from 'fuse.js'
import { useNPCs } from './useNPCs'
import { useFactions } from './useFactions'
import { useRegions } from './useRegions'
import { useRealmPOIs } from './usePOIs'
import { useRealmNotes } from './useRealmNotes'

export interface SearchableItem {
  id: string
  name: string
  type: 'npc' | 'faction' | 'region' | 'poi' | 'note'
  description: string
  url: string
  params: Record<string, string>
  tags: string[]
}

export function useGlobalSearch(worldId: string | null, query: string) {
  const npcs = useNPCs(worldId)
  const factions = useFactions(worldId)
  const regions = useRegions(worldId)
  const pois = useRealmPOIs(worldId)
  const notes = useRealmNotes(worldId)

  const items = useMemo<SearchableItem[]>(() => {
    const result: SearchableItem[] = []

    for (const n of npcs) {
      result.push({
        id: n.id,
        name: n.name,
        type: 'npc',
        description: n.description,
        url: '/realms/npcs/$npcId',
        params: { npcId: n.id },
        tags: [...(n.traits ?? []), ...(n.tags ?? [])],
      })
    }

    for (const f of factions) {
      result.push({
        id: f.id,
        name: f.name,
        type: 'faction',
        description: f.description,
        url: '/realms/factions/$factionId',
        params: { factionId: f.id },
        tags: f.traits ?? [],
      })
    }

    for (const r of regions) {
      result.push({
        id: r.id,
        name: r.name,
        type: 'region',
        description: r.description,
        url: '/realms/regions/$regionId',
        params: { regionId: r.id },
        tags: r.features ?? [],
      })
    }

    for (const p of pois) {
      result.push({
        id: p.id,
        name: p.name,
        type: 'poi',
        description: p.description,
        url: '/realms/pois/$poiId',
        params: { poiId: p.id },
        tags: p.tags ?? [],
      })
    }

    for (const note of notes) {
      result.push({
        id: note.id,
        name: note.title,
        type: 'note',
        description: note.content.slice(0, 200),
        url: '/realms/notes',
        params: {},
        tags: [],
      })
    }

    return result
  }, [npcs, factions, regions, pois, notes])

  const fuse = useMemo(
    () =>
      new Fuse(items, {
        keys: ['name', 'description', 'tags'],
        threshold: 0.4,
      }),
    [items]
  )

  const results = useMemo(() => {
    if (!query.trim()) return []
    return fuse.search(query).map((r) => r.item)
  }, [fuse, query])

  return results
}
