import { newId } from '@shared/ulid'
import type {
  CellState,
  GridPoint,
  GridRect,
  PlacementDirection,
  RoomSize,
  RoomType,
  RoomGeometry,
  SpatialRoom,
  Passage,
  DungeonSize,
  DungeonTheme,
  DungeonHazard,
  DungeonEncounter,
  DungeonTreasureEntry,
  RoomFeature,
  RoomSecret,
} from './types'
import { DUNGEON_GRID_SIZES } from './types'
import { SeededRandom } from './SeededRandom'

export function classifyRoomGeometry(bounds: GridRect): RoomGeometry {
  const area = bounds.width * bounds.height
  const aspect = Math.max(bounds.width, bounds.height) / Math.min(bounds.width, bounds.height)
  if (aspect >= 2 && area <= 12) return 'corridor'
  if (area <= 6) return 'alcove'
  if (aspect >= 1.5 && area >= 20) return 'gallery'
  return 'chamber'
}

export function markDeadEnds(rooms: SpatialRoom[], passages: Passage[]): void {
  const connectionCount = new Map<string, number>()
  for (const passage of passages) {
    connectionCount.set(passage.fromRoomId, (connectionCount.get(passage.fromRoomId) ?? 0) + 1)
    connectionCount.set(passage.toRoomId, (connectionCount.get(passage.toRoomId) ?? 0) + 1)
  }
  for (const room of rooms) {
    room.isDeadEnd = (connectionCount.get(room.id) ?? 0) === 1
  }
}

const ROOM_DIMS: Record<RoomSize, { minW: number; maxW: number; minH: number; maxH: number }> = {
  cramped: { minW: 2, maxW: 3, minH: 2, maxH: 3 },
  small:   { minW: 3, maxW: 4, minH: 3, maxH: 4 },
  medium:  { minW: 4, maxW: 6, minH: 4, maxH: 6 },
  large:   { minW: 5, maxW: 8, minH: 5, maxH: 8 },
  vast:    { minW: 6, maxW: 9, minH: 6, maxH: 9 },
}

const DIRECTIONS: PlacementDirection[] = ['n', 's', 'e', 'w']

export class OccupancyGrid {
  private cells: CellState[][]
  readonly width: number
  readonly height: number

