import { useState, useCallback, useRef, useEffect } from 'react'
import type { GeneratedDungeon, SpatialRoom, Passage } from '~/lib/dungeon/types'

interface Props {
  dungeon: GeneratedDungeon
  /** Child POI id currently selected (highlights the matching room) */
  selectedRoomPoiId?: string
  /** Map from generated room.id → child POI id */
  roomIdToPoiId?: Map<string, string>
  /** Called when user clicks a room */
  onRoomClick?: (roomId: string) => void
  className?: string
}

const ROOM_FILL = '#e8dcc8'
const ROOM_STROKE = '#3a3a3a'
const CORRIDOR_FILL = '#d4c9b0'
const PASSAGE_COLOR = '#8b7355'
const DOOR_COLOR = '#8b4513'
const LABEL_COLOR = '#333'
const SELECTED_FILL = '#ffd700'
const SELECTED_STROKE = '#b8860b'
const ENTRANCE_FILL = '#c8e6c9'
const EXIT_FILL = '#ffccbc'
const TRAP_INDICATOR = '#e53935'
const TREASURE_INDICATOR = '#ffd700'

function getRoomFill(room: SpatialRoom, isSelected: boolean): string {
  if (isSelected) return SELECTED_FILL
  if (room.type === 'entrance') return ENTRANCE_FILL
  if (room.type === 'exit') return EXIT_FILL
  if (room.geometry === 'corridor' || room.geometry === 'alcove') return CORRIDOR_FILL
  return ROOM_FILL
}

function getRoomStroke(_room: SpatialRoom, isSelected: boolean): string {
  return isSelected ? SELECTED_STROKE : ROOM_STROKE
}

function computeBounds(rooms: SpatialRoom[]) {
  if (rooms.length === 0) return { minX: 0, minY: 0, maxX: 100, maxY: 100 }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const r of rooms) {
    minX = Math.min(minX, r.bounds.x)
    minY = Math.min(minY, r.bounds.y)
    maxX = Math.max(maxX, r.bounds.x + r.bounds.width)
    maxY = Math.max(maxY, r.bounds.y + r.bounds.height)
  }
  const pad = 3
  return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad }
}

