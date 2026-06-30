import type { SeededRandom } from '~/lib/dungeon/SeededRandom'
import type { POI } from '@domain/entities/POI'
import { buildPOI } from './buildPoi'
import { resolvePool, type ResolvedTables } from './TableProvider'
import {
  NATURAL_SITE_NAME_TABLE_ID,
  NATURAL_SITE_NAMES,
  NATURAL_SITE_HAZARDS,
  type NaturalSiteHazard,
} from '@domain/data/worldgen/naturalSites.tables'

export interface BuildNaturalSiteInput {
  regionId: string
  rng: SeededRandom
  /** A region raw that nothing extracts yet, recorded as an unclaimed deposit. */
  hostedResource?: string
  position?: { x: number; y: number } | null
  mapRef?: string | null
  tables?: ResolvedTables
}

// Pure, seeded builder for a natural site — a named wild place (wood, mere,
// cavern, fen). Focused on IDENTITY (name + atmosphere) and an optional unclaimed
// resource deposit. Monster/treasure density is layered on later by the existing
// sprinkle pass, so this builder rolls none of that.
export function buildNaturalSite(input: BuildNaturalSiteInput): POI {
  const { rng, regionId, hostedResource } = input

  const name = rng.pick(resolvePool(input.tables, NATURAL_SITE_NAME_TABLE_ID, NATURAL_SITE_NAMES))
  const hazard: NaturalSiteHazard = rng.pick(NATURAL_SITE_HAZARDS)

  const description = hostedResource
    ? `${name} — ${hazard.mood}. The land here is rich with ${hostedResource}, untouched and unclaimed.`
    : `${name} — ${hazard.mood}.`

  const poi = buildPOI({
    regionId,
    name,
    description,
    type: 'natural',
    mood: hazard.mood,
    trouble: hazard.trouble,
    tags: ['natural-site'],
    position: input.position ?? null,
    mapRef: input.mapRef ?? null,
    trade: hostedResource ? { produces: hostedResource, needs: [] } : null,
  })

  // Defensive: if buildPOI in this tree predates the `trade` input, set it here
  // so identity + deposit don't depend on the sibling's buildPoi edit landing.
  poi.trade = hostedResource ? { produces: hostedResource, needs: [] } : null

  return poi
}