  constructor(width: number, height: number) {
    this.width = width
    this.height = height
    this.cells = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => 'empty' as CellState)
    )
  }

  getCell(x: number, y: number): CellState {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 'blocked'
    return this.cells[y][x]
  }

  setCell(x: number, y: number, state: CellState): void {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      this.cells[y][x] = state
    }
  }

  setRect(rect: GridRect, state: CellState): void {
    for (let dy = 0; dy < rect.height; dy++) {
      for (let dx = 0; dx < rect.width; dx++) {
        this.setCell(rect.x + dx, rect.y + dy, state)
      }
    }
  }

  isRectClear(rect: GridRect, allowStates: CellState[] = ['empty']): boolean {
    for (let dy = 0; dy < rect.height; dy++) {
      for (let dx = 0; dx < rect.width; dx++) {
        if (!allowStates.includes(this.getCell(rect.x + dx, rect.y + dy))) return false
      }
    }
    return true
  }

  reservePerimeter(rect: GridRect): void {
    for (let dx = -1; dx <= rect.width; dx++) {
      const topState = this.getCell(rect.x + dx, rect.y - 1)
      if (topState === 'empty') this.setCell(rect.x + dx, rect.y - 1, 'reserved')
      const bottomState = this.getCell(rect.x + dx, rect.y + rect.height)
      if (bottomState === 'empty') this.setCell(rect.x + dx, rect.y + rect.height, 'reserved')
    }
    for (let dy = 0; dy < rect.height; dy++) {
      const leftState = this.getCell(rect.x - 1, rect.y + dy)
      if (leftState === 'empty') this.setCell(rect.x - 1, rect.y + dy, 'reserved')
      const rightState = this.getCell(rect.x + rect.width, rect.y + dy)
      if (rightState === 'empty') this.setCell(rect.x + rect.width, rect.y + dy, 'reserved')
    }
  }

  findPassagePath(from: GridPoint, to: GridPoint): GridPoint[] | null {
    const key = (p: GridPoint) => `${p.x},${p.y}`
    type QueueItem = [number, number, GridPoint, GridPoint[]]
    const openSet: QueueItem[] = []
    const closedSet = new Set<string>()
    const heuristic = (a: GridPoint, b: GridPoint) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
    openSet.push([heuristic(from, to), 0, from, [from]])
    const maxIterations = 5000
    let iterations = 0
    while (openSet.length > 0 && iterations < maxIterations) {
      iterations++
      openSet.sort((a, b) => a[0] - b[0])
      const [, g, current, path] = openSet.shift()!
      const currentKey = key(current)
      if (closedSet.has(currentKey)) continue
      closedSet.add(currentKey)
      if (current.x === to.x && current.y === to.y) return path
      const neighbors: GridPoint[] = [
        { x: current.x, y: current.y - 1 },
        { x: current.x, y: current.y + 1 },
        { x: current.x - 1, y: current.y },
        { x: current.x + 1, y: current.y },
      ]
      for (const next of neighbors) {
        const nextKey = key(next)
        if (closedSet.has(nextKey)) continue
        const cellState = this.getCell(next.x, next.y)
        const canTraverse =
          cellState === 'empty' ||
          cellState === 'reserved' ||
          cellState === 'passage' ||
          (next.x === to.x && next.y === to.y)
        if (!canTraverse) continue
        let moveCost = 1
        if (cellState === 'reserved') moveCost = 2
        if (cellState === 'passage') moveCost = 5
        const newG = g + moveCost
        openSet.push([newG + heuristic(next, to), newG, next, [...path, next]])
      }
    }
    return null
  }

  simplifyPath(path: GridPoint[]): GridPoint[] {
    if (path.length <= 2) return path
    const waypoints: GridPoint[] = [path[0]]
    for (let i = 1; i < path.length - 1; i++) {
      const prev = path[i - 1]
      const curr = path[i]
      const next = path[i + 1]
      const dx1 = curr.x - prev.x
      const dy1 = curr.y - prev.y
      const dx2 = next.x - curr.x
      const dy2 = next.y - curr.y
      if (dx1 !== dx2 || dy1 !== dy2) waypoints.push(curr)
    }
    waypoints.push(path[path.length - 1])
    return waypoints
  }

  markPassage(waypoints: GridPoint[]): void {
    for (let i = 0; i < waypoints.length - 1; i++) {
      const from = waypoints[i]
      const to = waypoints[i + 1]
      const dx = Math.sign(to.x - from.x)
      const dy = Math.sign(to.y - from.y)
      let x = from.x
      let y = from.y
      while (x !== to.x || y !== to.y) {
        const state = this.getCell(x, y)
        if (state === 'empty' || state === 'reserved') this.setCell(x, y, 'passage')
        x += dx
        y += dy
      }
      const finalState = this.getCell(to.x, to.y)
      if (finalState === 'empty' || finalState === 'reserved') this.setCell(to.x, to.y, 'passage')
    }
  }
}

export class RoomPlacer {
  constructor(
    private grid: OccupancyGrid,
    private rng: SeededRandom
  ) {}

  generateRoomDimensions(size: RoomSize): { width: number; height: number } {
    const dims = ROOM_DIMS[size]
    return {
      width: this.rng.between(dims.minW, dims.maxW),
      height: this.rng.between(dims.minH, dims.maxH),
    }
  }

  placeEntrance(size: RoomSize, type: RoomType = 'entrance'): SpatialRoom | null {
    const dims = this.generateRoomDimensions(size)
    const edges = [
      { x: Math.floor(this.grid.width / 2) - Math.floor(dims.width / 2), y: 1 },
      { x: Math.floor(this.grid.width / 2) - Math.floor(dims.width / 2), y: this.grid.height - dims.height - 1 },
      { x: 1, y: Math.floor(this.grid.height / 2) - Math.floor(dims.height / 2) },
      { x: this.grid.width - dims.width - 1, y: Math.floor(this.grid.height / 2) - Math.floor(dims.height / 2) },
    ]
    this.rng.shuffle(edges)
    for (const edge of edges) {
      const bounds: GridRect = {
        x: Math.max(1, edge.x),
        y: Math.max(1, edge.y),
        width: dims.width,
        height: dims.height,
      }
      if (this.grid.isRectClear(bounds)) {
        this.grid.setRect(bounds, 'room')
        this.grid.reservePerimeter(bounds)
        return this.createSpatialRoom(bounds, type, size, 0)
      }
    }
    const fallback: GridRect = { x: 1, y: 1, width: dims.width, height: dims.height }
    if (this.grid.isRectClear(fallback)) {
      this.grid.setRect(fallback, 'room')
      this.grid.reservePerimeter(fallback)
      return this.createSpatialRoom(fallback, type, size, 0)
    }
    return null
  }

