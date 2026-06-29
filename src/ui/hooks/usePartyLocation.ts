import { useMemo } from 'react'
import { usePartyFaction } from './useFactions'
import { useRealmPOIs } from './usePOIs'
import type { POI } from '@domain/entities/POI'

export interface PartyLocation {
  poi: POI
  /** Ancestor chain from the top-level site down to the current node. */
  trail: { id: string; name: string }[]
}

/**
 * Resolves the party faction's current POI into the POI and its ancestor
 * breadcrumb (e.g. Ashreach › The Temple). Returns null if unset/unresolved.
 */
export function usePartyLocation(worldId: string | null): PartyLocation | null {
  const party = usePartyFaction(worldId)
  const pois = useRealmPOIs(worldId)

  return useMemo(() => {
    const currentId = party?.currentPoiId
    if (!currentId) return null
    const byId = new Map(pois.map((p) => [p.id, p]))
    const poi = byId.get(currentId)
    if (!poi) return null

    const trail: { id: string; name: string }[] = []
    const seen = new Set<string>()
    let cur: POI | undefined = poi
    while (cur && !seen.has(cur.id)) {
      seen.add(cur.id)
      trail.unshift({ id: cur.id, name: cur.name })
      cur = cur.parentPoiId ? byId.get(cur.parentPoiId) : undefined
    }
    return { poi, trail }
  }, [party?.currentPoiId, pois])
}
