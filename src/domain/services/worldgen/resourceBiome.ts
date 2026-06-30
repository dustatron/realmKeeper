import type { SeededRandom } from '~/lib/dungeon/SeededRandom'
import type { Biome } from '@domain/data/worldgen/biomes'
import {
  RESOURCE_CATALOG,
  resourceByName,
  type ResourceDef,
} from '@domain/data/worldgen/resources.catalog'

// Assigns each region a DEFINING RESOURCE drawn from a chosen pool, weighted to
// preserve biome variety. Pure + seeded: identical (regionCount, pool, seed) →
// identical output. Raw resources determine biomes; finished/unknown names in the
// pool are ignored. An empty/all-finished pool falls back to the low-fantasy raw
// baseline so generation can never produce zero biomes.

export interface RegionResource {
  definingResource: string
  biome: Biome
}

/** The biome a raw resource implies, or null for finished/unknown names. */
export function biomeForResource(name: string): Biome | null {
  const def = resourceByName(name)
  if (!def || def.tier !== 'raw' || def.biome == null) return null
  return def.biome
}

// Low-fantasy raw baseline: every land biome is represented, so the world can
// never end up with zero biomes even if the caller passes nothing usable.
function lowFantasyRawBaseline(): ResourceDef[] {
  return RESOURCE_CATALOG.filter(
    (r) => r.tier === 'raw' && r.biome != null && r.packs.includes('low-fantasy'),
  )
}

// Resolve the pool of usable raw resource defs (raw + known biome). Falls back to
// the low-fantasy baseline when the pool yields nothing usable.
function resolveRawDefs(pool: readonly string[]): ResourceDef[] {
  const defs: ResourceDef[] = []
  const seen = new Set<string>()
  for (const name of pool) {
    if (seen.has(name)) continue
    const def = resourceByName(name)
    if (!def || def.tier !== 'raw' || def.biome == null) continue
    seen.add(name)
    defs.push(def)
  }
  return defs.length > 0 ? defs : lowFantasyRawBaseline()
}

export function assignRegionResources(
  regionCount: number,
  pool: string[],
  rng: SeededRandom,
): RegionResource[] {
  if (regionCount <= 0) return []

  const defs = resolveRawDefs(pool)

  // Group usable resources by biome.
  const byBiome = new Map<Biome, ResourceDef[]>()
  for (const def of defs) {
    const biome = def.biome as Biome
    const arr = byBiome.get(biome)
    if (arr) arr.push(def)
    else byBiome.set(biome, [def])
  }

  // Seeded-shuffle biome order so round-robin spreads biomes as evenly as
  // possible while staying deterministic per seed.
  const biomeOrder = rng.shuffle([...byBiome.keys()])

  const assignments: RegionResource[] = []
  let cursor = 0
  while (assignments.length < regionCount) {
    const biome = biomeOrder[cursor % biomeOrder.length]
    cursor++
    const candidates = byBiome.get(biome) ?? []
    if (candidates.length === 0) continue
    // Within a biome, weighted pick by rarityWeight (repeats allowed when the
    // pool is smaller than the region count).
    const pick = rng.pickWeighted({
      entries: candidates.map((r) => ({ value: r.name, weight: r.rarityWeight })),
    })
    assignments.push({ definingResource: pick, biome })
  }

  return assignments
}
