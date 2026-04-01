import { useState, useRef, useCallback } from 'react'
import { Button } from '~/components/ui/button'
import { RefreshCw } from 'lucide-react'
import type { POI } from '@domain/entities/POI'
import type { SpatialDungeon, Passage } from '@generators/dungeon/index'

const CELL_SIZE = 20

// Room type colors
const ROOM_TYPE_COLORS: Record<string, string> = {
  entrance: '#15803d',    // green-700
  exit: '#166534',        // green-800
  treasury: '#a16207',    // yellow-700
  trap_room: '#c2410c',   // orange-700
  lair: '#991b1b',        // red-800
  shrine: '#7e22ce',      // purple-700
  prison: '#1e3a5f',      // dark blue
  chamber: '#374151',     // gray-700 (stone)
  corridor: '#374151',
  default: '#374151',
}

const PASSAGE_TYPE_COLORS: Record<string, string> = {
  secret: '#7c3aed',
  door: '#6b7280',
  archway: '#9ca3af',
  passage: '#6b7280',
  stairs: '#f59e0b',
  ladder: '#f59e0b',
  default: '#6b7280',
}

interface Props {
  layout: SpatialDungeon
  childPois: POI[]
  selectedRoomPoiId?: string | null
  onSelectRoom?: (poiId: string | null) => void
  onRegenerate: () => void
}

export function SpatialDungeonMapSection({
  layout,
  childPois,
  selectedRoomPoiId,
  onSelectRoom,
  onRegenerate,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [translate, setTranslate] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const isDragging = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })

  const viewW = layout.gridWidth * CELL_SIZE
  const viewH = layout.gridHeight * CELL_SIZE

  // Pan handlers
  const handlePointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return
    isDragging.current = true
    lastPos.current = { x: e.clientX, y: e.clientY }
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDragging.current) return
    const dx = e.clientX - lastPos.current.x
    const dy = e.clientY - lastPos.current.y
    lastPos.current = { x: e.clientX, y: e.clientY }
    setTranslate(prev => ({ x: prev.x + dx, y: prev.y + dy }))
  }, [])

  const handlePointerUp = useCallback(() => {
    isDragging.current = false
  }, [])

  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setScale(prev => Math.min(4, Math.max(0.3, prev * delta)))
  }, [])

  const handleRoomClick = useCallback((roomId: string) => {
    const poi = childPois.find(p => p.subtypeLabel === roomId)
    if (poi) {
      onSelectRoom?.(poi.id === selectedRoomPoiId ? null : poi.id)
    }
  }, [childPois, selectedRoomPoiId, onSelectRoom])

  const entranceRoom = layout.rooms.find(r => r.id === layout.entranceRoomId)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Dungeon Map</h3>
        <Button size="sm" variant="outline" onClick={onRegenerate}>
          <RefreshCw className="h-3 w-3 mr-1" />
          Regenerate
        </Button>
      </div>

      <div className="border rounded-md overflow-hidden bg-stone-950" style={{ height: 400 }}>
        <svg
          ref={svgRef}
          className="w-full h-full cursor-grab active:cursor-grabbing"
          viewBox={`0 0 ${viewW} ${viewH}`}
          style={{ touchAction: 'none' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onWheel={handleWheel}
        >
          <g transform={`translate(${translate.x},${translate.y}) scale(${scale})`}>
            {/* Background */}
            <rect x={0} y={0} width={viewW} height={viewH} fill="#0c0a09" />

            {/* Passage layer */}
            {layout.passages.map((passage: Passage) => {
              if (!passage.waypoints || passage.waypoints.length < 2) return null
              const pts = passage.waypoints.map(p => `${p.x * CELL_SIZE},${p.y * CELL_SIZE}`).join(' ')
              const color = PASSAGE_TYPE_COLORS[passage.connectionType] ?? PASSAGE_TYPE_COLORS.default
              return (
                <polyline
                  key={passage.id}
                  points={pts}
                  fill="none"
                  stroke={color}
                  strokeWidth={1.5}
                  strokeDasharray={passage.hidden ? '4,3' : undefined}
                  opacity={0.8}
                />
              )
            })}

            {/* Room layer */}
            {layout.rooms.map((room, idx) => {
              const x = room.bounds.x * CELL_SIZE
              const y = room.bounds.y * CELL_SIZE
              const w = room.bounds.width * CELL_SIZE
              const h = room.bounds.height * CELL_SIZE
              const cx = x + w / 2
              const cy = y + h / 2

              const poi = childPois.find(p => p.subtypeLabel === room.id)
              const isSelected = poi?.id === selectedRoomPoiId
              const color = ROOM_TYPE_COLORS[room.type] ?? ROOM_TYPE_COLORS.default
              const isEntrance = room.id === layout.entranceRoomId

              return (
                <g key={room.id} onClick={() => handleRoomClick(room.id)} style={{ cursor: 'pointer' }}>
                  <rect
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    fill={color}
                    stroke={isSelected ? '#3b82f6' : '#6b7280'}
                    strokeWidth={isSelected ? 2 : 0.5}
                    rx={1}
                  />
                  {/* Room number */}
                  <text
                    x={cx}
                    y={cy + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={Math.max(6, Math.min(10, w / 3))}
                    fill="#e5e7eb"
                    fontWeight="bold"
                    pointerEvents="none"
                  >
                    {idx + 1}
                  </text>
                  {/* Entrance marker */}
                  {isEntrance && (
                    <text
                      x={cx}
                      y={y - 3}
                      textAnchor="middle"
                      fontSize={8}
                      fill="#22c55e"
                      pointerEvents="none"
                    >
                      ▼
                    </text>
                  )}
                </g>
              )
            })}
          </g>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-700 inline-block" /> Entrance</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-yellow-700 inline-block" /> Treasury</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-orange-700 inline-block" /> Trap</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-800 inline-block" /> Lair/Boss</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-stone-700 inline-block" /> Room</span>
      </div>

      {selectedRoomPoiId && (
        <p className="text-xs text-blue-400">
          Room selected — open sidebar for details
        </p>
      )}
    </div>
  )
}
