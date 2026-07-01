import type { Season } from '@shared/constants'

export type DoomStatus = 'looming' | 'averted' | 'reckoned'
export type DoomVector = 'roads' | 'water' | 'blight' | 'resource'

export interface DoomStage {
  threshold: number // clock progress at/after which this grim portent fires (ascending, 1..segments)
  portent: string   // grim-portent text
  fired: boolean
}

export interface Doom {
  id: string
  worldId: string
  name: string                 // "The Reckoning of the <faction>" OR a themed name
  theme: string                // selected create-realm doom label, or '' when random
  description: string
  doomFactionId: string | null
  status: DoomStatus
  progress: number             // current clock fill (0..segments)
  segments: number             // ticks to reckoning (default 6)
  stages: DoomStage[]          // grim portents keyed to thresholds, ascending
  vector: DoomVector
  keyedResource: string | null
  keyedBiome: string | null
  reckoningDate: { year: number; season: Season; day: number; watch: number }
  /** World-date the doom's clock started (generation time). Anchors proportional clock fill. */
  startDate: { year: number; season: Season; day: number; watch: number }
  hookId: string | null        // the avert quest hook id
  createdAt: number
  updatedAt: number
}
