import type { PoiType } from '@shared/constants'

export interface TownAnchor {
  poiId: string
  x: number
  y: number
  type: PoiType
  /** Facing angle in radians (aligned to the street the building fronts). */
  angle?: number
}

export interface TownPreset {
  /** multiplier applied to FOOTPRINT_TABLE dimensions */
  footprintScale: number
  /** rendered road stroke width (informational; styling reads COLORS) */
  roadWidth: number
  /** outward offset of the wall hull / earth pad, in pixel units */
  padding: number
  /** wall on by default for this preset (overridable per town) */
  wallDefault: boolean
}

export const PRESETS: Record<'village' | 'city', TownPreset> = {
  village: { footprintScale: 1, roadWidth: 3, padding: 40, wallDefault: false },
  city: { footprintScale: 1.15, roadWidth: 5, padding: 70, wallDefault: true },
}
