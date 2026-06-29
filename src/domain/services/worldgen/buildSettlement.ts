import type { SeededRandom } from '~/lib/dungeon/SeededRandom'
import type { SystemConfig } from '@domain/entities/SystemConfig'
import type { POI } from '@domain/entities/POI'
import type { NPC } from '@domain/entities/NPC'
import { buildPOI } from './buildPoi'
import { buildNpc } from './buildNpc'
import { settlementSize } from '@domain/data/worldgen/settlementSize'
import type { ResolvedTables } from './TableProvider'
import { SHOP_TYPES_TABLE_ID, SHOP_NAMES_TABLE_ID, SHOP_TYPES } from '@domain/data/worldgen/shops.tables'

// The proprietor's trade, by building type (for the common civic types; other
// shop types fall back to the lowercased type name as the occupation).
const BUILDING_OCCUPATIONS: Record<string, string> = {
  Tavern: 'tavernkeeper', Inn: 'innkeeper', Smithy: 'blacksmith',
  Temple: 'priest', Shrine: 'shrinekeeper', Market: 'merchant',
  'Trading Post': 'trader', 'General Store': 'shopkeeper', Granary: 'granary keeper',
  Barracks: 'guard captain', Apothecary: 'apothecary', Stables: 'stablemaster',
  Mill: 'miller', Tannery: 'tanner', Guildhall: 'guildmaster',
  Warehouse: 'warehouse keeper', Bathhouse: 'bathhouse keeper', Bakery: 'baker',
  Brewery: 'brewer', Watchtower: 'watch officer',
}

function buildingCount(subtype: string | null, rng: SeededRandom): number {
  const size = settlementSize(subtype)
  if (size === 'large') return rng.between(7, 10)
  if (size === 'small') return rng.between(2, 3)
  return rng.between(4, 6)
}

export interface SettlementBuild {
  buildings: POI[]
  proprietors: NPC[]
}

// Pure, seeded settlement interior: child building POIs (shops) scaled by the
// settlement's size, each with a proprietor NPC living in it. Shop types and
// flavorful names are drawn from the central table registry (live custom tables
// drive generation), falling back to the built-in shop pools / a generic name.
export function buildSettlementBuildings(
  settlement: POI,
  worldId: string,
  systemConfig: SystemConfig,
  rng: SeededRandom,
  tables?: ResolvedTables,
): SettlementBuild {
  const typePool = tables?.texts(SHOP_TYPES_TABLE_ID)
  const types_ = typePool && typePool.length > 0 ? typePool : SHOP_TYPES
  const namePool = tables?.texts(SHOP_NAMES_TABLE_ID) ?? []

  const count = Math.min(types_.length, buildingCount(settlement.subtypeLabel, rng))
  const types = rng.sample(types_, count)
  // Distinct flavorful names when the pool is large enough; else fall back per
  // building to a generic "The <type>".
  const names = namePool.length >= count ? rng.sample(namePool, count) : null

  const buildings: POI[] = []
  const proprietors: NPC[] = []
  types.forEach((type, i) => {
    const name = names ? names[i] : `The ${type.toLowerCase()}`
    const building = buildPOI({
      regionId: settlement.regionId,
      parentPoiId: settlement.id,
      name,
      description: `${name} — a ${type.toLowerCase()} in ${settlement.name}.`,
      type: 'building',
      subtypeLabel: type,
    })
    buildings.push(building)
    proprietors.push(
      buildNpc(
        {
          worldId,
          regionId: settlement.regionId ?? undefined,
          poiId: building.id,
          role: 'inhabitant',
          occupation: BUILDING_OCCUPATIONS[type] ?? type.toLowerCase(),
          tables,
        },
        systemConfig,
        rng,
      ),
    )
  })
  return { buildings, proprietors }
}
