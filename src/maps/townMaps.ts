// Bundled Watabou MFCG city maps. PNG is the map backdrop; the sibling JSON
// (same basename) holds building geometry for future POI auto-anchoring.
// Maps are grouped into size buckets: sm (village-ish) / md / larg (city).

export type TownBucket = 'sm' | 'md' | 'larg'

export interface TownMap {
  /** basename, e.g. "bluevale" */
  id: string
  bucket: TownBucket
  /** bundled asset URL for the PNG backdrop */
  imageUrl: string
  /** bundled asset URL for the sibling Watabou JSON geometry */
  jsonUrl: string
  /** @deprecated use imageUrl */
  url: string
}

// Vite resolves bundled map assets to hashed URLs at build time.
const pngModules = import.meta.glob('./city/**/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const jsonModules = import.meta.glob('./city/**/*.json', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

export const TOWN_MAPS: TownMap[] = Object.entries(pngModules)
  .map(([path, imageUrl]) => {
    const m = path.match(/city\/(sm|md|larg)\/([^/]+)\.png$/)
    if (!m) return null
    const jsonUrl = jsonModules[`./city/${m[1]}/${m[2]}.json`]
    if (!jsonUrl) return null
    return {
      id: m[2],
      bucket: m[1] as TownBucket,
      imageUrl,
      jsonUrl,
      url: imageUrl,
    }
  })
  .filter((x): x is TownMap => x !== null)
  .sort((a, b) => a.id.localeCompare(b.id))

/** Map a settlement's location count to a size bucket. */
export function bucketForSize(childCount: number): TownBucket {
  if (childCount <= 8) return 'sm'
  if (childCount <= 16) return 'md'
  return 'larg'
}

/** Deterministically pick a town map from a seed (falls back across buckets). */
export function pickTownMap(seed: string, bucket?: TownBucket): TownMap | null {
  const pool = (bucket ? TOWN_MAPS.filter((m) => m.bucket === bucket) : TOWN_MAPS)
  const list = pool.length > 0 ? pool : TOWN_MAPS
  if (list.length === 0) return null
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return list[(h >>> 0) % list.length]
}
