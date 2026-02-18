import { Link } from '@tanstack/react-router'
import { Badge } from '~/components/ui/badge'
import type { Direction } from '@shared/constants'
import type { POI } from '@domain/entities/POI'
import type { ResolvedPath } from '~/ui/hooks/useResolvedPaths'

export interface CompassConnection {
  direction: Direction
  room: POI
  path: ResolvedPath
}

interface CompassRoseProps {
  currentRoom: POI
  connections: CompassConnection[]
}

// Maps compass directions to grid positions in a 3x3 grid
const GRID_POSITIONS: Record<string, { row: number; col: number }> = {
  nw: { row: 0, col: 0 },
  n:  { row: 0, col: 1 },
  ne: { row: 0, col: 2 },
  w:  { row: 1, col: 0 },
  e:  { row: 1, col: 2 },
  sw: { row: 2, col: 0 },
  s:  { row: 2, col: 1 },
  se: { row: 2, col: 2 },
}

// Compass directions that appear in the grid (not up/down)
const COMPASS_DIRS: Direction[] = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se']

export function CompassRose({ currentRoom, connections }: CompassRoseProps) {
  if (connections.length === 0) return null

  // Build lookup: direction → connection
  const byDir = new Map<Direction, CompassConnection>()
  for (const conn of connections) {
    byDir.set(conn.direction, conn)
  }

  const compassConns = connections.filter((c) => c.direction !== 'up' && c.direction !== 'down')
  const upConn = byDir.get('up')
  const downConn = byDir.get('down')

  // Build 3x3 grid cells
  const gridCells: React.ReactNode[] = []
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      if (row === 1 && col === 1) {
        // Center cell = current room
        gridCells.push(
          <div
            key="center"
            className="flex items-center justify-center rounded-md bg-primary/10 border-2 border-primary/30 p-1"
          >
            <span className="text-xs font-bold text-primary text-center leading-tight truncate">
              {currentRoom.name}
            </span>
          </div>
        )
      } else {
        const dir = COMPASS_DIRS.find(
          (d) => GRID_POSITIONS[d].row === row && GRID_POSITIONS[d].col === col
        )!
        const conn = byDir.get(dir)
        if (conn) {
          gridCells.push(
            <Link
              key={dir}
              to="/realms/pois/$poiId"
              params={{ poiId: conn.room.id }}
              className="flex flex-col items-center justify-center rounded-md border border-border hover:bg-accent transition-colors p-1 gap-0.5"
            >
              <span className="text-[10px] font-mono font-semibold text-muted-foreground">
                {dir.toUpperCase()}
              </span>
              <span className="text-xs text-center leading-tight truncate w-full">
                {conn.room.name}
              </span>
              {conn.path.hasDoor && (
                <span className="text-[10px]">
                  {conn.path.isLocked ? '🔒' : '🚪'}
                </span>
              )}
            </Link>
          )
        } else {
          gridCells.push(
            <div
              key={dir}
              className="flex items-center justify-center p-1"
            >
              <span className="text-[10px] font-mono text-muted-foreground/30">
                {dir.toUpperCase()}
              </span>
            </div>
          )
        }
      }
    }
  }

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Compass
      </h4>
      <div className="grid grid-cols-3 gap-1 max-w-[240px]">
        {gridCells}
      </div>
      {/* Up/Down badges */}
      {(upConn || downConn) && (
        <div className="flex items-center gap-2">
          {upConn && (
            <Link
              to="/realms/pois/$poiId"
              params={{ poiId: upConn.room.id }}
              className="inline-flex items-center gap-1"
            >
              <Badge variant="outline" className="text-xs gap-1">
                <span className="font-mono">UP</span>
                {upConn.room.name}
                {upConn.path.hasDoor && (upConn.path.isLocked ? ' 🔒' : ' 🚪')}
              </Badge>
            </Link>
          )}
          {downConn && (
            <Link
              to="/realms/pois/$poiId"
              params={{ poiId: downConn.room.id }}
              className="inline-flex items-center gap-1"
            >
              <Badge variant="outline" className="text-xs gap-1">
                <span className="font-mono">DOWN</span>
                {downConn.room.name}
                {downConn.path.hasDoor && (downConn.path.isLocked ? ' 🔒' : ' 🚪')}
              </Badge>
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
