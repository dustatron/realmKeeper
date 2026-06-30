import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import type { ResolvedTables } from './TableProvider'
import { hexDistance, hexNeighbors, hexLine } from '~/lib/hexmap/hex'
import {
  layoutHexGrid,
  REGION_PALETTE,
  hexClusterOutline,
} from '~/lib/hexmap/hexLayout'
import { type Biome } from '~/domain/data/worldgen/biomes'
import { buildElevationField } from '~/lib/hexmap/elevation'
import { traceRivers } from '~/lib/hexmap/rivers'
import { assignRegionResources } from './resourceBiome'
import { settlementSize } from '@domain/data/worldgen/settlementSize'
import { deriveNeeds, WATER } from './economy'
import { resourceByName } from '@domain/data/worldgen/resources.catalog'
import { buildTradeConnections, type SettlementNode } from './buildTradeConnections'
import { buildNaturalSite } from './buildNaturalSite'
import { computeWealthScore, wealthBand, npcWealthTier } from './wealth'
import { buildRegionFront } from './regionFronts'
import { seedStories } from './seedStories'
import { terrainTileForBiome, featureTileForPoi } from '~/lib/hexmap/tileMapping'
import { pickName } from '~/domain/data/worldgen/names'
import {
  POI_KIND_TABLE,
  poiKindToType,
  DUNGEON_THEMES,
  LANDMARK_ART_TABLE,
  PORTAL_NAMES,
} from '~/domain/data/worldgen/poiKinds'
import { buildPOI } from './buildPoi'
import { buildPath } from './buildPath'
import { buildFaction } from './buildFaction'
import { buildFactionRelationships } from './buildFactionRelationships'
import { buildNpc } from './buildNpc'
import { buildSettlementBuildings } from './buildSettlement'
import { buildConnections } from './buildConnections'
import { buildHooks } from './buildHooks'
import { buildDoom, type DoomClock } from './buildDoom'
import { buildEvents } from './buildEvents'
import { buildRegionFlavor } from './regionFlavor'
import { buildPoiFlavor } from './poiFlavor'
import { sprinkleRealmContent, type RealmContentSprinkleOptions } from './sprinkleRealmContent'
import type { GameMap, HexCell } from '@domain/entities/GameMap'
import type { Region } from '@domain/entities/Region'
import type { POI } from '@domain/entities/POI'
import type { Path } from '@domain/entities/Path'
import type { Faction } from '@domain/entities/Faction'
import type { FactionRelationship } from '@domain/entities/FactionRelationship'
import type { NPC } from '@domain/entities/NPC'
import type { Connection } from '@domain/entities/Connection'
import type { Hook } from '@domain/entities/Hook'
import type { Notice } from '@domain/entities/Notice'
import type { Rumor } from '@domain/entities/Rumor'
import type { WorldEvent } from '@domain/entities/WorldEvent'
import type { POIEvent } from '@domain/entities/POIEvent'
import type { SystemConfig } from '@domain/entities/SystemConfig'
import type { FactionPresence } from '@domain/entities/FactionPresence'
import { newId } from '@shared/ulid'

export type PoiDensity = 'sparse' | 'normal' | 'dense'

const DENSITY: Record<PoiDensity, number> = {
  sparse: 0.08,
  normal: 0.15,
  dense: 0.25,
}

