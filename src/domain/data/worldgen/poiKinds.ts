import { createWeightedTable, type WeightedTable } from '~/lib/dungeon/SeededRandom'
import type { PoiType } from '@shared/constants'

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

export const DUNGEON_THEMES = ['crypt', 'cave', 'temple', 'ruin', 'mine', 'lair']