  placeSecondaryEntrance(size: RoomSize): SpatialRoom | null {
    const dims = this.generateRoomDimensions(size)
    const edges = [
      { x: Math.floor(this.grid.width / 2) - Math.floor(dims.width / 2), y: 1 },
      { x: Math.floor(this.grid.width / 2) - Math.floor(dims.width / 2), y: this.grid.height - dims.height - 1 },
      { x: 1, y: Math.floor(this.grid.height / 2) - Math.floor(dims.height / 2) },
      { x: this.grid.width - dims.width - 1, y: Math.floor(this.grid.height / 2) - Math.floor(dims.height / 2) },
    ]
    this.rng.shuffle(edges)
    for (const edge of edges) {
      const bounds: GridRect = {
        x: Math.max(1, edge.x),
        y: Math.max(1, edge.y),
        width: dims.width,
        height: dims.height,
      }
      if (this.grid.isRectClear(bounds)) {
        this.grid.setRect(bounds, 'room')
        this.grid.reservePerimeter(bounds)
        return this.createSpatialRoom(bounds, 'exit', size, 0)
      }
    }
    return null
  }

  placeAdjacentRoom(
    anchor: SpatialRoom,
    size: RoomSize,
    type: RoomType,
    depth: number,
    preferredDirection?: PlacementDirection
  ): SpatialRoom | null {
    const dims = this.generateRoomDimensions(size)
    const directions = [...DIRECTIONS]
    if (preferredDirection) {
      const idx = directions.indexOf(preferredDirection)
      if (idx > 0) {
        directions.splice(idx, 1)
        directions.unshift(preferredDirection)
      }
    } else {
      this.rng.shuffle(directions)
    }
    for (const dir of directions) {
      const placement = this.findPlacementInDirection(anchor.bounds, dims, dir)
      if (placement && this.grid.isRectClear(placement)) {
        this.grid.setRect(placement, 'room')
        this.grid.reservePerimeter(placement)
        return this.createSpatialRoom(placement, type, size, depth)
      }
    }
    return null
  }

  private findPlacementInDirection(
    anchor: GridRect,
    roomDims: { width: number; height: number },
    direction: PlacementDirection
  ): GridRect | null {
    const gap = 3
    let x: number, y: number
    switch (direction) {
      case 'n':
        x = anchor.x + Math.floor((anchor.width - roomDims.width) / 2)
        y = anchor.y - gap - roomDims.height
        break
      case 's':
        x = anchor.x + Math.floor((anchor.width - roomDims.width) / 2)
        y = anchor.y + anchor.height + gap
        break
      case 'e':
        x = anchor.x + anchor.width + gap
        y = anchor.y + Math.floor((anchor.height - roomDims.height) / 2)
        break
      case 'w':
        x = anchor.x - gap - roomDims.width
        y = anchor.y + Math.floor((anchor.height - roomDims.height) / 2)
        break
    }
    if (x < 0 || y < 0 || x + roomDims.width > this.grid.width || y + roomDims.height > this.grid.height) {
      return null
    }
    return { x, y, width: roomDims.width, height: roomDims.height }
  }

  private createSpatialRoom(bounds: GridRect, type: RoomType, size: RoomSize, depth: number): SpatialRoom {
    const geometry = classifyRoomGeometry(bounds)
    let effectiveType = type
    if (type !== 'entrance' && type !== 'exit' && type !== 'treasury' && type !== 'shrine' &&
        type !== 'prison' && type !== 'trap_room') {
      if (geometry === 'corridor') effectiveType = 'corridor'
      else if (geometry === 'chamber' || geometry === 'gallery') effectiveType = 'chamber'
    }
    return {
      id: `room-${newId()}`,
      name: this.getRoomName(effectiveType),
      description: `A ${size} ${effectiveType.replace('_', ' ')}.`,
      type: effectiveType,
      size,
      depth,
      bounds,
      encounters: [] as DungeonEncounter[],
      treasure: [] as DungeonTreasureEntry[],
      features: [] as RoomFeature[],
      hazards: [] as DungeonHazard[],
      secrets: [] as RoomSecret[],
      explored: false,
      geometry,
      isDeadEnd: false,
    }
  }

