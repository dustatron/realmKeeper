import type { SeededRandom } from '~/lib/dungeon/SeededRandom'
import type { SystemConfig } from '@domain/entities/SystemConfig'
import type { POI } from '@domain/entities/POI'
import type { NPC } from '@domain/entities/NPC'
import { buildPOI } from './buildPoi'
import { buildNpc } from './buildNpc'

// Re-authored settlement building types. Each becomes a child POI of the
// settlement with a proprietor living in it.
const BUILDING_TYPES = [
  'Tavern', 'Smithy', 'Temple', 'Market', 'Granary', 'Barracks', 'Apothecary',
  'Stables', 'Mill', 'Tannery', 'Guildhall', 'Warehouse', 'Shrine', 'Bathhouse',
  'Trading Post', 'Watchtower', 'Inn', 'Bakery', 'Brewery', 'General Store',
]

// Settlement size by Cairn subtype → how many buildings it supports.
const LARGE = new Set(['City', 'Citadel', 'Fortress', 'Stronghold'])
const SMALL = new Set(['Hamlet', 'Outpost', 'Farmstead', 'Caravan', 'Commune', 'Villa', 'Prison'])

function buildingCount(subtype: string | null, rng: SeededRandom): number {
  if (subtype && LARGE.has(subtype)) return rng.between(7, 10)
  if (subtype && SMALL.has(subtype)) return rng.between(2, 3)
  return rng.between(4, 6)
}

export interface SettlementBuild {
  buildings: POI[]
  proprietors: NPC[]
}

// Pure, seeded settlement interior: child building POIs scaled by the
// settlement's size, each with a proprietor NPC living in it.
export function buildSettlementBuildings(
  settlement: POI,
  worldId: string,
  systemConfig: SystemConfig,
  rng: SeededRandom,
): SettlementBuild {
  const count = Math.min(BUILDING_TYPES.length, buildingCount(settlement.subtypeLabel, rng))
  const types = rng.sample(BUILDING_TYPES, count)

  const buildings: POI[] = []
  const proprietors: NPC[] = []
  for (const type of types) {
    const building = buildPOI({
      regionId: settlement.regionId,
      parentPoiId: settlement.id,
      name: `The ${type.toLowerCase()}`,
      description: `The ${type.toLowerCase()} of ${settlement.name}.`,
      type: 'building',
      subtypeLabel: type,
    })
    buildings.push(building)
    proprietors.push(
      buildNpc(
        { worldId, regionId: settlement.regionId ?? undefined, poiId: building.id, role: 'inhabitant' },
        systemConfig,
        rng,
      ),
    )
  }
  return { buildings, proprietors }
}
