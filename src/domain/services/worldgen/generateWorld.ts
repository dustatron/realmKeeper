import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { hexDistance, hexNeighbors } from '~/lib/hexmap/hex'
import {
  layoutHexGrid,
  REGION_PALETTE,
  hexClusterOutline,
} from '~/lib/hexmap/hexLayout'
import { BIOMES, type Biome } from '~/domain/data/worldgen/biomes'
import { pickName } from '~/domain/data/worldgen/names'
import { POI_KIND_TABLE, poiKindToType, DUNGEON_THEMES } from '~/domain/data/worldgen/poiKinds'
import { buildPOI } from './buildPoi'
import { buildRegionFlavor } from './regionFlavor'
import { describePoi } from './poiFlavor'
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

  // Step 3: one Region per center (with names unique within the world)
  const now = Date.now()
  const usedRegionNames = new Set<string>()
  const uniqueRegionName = (biome: Biome): string => {
    for (let i = 0; i < 20; i++) {
      const candidate = pickName('region', rng, { biome })
      if (!usedRegionNames.has(candidate)) {
        usedRegionNames.add(candidate)
        return candidate
      }
    }
    // Name pool exhausted for this map — disambiguate with a numeral.
    const base = pickName('region', rng, { biome })
    let name = base
    let k = 2
    while (usedRegionNames.has(name)) name = `${base} ${k++}`
    usedRegionNames.add(name)
    return name
  }
  const regions: Region[] = centers.map((center, idx) => {
    const id = newId()
    const name = uniqueRegionName(center.biome)
    const flavor = buildRegionFlavor(center.biome, rng)
    return {
      id,
      worldId: realmId,
      name,
      description: flavor.description,
      terrain: center.biome,
      features: flavor.features,
      dangers: flavor.dangers,
      settlements: [],
      resources: flavor.resources,
      people: flavor.people,
      boundary: null, // set in step 4c from the region's hex cluster
      // Distinct per-region color (not the biome color) so adjacent regions of
      // the same biome still read as separate areas on the map.
      color: REGION_PALETTE[idx % REGION_PALETTE.length],
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

  // Step 4b: carve lakes. Most maps get at least one small lake (a seed cell
  // grown outward to a few adjacent cells). Lakes overwrite the cell's biome to
  // 'lake' (rendered blue); POIs avoid them in step 6.
  const cellByCoord = new Map<string, CellMeta>()
  for (const cm of cellMetas) cellByCoord.set(`${cm.q},${cm.r}`, cm)

  const lakeCount = Math.max(1, Math.round(cellMetas.length / 110))
  for (let l = 0; l < lakeCount; l++) {
    const start = cellMetas[rng.between(0, cellMetas.length - 1)]
    const targetSize = rng.between(2, 5)
    const inLake = new Set<string>([`${start.q},${start.r}`])
    start.biome = 'lake'
    const frontier: CellMeta[] = [start]
    while (inLake.size < targetSize && frontier.length > 0) {
      const c = frontier[rng.between(0, frontier.length - 1)]
      const open = hexNeighbors({ q: c.q, r: c.r })
        .map((n) => cellByCoord.get(`${n.q},${n.r}`))
        .filter((n): n is CellMeta => !!n && !inLake.has(`${n.q},${n.r}`))
      if (open.length === 0) {
        frontier.splice(frontier.indexOf(c), 1)
        continue
      }
      const next = open[rng.between(0, open.length - 1)]
      next.biome = 'lake'
      inLake.add(`${next.q},${next.r}`)
      frontier.push(next)
    }
  }

  // Step 4c: each region's boundary = the outline of its hex cluster, so the map
  // can draw a labeled border around it.
  const cellsByRegion = new Map<string, CellMeta[]>()
  for (const cm of cellMetas) {
    const arr = cellsByRegion.get(cm.regionId)
    if (arr) arr.push(cm)
    else cellsByRegion.set(cm.regionId, [cm])
  }
  for (const region of regions) {
    const rcells = cellsByRegion.get(region.id) ?? []
    const ring = rcells.length > 0 ? hexClusterOutline(rcells) : []
    region.boundary = ring.length >= 3 ? ring : null
  }

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

  // Step 6: scatter POIs PER REGION so no region is left empty. Each region gets
  // at least MIN_POIS_PER_REGION (capped by its available land cells), scaling up
  // with the density knob.
  const MIN_POIS_PER_REGION = 4

  const makePoi = (cell: CellMeta): POI => {
    const kind = rng.pickWeighted(POI_KIND_TABLE)
    const type = poiKindToType(kind)
    const nameKind = kind === 'landmark' ? 'landmark' : kind
    const name = pickName(nameKind, rng)
    const description = describePoi(kind, name, cell.biome, rng)
    const dungeonSeedId = newId()

    const dungeonGenOptions =
      type === 'dungeon'
        ? {
            seed: `${seed}-${dungeonSeedId}`,
            theme: rng.pick(DUNGEON_THEMES),
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

    return buildPOI({
      regionId: cell.regionId,
      name,
      description,
      type,
      position: { x: cell.cx, y: cell.cy },
      mapRef: gameMap.id,
      dungeonGenOptions,
    })
  }

  const landByRegion = new Map<string, CellMeta[]>()
  for (const cm of cellMetas) {
    if (cm.biome === 'lake') continue
    const arr = landByRegion.get(cm.regionId)
    if (arr) arr.push(cm)
    else landByRegion.set(cm.regionId, [cm])
  }

  const pois: POI[] = []
  for (const region of regions) {
    const regionLand = landByRegion.get(region.id) ?? []
    if (regionLand.length === 0) continue
    const densityTarget = Math.round(regionLand.length * DENSITY[poiDensity])
    const target = Math.min(
      regionLand.length,
      Math.max(MIN_POIS_PER_REGION, densityTarget),
    )
    for (const cell of rng.sample(regionLand, target)) {
      pois.push(makePoi(cell))
    }
  }

  return { gameMap, regions, pois }
}