function renderPassage(passage: Passage, i: number) {
  if (passage.waypoints.length < 2) return null
  const points = passage.waypoints.map((p) => `${p.x},${p.y}`).join(' ')

  // Door indicator at midpoint
  const mid = passage.waypoints[Math.floor(passage.waypoints.length / 2)]

  return (
    <g key={`p-${i}`}>
      <polyline
        points={points}
        fill="none"
        stroke={PASSAGE_COLOR}
        strokeWidth={0.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={passage.hidden ? '1 0.5' : undefined}
      />
      {passage.connectionType === 'door' && (
        <rect x={mid.x - 0.3} y={mid.y - 0.15} width={0.6} height={0.3} fill={DOOR_COLOR} />
      )}
      {passage.connectionType === 'secret' && (
        <text x={mid.x} y={mid.y} textAnchor="middle" dominantBaseline="central" fontSize={0.7} fill={DOOR_COLOR} fontWeight="bold">S</text>
      )}
      {passage.connectionType === 'stairs' && (
        <text x={mid.x} y={mid.y} textAnchor="middle" dominantBaseline="central" fontSize={0.7} fill={PASSAGE_COLOR}>⬆</text>
      )}
      {passage.locked && (
        <text x={mid.x + 0.5} y={mid.y - 0.3} fontSize={0.5} fill={DOOR_COLOR}>🔒</text>
      )}
    </g>
  )
}

export function SpatialDungeonRenderer({ dungeon, selectedRoomPoiId, roomIdToPoiId, onRoomClick, className }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [viewBox, setViewBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null)

  const bounds = computeBounds(dungeon.rooms)
  const defaultVB = {
    x: bounds.minX,
    y: bounds.minY,
    w: bounds.maxX - bounds.minX,
    h: bounds.maxY - bounds.minY,
  }
  const vb = viewBox ?? defaultVB

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const mx = (e.clientX - rect.left) / rect.width
    const my = (e.clientY - rect.top) / rect.height
    const factor = e.deltaY > 0 ? 1.15 : 0.87
    const current = viewBox ?? defaultVB
    const nw = current.w * factor
    const nh = current.h * factor
    setViewBox({ x: current.x + (current.w - nw) * mx, y: current.y + (current.h - nh) * my, w: nw, h: nh })
  }, [viewBox, defaultVB])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return
    setIsPanning(true)
    const current = viewBox ?? defaultVB
    panStart.current = { x: e.clientX, y: e.clientY, vx: current.x, vy: current.y }
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }, [viewBox, defaultVB])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning || !panStart.current || !svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const current = viewBox ?? defaultVB
    const dx = (e.clientX - panStart.current.x) / rect.width * current.w
    const dy = (e.clientY - panStart.current.y) / rect.height * current.h
    setViewBox({ ...current, x: panStart.current.vx - dx, y: panStart.current.vy - dy })
  }, [isPanning, viewBox, defaultVB])

  const handlePointerUp = useCallback(() => {
    setIsPanning(false)
    panStart.current = null
  }, [])

  const resetZoom = useCallback(() => setViewBox(null), [])

  const lastTouchDist = useRef<number | null>(null)
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 2) { lastTouchDist.current = null; return }
    const t1 = e.touches[0], t2 = e.touches[1]
    const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
    if (lastTouchDist.current !== null) {
      const factor = lastTouchDist.current / dist
      const current = viewBox ?? defaultVB
      const nw = current.w * factor
      const nh = current.h * factor
      setViewBox({ x: current.x + (current.w - nw) * 0.5, y: current.y + (current.h - nh) * 0.5, w: nw, h: nh })
    }
    lastTouchDist.current = dist
  }, [viewBox, defaultVB])

  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const prevent = (e: Event) => e.preventDefault()
    el.addEventListener('wheel', prevent, { passive: false })
    return () => el.removeEventListener('wheel', prevent)
  }, [])

  // Build reverse map: generatedRoomId → poiId (for click handling)
  // Also build selectedPoiId → roomId map for highlighting
  const selectedRoomId = selectedRoomPoiId && roomIdToPoiId
    ? [...roomIdToPoiId.entries()].find(([, poiId]) => poiId === selectedRoomPoiId)?.[0]
    : undefined

  return (
    <div className={`relative ${className ?? ''}`}>
      <svg
        ref={svgRef}
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        className="w-full h-full bg-stone-800 rounded-lg touch-none"
        style={{ minHeight: 300 }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onTouchMove={handleTouchMove}
        onTouchEnd={() => { lastTouchDist.current = null }}
      >
        {/* Passages (render first, behind rooms) */}
        {dungeon.passages.map((p, i) => renderPassage(p, i))}

        {/* Rooms */}
        {dungeon.rooms.map((room) => {
          const { x, y, width, height } = room.bounds
          const isSelected = room.id === selectedRoomId
          const hasTraps = room.hazards.some((h) => !h.disarmed)
          const hasTreasure = room.treasure.some((t) => !t.looted)
          const centerX = x + width / 2
          const centerY = y + height / 2
          const labelFontSize = Math.min(width, height) * 0.25
          const poiId = roomIdToPoiId?.get(room.id)

          return (
            <g
              key={room.id}
              onClick={() => {
                if (onRoomClick && poiId) onRoomClick(poiId)
              }}
              style={{ cursor: onRoomClick && poiId ? 'pointer' : 'default' }}
            >
              <rect
                x={x}
                y={y}
                width={width}
                height={height}
                fill={getRoomFill(room, isSelected)}
                stroke={getRoomStroke(room, isSelected)}
                strokeWidth={isSelected ? 0.2 : 0.12}
                rx={room.geometry === 'alcove' ? 0.3 : 0}
              />

              {/* Room name label */}
              <text
                x={centerX}
                y={centerY - (labelFontSize * 0.3)}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={Math.max(0.4, labelFontSize)}
                fill={LABEL_COLOR}
                fontFamily="serif"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {room.name.length > 12 ? room.name.slice(0, 10) + '…' : room.name}
              </text>

              {/* Indicators: traps (red dot) and treasure (gold dot) */}
              {(hasTraps || hasTreasure) && (
                <g>
                  {hasTraps && <circle cx={x + width - 0.4} cy={y + 0.4} r={0.25} fill={TRAP_INDICATOR} />}
                  {hasTreasure && <circle cx={x + width - (hasTraps ? 0.9 : 0.4)} cy={y + 0.4} r={0.25} fill={TREASURE_INDICATOR} />}
                </g>
              )}

              {/* Dead end marker */}
              {room.isDeadEnd && room.type !== 'entrance' && (
                <rect x={x + 0.1} y={y + 0.1} width={0.4} height={0.4} fill={ROOM_STROKE} opacity={0.4} />
              )}
            </g>
          )
        })}

        {/* Key lock indicators on passages */}
        {dungeon.keyLockPairs?.map((kl, i) => {
          const passage = dungeon.passages.find((p) => p.id === kl.lockedPassageId)
          if (!passage || passage.waypoints.length < 2) return null
          const mid = passage.waypoints[Math.floor(passage.waypoints.length / 2)]
          return (
            <text key={`kl-${i}`} x={mid.x} y={mid.y - 0.6} textAnchor="middle" fontSize={0.6} fill={DOOR_COLOR}>
              🔑
            </text>
          )
        })}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-2 left-2 flex gap-2 text-xs bg-background/80 border rounded px-2 py-1">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: TRAP_INDICATOR }} />
          Trap
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: TREASURE_INDICATOR }} />
          Treasure
        </span>
      </div>

      {viewBox && (
        <button
          onClick={resetZoom}
          className="absolute top-2 right-2 px-2 py-1 text-xs bg-background/80 border rounded hover:bg-background"
        >
          Reset
        </button>
      )}
    </div>
  )
}