export function generateWorld(
  realmId: string,
  seed: string,
  opts: {
    cols: number
    rows: number
    hexSize?: number
    poiDensity?: PoiDensity
    factionCount?: number
    systemId?: string
    systemConfig?: SystemConfig
    clock?: DoomClock
    loomingThreat?: boolean
    portals?: boolean
    /** Central table registry snapshot (built-ins + user custom tables). */
    tables?: ResolvedTables
    realmContent?: RealmContentSprinkleOptions
    /** Chosen raw-resource names (the spine of terrain). Empty → low-fantasy baseline. */
    resources?: string[]
    /** When true, some natural sites host an unclaimed, extractable resource. */
    unclaimedDeposits?: boolean
  }
): {
  gameMap: GameMap
  regions: Region[]
  pois: POI[]
  paths: Path[]
  factions: Faction[]
  factionPresences: FactionPresence[]
  factionRelationships: FactionRelationship[]
  npcs: NPC[]
  connections: Connection[]
  hooks: Hook[]
  notices: Notice[]
  rumors: Rumor[]
  worldEvents: WorldEvent[]
  poiEvents: POIEvent[]
} {
  const { cols, rows, hexSize = 40, poiDensity = 'normal' } = opts
  const rng = new SeededRandom(seed)

  // Step 1: layout grid
  const { cells, width, height } = layoutHexGrid(cols, rows, hexSize)

  // Step 2: seed biome centers (lake excluded). Centers sit on DISTINCT cells —
  // sampling without replacement so two centers never share a cell, which would
  // leave the later (tie-losing) center's region owning zero cells.
  const seedCount = Math.max(3, Math.round(Math.sqrt(cells.length) / 2))
  // Resources are the source of truth for terrain: each region center's biome is
  // derived from a defining resource drawn from the chosen pool (weighted for
  // biome variety). Falls back to the low-fantasy baseline when no pool is given.
  const regionResources = assignRegionResources(seedCount, opts.resources ?? [], rng.child('region-resources'))
  const centers = rng.sample(cells, seedCount).map((cell, i) => ({
    q: cell.q,
    r: cell.r,
    biome: regionResources[i].biome,
    definingResource: regionResources[i].definingResource,
  }))

  // Step 3: one Region per center (with names unique within the world)
  const now = Date.now()
  const usedRegionNames = new Set<string>()
  const uniqueRegionName = (biome: Biome): string => {
    for (let i = 0; i < 20; i++) {
      const candidate = pickName('region', rng, { biome, tables: opts.tables })
      if (!usedRegionNames.has(candidate)) {
        usedRegionNames.add(candidate)
        return candidate
      }
    }
    // Name pool exhausted for this map — disambiguate with a numeral.
    const base = pickName('region', rng, { biome, tables: opts.tables })
    let name = base
    let k = 2
    while (usedRegionNames.has(name)) name = `${base} ${k++}`
    usedRegionNames.add(name)
    return name
  }
  let regions: Region[] = centers.map((center, idx) => {
    const id = newId()
    const name = uniqueRegionName(center.biome)
    const flavor = buildRegionFlavor(center.biome, rng, opts.tables)
    return {
      id,
      worldId: realmId,
      name,
      description: flavor.description,
      terrain: center.biome,
      definingResource: center.definingResource,
      features: flavor.features,
      dangers: flavor.dangers,
      settlements: [],
      // Real resources are the source of truth (scattered deposits join in P2);
      // replaces the old generic biome-flavor resource list.
      resources: [center.definingResource],
      people: flavor.people,
      problem: flavor.problem,
      front: null, // regional front assigned during integration (P3)
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

  // Step 4b-ii: drop any region left with no LAND cells — a region whose only
  // cells were all swallowed by a lake. Such a region gets no POIs (step 6
  // skips it) and would read as an empty, content-free place, so it should not
  // be persisted at all. (Distinct centers already guarantee every region owns
  // at least one cell; this catches the lake case.)
  const landCellCount = new Map<string, number>()
  for (const cm of cellMetas) {
    if (cm.biome === 'lake') continue
    landCellCount.set(cm.regionId, (landCellCount.get(cm.regionId) ?? 0) + 1)
  }
  regions = regions.filter((r) => (landCellCount.get(r.id) ?? 0) > 0)

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

  // Step 4d: elevation + rivers. A deterministic elevation field drives river
  // courses (downhill to lakes/edge) and chokepoints (fords/passes/bridges).
  // Stored on cells for trade (P2) and map rendering (P4); rivers drain into the
  // lakes carved above. Child rngs keep this isolated from the main stream.
  const waterCells = new Set(
    cellMetas.filter((cm) => cm.biome === 'lake').map((cm) => `${cm.q},${cm.r}`),
  )
  const elevation = buildElevationField(cells, rng.child('elevation'))
  const { riverCells, chokepoints } = traceRivers(elevation, cells, rng.child('rivers'), { waterCells })
  const chokepointByCoord = new Map(chokepoints.map((c) => [`${c.q},${c.r}`, c.kind]))

  // Step 5: build GameMap. Each cell carries its terrain tile (by biome); cells
  // that host a POI get their tile overwritten with that POI's feature tile in
  // step 6. Lookup map lets step 6 find a cell's HexCell by coordinates.
  const hexCells: HexCell[] = cellMetas.map((cm) => ({
    q: cm.q,
    r: cm.r,
    biome: cm.biome,
    corners: cm.corners,
    tile: terrainTileForBiome(cm.biome) ?? undefined,
    elevation: elevation.get(`${cm.q},${cm.r}`),
    river: riverCells.has(`${cm.q},${cm.r}`) || undefined,
    chokepoint: chokepointByCoord.get(`${cm.q},${cm.r}`) ?? undefined,
  }))
  const hexCellByCoord = new Map<string, HexCell>()
  for (const hc of hexCells) hexCellByCoord.set(`${hc.q},${hc.r}`, hc)

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

  // Overworld POI names must be unique across the world (interior building names
  // may still repeat between settlements). Retry the generator a few times, then
  // fall back to a numeral suffix.
  const usedPoiNames = new Set<string>()
  const uniquePoiName = (gen: () => string): string => {
    for (let i = 0; i < 20; i++) {
      const candidate = gen()
      if (!usedPoiNames.has(candidate)) {
        usedPoiNames.add(candidate)
        return candidate
      }
    }
    const base = gen()
    let name = base
    let k = 2
    while (usedPoiNames.has(name)) name = `${base} ${k++}`
    usedPoiNames.add(name)
    return name
  }

  const makePoi = (cell: CellMeta): POI => {
    const kind = rng.pickWeighted(POI_KIND_TABLE)
    const type = poiKindToType(kind)
    const nameKind = kind === 'landmark' ? 'landmark' : kind
    const name = uniquePoiName(() => pickName(nameKind, rng, { tables: opts.tables }))
    // Every POI gets structured flavor: the Cairn type as a subtype label, its
    // feature as a tag, plus a clean description and read-aloud.
    const flavor = buildPoiFlavor(kind, name, cell.biome, rng, opts.tables)
    const dungeonSeedId = newId()

    // Art-driven landmarks: assign a tile-backed subtype (volcano, floating
    // island, crystals, wonder, standing stones) + a mechanical GM hook, so the
    // map shows distinct doodles instead of a single generic landmark.
    if (kind === 'landmark') {
      const art = rng.pickWeighted(LANDMARK_ART_TABLE)
      flavor.subtypeLabel = art.label
      flavor.trouble = art.hook
    }

    // Feature tile overrides the cell's terrain tile. The POI's marker/detail
    // page re-derives the same tile from its type + subtype (featureTileForPoi),
    // so nothing is stashed on the POI itself — keeps the user-facing tags clean.
    const featureTile = featureTileForPoi(type, { subtype: flavor.subtypeLabel })
    if (featureTile) {
      const hostCell = hexCellByCoord.get(`${cell.q},${cell.r}`)
      if (hostCell) hostCell.tile = featureTile
    }

    const dungeonGenOptions =
      type === 'dungeon'
        ? {
            seed: `${seed}-${dungeonSeedId}`,
            theme: rng.pick(DUNGEON_THEMES),
            // Smaller dungeons (3-8 rooms) keep pre-generation fast and the POI
            // count manageable when every dungeon is built up front.
            size: rng.pick(['lair', 'small'] as const),
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
      description: flavor.description,
      type,
      subtypeLabel: flavor.subtypeLabel,
      tags: flavor.tags,
      trouble: flavor.trouble,
      mood: flavor.mood,
      sensory: flavor.sensory,
      // Templates display readAloud (not description), so the flavor read-aloud
      // is what actually surfaces on the POI detail page.
      readAloud: flavor.readAloud,
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
  // Settlement POIs paired with their hex coords, so step 7 can wire travel
  // routes by hex distance.
  const settlementNodes: { poi: POI; q: number; r: number }[] = []
  // Cells already hosting a POI — portals (step 7c) avoid these so a gate gets
  // its own clean hex.
  const usedCells = new Set<string>()
  for (const region of regions) {
    const regionLand = landByRegion.get(region.id) ?? []
    if (regionLand.length === 0) continue
    const densityTarget = Math.round(regionLand.length * DENSITY[poiDensity])
    const target = Math.min(
      regionLand.length,
      Math.max(MIN_POIS_PER_REGION, densityTarget),
    )
    for (const cell of rng.sample(regionLand, target)) {
      const poi = makePoi(cell)
      pois.push(poi)
      usedCells.add(`${cell.q},${cell.r}`)
      if (poi.type === 'settlement') {
        settlementNodes.push({ poi, q: cell.q, r: cell.r })
      }
    }
  }

  // Step 7: build the road network. Travel time scales with distance (~2-4
  // watches per hex). Edges are undirected, deduped by sorted POI-id pair, never
  // self-linking, and never crossing water (a road is invalid if the hex line
  // between its endpoints passes through a lake).
  const WATCHES_PER_HEX_MIN = 2
  const WATCHES_PER_HEX_MAX = 4
  type Node = (typeof settlementNodes)[number]

  const lakeSet = new Set<string>()
  for (const cm of cellMetas) if (cm.biome === 'lake') lakeSet.add(`${cm.q},${cm.r}`)
  const crossesWater = (a: Node, b: Node): boolean =>
    hexLine({ q: a.q, r: a.r }, { q: b.q, r: b.r }).some((h) => lakeSet.has(`${h.q},${h.r}`))

  const paths: Path[] = []
  const seenEdges = new Set<string>()
  const addPath = (a: Node, b: Node, dist: number): void => {
    const key = [a.poi.id, b.poi.id].sort().join('|')
    if (seenEdges.has(key)) return
    seenEdges.add(key)
    const watchesPerHex = rng.between(WATCHES_PER_HEX_MIN, WATCHES_PER_HEX_MAX)
    paths.push(
      buildPath({
        fromPoiId: a.poi.id,
        toPoiId: b.poi.id,
        name: `${a.poi.name} to ${b.poi.name}`,
        baseTravelWatches: Math.max(1, dist * watchesPerHex),
      }),
    )
  }

  const nodesByRegion = new Map<string, Node[]>()
  for (const node of settlementNodes) {
    const arr = nodesByRegion.get(node.poi.regionId)
    if (arr) arr.push(node)
    else nodesByRegion.set(node.poi.regionId, [node])
  }

  // 7a: intra-region — link each settlement to its nearest 1-2 dry neighbors in
  // the same region, so a region's own settlements form a local network.
  for (const nodes of nodesByRegion.values()) {
    for (const node of nodes) {
      const candidates = nodes
        .filter((o) => o.poi.id !== node.poi.id && !crossesWater(node, o))
        .map((o) => ({ o, dist: hexDistance({ q: node.q, r: node.r }, { q: o.q, r: o.r }) }))
        .sort((a, b) => a.dist - b.dist)
      const linkCount = rng.between(1, 2)
      for (const { o, dist } of candidates.slice(0, linkCount)) addPath(node, o, dist)
    }
  }

  // 7b: inter-region — connect regions into a backbone. Each region pair's
  // candidate road is its closest settlement pair; if that closest pair crosses
  // water, the pair is skipped (regions only reachable across water stay islands).
  const regionKeys = [...nodesByRegion.keys()]
  interface RegionEdge {
    ri: string
    rj: string
    a: Node
    b: Node
    dist: number
  }
  const regionEdges: RegionEdge[] = []
  for (let i = 0; i < regionKeys.length; i++) {
    for (let j = i + 1; j < regionKeys.length; j++) {
      const groupA = nodesByRegion.get(regionKeys[i])!
      const groupB = nodesByRegion.get(regionKeys[j])!
      let best: { a: Node; b: Node; dist: number } | null = null
      for (const a of groupA) {
        for (const b of groupB) {
          const dist = hexDistance({ q: a.q, r: a.r }, { q: b.q, r: b.r })
          if (!best || dist < best.dist) best = { a, b, dist }
        }
      }
      if (!best || crossesWater(best.a, best.b)) continue
      regionEdges.push({ ri: regionKeys[i], rj: regionKeys[j], a: best.a, b: best.b, dist: best.dist })
    }
  }

  // Minimum spanning tree over regions (Kruskal), then a few shortest leftover
  // edges as redundant cross-links so the network has some loops, not just a tree.
  regionEdges.sort((x, y) => x.dist - y.dist)
  const parent = new Map<string, string>(regionKeys.map((k) => [k, k]))
  const find = (k: string): string => {
    while (parent.get(k) !== k) {
      parent.set(k, parent.get(parent.get(k)!)!)
      k = parent.get(k)!
    }
    return k
  }
  const extraEdges: RegionEdge[] = []
  for (const edge of regionEdges) {
    if (find(edge.ri) !== find(edge.rj)) {
      parent.set(find(edge.ri), find(edge.rj))
      addPath(edge.a, edge.b, edge.dist)
    } else {
      extraEdges.push(edge)
    }
  }
  const extraCount = Math.min(extraEdges.length, Math.max(1, Math.round(regionKeys.length / 3)))
  for (const edge of extraEdges.slice(0, extraCount)) addPath(edge.a, edge.b, edge.dist)

  // Step 7c: planar portals. Deliberately rare — AT MOST ONE PER REGION, and only
  // a handful of regions get one: a single pair (A↔B) on small maps, a closed
  // ring (A→B→C→…→A) on larger ones. Links are Path rows of type 'portal' (1
  // watch), so stepping through a gate surfaces as a connection on the POI page
  // and on the map. Skipped entirely when portals are toggled off at creation.
  const portalsEnabled = opts.portals !== false
  const portalTarget =
    cellMetas.length <= 100 ? 2 : Math.min(4, 2 + Math.round(cellMetas.length / 160))
  // One candidate clean land cell per region (so a region hosts at most one gate).
  const portalRegionCells = regions
    .map((r) => (landByRegion.get(r.id) ?? []).filter((c) => !usedCells.has(`${c.q},${c.r}`)))
    .filter((cells) => cells.length > 0)
    .map((cells) => rng.pick(cells))
  const portalNodes: { poi: POI; q: number; r: number }[] = []
  if (portalsEnabled && portalRegionCells.length >= 2) {
    const chosenCells = rng.sample(portalRegionCells, Math.min(portalTarget, portalRegionCells.length))
    const portalNames = rng.sample(PORTAL_NAMES, Math.min(chosenCells.length, PORTAL_NAMES.length))
    chosenCells.forEach((cell, i) => {
      const name = uniquePoiName(() => portalNames[i] ?? `Gate ${i + 1}`)
      const portal = buildPOI({
        regionId: cell.regionId,
        name,
        type: 'portal',
        subtypeLabel: 'Planar Gate',
        tags: ['portal'],
        description: `${name} is a standing gate humming with planar energy.`,
        readAloud: `The air within ${name} ripples like a heat-haze, though the stone is cold; step through, and you are somewhere else.`,
        trouble: 'Where it leads is fixed but not obvious; what else uses the gate is the real question.',
        position: { x: cell.cx, y: cell.cy },
        mapRef: gameMap.id,
      })
      pois.push(portal)
      usedCells.add(`${cell.q},${cell.r}`)
      const hostCell = hexCellByCoord.get(`${cell.q},${cell.r}`)
      if (hostCell) hostCell.tile = 'portal'
      portalNodes.push({ poi: portal, q: cell.q, r: cell.r })
    })

    // Link the gates. 2 → one pair; 3+ → a closed ring (wrap last→first).
    const linkPortals = (a: POI, b: POI): void => {
      paths.push(
        buildPath({
          fromPoiId: a.id,
          toPoiId: b.id,
          type: 'portal',
          name: `${a.name} ⇆ ${b.name}`,
          description: 'A planar link — step through one gate, emerge from the other.',
          baseTravelWatches: 1,
        }),
      )
    }
    if (portalNodes.length === 2) {
      linkPortals(portalNodes[0].poi, portalNodes[1].poi)
    } else if (portalNodes.length >= 3) {
      for (let i = 0; i < portalNodes.length; i++) {
        linkPortals(portalNodes[i].poi, portalNodes[(i + 1) % portalNodes.length].poi)
      }
    }
  }

  // Step 7d: settlement economy. Small/medium settlements EXTRACT their region's
  // defining resource; large settlements REFINE it into a finished good. Needs
  // follow from what they produce (deriveNeeds). Water is special — satisfied by
  // a river or lake-adjacent cell, not by trade — so it's tracked separately and
  // dropped from the tradeable needs.
  const definingByRegion = new Map(regions.map((r) => [r.id, r.definingResource]))
  const lakeAdjacent = (q: number, r: number): boolean =>
    hexNeighbors({ q, r }).some((n) => waterCells.has(`${n.q},${n.r}`))
  const settlementWater = new Map<string, boolean>()
  const REFINER_GOODS = ['weapons', 'tools', 'textiles']
  for (const node of settlementNodes) {
    const size = settlementSize(node.poi.subtypeLabel)
    const srng = rng.child(`trade-${node.poi.id}`)
    const produces =
      size === 'large'
        ? srng.pick(REFINER_GOODS)
        : (definingByRegion.get(node.poi.regionId) ?? 'grain')
    const needs = deriveNeeds(produces, size).filter((n) => n !== WATER)
    node.poi.trade = { produces, needs }
    settlementWater.set(
      node.poi.id,
      riverCells.has(`${node.q},${node.r}`) || lakeAdjacent(node.q, node.r),
    )
  }

  // Step 7f: settlement wealth. Snapshot a band from the trade graph — road
  // degree + economic role + good value + water access + monopoly. This is the
  // content anchor that shapes buildings, NPC tiers, and hooks; the live score
  // recomputes lazily later. Pure derivation, no rng consumed.
  const settlementIdSet = new Set(settlementNodes.map((n) => n.poi.id))
  const roadDegree = new Map<string, number>()
  for (const p of paths) {
    if (p.type === 'portal') continue
    if (settlementIdSet.has(p.fromPoiId) && settlementIdSet.has(p.toPoiId)) {
      roadDegree.set(p.fromPoiId, (roadDegree.get(p.fromPoiId) ?? 0) + 1)
      roadDegree.set(p.toPoiId, (roadDegree.get(p.toPoiId) ?? 0) + 1)
    }
  }
  const producerCount = new Map<string, number>()
  for (const node of settlementNodes) {
    const g = node.poi.trade?.produces
    if (g) producerCount.set(g, (producerCount.get(g) ?? 0) + 1)
  }
  for (const node of settlementNodes) {
    const produces = node.poi.trade?.produces ?? null
    const def = produces ? resourceByName(produces) : undefined
    const score = computeWealthScore({
      id: node.poi.id,
      produces: produces ? { weightClass: def?.weightClass ?? 'bulk' } : null,
      role: settlementSize(node.poi.subtypeLabel) === 'large' ? 'refiner' : 'extractor',
      tradeDegree: roadDegree.get(node.poi.id) ?? 0,
      hasWater: settlementWater.get(node.poi.id) ?? false,
      monopoly: produces ? producerCount.get(produces) === 1 : false,
    })
    node.poi.wealthBand = wealthBand(score)
  }

  // Step 7e: natural sites — a few named, dangerous wild places on unsettled land,
  // away from existing POIs. With unclaimed deposits enabled, some hold an
  // extractable resource (an adventure-worthy vein). Child rng keeps the main
  // seeded stream (factions/interiors) byte-stable.
  const nsRng = rng.child('natural-sites')
  // Wild sites belong on every map — all sizes have forests and resource-rich
  // wilds. Floor of 2 so small/medium aren't barren; scales up with map area
  // (small ~2, medium ~4, large ~6).
  const naturalCount = Math.min(8, Math.max(2, Math.round(cellMetas.length / 40)))
  const wildCells = cellMetas.filter(
    (cm) => cm.biome !== 'lake' && !usedCells.has(`${cm.q},${cm.r}`),
  )
  for (const cm of nsRng.sample(wildCells, Math.min(naturalCount, wildCells.length))) {
    const hostedResource = opts.unclaimedDeposits
      ? (definingByRegion.get(cm.regionId) ?? undefined)
      : undefined
    pois.push(
      buildNaturalSite({
        regionId: cm.regionId,
        rng: nsRng.child(`${cm.q}-${cm.r}`),
        hostedResource,
        position: { x: cm.cx, y: cm.cy },
        mapRef: gameMap.id,
        tables: opts.tables,
        usedNames: usedPoiNames,
      }),
    )
    usedCells.add(`${cm.q},${cm.r}`)
  }

  // Step 8: factions. Each gets a distinct settlement as its headquarters (and
  // inherits that settlement's region). Count scales with map size via the
  // region count (which grows reliably small→medium→large, unlike settlement
  // count, which can plateau) — capped at the settlements available to host
  // them. Faction leadership/agents are assigned in a later NPC stage, so those
  // references start empty.
  const defaultFactionCount = Math.max(2, Math.round(regions.length * 0.75))
  const factionCount = Math.min(
    settlementNodes.length,
    opts.factionCount ?? defaultFactionCount,
  )
  const hqNodes = rng.sample(settlementNodes, factionCount)
  const usedFactionNames = new Set<string>()
  const factions: Faction[] = hqNodes.map((node) =>
    buildFaction(
      {
        worldId: realmId,
        hqPoiId: node.poi.id,
        regionId: node.poi.regionId,
        usedNames: usedFactionNames,
        tables: opts.tables,
      },
      rng,
    ),
  )

  // Seed a FactionPresence row for each faction's HQ so the region Factions tab
  // can find it via presence lookup (not only via f.regionId, which misses factions
  // whose HQ is in a different region from their assigned regionId).
  const factionPresences: FactionPresence[] = factions
    .filter((f) => f.headquartersPoiId)
    .map((f) => ({
      id: newId(),
      factionId: f.id,
      poiId: f.headquartersPoiId as string,
      type: 'controls' as const,
      notes: '',
      createdAt: now,
      updatedAt: now,
    }))

  // Step 8b: faction leaders + agents. Only runs when the realm's system config
  // is supplied (the SystemBlock is rolled for that system). Each faction gets
  // one leader and 1-3 agents, all headquartered with the faction; the faction's
  // leaderNpcId/agentNpcIds are filled in here.
  const npcs: NPC[] = []
  if (opts.systemConfig) {
    for (const faction of factions) {
      const link = {
        worldId: realmId,
        factionId: faction.id,
        regionId: faction.regionId ?? undefined,
        poiId: faction.headquartersPoiId ?? undefined,
      }
      // Every faction NPC gets their OWN personal want (varied — buildNpc draws
      // from the NPC wants pool), PLUS a faction action: what they're currently
      // doing for the faction. Leaders drive a long-term aim; agents work an
      // immediate goal. (Previously the agenda goal WAS the want, so a faction's
      // agents all parroted the same 1-2 immediate goals.)
      const longTermGoals = faction.agendaGoals.filter((g) => g.timeframe === 'long-term')
      const immediateGoals = faction.agendaGoals.filter((g) => g.timeframe === 'immediate')
      const actionFrom = (pool: typeof faction.agendaGoals): string =>
        (pool.length > 0 ? rng.pick(pool) : faction.agendaGoals[0])?.description ?? ''

      const leader = buildNpc(
        { ...link, role: 'leader', factionAction: actionFrom(longTermGoals), tables: opts.tables },
        opts.systemConfig,
        rng,
      )
      npcs.push(leader)
      faction.leaderNpcId = leader.id

      const agentIds: string[] = []
      const agentCount = rng.between(1, 3)
      for (let i = 0; i < agentCount; i++) {
        const agent = buildNpc(
          { ...link, role: 'agent', factionAction: actionFrom(immediateGoals), tables: opts.tables },
          opts.systemConfig,
          rng,
        )
        npcs.push(agent)
        agentIds.push(agent.id)
      }
      faction.agentNpcIds = agentIds
    }

    // Step 8c: settlement interiors — each settlement gets buildings (scaled by
    // its size), each with a proprietor living in it, plus one notable resident
    // at the settlement itself. So settlements have an interior and locations are
    // rarely empty. Each NPC has a personal want, reading as a quest-giver.
    for (const node of settlementNodes) {
      const { buildings, proprietors } = buildSettlementBuildings(
        node.poi,
        realmId,
        opts.systemConfig,
        rng,
        opts.tables,
      )
      pois.push(...buildings)
      // Wealth distribution: a settlement's band sets the spread of its NPCs'
      // tiers (a rich town still has an underclass). Child rng keeps the main
      // stream byte-stable.
      const band = node.poi.wealthBand ?? 'modest'
      const wrng = rng.child(`npc-wealth-${node.poi.id}`)
      for (const p of proprietors) p.wealthTier = npcWealthTier(band, wrng)
      npcs.push(...proprietors)
      const resident = buildNpc(
        { worldId: realmId, regionId: node.poi.regionId, poiId: node.poi.id, role: 'inhabitant', tables: opts.tables },
        opts.systemConfig,
        rng,
      )
      resident.wealthTier = npcWealthTier(band, wrng)
      npcs.push(resident)
    }
  }

  // Step 9: seeded pairwise relationships among the generated factions.
  const factionRelationships = buildFactionRelationships(
    factions.map((f) => f.id),
    rng,
  )

  // Step 10: narrative connections among the NPCs (agents → leader, and
  // leader↔leader ties from faction sentiment). Needs leaders, so only when
  // NPCs were generated.
  const connections: Connection[] = opts.systemConfig
    ? buildConnections(factions, factionRelationships, realmId)
    : []

  // Step 10b: trade. Supplier→consumer edges between road-connected settlements,
  // gated by good value (bulk satisfies only nearby needs, luxury reaches far).
  // Unmet needs — and large towns without a water source — become a chance-gated
  // supply-shortage trouble on the settlement.
  const settlementIds = new Set(settlementNodes.map((n) => n.poi.id))
  const neighbors = new Map<string, Set<string>>(
    settlementNodes.map((n) => [n.poi.id, new Set<string>()]),
  )
  for (const p of paths) {
    if (p.type === 'portal') continue
    if (settlementIds.has(p.fromPoiId) && settlementIds.has(p.toPoiId)) {
      neighbors.get(p.fromPoiId)!.add(p.toPoiId)
      neighbors.get(p.toPoiId)!.add(p.fromPoiId)
    }
  }
  const tradeNodes: SettlementNode[] = settlementNodes.map((n) => {
    const produces = n.poi.trade?.produces ?? null
    const def = produces ? resourceByName(produces) : undefined
    return {
      id: n.poi.id,
      regionId: n.poi.regionId,
      produces: produces ? { name: produces, weightClass: def?.weightClass ?? 'bulk' } : null,
      needs: n.poi.trade?.needs ?? [],
      neighbors: [...(neighbors.get(n.poi.id) ?? [])],
    }
  })
  const trade = buildTradeConnections(tradeNodes, realmId)
  connections.push(...trade.connections)

  const settlementPoiById = new Map(settlementNodes.map((n) => [n.poi.id, n.poi]))
  for (const { settlementId, good } of trade.unmetNeeds) {
    const poi = settlementPoiById.get(settlementId)
    if (poi && !poi.trouble && rng.child(`unmet-${settlementId}-${good}`).chance(0.5)) {
      poi.trouble = `Supplies of ${good} have dried up, and tempers are fraying.`
    }
  }
  for (const node of settlementNodes) {
    if (
      settlementSize(node.poi.subtypeLabel) === 'large' &&
      !settlementWater.get(node.poi.id) &&
      !node.poi.trouble &&
      rng.child(`water-${node.poi.id}`).chance(0.5)
    ) {
      node.poi.trouble = 'The town has outgrown its wells, and water is running short.'
    }
  }

  // Step 11: quest Hooks (structured secrets) + their public Notice/Rumor
  // projections at real POIs. Needs NPCs, so only when a system config is given.
  const { hooks, notices, rumors } = opts.systemConfig
    ? buildHooks(factions, npcs, pois, connections, realmId, rng, opts.tables)
    : { hooks: [], notices: [], rumors: [] }

  // Step 11b: regional fronts + the StorySeeder pass. Each region gets a mini
  // progress-clock threat; the seeder reads the finished economic graph to emit
  // wealth-band hooks, contested-resource plots (>=1 per region), and cross-map
  // rumors. Child rngs keep the core seed stream stable.
  for (const region of regions) {
    region.front = buildRegionFront({
      regionId: region.id,
      definingResource: region.definingResource,
      rng: rng.child(`front-${region.id}`),
      tables: opts.tables,
    })
  }
  const story = seedStories({
    settlements: settlementNodes.map((n) => ({
      id: n.poi.id,
      regionId: n.poi.regionId,
      wealthBand: n.poi.wealthBand,
      produces: n.poi.trade?.produces ?? null,
      needs: n.poi.trade?.needs ?? [],
      trouble: n.poi.trouble,
    })),
    regions: regions.map((r) => ({ id: r.id, definingResource: r.definingResource })),
    worldId: realmId,
    rng: rng.child('story-seeder'),
    tables: opts.tables,
  })
  hooks.push(...story.hooks)
  notices.push(...story.notices)
  rumors.push(...story.rumors)

  // Step 12: the looming doom — a faction's agenda escalates into a dated
  // WorldEvent, foreshadowed by rumors and opposed by a quest to avert it. Its
  // hook/notice/rumors join the world's quest projections.
  const worldEvents: WorldEvent[] = []
  const poiEvents: POIEvent[] = []
  // Seasonal civic calendar — recurring festivals/markets/ceremonies at
  // settlements, with every season covered at distinct locations.
  poiEvents.push(
    ...buildEvents(
      settlementNodes.map((node) => node.poi),
      realmId,
      opts.clock?.daysPerSeason ?? 30,
      opts.clock?.watchesPerDay ?? 3,
      rng,
    ),
  )
  if (opts.loomingThreat && opts.systemConfig && opts.clock && factions.length > 0) {
    const doom = buildDoom(factions, pois, opts.clock, realmId, rng)
    worldEvents.push(doom.event)
    poiEvents.push(...doom.poiEvents)
    hooks.push(...doom.hooks)
    notices.push(...doom.notices)
    rumors.push(...doom.rumors)
  }

  if (opts.systemId && opts.realmContent) {
    sprinkleRealmContent({
      pois,
      npcs,
      regions,
      factions,
      systemId: opts.systemId,
      options: opts.realmContent,
      rng: rng.child('realm-content'),
    })
  }

  return {
    gameMap,
    regions,
    pois,
    paths,
    factions,
    factionPresences,
    factionRelationships,
    npcs,
    connections,
    hooks,
    notices,
    rumors,
    worldEvents,
    poiEvents,
  }
}
