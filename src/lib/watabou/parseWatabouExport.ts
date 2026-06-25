import type {
  WatabouCityData,
  WatabouCityFeature,
} from '@domain/value-objects/WatabouCityData'
import type { WatabouDungeonData } from '@domain/value-objects/WatabouDungeonData'

export type WatabouData = WatabouCityData | WatabouDungeonData

export type DetectResult =
  | { data: WatabouData; seed: string | null }
  | { error: string }

type AnyObj = Record<string, unknown>

const num = (v: unknown): number | undefined => (typeof v === 'number' ? v : undefined)
const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined)

/**
 * Normalizes an MFCG `features` array into the internal WatabouCityFeature shape.
 *
 * Handles two MFCG export shapes:
 *  - Legacy GeoJSON: each entry is `{ type:'Feature', properties:{id}, geometry:{...} }`.
 *  - MFCG 0.11+: a FeatureCollection whose entries are bare geometry objects
 *    (`{ type:'Polygon'|'MultiPolygon'|'MultiPoint'|'GeometryCollection', id, coordinates|geometries }`),
 *    plus a leading metadata-only `Feature` carrying roadWidth/version/seed/etc.
 */
function normalizeMfcg(obj: AnyObj): {
  features: WatabouCityFeature[]
  metadata: WatabouCityData['metadata']
  seed: string | null
} {
  const raw = (obj.features as unknown[]) ?? []
  const out: WatabouCityFeature[] = []
  let metadata: WatabouCityData['metadata']
  let seed = str(obj.seed) ?? null

  const captureMetadata = (src: AnyObj) => {
    metadata = {
      roadWidth: num(src.roadWidth),
      towerRadius: num(src.towerRadius),
      wallThickness: num(src.wallThickness),
      riverWidth: num(src.riverWidth),
      version: num(src.version),
    }
    if (str(src.seed)) seed = str(src.seed)!
  }

  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const f = entry as AnyObj

    // Metadata-only Feature (MFCG 0.11+): a Feature with no geometry.
    if (f.type === 'Feature' && f.geometry == null) {
      captureMetadata(f)
      continue
    }

    // Legacy wrapped Feature.
    if (f.type === 'Feature' && f.geometry != null) {
      const props = (f.properties as AnyObj | undefined) ?? {}
      if (!metadata && (props.roadWidth != null || props.version != null)) captureMetadata(props)
      if (!seed && str(props.seed)) seed = str(props.seed)!
      out.push({
        type: 'Feature',
        properties: { ...props, id: str(props.id) ?? str(f.id) },
        geometry: f.geometry as WatabouCityFeature['geometry'],
      })
      continue
    }

    // Bare geometry object (MFCG 0.11+).
    const id = str(f.id)
    if (f.type === 'GeometryCollection' && Array.isArray(f.geometries)) {
      for (const g of f.geometries as unknown[]) {
        if (!g || typeof g !== 'object') continue
        const geom = g as AnyObj
        if (geom.coordinates == null) continue
        out.push({
          type: 'Feature',
          properties: { id },
          geometry: { type: String(geom.type), coordinates: geom.coordinates as WatabouCityFeature['geometry']['coordinates'] },
        })
      }
      continue
    }
    if (f.coordinates != null && typeof f.type === 'string') {
      out.push({
        type: 'Feature',
        properties: { id },
        geometry: { type: f.type, coordinates: f.coordinates as WatabouCityFeature['geometry']['coordinates'] },
      })
    }
  }

  return { features: out, metadata, seed }
}

/**
 * Detects and normalizes a Watabou export (MFCG city GeoJSON or One Page Dungeon JSON).
 * Tolerant of both legacy and current export formats.
 */
export function detectWatabouFormat(json: unknown): DetectResult {
  if (!json || typeof json !== 'object') return { error: 'Invalid JSON' }
  const obj = json as AnyObj

  // OPD (One Page Dungeon): has a `rects` array.
  if (Array.isArray(obj.rects)) {
    const data: WatabouDungeonData = {
      type: 'opd',
      rects: obj.rects as WatabouDungeonData['rects'],
      doors: Array.isArray(obj.doors) ? (obj.doors as WatabouDungeonData['doors']) : [],
      columns: Array.isArray(obj.columns) ? (obj.columns as WatabouDungeonData['columns']) : [],
      water: Array.isArray(obj.water) ? (obj.water as WatabouDungeonData['water']) : [],
      notes: Array.isArray(obj.notes) ? (obj.notes as WatabouDungeonData['notes']) : [],
      version: num(obj.version),
      seed: str(obj.seed),
    }
    return { data, seed: data.seed ?? null }
  }

  // MFCG city: a `features` array (FeatureCollection or legacy).
  if (Array.isArray(obj.features) && obj.features.length > 0) {
    const { features, metadata, seed } = normalizeMfcg(obj)
    if (features.length > 0) {
      const data: WatabouCityData = { type: 'mfcg', features, metadata }
      return { data, seed }
    }
  }

  return { error: 'Unrecognized format. Expected MFCG GeoJSON or One Page Dungeon JSON.' }
}
