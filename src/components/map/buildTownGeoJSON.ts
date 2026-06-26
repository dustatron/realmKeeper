import type { WatabouCityData } from '@domain/value-objects/WatabouCityData'
import { classifyFeature } from '~/lib/watabou/featureStyle'

type ToLngLat = (x: number, y: number) => [number, number]

function mapCoords(coords: unknown, toLngLat: ToLngLat): unknown {
  if (Array.isArray(coords) && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
    return toLngLat(coords[0], coords[1] as number)
  }
  if (Array.isArray(coords)) return coords.map((c) => mapCoords(c, toLngLat))
  return coords
}

export function buildTownGeoJSON(data: WatabouCityData, toLngLat: ToLngLat): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: data.features.map((f) => ({
      type: 'Feature',
      properties: {
        kind: classifyFeature(f),
        poiId: (f.properties as { poiId?: string }).poiId ?? null,
      },
      geometry: {
        type: f.geometry.type,
        coordinates: mapCoords(f.geometry.coordinates, toLngLat),
      } as GeoJSON.Geometry,
    })),
  }
}
