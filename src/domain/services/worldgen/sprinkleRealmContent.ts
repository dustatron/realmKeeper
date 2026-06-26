import { getMagicItemsBySystemId, getMonstersBySystemId } from '@domain/data/compendium'
import { treasureTableDefs } from '@domain/data/treasure-tables'
import type { POI } from '@domain/entities/POI'
import type { TreasureItem } from '@domain/value-objects/TreasureItem'
import type { TableDef } from '@domain/entities/TableDef'
import type { PoiType } from '@shared/constants'
import { newId } from '@shared/ulid'
import type { SeededRandom } from '~/lib/dungeon/SeededRandom'

export interface RealmContentSprinkleOptions {
  treasure?: boolean
  magicItems?: boolean
  monsters?: boolean
}

interface SprinkleRealmContentInput {
  pois: POI[]
  systemId: string
  options: RealmContentSprinkleOptions
  rng: SeededRandom
}

const TREASURE_POI_TYPES = new Set<PoiType>([
  'building',
  'camp',
  'dungeon',
  'fortification',
  'landmark',
  'natural',
  'ruin',
  'shrine',
])

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

export function sprinkleRealmContent({
  pois,
  systemId,
  options,
  rng,
}: SprinkleRealmContentInput): POI[] {
  const treasurePois = pois.filter((poi) => TREASURE_POI_TYPES.has(poi.type))
  const monsterPois = pois.filter((poi) => MONSTER_POI_TYPES.has(poi.type))

  if (options.treasure) {
    const targets = rng.sample(
      treasurePois,
      targetCount(treasurePois.length, 0.3, 3, 24),
    )
    for (const poi of targets) {
      poi.treasure = [...poi.treasure, pickTreasureItem(rng.child(`treasure-${poi.id}`))]
    }
  }

  if (options.magicItems) {
    const magicItems = getMagicItemsBySystemId(systemId)
    const targets = rng.sample(
      treasurePois,
      targetCount(treasurePois.length, 0.1, 2, 8),
    )
    for (const poi of targets) {
      if (magicItems.length === 0) break
      const item = rng.pick(magicItems)
      const treasure: TreasureItem = {
        id: newId(),
        name: item.name,
        description: item.description,
        value: 'priceless',
        quantity: 1,
        collected: false,
        isMagic: true,
        compendiumId: item.id,
      }
      poi.treasure = [...poi.treasure, treasure]
      if (!poi.magicItemRefs.some((ref) => ref.id === item.id)) {
        poi.magicItemRefs = [...poi.magicItemRefs, { id: item.id }]
      }
    }
  }

  if (options.monsters) {
    const monsters = getMonstersBySystemId(systemId)
    const targets = rng.sample(
      monsterPois,
      targetCount(monsterPois.length, 0.35, 3, 24),
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
