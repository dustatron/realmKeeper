import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import type { DungeonTheme } from '~/lib/dungeon/types'
import { hexDistance } from '~/lib/hexmap/hex'
import { layoutHexGrid, BIOME_COLORS } from '~/lib/hexmap/hexLayout'
import { BIOMES, type Biome, pickBiomeFeature } from '~/domain/data/worldgen/biomes'
import { pickName } from '~/domain/data/worldgen/names'
import { POI_KIND_TABLE, poiKindToType, DUNGEON_THEMES } from '~/domain/data/worldgen/poiKinds'
import { buildPOI } from './buildPoi'
import type { GameMap, HexCell } from '@domain/entities/GameMap'
import type { Region } from '@domain/entities/Region'
import type { POI } from '@domain/entities/POI'
import { newId } from '@shared/ulid'

export type PoiDensity = 'sparse' | 'normal' | 'dense'

const DENSITY: Record<PoiDensity, number> = {
  sparse: 0.08,
  normal: 0.15,
  dense: 0.25,
}

const LAND_BIOMES: Biome[] = BIOMES.filter((b) => b !== 'lake')

export function generateWorld(
  realmId: string,
  seed: string,
  opts: { cols: number; rows: number; hexSize?: number; poiDensity?: PoiDensity }
): { gameMap: GameMap; regions: Region[]; pois: POI[] } {
  const { cols, rows, hexSize = 40, poiDensity = 'normal' } = opts
  const rng = new SeededRandom(seed)

  // Step 1: layout grid
  const { cells, width, height } = layoutHexGrid(cols, rows, hexSize)

  // Step 2: seed biome centers (lake excluded)
  const seedCount = Math.max(3, Math.round(Math.sqrt(cells.length) / 2))
  const centers = Array.from({ length: seedCount }, () => {
    const cell = cells[rng.between(0, cells.length - 1)]
    return { q: cell.q, r: cell.r, biome: rng.pick(LAND_BIOMES) }
  })

  // Step 3: one Region per center
  const now = Date.now()
  const regions: Region[] = centers.map((center) => {
    const id = newId()
    return {
      id,
      worldId: realmId,
      name: pickName('region', rng),
      description: '',
      terrain: center.biome,
      features: [pickBiomeFeature(center.biome, rng)],
      dangers: [],
      settlements: [],
      resources: [],
      people: [],
      boundary: null,
      color: BIOME_COLORS[center.biome],
      imageUrl: null,
      createdAt: now,
      updatedAt: now,
    }
  })

  // Step 4: assign each cell its biome + regionId by nearest center
  interface CellMeta {
    q: number
    r: number
    cx: number
    cy: number
    biome: Biome
    regionId: string
    corners: { x: number; y: number }[]
  }

  const cellMetas: CellMeta[] = cells.map((cell, i) => {
    let bestIdx = 0
    let bestDist = Infinity
    for (let ci = 0; ci < centers.length; ci++) {
      const d = hexDistance({ q: cell.q, r: cell.r }, { q: centers[ci].q, r: centers[ci].r })
      if (d < bestDist) {
        bestDist = d
        bestIdx = ci
      }
    }
    return {
      q: cell.q,
      r: cell.r,
      cx: cell.cx,
      cy: cell.cy,
      biome: centers[bestIdx].biome,
      regionId: regions[bestIdx].id,
      corners: cell.corners,
    }
  })

  // Step 5: build GameMap
  const hexCells: HexCell[] = cellMetas.map((cm) => ({
    q: cm.q,
    r: cm.r,
    biome: cm.biome,
    corners: cm.corners,
  }))

  const gameMap: GameMap = {
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

  // Step 6: scatter POIs
  const landCells = cellMetas.filter((cm) => cm.biome !== 'lake')
  const poiCount = Math.round(landCells.length * DENSITY[poiDensity])
  const pickedCells = rng.sample(landCells, poiCount)

  const pois: POI[] = pickedCells.map((cell) => {
    const kind = rng.pickWeighted(POI_KIND_TABLE)
    const type = poiKindToType(kind)
    const nameKind = kind === 'landmark' ? 'landmark' : kind
    const name = pickName(nameKind, rng)
    const id = newId()

    const dungeonGenOptions =
      type === 'dungeon'
        ? {
            seed: `${seed}-${id}`,
            theme: rng.pick(DUNGEON_THEMES) as DungeonTheme,
            size: 'medium' as const,
            treasureLevel: 'standard' as const,
            dangerLevel: 'medium' as const,
            includeWeapons: true,
            includeGear: true,
            magicItemCount: 1,
            spellCount: 0,
            exitPoiIds: [],
          }
        : null

    const poi = buildPOI({
      regionId: cell.regionId,
      name,
      type,
      position: { x: cell.cx, y: cell.cy },
      mapRef: gameMap.id,
      dungeonGenOptions,
    })

    // buildPOI generates its own id; we used id only for the dungeon seed
    return poi
  })

  return { gameMap, regions, pois }
}
