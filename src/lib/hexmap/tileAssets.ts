import type { HexTile } from './tileMapping'

/**
 * Bundled URLs for the hex tile PNGs. Vite hashes + precaches these (offline
 * PWA), so no separate sprite sheet / network fetch is needed for the ~27 tiles.
 *
 * - `terrain/` — bordered hex tiles (transparent interior) for the map symbol layer.
 * - `icons/`   — borderless doodles for POI markers and the POI detail header.
 */
const terrainModules = import.meta.glob('../../assets/hex-tiles/terrain/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const iconModules = import.meta.glob('../../assets/hex-tiles/icons/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

function byName(modules: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [path, url] of Object.entries(modules)) {
    const name = path.split('/').pop()!.replace(/\.png$/, '')
    out[name] = url
  }
  return out
}

export const TERRAIN_TILE_URLS: Record<string, string> = byName(terrainModules)
export const ICON_TILE_URLS: Record<string, string> = byName(iconModules)

export function terrainTileUrl(name: HexTile | string | null | undefined): string | null {
  if (!name) return null
  return TERRAIN_TILE_URLS[name] ?? null
}

export function iconTileUrl(name: HexTile | string | null | undefined): string | null {
  if (!name) return null
  return ICON_TILE_URLS[name] ?? null
}
