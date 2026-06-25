import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { hexDistance } from '~/lib/hexmap/hex'
import { layoutHexGrid } from '~/lib/hexmap/hexLayout'
import { BIOMES, type Biome } from '~/domain/data/worldgen/biomes'
import type { GameMap, HexCell } from '@domain/entities/GameMap'
import { newId } from '@shared/ulid'

// Land biomes used as cluster seeds. `lake` is excluded from the seed set; it
// does not appear in v1 tiny worlds (no scatter/filler pass yet).
const LAND_BIOMES: Biome[] = BIOMES.filter((b) => b !== 'lake')

export function buildTinyHexMap(
  realmId: string,
  seed: string,
  opts: { cols?: number; rows?: number; hexSize?: number } = {}
): GameMap {
  const cols = opts.cols ?? 8
  const rows = opts.rows ?? 8
  const hexSize = opts.hexSize ?? 40
  const rng = new SeededRandom(seed)

  const { cells, width, height } = layoutHexGrid(cols, rows, hexSize)

  // Seed a handful of biome "centers"; each cell takes the nearest center's biome.
  const seedCount = Math.max(3, Math.round(Math.sqrt(cells.length) / 2))
  const centers = Array.from({ length: seedCount }, () => {
    const cell = cells[rng.between(0, cells.length - 1)]
    return { q: cell.q, r: cell.r, biome: rng.pick(LAND_BIOMES) }
  })

  const hexCells: HexCell[] = cells.map((cell) => {
    let best = centers[0]
    let bestDist = Infinity
    for (const center of centers) {
      const d = hexDistance({ q: cell.q, r: cell.r }, { q: center.q, r: center.r })
      if (d < bestDist) {
        bestDist = d
        best = center
      }
    }
    return { q: cell.q, r: cell.r, biome: best.biome, corners: cell.corners }
  })

  const now = Date.now()
  return {
    id: newId(),
    name: 'Generated World Map',
    ownerRealmId: realmId,
    ownerPoiId: null,
    imageUrl: '',
    width,
    height,
    sortOrder: now,
    kind: 'hex',
    hexCols: cols,
    hexRows: rows,
    hexSize,
    hexOrientation: 'pointy',
    hexCells,
    createdAt: now,
    updatedAt: now,
  }
}
