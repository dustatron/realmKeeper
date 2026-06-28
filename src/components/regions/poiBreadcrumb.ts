import type { POI } from '@domain/entities/POI'

export function poiBreadcrumb(poiId: string | null | undefined, pois: POI[]): { id: string; name: string }[] {
  if (!poiId) return []
  const byId = new Map(pois.map((p) => [p.id, p]))
  const chain: { id: string; name: string }[] = []
  const seen = new Set<string>()
  let cur = byId.get(poiId)
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id)
    chain.unshift({ id: cur.id, name: cur.name })
    cur = cur.parentPoiId ? byId.get(cur.parentPoiId) : undefined
  }
  return chain
}
