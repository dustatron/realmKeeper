import type { POI } from '@domain/entities/POI'
import type { NPC } from '@domain/entities/NPC'
import type { CompendiumMonster } from '@domain/entities/Compendium'
import { getCompendiumById } from '@domain/data/compendium'
import { monsterThreat } from '~/lib/worldgen/compendium-utils'

const BIG_MONSTER_THREAT_CUTOFF = 4

export interface RegionContents {
  treasureCount: number
  magicCount: number
  highlights: { name: string; kind: 'magic' | 'notable'; location: string }[]
  bigMonsters: { name: string; location: string; count: number }[]
  monsters: { name: string; count: number }[]
}

export function summarizeRegionContents(pois: POI[], npcs: NPC[]): RegionContents {
  const poiItems = pois.flatMap((p) =>
    p.treasure.map((t) => ({ name: t.name, magic: !!t.isMagic, notable: !!t.notable, location: p.name }))
  )
  const npcItems = npcs.flatMap((n) =>
    (n.systemBlock?.inventory ?? [])
      .filter((it) => it.notable === true || it.compendiumKind === 'magicItem' || it.source === 'treasure')
      .map((it) => ({
        name: it.name,
        magic: it.compendiumKind === 'magicItem',
        notable: !!it.notable,
        location: n.name,
      }))
  )
  const all = [...poiItems, ...npcItems]
  const highlights = all
    .filter((i) => i.magic || i.notable)
    .map((i) => ({ name: i.name, kind: i.magic ? ('magic' as const) : ('notable' as const), location: i.location }))

  const monsterMap = new Map<string, number>()
  for (const p of pois) {
    for (const ref of p.monsterRefs) {
      const qty = ref.quantity ?? 1
      monsterMap.set(ref.id, (monsterMap.get(ref.id) ?? 0) + qty)
    }
  }

  const monsters = [...monsterMap.entries()].map(([id, count]) => ({
    name: getCompendiumById(id)?.name ?? id,
    count,
  }))

  // Build bigMonsters: per-POI entries for high-threat monsters
  const bigMonsters: { name: string; location: string; count: number }[] = []
  for (const p of pois) {
    for (const ref of p.monsterRefs) {
      const entry = getCompendiumById(ref.id)
      if (!entry || entry.kind !== 'monster') continue
      const monster = entry as CompendiumMonster
      if (monsterThreat(monster) >= BIG_MONSTER_THREAT_CUTOFF) {
        bigMonsters.push({ name: monster.name, location: p.name, count: ref.quantity ?? 1 })
      }
    }
  }

  return {
    treasureCount: all.length,
    magicCount: all.filter((i) => i.magic).length,
    highlights,
    bigMonsters,
    monsters,
  }
}