  private getRoomName(type: RoomType): string {
    const names: Record<RoomType, string[]> = {
      entrance: ['Entry Hall', 'Gatehouse', 'Antechamber', 'Foyer'],
      exit: ['Secret Exit', 'Escape Tunnel', 'Back Door', 'Hidden Egress'],
      corridor: ['Passage', 'Hallway', 'Gallery', 'Tunnel'],
      chamber: ['Chamber', 'Hall', 'Room', 'Vault'],
      lair: ['Lair', 'Den', 'Nest', 'Burrow'],
      trap_room: ['Death Corridor', 'Gauntlet', 'Testing Ground'],
      treasury: ['Treasury', 'Vault', 'Hoard Room'],
      shrine: ['Shrine', 'Chapel', 'Altar Room', 'Sanctuary'],
      prison: ['Dungeon Cells', 'Oubliette', 'Prison Block'],
    }
    return this.rng.pick(names[type])
  }
}

export class PassageRouter {
  constructor(
    private grid: OccupancyGrid,
    private rng: SeededRandom
  ) {}

  routePassage(
    from: SpatialRoom,
    to: SpatialRoom,
    connectionType: Passage['connectionType'] = 'door'
  ): Passage | null {
    const fromPoint = this.findConnectionPoint(from, to)
    const toPoint = this.findConnectionPoint(to, from)
    if (!fromPoint || !toPoint) return null
    const path = this.grid.findPassagePath(fromPoint, toPoint)
    if (!path || path.length < 2) return null
    const waypoints = this.grid.simplifyPath(path)
    this.grid.markPassage(path)
    return {
      id: `passage-${newId()}`,
      fromRoomId: from.id,
      toRoomId: to.id,
      waypoints,
      connectionType,
      locked: this.rng.chance(0.15),
      hidden: connectionType === 'secret',
    }
  }

  private findConnectionPoint(room: SpatialRoom, target: SpatialRoom): GridPoint | null {
    const roomCenterX = room.bounds.x + room.bounds.width / 2
    const roomCenterY = room.bounds.y + room.bounds.height / 2
    const targetCenterX = target.bounds.x + target.bounds.width / 2
    const targetCenterY = target.bounds.y + target.bounds.height / 2
    const dx = targetCenterX - roomCenterX
    const dy = targetCenterY - roomCenterY
    let exitX: number, exitY: number
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) {
        exitX = room.bounds.x + room.bounds.width
        exitY = room.bounds.y + Math.floor(room.bounds.height / 2)
      } else {
        exitX = room.bounds.x - 1
        exitY = room.bounds.y + Math.floor(room.bounds.height / 2)
      }
    } else {
      if (dy > 0) {
        exitX = room.bounds.x + Math.floor(room.bounds.width / 2)
        exitY = room.bounds.y + room.bounds.height
      } else {
        exitX = room.bounds.x + Math.floor(room.bounds.width / 2)
        exitY = room.bounds.y - 1
      }
    }
    return { x: exitX, y: exitY }
  }
}

export class DungeonLayoutGenerator {
  private grid!: OccupancyGrid
  private placer!: RoomPlacer
  private router!: PassageRouter
  private rng: SeededRandom

  constructor(seed: string) {
    this.rng = new SeededRandom(`${seed}-layout`)
  }

