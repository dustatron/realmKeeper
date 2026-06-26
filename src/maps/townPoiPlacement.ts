import type { POI } from '@domain/entities/POI'
import type { PoiType } from '@shared/constants'
import type { TownBuildingCandidate } from './townMapGeometry'

export type TownPoiAssignmentSource = 'building' | 'fallback'

export interface TownPoiAssignment {
  poiId: string
  position: { x: number; y: number }
  source: TownPoiAssignmentSource
  buildingId: string | null
}

export interface AssignPoisToBuildingsInput {
  pois: POI[]
  buildings: TownBuildingCandidate[]
  mapId: string
  imageSize: { width: number; height: number }
  reassignExistingOnMap?: boolean
  placementSalt?: string
}

const IMPORTANT_TYPES = new Set<PoiType>([
  'settlement',
  'district',
  'fortification',
  'landmark',
  'shrine',
])

const MIN_SPREAD_AREA_RATIO = 0.06
const POSITION_MATCH_TOLERANCE = 1

function shouldAssign(poi: POI, mapId: string, reassignExistingOnMap: boolean): boolean {
  if (poi.mapRef === mapId && poi.position) return reassignExistingOnMap
  if (poi.mapRef && poi.mapRef !== mapId) return false
  if (!poi.mapRef && poi.position) return false
  return true
}

function hasPositionOnMap(
  poi: POI,
  mapId: string,
): poi is POI & { mapRef: string; position: { x: number; y: number } } {
  return poi.mapRef === mapId && poi.position !== null
}

function poiPriority(poi: POI): number {
  return IMPORTANT_TYPES.has(poi.type) ? 1 : 0
}

function sortPoisForAssignment(pois: POI[]): POI[] {
  return [...pois].sort((a, b) =>
    poiPriority(b) - poiPriority(a) ||
    a.name.localeCompare(b.name) ||
    a.id.localeCompare(b.id),
  )
}

