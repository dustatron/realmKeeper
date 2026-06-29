import { createWeightedTable, type WeightedTable } from '~/lib/dungeon/SeededRandom'
import type { PoiType } from '@shared/constants'
import type { DungeonTheme } from '~/lib/dungeon/types'

export type PoiKind = 'settlement' | 'dungeon' | 'ruin' | 'landmark'

export const POI_KIND_TABLE: WeightedTable<PoiKind> = createWeightedTable<PoiKind>({
  settlement: 4,
  dungeon: 3,
  ruin: 2,
  landmark: 3,
})

export function poiKindToType(kind: PoiKind): PoiType {
  switch (kind) {
    case 'settlement':
      return 'settlement'
    case 'dungeon':
      return 'dungeon'
    case 'ruin':
      return 'ruin'
    case 'landmark':
      return 'landmark'
  }
}

// Art-driven landmark subtypes. The `label` doubles as the POI's subtypeLabel
// AND the key into LANDMARK_LABEL_TO_TILE (tileMapping), so each renders its own
// hand-drawn tile. `hook` is a mechanical seed surfaced on the POI for the GM.
export interface LandmarkArt {
  label: string
  hook: string
}

export const LANDMARK_ART_TABLE: WeightedTable<LandmarkArt> = {
  entries: [
    {
      value: {
        label: 'Standing Stones',
        hook: 'On the right night the ring opens a way; the rest of the time it only watches. Something is buried at its center.',
      },
      weight: 3,
    },
    {
      value: {
        label: 'Ancient Wonder',
        hook: 'A structure no one alive could have built, its purpose dormant — and someone is quietly trying to wake it.',
      },
      weight: 3,
    },
    {
      value: {
        label: 'Crystal Spire',
        hook: 'The crystals hum and slowly grow. Harvested shards hold a charge; over-harvesting draws what feeds on them.',
      },
      weight: 2,
    },
    {
      value: {
        label: 'Floating Island',
        hook: 'It drifts above the ground. Reaching what rests on top needs flight, a tether, or learning why it floats.',
      },
      weight: 1,
    },
    {
      value: {
        label: 'Volcano',
        hook: 'It smokes steadily. Each season it stirs; locals count the stirrings, and dread the one that does not stop.',
      },
      weight: 1,
    },
  ],
}

// Names for planar portals (POI type 'portal'). Re-authored, system-agnostic.
export const PORTAL_NAMES: string[] = [
  'The Standing Gate',
  'The Hollow Arch',
  'Mistgate',
  'The Sunken Door',
  'Threshold Stone',
  'The Wayward Arch',
  'The Pale Gate',
  'Echo Arch',
  'The Riven Door',
  'Gate of Ash',
]

// Typed as DungeonTheme[] so the compiler rejects any value not in the union
// (e.g. 'ruin' is a POI kind but NOT a valid dungeon theme).
export const DUNGEON_THEMES: DungeonTheme[] = [
  'crypt',
  'cave',
  'temple',
  'tomb',
  'mine',
  'lair',
]
