import type { SeededRandom } from '~/lib/dungeon/SeededRandom'
import type { Biome } from './biomes'
import {
  type ResourcePack,
  type ResourceDef,
  rawResourcesForPacks,
} from './resources.catalog'

// Theme packs are additive tag-sources. High Fantasy is on by default alongside
// the Low Fantasy baseline (which keeps every biome populatable); Sci-Fi and
// Doomed are opt-in. A user can still cherry-pick individual cross-pack resources
// in the form regardless of which packs are enabled.

export const RESOURCE_PACKS: ResourcePack[] = ['low-fantasy', 'high-fantasy', 'sci-fi', 'doomed']

export const DEFAULT_PACKS: ResourcePack[] = ['low-fantasy', 'high-fantasy']

export const PACK_LABELS: Record<ResourcePack, string> = {
  'low-fantasy': 'Low Fantasy',
  'high-fantasy': 'High Fantasy',
  'sci-fi': 'Sci-Fi',
  doomed: 'Doomed',
}

export type WorldSize = 'small' | 'medium' | 'large'

// How many distinct resources a world of each size is seeded with. More
// resources → more biomes represented → a richer, more varied map.
const COUNT_BY_SIZE: Record<WorldSize, number> = {
  small: 7,
  medium: 12,
  large: 20,
}

export function resourceCountForSize(size: WorldSize): number {
  return COUNT_BY_SIZE[size]
}

/**
 * Seeded, biome-spread auto-proposal of raw resources for the create-realm form.
 * Groups the available pool by biome and round-robins across biomes (shuffled
 * order, weighted-by-rarity pick within each biome) so the proposed set covers
 * many biomes rather than clumping. Deterministic for a given (packs, size, seed).
 * Returns raw resource NAMES only (the multiselect is raw-only by design).
 */
export function autoProposeResources(
  packs: readonly ResourcePack[],
  size: WorldSize,
  rng: SeededRandom,
): string[] {
  const pool = rawResourcesForPacks(packs)
  const target = Math.min(resourceCountForSize(size), pool.length)
  if (target === 0) return []

  // Group remaining candidates by biome.
  const byBiome = new Map<Biome, ResourceDef[]>()
  for (const r of pool) {
    if (r.biome == null) continue
    const arr = byBiome.get(r.biome)
    if (arr) arr.push(r)
    else byBiome.set(r.biome, [r])
  }

  const biomeOrder = rng.shuffle([...byBiome.keys()])
  const chosen: string[] = []
  const chosenSet = new Set<string>()

  // Round-robin across biomes until we hit the target or exhaust the pool.
  let progressed = true
  while (chosen.length < target && progressed) {
    progressed = false
    for (const biome of biomeOrder) {
      if (chosen.length >= target) break
      const candidates = (byBiome.get(biome) ?? []).filter((r) => !chosenSet.has(r.name))
      if (candidates.length === 0) continue
      const pick = rng.pickWeighted({
        entries: candidates.map((r) => ({ value: r.name, weight: r.rarityWeight })),
      })
      chosen.push(pick)
      chosenSet.add(pick)
      progressed = true
    }
  }

  return chosen
}