  generate(
    size: DungeonSize,
    _theme: DungeonTheme,
    roomCount: number
  ): { rooms: SpatialRoom[]; passages: Passage[]; gridWidth: number; gridHeight: number } {
    const gridSize = DUNGEON_GRID_SIZES[size]
    this.grid = new OccupancyGrid(gridSize, gridSize)
    this.placer = new RoomPlacer(this.grid, this.rng)
    this.router = new PassageRouter(this.grid, this.rng)

    const rooms: SpatialRoom[] = []
    const passages: Passage[] = []

    const entranceSize = this.rng.pick<RoomSize>(['small', 'medium'])
    const entrance = this.placer.placeEntrance(entranceSize, 'entrance')
    if (!entrance) throw new Error('Failed to place entrance room')
    rooms.push(entrance)

    const roomTypes: RoomType[] = [
      'corridor', 'corridor',
      'chamber', 'chamber', 'chamber', 'chamber',
      'lair', 'trap_room', 'treasury', 'shrine', 'prison',
    ]
    const roomSizes: RoomSize[] = [
      'cramped', 'cramped',
      'small', 'small', 'small',
      'medium', 'medium',
      'large', 'vast',
    ]

    let attempts = 0
    const maxAttempts = roomCount * 10
    while (rooms.length < roomCount && attempts < maxAttempts) {
      attempts++
      const connectionCounts = new Map<string, number>()
      for (const p of passages) {
        connectionCounts.set(p.fromRoomId, (connectionCounts.get(p.fromRoomId) ?? 0) + 1)
        connectionCounts.set(p.toRoomId, (connectionCounts.get(p.toRoomId) ?? 0) + 1)
      }
      const weightedRooms = rooms.map((r) => ({
        room: r,
        weight: 1 / (1 + (connectionCounts.get(r.id) ?? 0)),
      }))
      const totalWeight = weightedRooms.reduce((sum, wr) => sum + wr.weight, 0)
      let pick = this.rng.next() * totalWeight
      let anchor = rooms[0]
      for (const wr of weightedRooms) {
        pick -= wr.weight
        if (pick <= 0) { anchor = wr.room; break }
      }
      const roomType = this.rng.pick(roomTypes)
      const roomSize = this.rng.pick(roomSizes)
      const depth = anchor.depth + 1
      const newRoom = this.placer.placeAdjacentRoom(anchor, roomSize, roomType, depth)
      if (newRoom) {
        rooms.push(newRoom)
        const connectionType = this.rng.pick<Passage['connectionType']>([
          'door', 'door', 'archway', 'passage', 'secret',
        ])
        const passage = this.router.routePassage(anchor, newRoom, connectionType)
        if (passage) passages.push(passage)
      }
    }

    const loopCount = Math.floor(rooms.length * 0.3)
    for (let i = 0; i < loopCount; i++) {
      const fromRoom = this.rng.pick(rooms)
      const toRoom = this.rng.pick(rooms)
      if (fromRoom.id === toRoom.id) continue
      const exists = passages.some(
        (p) => (p.fromRoomId === fromRoom.id && p.toRoomId === toRoom.id) ||
               (p.fromRoomId === toRoom.id && p.toRoomId === fromRoom.id)
      )
      if (!exists) {
        const passage = this.router.routePassage(fromRoom, toRoom, 'passage')
        if (passage) passages.push(passage)
      }
    }

    const shouldAddSecondaryExit =
      size === 'large' || size === 'megadungeon' ||
      (size === 'medium' && this.rng.chance(0.5))

    if (shouldAddSecondaryExit) {
      const connectionCounts2 = new Map<string, number>()
      for (const p of passages) {
        connectionCounts2.set(p.fromRoomId, (connectionCounts2.get(p.fromRoomId) ?? 0) + 1)
        connectionCounts2.set(p.toRoomId, (connectionCounts2.get(p.toRoomId) ?? 0) + 1)
      }
      const deadEndRooms = rooms.filter(
        (r) => r.type !== 'entrance' && r.type !== 'exit' && (connectionCounts2.get(r.id) ?? 0) === 1
      )
      const candidateRooms = deadEndRooms.length > 0
        ? deadEndRooms
        : rooms.filter((r) => r.depth >= 2 && r.type !== 'entrance' && r.type !== 'exit')
      if (candidateRooms.length > 0) {
        const anchorRoom = this.rng.pick(candidateRooms)
        const secondaryExit = this.placer.placeAdjacentRoom(anchorRoom, 'small', 'exit', anchorRoom.depth)
        if (secondaryExit) {
          rooms.push(secondaryExit)
          const passage = this.router.routePassage(anchorRoom, secondaryExit, 'secret')
          if (passage) {
            passage.hidden = true
            passages.push(passage)
          }
        }
      }
    }

    markDeadEnds(rooms, passages)
    return { rooms, passages, gridWidth: gridSize, gridHeight: gridSize }
  }
}
