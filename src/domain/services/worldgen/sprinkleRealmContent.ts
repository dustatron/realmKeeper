import { getMagicItemsBySystemId, getMonstersBySystemId } from '@domain/data/compendium'
import { treasureTableDefs } from '@domain/data/treasure-tables'
import type { POI } from '@domain/entities/POI'
import type { TreasureItem } from '@domain/value-objects/TreasureItem'
import type { TableDef } from '@domain/entities/TableDef'
import type { PoiType } from '@shared/constants'
import { newId } from '@shared/ulid'
import type { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { LOOT_DENSITY, type LootDensity } from './lootDensity'
import type { NPC } from '@domain/entities/NPC'
import type { Region } from '@domain/entities/Region'
import type { Faction } from '@domain/entities/Faction'
import { seedRegionLoot, eligibleTreasurePois, npcsByRegion, seedFactionGreatItems } from './seedTreasureHelpers'

export interface RealmContentSprinkleOptions {
  treasureDensity?: LootDensity
  magicDensity?: LootDensity
  monsterDensity?: LootDensity
}

interface SprinkleRealmContentInput {
  pois: POI[]
  systemId: string
  options: RealmContentSprinkleOptions
  rng: SeededRandom
  npcs?: NPC[]
  regions?: Region[]
  factions?: Faction[]
}

const MONSTER_POI_TYPES = new Set<PoiType>([
  'camp',
  'dungeon',
  'fortification',
  'landmark',
  'natural',
  'ruin',
  'shrine',
])

function targetCount(eligibleCount: number, ratio: number, min: number, max: number): number {
  if (eligibleCount === 0) return 0
  return Math.min(eligibleCount, max, Math.max(min, Math.round(eligibleCount * ratio)))
}

function pickTreasureTable(rng: SeededRandom): TableDef {
  return rng.pick(treasureTableDefs)
}

function pickTreasureItem(rng: SeededRandom): TreasureItem {
  const table = pickTreasureTable(rng)
  const entry = rng.pick(table.entries)
  const valueMatch = entry.text.match(/\(([^)]+)\)/)
  return {
    id: newId(),
    name: entry.text,
    description: `From ${table.name}`,
    value: valueMatch ? valueMatch[1] : '',
    quantity: 1,
    collected: false,
  }
}

export function sprinkleRealmContent(input: SprinkleRealmContentInput): POI[] {
  const { pois, systemId, options, rng } = input

  const treasureMult = LOOT_DENSITY[options.treasureDensity ?? 'off']
  const magicMult = LOOT_DENSITY[options.magicDensity ?? 'off']

  // Build realm-wide magic pool (shared by region passes AND faction great-item pass)
  const magicPool = magicMult > 0 ? rng.shuffle([...getMagicItemsBySystemId(systemId)]) : []
  let magicIndex = 0
  const takeMagic = (): { id: string; name: string; description: string } | null => {
    if (magicIndex >= magicPool.length) return null
    return magicPool[magicIndex++]
  }

  // Per-region treasure + magic seeding — requires explicit regions
  if ((treasureMult > 0 || magicMult > 0) && input.regions?.length) {
    const elig = eligibleTreasurePois(pois)
    const byRegion = new Map<string, POI[]>()
    for (const p of elig) {
      const a = byRegion.get(p.regionId) ?? []
      a.push(p)
      byRegion.set(p.regionId, a)
    }

    const npcMap = input.npcs ? npcsByRegion(input.npcs) : new Map()

    for (const region of input.regions) {
      const holders = byRegion.get(region.id) ?? []
      const regionNpcs = npcMap.get(region.id) ?? []
      if (holders.length === 0 && regionNpcs.length === 0) continue
      seedRegionLoot({
        region,
        holders,
        npcs: regionNpcs,
        treasureMult,
        magicMult,
        takeMagic,
        rng,
        pickTreasureItemFn: pickTreasureItem,
      })
    }
  }

  // Faction great-item guarantee — runs after region loop, draws from the same takeMagic pool
  if (input.factions?.length) {
    const poiById = new Map(pois.map((p) => [p.id, p]))
    const npcById = new Map((input.npcs ?? []).map((n) => [n.id, n]))
    seedFactionGreatItems({
      factions: input.factions,
      poiById,
      npcById,
      magicDensity: options.magicDensity,
      takeMagic,
      pickTreasureItemFn: pickTreasureItem,
      rng: rng.child('faction-great-items'),
    })
  }

  // Monster seeding (unchanged)
  const monsterMult = LOOT_DENSITY[options.monsterDensity ?? 'off']
  if (monsterMult > 0) {
    const monsterPois = pois.filter((poi) => MONSTER_POI_TYPES.has(poi.type))
    const monsters = getMonstersBySystemId(systemId)
    const targets = rng.sample(
      monsterPois,
      targetCount(monsterPois.length, 0.45 * monsterMult, 1, 64),
    )
    for (const poi of targets) {
      if (monsters.length === 0) break
      const monster = rng.pick(monsters)
      if (!poi.monsterRefs.some((ref) => ref.id === monster.id)) {
        poi.monsterRefs = [...poi.monsterRefs, { id: monster.id, quantity: rng.between(1, 4) }]
      }
    }
  }

  return pois
}
