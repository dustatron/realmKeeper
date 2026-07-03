import type { Point } from '~/lib/hexmap/hex'
import type { Biome } from '~/domain/data/worldgen/biomes'
import type { WatabouCityData } from '@domain/value-objects/WatabouCityData'

export interface HexCell {
  q: number
  r: number
  biome: Biome
  corners: Point[]
  /**
   * Hand-drawn tile name (see tileMapping). Terrain tile by biome, or a feature
   * tile when the cell hosts a POI. Optional: older generated maps lack it and
   * fall back to the biome's terrain tile at render time.
   */
  tile?: string
  /**
   * Worldgen terrain attributes. Optional and additive: older generated maps
   * lack them entirely. No backfill is performed — absence is treated as "unset".
   */
  elevation?: number
  river?: boolean
  /**
   * The next cell DOWNSTREAM in this cell's river course (source → terminus), or
   * null at a terminus (map edge / lake). Drives flow-accurate river rendering:
   * water is drawn only along real flow edges, so tributaries merge into trunks
   * instead of every adjacent river pair joining into a lattice. Absent on cells
   * with no river and on older generated maps.
   */
  riverTo?: { q: number; r: number } | null
  chokepoint?: 'ford' | 'pass' | 'bridge' | null
}

export interface GameMap {
  id: string
  name: string
  ownerRealmId: string | null
  ownerPoiId: string | null
  imageUrl: string
  kind: 'image' | 'hex' | 'town'
  hexCols: number | null
  hexRows: number | null
  hexSize: number | null
  hexOrientation: 'pointy' | 'flat' | null
  hexCells?: HexCell[]
  townData?: WatabouCityData | null
  townPreset?: 'village' | 'city' | null
  townSeed?: string | null
  townWalled?: boolean | null
  width: number
  height: number
  sortOrder: number
  createdAt: number
  updatedAt: number
}
