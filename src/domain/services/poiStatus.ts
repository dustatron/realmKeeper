import type { POI } from '@domain/entities/POI'
import type { PoiStatus } from '@shared/constants'
import type { WorldDate } from '@domain/value-objects/WorldDate'

/**
 * The POI exploration invariant: `visited === (status !== 'unexplored')`.
 *
 * Every writer of `visited` or `status` must go through these helpers so the two
 * fields can never desync (the map marker reads `status`; the detail page,
 * region list and dungeon counters read `visited`).
 */

/** Patch for setting an explicit status, keeping `visited` + `lastVisitedDate` consistent. */
export function statusPatch(poi: POI, status: PoiStatus, now?: WorldDate | null): Partial<POI> {
  const visited = status !== 'unexplored'
  let lastVisitedDate = poi.lastVisitedDate
  if (!visited) {
    lastVisitedDate = null // clearing exploration clears the "last visited" stamp
  } else if (!poi.visited) {
    lastVisitedDate = now ?? poi.lastVisitedDate // stamp on the first visit only
  }
  return { visited, status, lastVisitedDate }
}

/** Patch for toggling the simple visited flag, deriving a consistent status. */
export function visitedPatch(poi: POI, visited: boolean, now?: WorldDate | null): Partial<POI> {
  // Preserve a richer status (e.g. 'cleared') when re-marking visited.
  const status: PoiStatus = visited ? (poi.status === 'unexplored' ? 'explored' : poi.status) : 'unexplored'
  return statusPatch(poi, status, now)
}
