import type { NPC } from '@domain/entities/NPC'
import type { InventoryItem } from '@domain/value-objects/SystemBlock'
import type { POI } from '@domain/entities/POI'
import type { TreasureItem } from '@domain/value-objects/TreasureItem'
import type { PoiType } from '@shared/constants'
import { newId } from '@shared/ulid'
import type { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { tierForTerrain } from './regionFlavor'
import type { Faction } from '@domain/entities/Faction'
import type { LootDensity } from './lootDensity'
import { pickTierMonster } from '~/lib/worldgen/compendium-utils'

/** POI types eligible for monster seeding (excludes dungeon/ruin — those have their own generators). */
export const MONSTER_POI_TYPES = new Set<PoiType>([
  'camp',
  'fortification',
  'landmark',
  'natural',
  'shrine',
])

const BASE_MONSTER = 1

const GUARD_CHANCE: Record<'easy' | 'tough' | 'perilous', number> = {
  easy: 0,
  tough: 0.4,
  perilous: 0.75,
}

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

/** Group NPCs by regionId, skipping those with no regionId. */
export function npcsByRegion(npcs: NPC[]): Map<string, NPC[]> {
  const m = new Map<string, NPC[]>()
  for (const n of npcs) {
    if (!n.regionId) continue
    const a = m.get(n.regionId) ?? []
    a.push(n)
    m.set(n.regionId, a)
  }
  return m
}

export function pushMagicToNpc(
  n: NPC,
  picked: { id: string | null; name: string; description: string } | null,
  notable: boolean,
): void {
  const item: InventoryItem = {
    id: newId(),
    name: picked?.name ?? 'Strange Relic',
    slots: 1,
    description: picked?.description ?? '',
    source: 'compendium',
    compendiumKind: 'magicItem',
    ...(picked?.id ? { compendiumId: picked.id } : {}),
    notable,
  }
  n.systemBlock.inventory = [...(n.systemBlock.inventory ?? []), item]
}

export function pushTreasureToNpc(n: NPC, item: TreasureItem): void {
  const invItem: InventoryItem = {
    id: newId(),
    name: item.name,
    slots: 1,
    description: item.description,
    value: item.value,
    quantity: item.quantity,
    source: 'treasure',
    ...(item.notable ? { notable: true } : {}),
  }
  n.systemBlock.inventory = [...(n.systemBlock.inventory ?? []), invItem]
}

const TIER_FACTOR: Record<'easy' | 'tough' | 'perilous', number> = {
  easy: 1,
  tough: 1.5,
  perilous: 2,
}

const BASE_TREASURE = 2
const BASE_MAGIC = 1

/** Weight: probability that a find goes to an NPC rather than a POI (when NPCs available). */
const NPC_WEIGHT = 0.3

export interface SeedRegionLootInput {
  region: { id: string; terrain: string }
  holders: POI[]
  npcs?: NPC[]
  treasureMult: number
  magicMult: number
  takeMagic: () => { id: string; name: string; description: string } | null
  rng: SeededRandom
  pickTreasureItemFn: (rng: SeededRandom) => TreasureItem
}

export function seedRegionLoot(input: SeedRegionLootInput): void {
  const { region, holders, npcs = [], treasureMult, magicMult, takeMagic, rng, pickTreasureItemFn } = input
  if (holders.length === 0 && npcs.length === 0) return

  const rrng = rng.child(`region-${region.id}`)
  const tier = TIER_FACTOR[tierForTerrain(region.terrain)]
  let regionHasNotable = false

  /** Pick an NPC holder with NPC_WEIGHT if NPCs available, else pick from POI holders. */
  function pickHolder(): { kind: 'poi'; poi: POI } | { kind: 'npc'; npc: NPC } {
    if (npcs.length > 0 && holders.length > 0 && rrng.next() < NPC_WEIGHT) {
      return { kind: 'npc', npc: rrng.pick(npcs) }
    }
    if (holders.length > 0) {
      return { kind: 'poi', poi: rrng.pick(holders) }
    }
    // Only NPCs available
    return { kind: 'npc', npc: rrng.pick(npcs) }
  }

  // Magic branch
  if (magicMult > 0) {
    const count = Math.max(1, Math.round(BASE_MAGIC * magicMult * tier))
    for (let i = 0; i < count; i++) {
      const picked = takeMagic()
      if (picked === null) {
        if (i === 0 && !regionHasNotable) {
          // Fall back to a notable treasure when magic pool is exhausted
          const h = pickHolder()
          const item = pickTreasureItemFn(rrng)
          item.notable = true
          if (h.kind === 'poi') {
            h.poi.treasure = [...h.poi.treasure, item]
          } else {
            pushTreasureToNpc(h.npc, item)
          }
          regionHasNotable = true
        }
        // skip extra slots
        continue
      }
      const isNotable = !regionHasNotable
      const h = pickHolder()
      if (h.kind === 'poi') {
        const treasure: TreasureItem = {
          id: newId(),
          name: picked.name,
          description: picked.description,
          value: 'priceless',
          quantity: 1,
          collected: false,
          isMagic: true,
          compendiumId: picked.id,
          notable: isNotable,
        }
        h.poi.treasure = [...h.poi.treasure, treasure]
        if (!h.poi.magicItemRefs.some((ref) => ref.id === picked.id)) {
          h.poi.magicItemRefs = [...h.poi.magicItemRefs, { id: picked.id }]
        }
      } else {
        pushMagicToNpc(h.npc, picked, isNotable)
      }
      regionHasNotable = true
    }
  }

  // Treasure branch
  if (treasureMult > 0) {
    const count = Math.max(1, Math.round(BASE_TREASURE * treasureMult * tier))
    for (let i = 0; i < count; i++) {
      const h = pickHolder()
      const item = pickTreasureItemFn(rrng)
      if (!regionHasNotable && i === 0) {
        item.notable = true
        regionHasNotable = true
      }
      if (h.kind === 'poi') {
        h.poi.treasure = [...h.poi.treasure, item]
      } else {
        pushTreasureToNpc(h.npc, item)
      }
    }
  }
}

export interface SeedFactionGreatItemsInput {
  factions: Faction[]
  poiById: Map<string, POI>
  npcById: Map<string, NPC>
  magicDensity?: LootDensity
  takeMagic: () => { id: string; name: string; description: string } | null
  pickTreasureItemFn: (rng: SeededRandom) => TreasureItem
  rng: SeededRandom
}

type PickMonsterFn = (
  systemId: string,
  tier: 'easy' | 'tough' | 'perilous',
  rng: SeededRandom,
  opts: { high: boolean },
) => { id: string; name: string } | null

/**
 * Seed monster refs for a single region's POIs.
 * Every region with eligible POIs gets max(1, round(BASE_MONSTER × monsterMult × tierFactor)) monsters.
 * The first pick is always high-band. Notable-find POIs in tough/perilous regions get a guardian
 * with GUARD_CHANCE probability.
 *
 * @param pickMonsterFn - Optional injected picker (defaults to pickTierMonster). Enables deterministic
 *   testing without a real compendium.
 */
export function seedRegionMonsters(
  regionPois: POI[],
  tier: 'easy' | 'tough' | 'perilous',
  monsterMult: number,
  systemId: string,
  rng: SeededRandom,
  pickMonsterFn: PickMonsterFn = pickTierMonster,
): void {
  if (monsterMult <= 0) return
  const eligible = regionPois.filter((p) => MONSTER_POI_TYPES.has(p.type))
  if (eligible.length === 0) return

  const tierFactor = TIER_FACTOR[tier]
  const count = Math.max(1, Math.round(BASE_MONSTER * monsterMult * tierFactor))

  for (let i = 0; i < count; i++) {
    const holder = rng.pick(eligible)
    const m = pickMonsterFn(systemId, tier, rng, { high: i === 0 })
    if (m && !holder.monsterRefs.some((r) => r.id === m.id)) {
      holder.monsterRefs = [...holder.monsterRefs, { id: m.id, quantity: rng.between(1, 3) }]
    }
  }

  // Guardian pass: notable-find POIs in tough/perilous regions.
  // Retry up to 5 times to find an id not already on the holder; if all attempts collide,
  // bump the existing ref's quantity instead of silently dropping the guardian.
  const gc = GUARD_CHANCE[tier]
  if (gc > 0) {
    for (const holder of eligible) {
      const hasNotable = holder.treasure.some((t) => t.notable || t.isMagic)
      if (!hasNotable || !rng.chance(gc)) continue

      let g = pickMonsterFn(systemId, tier, rng, { high: true })
      if (!g) continue

      let attempts = 0
      while (attempts < 4 && holder.monsterRefs.some((r) => r.id === g!.id)) {
        g = pickMonsterFn(systemId, tier, rng, { high: true })
        if (!g) break
        attempts++
      }

      if (!g) continue

      const existing = holder.monsterRefs.find((r) => r.id === g!.id)
      if (existing) {
        // All retries collided — bump quantity to ensure the guardian is reflected
        holder.monsterRefs = holder.monsterRefs.map((r) =>
          r.id === g!.id ? { ...r, quantity: (r.quantity ?? 1) + 1 } : r
        )
      } else {
        holder.monsterRefs = [...holder.monsterRefs, { id: g.id, quantity: 1 }]
      }
    }
  }
}

/**
 * Guarantee one notable "great" item per non-party faction.
 * Prefers the HQ POI; falls back to the leader NPC.
 * If magicDensity !== 'off', draws from the shared takeMagic pool (falls back to notable
 * treasure when pool exhausted). If magicDensity === 'off', always places a notable treasure.
 */
export function seedFactionGreatItems(input: SeedFactionGreatItemsInput): void {
  const { factions, poiById, npcById, magicDensity, takeMagic, pickTreasureItemFn, rng } = input
  const magicOn = (magicDensity ?? 'off') !== 'off'

  for (const f of factions) {
    if (f.isParty) continue

    const hqPoi = f.headquartersPoiId ? poiById.get(f.headquartersPoiId) : undefined
    const leader = f.leaderNpcId ? npcById.get(f.leaderNpcId) : undefined
    if (!hqPoi && !leader) continue

    if (magicOn) {
      const picked = takeMagic()
      if (picked !== null) {
        if (hqPoi) {
          const treasure: TreasureItem = {
            id: newId(),
            name: picked.name,
            description: picked.description,
            value: 'priceless',
            quantity: 1,
            collected: false,
            isMagic: true,
            compendiumId: picked.id,
            notable: true,
          }
          hqPoi.treasure = [...hqPoi.treasure, treasure]
          if (!hqPoi.magicItemRefs.some((ref) => ref.id === picked.id)) {
            hqPoi.magicItemRefs = [...hqPoi.magicItemRefs, { id: picked.id }]
          }
        } else {
          pushMagicToNpc(leader!, picked, true)
        }
      } else {
        // Magic pool exhausted → fall back to notable treasure
        const item = pickTreasureItemFn(rng)
        item.notable = true
        if (hqPoi) {
          hqPoi.treasure = [...hqPoi.treasure, item]
        } else {
          pushTreasureToNpc(leader!, item)
        }
      }
    } else {
      // magicDensity === 'off' → always a notable treasure
      const item = pickTreasureItemFn(rng)
      item.notable = true
      if (hqPoi) {
        hqPoi.treasure = [...hqPoi.treasure, item]
      } else {
        pushTreasureToNpc(leader!, item)
      }
    }
  }
}
