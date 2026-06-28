import type { POI } from '@domain/entities/POI'
import type { NPC } from '@domain/entities/NPC'
import type { CompendiumMonster } from '@domain/entities/Compendium'
import { getCompendiumById } from '@domain/data/compendium'
import { monsterThreat } from '~/lib/worldgen/compendium-utils'
import { tierForTerrain, type Tier } from '@domain/services/worldgen/regionFlavor'

const BIG_MONSTER_THREAT_CUTOFF = 4

export interface RegionTreasure {
  name: string
  value: string
  notable: boolean
  collected: boolean
  poiId: string | null
  npcId: string | null
  guardianNpcId: string | null
  compendiumId: string | null
}

export interface RegionMagicItem {
  name: string
  collected: boolean
  poiId: string | null
  npcId: string | null
  compendiumId: string | null
}

export interface RegionMonsterRow {
  name: string
  count: number
  poiId: string | null
  threat: number
  big: boolean
  compendiumId: string | null
}

export interface RegionContents {
  treasures: RegionTreasure[]
  magic: RegionMagicItem[]
  monsters: RegionMonsterRow[]
  treasureCount: number
  magicCount: number
  monsterCount: number
}

export function regionDangerTier(pois: POI[], terrain: string): Tier {
  let max = 0
  for (const p of pois) {
    for (const ref of p.monsterRefs ?? []) {
      const e = getCompendiumById(ref.id)
      if (e?.kind === 'monster') max = Math.max(max, monsterThreat(e as CompendiumMonster))
    }
  }
  if (max === 0) return tierForTerrain(terrain)
  return max >= 5 ? 'perilous' : max >= 3 ? 'tough' : 'easy'
}

export function summarizeRegionContents(pois: POI[], npcs: NPC[]): RegionContents {
  const treasures: RegionTreasure[] = []
  const magic: RegionMagicItem[] = []
  const monsters: RegionMonsterRow[] = []

  for (const p of pois) {
    // POI treasure items: split by isMagic
    for (const t of p.treasure ?? []) {
      if (t.isMagic) {
        magic.push({ name: t.name, collected: !!t.collected, poiId: p.id, npcId: null, compendiumId: t.compendiumId ?? null })
      } else {
        treasures.push({
          name: t.name,
          value: t.value,
          notable: !!t.notable,
          collected: !!t.collected,
          poiId: p.id,
          npcId: null,
          guardianNpcId: t.guardianNpcId ?? null,
          compendiumId: t.compendiumId ?? null,
        })
      }
    }

    // POI magicItemRefs — resolve name via compendium; skip unresolved
    for (const ref of p.magicItemRefs ?? []) {
      const entry = getCompendiumById(ref.id)
      if (!entry) continue
      magic.push({ name: entry.name, collected: false, poiId: p.id, npcId: null, compendiumId: ref.id })
    }

    // POI monsterRefs — one row per (poi, ref); skip unresolved
    for (const ref of p.monsterRefs ?? []) {
      const entry = getCompendiumById(ref.id)
      if (!entry) continue
      const threat = entry.kind === 'monster' ? monsterThreat(entry as CompendiumMonster) : 0
      monsters.push({
        name: entry.name,
        count: ref.quantity ?? 1,
        poiId: p.id,
        threat,
        big: threat >= BIG_MONSTER_THREAT_CUTOFF,
        compendiumId: ref.id,
      })
    }
  }

  // NPC inventory items
  for (const n of npcs) {
    for (const it of n.systemBlock?.inventory ?? []) {
      if (it.compendiumKind === 'magicItem') {
        magic.push({ name: it.name, collected: false, poiId: null, npcId: n.id, compendiumId: it.compendiumId ?? null })
      } else if (it.source === 'treasure') {
        treasures.push({
          name: it.name,
          value: it.value ?? '',
          notable: !!it.notable,
          collected: false,
          poiId: null,
          npcId: n.id,
          guardianNpcId: null,
          compendiumId: it.compendiumId ?? null,
        })
      }
    }
  }

  return {
    treasures,
    magic,
    monsters,
    treasureCount: treasures.length,
    magicCount: magic.length,
    monsterCount: monsters.reduce((a, m) => a + m.count, 0),
  }
}
