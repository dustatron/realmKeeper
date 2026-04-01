/**
 * ExitPointGenerator - Stubbed for realmKeeper (no hex grid).
 * Returns empty array since realmKeeper uses POIs/Paths for connections.
 */

import type { DungeonTheme, SpatialRoom } from '../types'

export function generateExitPoints(
  _theme: DungeonTheme,
  _rooms: SpatialRoom[],
  _dungeonSize: string,
  _seed: string
): never[] {
  return []
}
