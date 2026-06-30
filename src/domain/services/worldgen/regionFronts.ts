import type { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { resolvePool, type ResolvedTables } from './TableProvider'
import {
  REGION_FRONT_TITLE_TABLE_ID, REGION_FRONT_TITLES,
  REGION_FRONT_DESC_TABLE_ID, REGION_FRONT_DESCRIPTIONS,
} from '@domain/data/worldgen/regionFront.tables'

export interface RegionFront {
  title: string
  description: string
  /** Filled segments on the progress clock. Always starts at 0. */
  progress: number
  /** Total segments before the front resolves — 4 (fast) or 6 (slow). */
  segments: number
}

export interface RegionFrontInput {
  regionId: string
  /** The region's defining resource, woven into the front when present. */
  definingResource: string | null
  rng: SeededRandom
  tables?: ResolvedTables
}

// Build a regional FRONT: a mini progress-clock threat that the world advances
// when the table ignores it. Title + escalating description come from the front
// tables; when the region has a defining resource, a closing line ties the
// threat to what the region has to lose. Pure and deterministic for a seed.
export function buildRegionFront(input: RegionFrontInput): RegionFront {
  const { definingResource, rng, tables } = input
  const titles = resolvePool(tables, REGION_FRONT_TITLE_TABLE_ID, REGION_FRONT_TITLES)
  const descriptions = resolvePool(tables, REGION_FRONT_DESC_TABLE_ID, REGION_FRONT_DESCRIPTIONS)

  const title = rng.pick(titles)
  let description = rng.pick(descriptions)

  // A slow front (6 segments) gives more room before it tips; a fast one (4)
  // bites sooner. Seeded so the same region always gets the same pace.
  const segments = rng.chance(0.5) ? 4 : 6

  if (definingResource) {
    description += ` And the ${definingResource} this region lives by will be the first thing lost.`
  }

  return { title, description, progress: 0, segments }
}
