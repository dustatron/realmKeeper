import type { SeededRandom } from '~/lib/dungeon/SeededRandom'
import type { SystemConfig } from '@domain/entities/SystemConfig'
import type { POI } from '@domain/entities/POI'
import type { NPC } from '@domain/entities/NPC'
import { buildPOI } from './buildPoi'
import { buildNpc } from './buildNpc'
import { settlementSize } from '@domain/data/worldgen/settlementSize'
import { resolvePool, type ResolvedTables } from './TableProvider'
import { SHOP_TYPES_TABLE_ID, SHOP_NAMES_TABLE_ID, SHOP_TYPES } from '@domain/data/worldgen/shops.tables'
import {
  DISTRICT_TABLE_ID, KNOWN_FOR_TABLE_ID, STRUCTURE_QUIRK_TABLE_ID, GUILD_TABLE_ID, SHOP_QUIRK_TABLE_ID, NOTABLE_FEATURE_TABLE_ID,
  DISTRICTS, KNOWN_FOR, STRUCTURE_QUIRKS, GUILDS, SHOP_QUIRKS, NOTABLE_FEATURES,
} from '@domain/data/worldgen/settlement.tables'
import {
  FESTIVAL_TABLE_ID, FESTIVALS,
  SETTLEMENT_SECRET_TABLE_ID, SETTLEMENT_SECRETS,
} from '@domain/data/worldgen/world-flavor.tables'
import { NPC_PROPRIETOR_QUIRK_TABLE_ID, NPC_PROPRIETOR_QUIRKS } from '@domain/data/worldgen/npc-extra.tables'

// Pick from an editable table, falling back to the built-in array (same order
// keeps seeded output stable).
function pickFlavor(rng: SeededRandom, tables: ResolvedTables | undefined, id: string, fallback: readonly string[]): string {
  return rng.pick(resolvePool(tables, id, fallback))
}

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

// Building count scales with settlement size AND wealth band — a rich town is
// busier and better-appointed than a poor one of the same size.
function buildingCount(subtype: string | null, wealthBand: string | null, rng: SeededRandom): number {
  const size = settlementSize(subtype)
  const base = size === 'large' ? rng.between(7, 10) : size === 'small' ? rng.between(2, 3) : rng.between(4, 6)
  const mult =
    wealthBand === 'rich' ? 1.4
      : wealthBand === 'prosperous' ? 1.2
      : wealthBand === 'poor' ? 0.7
      : wealthBand === 'destitute' ? 0.5
      : 1
  return Math.max(1, Math.round(base * mult))
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

  // Settlement-level flavor: a "known for", a structure quirk, a notable feature,
  // and a tradition. Stored as structured data (settlementFlavor) for the overview
  // data list. The district and guild draws are still made — so the main rng
  // stream (and the building generation below) stays byte-identical — but they are
  // no longer surfaced (dropped from the data set per design).
  pickFlavor(rng, tables, DISTRICT_TABLE_ID, DISTRICTS)
  const knownFor = pickFlavor(rng, tables, KNOWN_FOR_TABLE_ID, KNOWN_FOR)
  const structureQuirk = pickFlavor(rng, tables, STRUCTURE_QUIRK_TABLE_ID, STRUCTURE_QUIRKS)
  if (rng.chance(0.5)) pickFlavor(rng, tables, GUILD_TABLE_ID, GUILDS)
  const feature = pickFlavor(rng, tables, NOTABLE_FEATURE_TABLE_ID, NOTABLE_FEATURES)
  // A festival and a GM-only secret — additive, via CHILD rngs so the building
  // generation below (which uses the main rng) stays byte-identical.
  const festival = rng.child('settlement-festival').pick(resolvePool(tables, FESTIVAL_TABLE_ID, FESTIVALS))
  const secret = rng.child('settlement-secret').pick(resolvePool(tables, SETTLEMENT_SECRET_TABLE_ID, SETTLEMENT_SECRETS))
  // Flavor is stored as structured data (rendered as a data list) rather than
  // stitched into the description prose. The base description (terrain + patron
  // lead) stays as the readable hook; the GM-only secret moves to gmNotes.
  settlement.settlementFlavor = {
    knownFor,
    character: structureQuirk,
    notable: feature,
    tradition: festival,
  }
  settlement.gmNotes = secret

  const count = Math.min(types_.length, buildingCount(settlement.subtypeLabel, settlement.wealthBand, rng))
  const types = rng.sample(types_, count)
  // Distinct flavorful names when the pool is large enough; else fall back per
  // building to a generic "The <type>".
  const names = namePool.length >= count ? rng.sample(namePool, count) : null

  const buildings: POI[] = []
  const proprietors: NPC[] = []
  types.forEach((type, i) => {
    const name = names ? names[i] : `The ${type.toLowerCase()}`
    const quirk = pickFlavor(rng, tables, SHOP_QUIRK_TABLE_ID, SHOP_QUIRKS)
    const quirkNote = quirk.charAt(0).toUpperCase() + quirk.slice(1)
    const building = buildPOI({
      regionId: settlement.regionId,
      parentPoiId: settlement.id,
      name,
      description: `${name} — a ${type.toLowerCase()} in ${settlement.name}. Locals note: ${quirkNote}.`,
      type: 'building',
      subtypeLabel: type,
    })
    buildings.push(building)
    const proprietor = buildNpc(
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
    )
    // A behind-the-counter quirk — child rng (keyed per building) so it doesn't
    // disturb the next proprietor's seeded generation.
    const quirkLine = rng.child(`prop-quirk-${i}`).pick(resolvePool(tables, NPC_PROPRIETOR_QUIRK_TABLE_ID, NPC_PROPRIETOR_QUIRKS))
    proprietor.description = `${proprietor.description} ${quirkLine}`
    proprietors.push(proprietor)
  })
  return { buildings, proprietors }
}
