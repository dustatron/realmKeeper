import type { POI } from '@domain/entities/POI'
import type { NPC } from '@domain/entities/NPC'
import { getCompendiumById } from '@domain/data/compendium'

export interface RegionContents {
  treasureCount: number
  magicCount: number
  highlights: { name: string; kind: 'magic' | 'notable' }[]
  monsters: { name: string; count: number }[]
}

export function summarizeRegionContents(pois: POI[], npcs: NPC[]): RegionContents {
  const poiItems = pois.flatMap((p) =>
    p.treasure.map((t) => ({ name: t.name, magic: !!t.isMagic, notable: !!t.notable }))
  )
  const npcItems = npcs.flatMap((n) =>
    (n.systemBlock?.inventory ?? []).map((it) => ({
      name: it.name,
      magic: it.compendiumKind === 'magicItem',
      notable: !!it.notable,
    }))
  )
  const all = [...poiItems, ...npcItems]
  const highlights = all
    .filter((i) => i.magic || i.notable)
    .map((i) => ({ name: i.name, kind: i.magic ? ('magic' as const) : ('notable' as const) }))

  const monsterMap = new Map<string, number>()
  for (const p of pois) {
    for (const ref of p.monsterRefs) {
      monsterMap.set(ref.id, (monsterMap.get(ref.id) ?? 0) + (ref.quantity ?? 1))
    }
  }
  const monsters = [...monsterMap.entries()].map(([id, count]) => ({
    name: getCompendiumById(id)?.name ?? id,
    count,
  }))

  return {
    treasureCount: all.length,
    magicCount: all.filter((i) => i.magic).length,
    highlights,
    monsters,
  }
}
