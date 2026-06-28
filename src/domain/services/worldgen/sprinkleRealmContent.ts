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
import { seedRegionLoot, eligibleTreasurePois } from './seedTreasureHelpers'

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

  // Per-region treasure + magic seeding
  if (treasureMult > 0 || magicMult > 0) {
    // Build realm-wide magic pool (shuffled, unique draw via closure)
    const magicPool = magicMult > 0 ? rng.shuffle([...getMagicItemsBySystemId(systemId)]) : []
    let magicIndex = 0
    const takeMagic = (): { id: string; name: string; description: string } | null => {
      if (magicIndex >= magicPool.length) return null
      return magicPool[magicIndex++]
    }

    const elig = eligibleTreasurePois(pois)
    const byRegion = new Map<string, POI[]>()
    for (const p of elig) {
      const a = byRegion.get(p.regionId) ?? []
      a.push(p)
      byRegion.set(p.regionId, a)
    }

    // Use provided regions or derive pseudo-regions from POI regionIds
    const regions: Array<{ id: string; terrain: string }> =
      input.regions && input.regions.length > 0
        ? input.regions
        : Array.from(byRegion.keys()).map((id) => ({ id, terrain: 'grasslands' }))

    for (const region of regions) {
      const holders = byRegion.get(region.id) ?? []
      if (holders.length === 0) continue
      seedRegionLoot({
        region,
        holders,
        treasureMult,
        magicMult,
        takeMagic,
        rng,
        pickTreasureItemFn: pickTreasureItem,
      })
    }
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
