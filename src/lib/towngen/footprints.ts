import type { PoiType } from '@shared/constants'

export type FootprintShape = 'rect' | 'blob'
export interface FootprintSpec {
  shape: FootprintShape
  /** base width/height in pixel units (before preset scaling) */
  w: number
  h: number
}

export const FOOTPRINT_TABLE: Record<PoiType, FootprintSpec> = {
  settlement: { shape: 'rect', w: 60, h: 60 },
  building: { shape: 'rect', w: 34, h: 28 },
  interior: { shape: 'rect', w: 26, h: 22 },
  fortification: { shape: 'rect', w: 70, h: 70 },
  dungeon: { shape: 'blob', w: 44, h: 44 },
  natural: { shape: 'blob', w: 40, h: 40 },
  landmark: { shape: 'blob', w: 30, h: 30 },
  district: { shape: 'rect', w: 80, h: 60 },
  zone: { shape: 'rect', w: 80, h: 60 },
  ruin: { shape: 'rect', w: 36, h: 30 },
  camp: { shape: 'blob', w: 28, h: 28 },
  shrine: { shape: 'blob', w: 24, h: 24 },
  other: { shape: 'rect', w: 30, h: 26 },
}
