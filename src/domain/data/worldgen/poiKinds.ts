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
