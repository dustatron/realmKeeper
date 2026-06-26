import type { Point } from '~/lib/hexmap/hex'
import type { Biome } from '~/domain/data/worldgen/biomes'
import type { WatabouCityData } from '@domain/value-objects/WatabouCityData'

export interface HexCell {
  q: number
  r: number
  biome: Biome
  corners: Point[]
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
