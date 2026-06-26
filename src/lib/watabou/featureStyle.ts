import type { WatabouCityFeature } from '@domain/value-objects/WatabouCityData'

// MFCG feature classification by property id or geometry patterns
export type FeatureKind =
  | 'earth' | 'water' | 'farm' | 'plaza' | 'tree' | 'road' | 'river'
  | 'wall' | 'building' | 'tower' | 'unknown'

export function classifyFeature(f: WatabouCityFeature): FeatureKind {
  const id = f.properties?.id ?? ''
  const idStr = typeof id === 'string' ? id : ''
  if (idStr === 'earth') return 'earth'
  if (idStr.includes('wall') || idStr === 'walls') return 'wall'
  if (idStr.includes('tower')) return 'tower'
  if (idStr.includes('plank') || idStr.includes('road') || idStr.includes('street') || idStr === 'roads') return 'road'
  if (idStr.includes('river') || idStr === 'rivers') return 'river'
  if (idStr.includes('water') || idStr === 'sea' || idStr === 'ocean') return 'water'
  if (idStr.includes('tree') || idStr === 'trees') return 'tree'
  if (idStr.includes('plaza') || idStr.includes('square') || idStr === 'squares' || idStr === 'greens') return 'plaza'
  if (idStr.includes('building') || idStr === 'buildings' || idStr === 'prisms') return 'building'
  if (idStr.includes('farm') || idStr === 'fields') return 'farm'
  // Heuristic fallback by geometry type.
  if (f.geometry.type === 'MultiPolygon') return 'building'
  if (f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString') return 'road'
  if (f.geometry.type === 'MultiPoint' || f.geometry.type === 'Point') return 'tree'
  if (f.geometry.type === 'Polygon') return 'plaza'
  return 'unknown'
}

export const COLORS: Record<string, { fill: string; stroke: string; strokeWidth: number; opacity?: number }> = {
  earth: { fill: '#e8dcc0', stroke: '#d8c8a0', strokeWidth: 0.3 },
  tree: { fill: '#7fa05a', stroke: 'none', strokeWidth: 1.4, opacity: 0.7 },
  building: { fill: '#b8a88a', stroke: '#6b5c3e', strokeWidth: 0.3 },
  wall: { fill: 'none', stroke: '#5a4a30', strokeWidth: 1.5 },
  tower: { fill: '#8a7a5a', stroke: '#5a4a30', strokeWidth: 0.5 },
  road: { fill: 'none', stroke: '#c8b898', strokeWidth: 1 },
  river: { fill: 'none', stroke: '#6ba3be', strokeWidth: 2 },
  water: { fill: '#6ba3be', stroke: '#4a8aa0', strokeWidth: 0.5, opacity: 0.6 },
  plaza: { fill: '#c8d8a8', stroke: '#a0b888', strokeWidth: 0.3, opacity: 0.5 },
  farm: { fill: '#d4dca0', stroke: '#b0b880', strokeWidth: 0.2, opacity: 0.4 },
  unknown: { fill: '#aaa', stroke: '#888', strokeWidth: 0.2 },
}
