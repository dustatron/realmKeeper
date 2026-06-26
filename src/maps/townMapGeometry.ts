import type { WatabouCityData, WatabouCityFeature } from '@domain/value-objects/WatabouCityData'
import { detectWatabouFormat } from '~/lib/watabou/parseWatabouExport'
import { classifyFeature } from '~/lib/watabou/featureStyle'

export interface TownBuildingCandidate {
  id: string
  centroid: { x: number; y: number }
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
  area: number
}

interface Point {
  x: number
  y: number
}

interface PolygonRings {
  outer: Point[]
  holes: Point[][]
}

interface SourceBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

const MIN_BUILDING_AREA = 4
const PLACEMENT_FEATURE_IDS = new Set(['buildings'])

function isFinitePoint(point: Point): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y)
}

function collectPoints(coords: unknown): Point[] {
  if (
    Array.isArray(coords) &&
    typeof coords[0] === 'number' &&
    typeof coords[1] === 'number'
  ) {
    return [{ x: coords[0], y: coords[1] }]
  }

  if (!Array.isArray(coords)) return []
  return coords.flatMap(collectPoints)
}

function boundsForPoints(points: Point[]): SourceBounds | null {
  const finite = points.filter(isFinitePoint)
  if (finite.length === 0) return null

  return {
    minX: Math.min(...finite.map((p) => p.x)),
    minY: Math.min(...finite.map((p) => p.y)),
    maxX: Math.max(...finite.map((p) => p.x)),
    maxY: Math.max(...finite.map((p) => p.y)),
  }
}

function combineBounds(bounds: SourceBounds[]): SourceBounds | null {
  if (bounds.length === 0) return null

  return {
    minX: Math.min(...bounds.map((b) => b.minX)),
    minY: Math.min(...bounds.map((b) => b.minY)),
    maxX: Math.max(...bounds.map((b) => b.maxX)),
    maxY: Math.max(...bounds.map((b) => b.maxY)),
  }
}

function sourceBoundsForCity(data: WatabouCityData): SourceBounds | null {
  return combineBounds(
    data.features
      .map((feature) => boundsForPoints(collectPoints(feature.geometry.coordinates)))
      .filter((b): b is SourceBounds => b !== null),
  )
}

function makeTransform(bounds: SourceBounds, imageSize: { width: number; height: number }) {
  const sourceWidth = bounds.maxX - bounds.minX
  const sourceHeight = bounds.maxY - bounds.minY
  if (sourceWidth <= 0 || sourceHeight <= 0 || imageSize.width <= 0 || imageSize.height <= 0) {
    return null
  }

  const scale = Math.min(imageSize.width / sourceWidth, imageSize.height / sourceHeight)
  const offsetX = (imageSize.width - sourceWidth * scale) / 2
  const offsetY = (imageSize.height - sourceHeight * scale) / 2
  const clamp = (value: number, max: number) => Math.max(0, Math.min(max, value))

  return {
    point: (point: Point): Point => ({
      x: clamp((point.x - bounds.minX) * scale + offsetX, imageSize.width),
      y: clamp((point.y - bounds.minY) * scale + offsetY, imageSize.height),
    }),
    area: (area: number): number => area * scale * scale,
  }
}

function ringArea(ring: Point[]): number {
  if (ring.length < 3) return 0

  const sum = ring.reduce((acc, point, index) => {
    const next = ring[(index + 1) % ring.length]
    return acc + point.x * next.y - next.x * point.y
  }, 0)

  return sum / 2
}

function ringCentroid(ring: Point[]): Point | null {
  const area = ringArea(ring)
  if (area === 0) return null

  const sum = ring.reduce(
    (acc, point, index) => {
      const next = ring[(index + 1) % ring.length]
      const cross = point.x * next.y - next.x * point.y
      return {
        x: acc.x + (point.x + next.x) * cross,
        y: acc.y + (point.y + next.y) * cross,
      }
    },
    { x: 0, y: 0 },
  )

  return {
    x: sum.x / (6 * area),
    y: sum.y / (6 * area),
  }
}

function pointInRing(point: Point, ring: Point[]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]
    const b = ring[j]
    const crosses = (a.y > point.y) !== (b.y > point.y)
    if (!crosses) continue

    const x = ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    if (point.x < x) inside = !inside
  }
  return inside
}

function pointInPolygon(point: Point, polygon: PolygonRings): boolean {
  return pointInRing(point, polygon.outer) &&
    !polygon.holes.some((hole) => pointInRing(point, hole))
}

function pointToSegmentDistance(point: Point, a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  if (dx === 0 && dy === 0) return Math.hypot(point.x - a.x, point.y - a.y)

  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy)))
  const x = a.x + t * dx
  const y = a.y + t * dy
  return Math.hypot(point.x - x, point.y - y)
}

