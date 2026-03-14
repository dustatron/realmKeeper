export interface WatabouCityFeatureProperties {
  id?: string
  [key: string]: unknown
}

export interface WatabouCityFeatureGeometry {
  type: string
  coordinates: number[] | number[][] | number[][][] | number[][][][]
}

export interface WatabouCityFeature {
  type: 'Feature'
  properties: WatabouCityFeatureProperties
  geometry: WatabouCityFeatureGeometry
}

export interface WatabouCityData {
  type: 'mfcg'
  features: WatabouCityFeature[]
  metadata?: {
    roadWidth?: number
    towerRadius?: number
    wallThickness?: number
    riverWidth?: number
    version?: number
  }
}