function fallbackPosition(
  index: number,
  total: number,
  imageSize: { width: number; height: number },
): { x: number; y: number } {
  const columns = Math.max(1, Math.ceil(Math.sqrt(total)))
  const rows = Math.max(1, Math.ceil(total / columns))
  const col = index % columns
  const row = Math.floor(index / columns)
  return {
    x: ((col + 1) / (columns + 1)) * imageSize.width,
    y: ((row + 1) / (rows + 1)) * imageSize.height,
  }
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function isSamePosition(
  a: { x: number; y: number },
  b: { x: number; y: number },
): boolean {
  return distance(a, b) <= POSITION_MATCH_TOLERANCE
}

function nearestDistance(building: TownBuildingCandidate, selected: TownBuildingCandidate[]): number {
  if (selected.length === 0) return 0
  return Math.min(...selected.map((candidate) => distance(building.centroid, candidate.centroid)))
}

function compareBuildings(a: TownBuildingCandidate, b: TownBuildingCandidate): number {
  return b.area - a.area || a.id.localeCompare(b.id)
}

function hashString(value: string): number {
  return [...value].reduce((hash, character) => {
    hash ^= character.charCodeAt(0)
    return Math.imul(hash, 16777619)
  }, 2166136261) >>> 0
}

function centroidForBuildings(buildings: TownBuildingCandidate[]): { x: number; y: number } {
  const total = buildings.reduce(
    (acc, building) => ({
      x: acc.x + building.centroid.x,
      y: acc.y + building.centroid.y,
    }),
    { x: 0, y: 0 },
  )

  return {
    x: total.x / buildings.length,
    y: total.y / buildings.length,
  }
}

function spreadCandidatePool(
  buildings: TownBuildingCandidate[],
  assignmentCount: number,
): TownBuildingCandidate[] {
  const maxArea = buildings[0]?.area ?? 0
  const minimumArea = maxArea * MIN_SPREAD_AREA_RATIO
  const candidates = buildings.filter((building) => building.area >= minimumArea)
  return candidates.length >= assignmentCount ? candidates : buildings
}

function pickFromOrderedBuildings(
  ordered: TownBuildingCandidate[],
  assignmentCount: number,
  offset: number,
): TownBuildingCandidate[] {
  const selected: TownBuildingCandidate[] = []
  const selectedIds = new Set<string>()

  for (let i = 0; i < assignmentCount && selected.length < ordered.length; i += 1) {
    const targetIndex = Math.floor((offset + (i * ordered.length) / assignmentCount) % ordered.length)
    const next = ordered
      .slice(targetIndex)
      .concat(ordered.slice(0, targetIndex))
      .find((building) => !selectedIds.has(building.id))
    if (!next) break
    selected.push(next)
    selectedIds.add(next.id)
  }

  return selected
}

function selectSaltedSpreadBuildings(
  buildings: TownBuildingCandidate[],
  assignmentCount: number,
  placementSalt: string,
): TownBuildingCandidate[] {
  if (assignmentCount <= 0 || buildings.length === 0) return []

  const pool = spreadCandidatePool(buildings, assignmentCount)
  const poolCenter = centroidForBuildings(pool)
  const ordered = [...pool].sort((a, b) => (
    Math.atan2(a.centroid.y - poolCenter.y, a.centroid.x - poolCenter.x) -
      Math.atan2(b.centroid.y - poolCenter.y, b.centroid.x - poolCenter.x) ||
    distance(b.centroid, poolCenter) - distance(a.centroid, poolCenter) ||
    compareBuildings(a, b)
  ))
  const offset = hashString(placementSalt) % ordered.length
  const selected = pickFromOrderedBuildings(ordered, assignmentCount, offset)

  if (selected.length >= assignmentCount) return selected.sort(compareBuildings)

  const selectedIds = new Set(selected.map((building) => building.id))
  return [
    ...selected,
    ...buildings.filter((building) => !selectedIds.has(building.id)),
  ].slice(0, assignmentCount).sort(compareBuildings)
}

function selectSpreadBuildings(
  buildings: TownBuildingCandidate[],
  assignmentCount: number,
): TownBuildingCandidate[] {
  if (assignmentCount <= 0 || buildings.length === 0) return []

  const pool = spreadCandidatePool(buildings, assignmentCount)
  const poolCenter = centroidForBuildings(pool)
  const selected: TownBuildingCandidate[] = []
  const remaining = new Map(pool.map((building) => [building.id, building]))

  while (selected.length < assignmentCount && remaining.size > 0) {
    const next = [...remaining.values()].sort((a, b) => (
      (selected.length === 0
        ? distance(b.centroid, poolCenter) - distance(a.centroid, poolCenter)
        : nearestDistance(b, selected) - nearestDistance(a, selected)) ||
      compareBuildings(a, b)
    ))[0]
    if (!next) break
    selected.push(next)
    remaining.delete(next.id)
  }

  if (selected.length >= assignmentCount) return selected.sort(compareBuildings)

  const selectedIds = new Set(selected.map((building) => building.id))
  return [
    ...selected,
    ...buildings.filter((building) => !selectedIds.has(building.id)),
  ].slice(0, assignmentCount).sort(compareBuildings)
}

export function assignPoisToBuildings(input: AssignPoisToBuildingsInput): TownPoiAssignment[] {
  const assignablePois = sortPoisForAssignment(input.pois.filter((poi) =>
    shouldAssign(poi, input.mapId, input.reassignExistingOnMap ?? false),
  ))
  const sortedBuildings = [...input.buildings].sort(compareBuildings)
  const currentPositions = input.reassignExistingOnMap
    ? assignablePois
      .filter((poi) => hasPositionOnMap(poi, input.mapId))
      .map((poi) => poi.position)
    : []
  const alternateBuildings = currentPositions.length > 0
    ? sortedBuildings.filter((building) =>
      !currentPositions.some((position) => isSamePosition(building.centroid, position)),
    )
    : sortedBuildings
  const availableBuildings = alternateBuildings.length >= assignablePois.length
    ? alternateBuildings
    : sortedBuildings
  const selectedBuildings = input.placementSalt
    ? selectSaltedSpreadBuildings(availableBuildings, assignablePois.length, input.placementSalt)
    : selectSpreadBuildings(availableBuildings, assignablePois.length)

  return assignablePois.map((poi, index) => {
    const building = selectedBuildings[index]
    if (building) {
      return {
        poiId: poi.id,
        position: building.centroid,
        source: 'building',
        buildingId: building.id,
      }
    }

    return {
      poiId: poi.id,
      position: fallbackPosition(index - selectedBuildings.length, assignablePois.length - selectedBuildings.length, input.imageSize),
      source: 'fallback',
      buildingId: null,
    }
  })
}
