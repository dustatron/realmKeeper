import type { POI } from '@domain/entities/POI'
import type { TreasureItem } from '@domain/value-objects/TreasureItem'
import type { PoiType } from '@shared/constants'
import { newId } from '@shared/ulid'
import type { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { tierForTerrain } from './regionFlavor'

export const TREASURE_POI_TYPES = new Set<PoiType>([
  'building',
  'camp',
  'fortification',
  'landmark',
  'natural',
  'shrine',
])

/** Filter POIs eligible for treasure seeding: correct type, not a dungeon child. */
export function eligibleTreasurePois(pois: POI[]): POI[] {
  const dungeonIds = new Set(pois.filter((p) => p.type === 'dungeon').map((p) => p.id))
  return pois.filter((p) => {
    if (!TREASURE_POI_TYPES.has(p.type)) return false
    if (p.parentPoiId && dungeonIds.has(p.parentPoiId)) return false
    return true
  })
}

const TIER_FACTOR: Record<'easy' | 'tough' | 'perilous', number> = {
  easy: 1,
  tough: 1.5,
  perilous: 2,
}

const BASE_TREASURE = 2
const BASE_MAGIC = 1

export interface SeedRegionLootInput {
  region: { id: string; terrain: string }
  holders: POI[]
  treasureMult: number
  magicMult: number
  takeMagic: () => { id: string; name: string; description: string } | null
  rng: SeededRandom
  pickTreasureItemFn: (rng: SeededRandom) => TreasureItem
}

export function seedRegionLoot(input: SeedRegionLootInput): void {
  const { region, holders, treasureMult, magicMult, takeMagic, rng, pickTreasureItemFn } = input
  if (holders.length === 0) return

  const rrng = rng.child(`region-${region.id}`)
  const tier = TIER_FACTOR[tierForTerrain(region.terrain)]
  let regionHasNotable = false

  // Magic branch
  if (magicMult > 0) {
    const count = Math.max(1, Math.round(BASE_MAGIC * magicMult * tier))
    for (let i = 0; i < count; i++) {
      const picked = takeMagic()
      if (picked === null) {
        if (i === 0 && !regionHasNotable) {
          // Fall back to a notable treasure when magic pool is exhausted
          const holder = rrng.pick(holders)
          const item = pickTreasureItemFn(rrng)
          item.notable = true
          holder.treasure = [...holder.treasure, item]
          regionHasNotable = true
        }
        // skip extra slots
        continue
      }
      const holder = rrng.pick(holders)
      const treasure: TreasureItem = {
        id: newId(),
        name: picked.name,
        description: picked.description,
        value: 'priceless',
        quantity: 1,
        collected: false,
        isMagic: true,
        compendiumId: picked.id,
        notable: !regionHasNotable,
      }
      holder.treasure = [...holder.treasure, treasure]
      if (!holder.magicItemRefs.some((ref) => ref.id === picked.id)) {
        holder.magicItemRefs = [...holder.magicItemRefs, { id: picked.id }]
      }
      regionHasNotable = true
    }
  }

  // Treasure branch
  if (treasureMult > 0) {
    const count = Math.max(1, Math.round(BASE_TREASURE * treasureMult * tier))
    for (let i = 0; i < count; i++) {
      const holder = rrng.pick(holders)
      const item = pickTreasureItemFn(rrng)
      if (!regionHasNotable && i === 0) {
        item.notable = true
        regionHasNotable = true
      }
      holder.treasure = [...holder.treasure, item]
    }
  }
}
