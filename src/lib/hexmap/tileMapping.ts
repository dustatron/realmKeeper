import type { Biome } from '~/domain/data/worldgen/biomes'
import type { PoiType } from '@shared/constants'

/**
 * Hex tile vocabulary — the 27 hand-drawn tiles (see src/assets/hex-tiles).
 * Pure name logic only: NO asset imports here, so worldgen (and its tests) can
 * resolve tile names without pulling in Vite's `import.meta.glob`. The UI maps
 * these names to bundled PNG URLs via tileAssets.ts.
 */
export const HEX_TILES = [
  'volcano', 'water', 'grass', 'forest', 'trees', 'hills', 'mountains',
  'city', 'river', 'lake', 'cave', 'swamp', 'portal', 'village', 'community',
  'tower', 'hole', 'dead-trees', 'standing-stones', 'graveyard', 'ruins',
  'floating-island', 'wonder', 'keep', 'crystals', 'fog', 'farms',
  // Border-only tile (transparent interior): keeps the hand-drawn hex outline on
  // biomes that have no doodle of their own (desert, frozen) — the color fill
  // shows through the middle.
  'empty-hex',
] as const
export type HexTile = (typeof HEX_TILES)[number]

/**
 * Terrain overlay tile per biome. The biome COLOR fill renders underneath
 * (terrainColors / BIOME_COLORS), so `null` biomes (desert, frozen) simply show
 * the tan/icy fill with no doodle — there is no dune or snow tile in the pack.
 */
export const TERRAIN_TILE_BY_BIOME: Record<Biome, HexTile | null> = {
  forest: 'forest',
  jungle: 'forest',
  grasslands: 'grass',
  mountains: 'mountains',
  hills: 'hills',
  marsh: 'swamp',
  blighted: 'dead-trees',
  lake: 'water',
  // No desert/snow doodle in the pack — use the border-only tile so these read
  // as deliberate (outlined hex + biome color) rather than a missing tile.
  desert: 'empty-hex',
  frozen: 'empty-hex',
}

export function terrainTileForBiome(biome: Biome): HexTile | null {
  return TERRAIN_TILE_BY_BIOME[biome] ?? null
}

/**
 * Human-readable landmark subtype label → its hex tile. Worldgen sets these
 * labels on art-driven landmark POIs; the map cell and the POI marker/detail
 * both resolve the tile through here, so a "Crystal Spire" reads as crystals
 * everywhere. Unknown landmark subtypes fall back to `wonder`.
 */
export const LANDMARK_LABEL_TO_TILE: Record<string, HexTile> = {
  'floating island': 'floating-island',
  volcano: 'volcano',
  'ancient wonder': 'wonder',
  'crystal spire': 'crystals',
  'standing stones': 'standing-stones',
}

/**
 * Feature tile for a POI, overriding the terrain tile on the hex it sits on.
 * Settlement size is read from a `size:` tag when present (city > village >
 * hamlet); subtype-specific landmarks/dungeons are read from a `subtype:` tag.
 */
export function featureTileForPoi(
  type: PoiType,
  opts: { subtype?: string | null; size?: string | null } = {},
): HexTile | null {
  const subtype = opts.subtype?.toLowerCase() ?? ''
  // Direct subtype → tile (set by art-driven worldgen).
  if ((HEX_TILES as readonly string[]).includes(subtype)) return subtype as HexTile

  switch (type) {
    case 'settlement': {
      const size = opts.size?.toLowerCase() ?? ''
      if (size === 'city' || size === 'large') return 'city'
      if (size === 'hamlet' || size === 'tiny') return 'community'
      return 'village'
    }
    case 'fortification':
      return 'keep'
    case 'dungeon':
      return 'cave'
    case 'ruin':
      return 'ruins'
    case 'portal':
      return 'portal'
    case 'landmark':
      return LANDMARK_LABEL_TO_TILE[subtype] ?? 'wonder'
    case 'shrine':
      return 'standing-stones'
    case 'camp':
      return 'community'
    case 'natural':
      return 'trees'
    default:
      return null
  }
}
