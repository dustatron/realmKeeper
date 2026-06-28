import { getMagicItemsBySystemId } from '@domain/data/compendium'
import { treasureTableDefs } from '@domain/data/treasure-tables'
import type { POI } from '@domain/entities/POI'
import type { TreasureItem } from '@domain/value-objects/TreasureItem'
import type { TableDef } from '@domain/entities/TableDef'
import { newId } from '@shared/ulid'
import type { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { LOOT_DENSITY, type LootDensity } from './lootDensity'
import type { NPC } from '@domain/entities/NPC'
import type { Region } from '@domain/entities/Region'
import type { Faction } from '@domain/entities/Faction'
import { seedRegionLoot, eligibleTreasurePois, npcsByRegion, seedFactionGreatItems, seedRegionMonsters } from './seedTreasureHelpers'
import { tierForTerrain } from './regionFlavor'

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
  const monsterMult = LOOT_DENSITY[options.monsterDensity ?? 'off']

  // Build realm-wide magic pool (shared by region passes AND faction great-item pass)
  // Use a dedicated child RNG so the parent state is never mutated by the magic pool shuffle,
  // keeping monster/treasure streams independent of magicDensity.
  const magicPool = magicMult > 0
    ? rng.child('magic-pool').shuffle([...getMagicItemsBySystemId(systemId)])
    : []
  let magicIndex = 0
  const takeMagic = (): { id: string; name: string; description: string } | null => {
    if (magicIndex >= magicPool.length) return null
    return magicPool[magicIndex++]
  }

  // Per-region treasure, magic, and monster seeding — requires explicit regions
  if ((treasureMult > 0 || magicMult > 0 || monsterMult > 0) && input.regions?.length) {
    // Treasure/magic: eligible POIs only
    const elig = eligibleTreasurePois(pois)
    const byRegion = new Map<string, POI[]>()
    for (const p of elig) {
      const a = byRegion.get(p.regionId) ?? []
      a.push(p)
      byRegion.set(p.regionId, a)
    }

    // Monsters: all POIs (seedRegionMonsters filters by MONSTER_POI_TYPES internally)
    const allByRegion = new Map<string, POI[]>()
    for (const p of pois) {
      const a = allByRegion.get(p.regionId) ?? []
      a.push(p)
      allByRegion.set(p.regionId, a)
    }

    const npcMap = input.npcs ? npcsByRegion(input.npcs) : new Map()

    for (const region of input.regions) {
      const holders = byRegion.get(region.id) ?? []
      const regionNpcs = npcMap.get(region.id) ?? []

      // Treasure + magic pass
      if ((treasureMult > 0 || magicMult > 0) && (holders.length > 0 || regionNpcs.length > 0)) {
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

      // Monster pass — runs after treasure/magic so guardian check sees notable finds
      if (monsterMult > 0) {
        const regionAllPois = allByRegion.get(region.id) ?? []
        if (regionAllPois.length > 0) {
          seedRegionMonsters(
            regionAllPois,
            tierForTerrain(region.terrain),
            monsterMult,
            systemId,
            rng.child(`monsters-region-${region.id}`),
          )
        }
      }
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

  return pois
}