function distanceToRing(point: Point, ring: Point[]): number {
  if (ring.length === 0) return 0

  return Math.min(...ring.map((a, index) => {
    const b = ring[(index + 1) % ring.length]
    return pointToSegmentDistance(point, a, b)
  }))
}

function distanceToPolygonEdges(point: Point, polygon: PolygonRings): number {
  return Math.min(
    distanceToRing(point, polygon.outer),
    ...polygon.holes.map((hole) => distanceToRing(point, hole)),
  )
}

function polygonArea(polygon: PolygonRings): number {
  return Math.max(
    0,
    Math.abs(ringArea(polygon.outer)) -
      polygon.holes.reduce((total, hole) => total + Math.abs(ringArea(hole)), 0),
  )
}

function polygonLabelPoint(polygon: PolygonRings): Point | null {
  const bounds = boundsForPoints(polygon.outer)
  if (!bounds) return null

  const centroid = ringCentroid(polygon.outer)
  const candidates: Point[] = centroid ? [centroid] : []
  const steps = 12

  for (let yStep = 0; yStep <= steps; yStep += 1) {
    for (let xStep = 0; xStep <= steps; xStep += 1) {
      candidates.push({
        x: bounds.minX + ((xStep + 0.5) / (steps + 1)) * (bounds.maxX - bounds.minX),
        y: bounds.minY + ((yStep + 0.5) / (steps + 1)) * (bounds.maxY - bounds.minY),
      })
    }
  }

  return candidates
    .filter((point) => pointInPolygon(point, polygon))
    .sort((a, b) => distanceToPolygonEdges(b, polygon) - distanceToPolygonEdges(a, polygon))[0] ?? null
}

function normalizeRing(raw: unknown): Point[] {
  return collectPoints(raw).filter(isFinitePoint)
}

function normalizePolygon(raw: unknown): PolygonRings | null {
  const rings = Array.isArray(raw) ? raw : []
  const outer = normalizeRing(rings[0])
  if (outer.length < 3) return null

  return {
    outer,
    holes: rings
      .slice(1)
      .map(normalizeRing)
      .filter((ring) => ring.length >= 3),
  }
}

function polygonsForFeature(feature: WatabouCityFeature): PolygonRings[] {
  if (feature.geometry.type === 'Polygon') {
    const polygon = normalizePolygon(feature.geometry.coordinates)
    return polygon ? [polygon] : []
  }

  if (feature.geometry.type === 'MultiPolygon') {
    const polygons = feature.geometry.coordinates as unknown[]
    return polygons.flatMap((rawPolygon) => {
      const polygon = normalizePolygon(rawPolygon)
      return polygon ? [polygon] : []
    })
  }

  return []
}

function cityDataFromJson(rawJson: unknown): WatabouCityData | null {
  const result = detectWatabouFormat(rawJson)
  if ('error' in result || result.data.type !== 'mfcg') return null
  return result.data
}

function isPlacementFeature(feature: WatabouCityFeature): boolean {
  const id = feature.properties.id
  if (typeof id !== 'string') return classifyFeature(feature) === 'building'
  return PLACEMENT_FEATURE_IDS.has(id) || id.includes('building')
}

export function extractTownBuildings(
  rawJson: unknown,
  imageSize: { width: number; height: number },
): TownBuildingCandidate[] {
  const data = cityDataFromJson(rawJson)
  if (!data) return []

  const sourceBounds = sourceBoundsForCity(data)
  if (!sourceBounds) return []

  const transform = makeTransform(sourceBounds, imageSize)
  if (!transform) return []

  return data.features
    .filter(isPlacementFeature)
    .flatMap((feature, featureIndex) =>
      polygonsForFeature(feature).flatMap((polygon, polygonIndex) => {
        const sourceArea = polygonArea(polygon)
        const labelPoint = polygonLabelPoint(polygon)
        const bounds = boundsForPoints(polygon.outer)
        if (!labelPoint || !bounds) return []

        const mappedCentroid = transform.point(labelPoint)
        const mappedMin = transform.point({ x: bounds.minX, y: bounds.minY })
        const mappedMax = transform.point({ x: bounds.maxX, y: bounds.maxY })
        const area = transform.area(sourceArea)
        if (area < MIN_BUILDING_AREA) return []

        const featureId = String(feature.properties.id ?? `feature-${featureIndex}`)
        return [{
          id: `${featureId}-${featureIndex}-${polygonIndex}`,
          centroid: mappedCentroid,
          bounds: {
            minX: Math.min(mappedMin.x, mappedMax.x),
            minY: Math.min(mappedMin.y, mappedMax.y),
            maxX: Math.max(mappedMin.x, mappedMax.x),
            maxY: Math.max(mappedMin.y, mappedMax.y),
          },
          area,
        }]
      }),
    )
    .sort((a, b) => b.area - a.area || a.id.localeCompare(b.id))
}
