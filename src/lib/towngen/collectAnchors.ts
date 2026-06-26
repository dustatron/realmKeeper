import type { POI } from '@domain/entities/POI'
import type { TownAnchor } from './presets'

export function collectAnchors(pois: POI[]): TownAnchor[] {
  return pois
    .filter((p): p is POI & { position: { x: number; y: number } } => p.position != null)
    .map((p) => ({ poiId: p.id, x: p.position.x, y: p.position.y, type: p.type }))
}
