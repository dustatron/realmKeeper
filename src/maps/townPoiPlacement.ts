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
}

const IMPORTANT_TYPES = new Set<PoiType>([
  'settlement',
  'district',
  'fortification',
  'landmark',
  'shrine',
])

function shouldAssign(poi: POI, mapId: string): boolean {
  if (poi.mapRef === mapId && poi.position) return false
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

export function assignPoisToBuildings(input: AssignPoisToBuildingsInput): TownPoiAssignment[] {
  const assignablePois = sortPoisForAssignment(input.pois.filter((poi) => shouldAssign(poi, input.mapId)))
  const availableBuildings = [...input.buildings].sort((a, b) => b.area - a.area || a.id.localeCompare(b.id))

  return assignablePois.map((poi, index) => {
    const building = availableBuildings[index]
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
      position: fallbackPosition(index - availableBuildings.length, assignablePois.length - availableBuildings.length, input.imageSize),
      source: 'fallback',
      buildingId: null,
    }
  })
}
