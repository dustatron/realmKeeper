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
}

const IMPORTANT_TYPES = new Set<PoiType>([
  'settlement',
  'district',
  'fortification',
  'landmark',
  'shrine',
])

const MIN_SPREAD_AREA_RATIO = 0.06

function shouldAssign(poi: POI, mapId: string, reassignExistingOnMap: boolean): boolean {
  if (poi.mapRef === mapId && poi.position) return reassignExistingOnMap
  if (poi.mapRef && poi.mapRef !== mapId) return false
  if (!poi.mapRef && poi.position) return false
  return true
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

function nearestDistance(building: TownBuildingCandidate, selected: TownBuildingCandidate[]): number {
  if (selected.length === 0) return 0
  return Math.min(...selected.map((candidate) => distance(building.centroid, candidate.centroid)))
}

function compareBuildings(a: TownBuildingCandidate, b: TownBuildingCandidate): number {
  return b.area - a.area || a.id.localeCompare(b.id)
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

function selectSpreadBuildings(
  buildings: TownBuildingCandidate[],
  assignmentCount: number,
): TownBuildingCandidate[] {
  if (assignmentCount <= 0 || buildings.length === 0) return []

  const pool = spreadCandidatePool(buildings, assignmentCount)
  const selected: TownBuildingCandidate[] = []
  const remaining = new Map(pool.map((building) => [building.id, building]))

  while (selected.length < assignmentCount && remaining.size > 0) {
    const next = [...remaining.values()].sort((a, b) => (
      nearestDistance(b, selected) - nearestDistance(a, selected) ||
      compareBuildings(a, b)
    ))[0]
    if (!next) break
    selected.push(next)
    remaining.delete(next.id)
  }

  if (selected.length >= assignmentCount) return selected

  const selectedIds = new Set(selected.map((building) => building.id))
  return [
    ...selected,
    ...buildings.filter((building) => !selectedIds.has(building.id)),
  ].slice(0, assignmentCount)
}

export function assignPoisToBuildings(input: AssignPoisToBuildingsInput): TownPoiAssignment[] {
  const assignablePois = sortPoisForAssignment(input.pois.filter((poi) =>
    shouldAssign(poi, input.mapId, input.reassignExistingOnMap ?? false),
  ))
  const availableBuildings = [...input.buildings].sort(compareBuildings)
  const selectedBuildings = selectSpreadBuildings(availableBuildings, assignablePois.length)

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
