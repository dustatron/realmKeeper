import { useState, useCallback, useRef, useEffect } from 'react'
import { newId } from '@shared/ulid'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { Pencil, X, Trash2, Plus, Link2 } from 'lucide-react'
import type { GeneratedDungeon, SpatialRoom, Passage, DungeonTheme, RoomType } from '~/lib/dungeon/types'

interface Props {
  dungeon: GeneratedDungeon
  /** Child POI id currently selected (highlights the matching room) */
  selectedRoomPoiId?: string
  /** Map from generated room.id → child POI id */
  roomIdToPoiId?: Map<string, string>
  /** Called when user clicks a room in view mode */
  onRoomClick?: (childPoiId: string) => void
  /** Called when dungeon structure changes (enables edit mode toggle) */
  onDungeonChange?: (dungeon: GeneratedDungeon) => void
  className?: string
}

// 1 cell = CELL_SIZE pixels
const CELL_SIZE = 10
const PASSAGE_WIDTH = 8
const DRAG_THRESHOLD = 5

const THEME_COLORS: Record<DungeonTheme, { fill: string; stroke: string; passage: string }> = {
  tomb:           { fill: '#44403c', stroke: '#78716c', passage: '#57534e' },
  cave:           { fill: '#292524', stroke: '#57534e', passage: '#44403c' },
  temple:         { fill: '#4c1d95', stroke: '#7c3aed', passage: '#5b21b6' },
  mine:           { fill: '#78350f', stroke: '#b45309', passage: '#92400e' },
  fortress:       { fill: '#374151', stroke: '#6b7280', passage: '#4b5563' },
  sewer:          { fill: '#14532d', stroke: '#166534', passage: '#15803d' },
  crypt:          { fill: '#1c1917', stroke: '#44403c', passage: '#292524' },
  lair:           { fill: '#450a0a', stroke: '#7f1d1d', passage: '#991b1b' },
  shrine:         { fill: '#fef3c7', stroke: '#f59e0b', passage: '#d97706' },
  bandit_hideout: { fill: '#365314', stroke: '#4d7c0f', passage: '#3f6212' },
  cultist_lair:   { fill: '#4a044e', stroke: '#86198f', passage: '#701a75' },
  witch_hut:      { fill: '#422006', stroke: '#713f12', passage: '#854d0e' },
  sea_cave:       { fill: '#164e63', stroke: '#0e7490', passage: '#155e75' },
  beast_den:      { fill: '#3f3f46', stroke: '#71717a', passage: '#52525b' },
  floating_keep:  { fill: '#1e3a5f', stroke: '#3b82f6', passage: '#1d4ed8' },
}

const ENTRANCE_COLORS = { fill: '#166534', stroke: '#22c55e' }
const SELECTED_STROKE = '#f59e0b'
const EDIT_SELECTED_STROKE = '#3b82f6'

const ROOM_SYMBOLS: Record<string, string> = {
  entrance: '⛩',
  exit: '🚪',
  corridor: '→',
  chamber: '□',
  shrine: '✦',
  treasury: '◈',
  prison: '⚿',
  lair: '☠',
  trap_room: '⚠',
}

const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  entrance: 'Entrance',
  exit: 'Exit',
  corridor: 'Corridor',
  chamber: 'Chamber',
  shrine: 'Shrine',
  treasury: 'Treasury',
  prison: 'Prison',
  lair: 'Lair',
  trap_room: 'Trap Room',
}

const ADDABLE_ROOM_TYPES: RoomType[] = ['chamber', 'shrine', 'treasury', 'prison', 'lair', 'trap_room', 'corridor', 'exit']

function px(cellCoord: number) { return cellCoord * CELL_SIZE }
function cx(cellCoord: number) { return cellCoord * CELL_SIZE + CELL_SIZE / 2 }

function computeBounds(dungeon: GeneratedDungeon) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const r of dungeon.rooms) {
    minX = Math.min(minX, r.bounds.x)
    minY = Math.min(minY, r.bounds.y)
    maxX = Math.max(maxX, r.bounds.x + r.bounds.width)
    maxY = Math.max(maxY, r.bounds.y + r.bounds.height)
  }
  for (const p of dungeon.passages) {
    for (const wp of p.waypoints) {
      minX = Math.min(minX, wp.x)
      minY = Math.min(minY, wp.y)
      maxX = Math.max(maxX, wp.x + 1)
      maxY = Math.max(maxY, wp.y + 1)
    }
  }
  if (!isFinite(minX)) return { minX: 0, minY: 0, maxX: 100, maxY: 100 }
  const pad = 2
  return {
    minX: (minX - pad) * CELL_SIZE,
    minY: (minY - pad) * CELL_SIZE,
    maxX: (maxX + pad) * CELL_SIZE,
    maxY: (maxY + pad) * CELL_SIZE,
  }
}

function waypointsToPath(waypoints: Passage['waypoints']): string {
  if (waypoints.length < 2) return ''
  const pts = waypoints.map((wp) => `${cx(wp.x)},${cx(wp.y)}`)
  return `M ${pts[0]} L ${pts.slice(1).join(' L ')}`
}

function makePassage(fromRoom: SpatialRoom, toRoom: SpatialRoom): Passage {
  return {
    id: newId(),
    fromRoomId: fromRoom.id,
    toRoomId: toRoom.id,
    waypoints: [
      { x: Math.round(fromRoom.bounds.x + fromRoom.bounds.width / 2), y: Math.round(fromRoom.bounds.y + fromRoom.bounds.height / 2) },
      { x: Math.round(toRoom.bounds.x + toRoom.bounds.width / 2), y: Math.round(toRoom.bounds.y + toRoom.bounds.height / 2) },
    ],
    connectionType: 'archway',
    locked: false,
    hidden: false,
  }
}

function RoomShape({ room, theme, isSelected, isEditSelected, roomNumber, hasNPCs, hasTreasure, onClick }: {
  room: SpatialRoom
  theme: DungeonTheme
  isSelected: boolean
  isEditSelected: boolean
  roomNumber: number
  hasNPCs: boolean
  hasTreasure: boolean
  onClick?: () => void
}) {
  const themeColors = THEME_COLORS[theme] ?? THEME_COLORS.cave
  const isEntrance = room.type === 'entrance' || room.type === 'exit'
  const fill = isSelected ? '#7c2d12' : isEntrance ? ENTRANCE_COLORS.fill : themeColors.fill
  const stroke = isEditSelected ? EDIT_SELECTED_STROKE : isSelected ? SELECTED_STROKE : isEntrance ? ENTRANCE_COLORS.stroke : themeColors.stroke
  const strokeWidth = isSelected || isEditSelected ? 2 : 1.5

  const x = px(room.bounds.x)
  const y = px(room.bounds.y)
  const w = px(room.bounds.width)
  const h = px(room.bounds.height)

  const icons: { icon: string; color: string }[] = []
  if (room.hazards.some((h) => !h.disarmed))      icons.push({ icon: '⚠', color: '#f97316' })
  if (hasTreasure)                                 icons.push({ icon: '◈', color: '#eab308' })
  if (hasNPCs)                                     icons.push({ icon: '☻', color: '#93c5fd' })
  if (room.secrets?.some((s) => !s.discovered))   icons.push({ icon: '?', color: '#a78bfa' })
  if (room.discoveries?.some((d) => !d.found))    icons.push({ icon: '!', color: '#6ee7b7' })

  const iconSize = Math.max(5, Math.min(w, h) * 0.38)
  const iconSpacing = iconSize + 1.5
  const totalIconWidth = icons.length * iconSpacing - 1.5
  const iconStartX = (x + w / 2) - totalIconWidth / 2
  const numSize = Math.max(5, Math.min(w, h) * 0.35)

  return (
    <g
      data-room-id={room.id}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <rect x={x} y={y} width={w} height={h} fill={fill} stroke={stroke} strokeWidth={strokeWidth} rx={2} />

      {/* Edit-selected glow ring */}
      {isEditSelected && (
        <rect x={x - 1.5} y={y - 1.5} width={w + 3} height={h + 3} fill="none" stroke={EDIT_SELECTED_STROKE} strokeWidth={1} rx={3} opacity={0.5} />
      )}

      {icons.length > 0 ? (
        icons.map((ic, i) => (
          <text
            key={i}
            x={iconStartX + i * iconSpacing + iconSpacing / 2}
            y={y + h / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={iconSize}
            fill={ic.color}
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {ic.icon}
          </text>
        ))
      ) : (
        <text
          x={x + w / 2} y={y + h / 2}
          textAnchor="middle" dominantBaseline="central"
          fontSize={Math.max(6, Math.min(w, h) * 0.45)}
          fill="rgba(255,255,255,0.2)"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {ROOM_SYMBOLS[room.type] ?? '·'}
        </text>
      )}

      <text
        x={x + w - 2} y={y + 2 + numSize * 0.7}
        textAnchor="end"
        fontSize={numSize}
        fontWeight="bold"
        fill="rgba(255,255,255,0.75)"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {roomNumber}
      </text>
    </g>
  )
}

function PassageShape({ passage, theme }: { passage: Passage; theme: DungeonTheme }) {
  const colors = THEME_COLORS[theme] ?? THEME_COLORS.cave
  const pathData = waypointsToPath(passage.waypoints)
  if (!pathData) return null

  const hasTrap = passage.trap && !passage.trap.disarmed
  const midWp = passage.waypoints[Math.floor(passage.waypoints.length / 2)]

  return (
    <g>
      <path
        d={pathData}
        stroke={colors.passage}
        strokeWidth={PASSAGE_WIDTH}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {passage.hidden && (
        <path d={pathData} stroke="#a3a3a3" strokeWidth={2} fill="none" strokeDasharray="4 4" strokeLinecap="round" />
      )}
      {passage.connectionType === 'door' && passage.waypoints.length >= 2 && (
        <rect
          x={cx(passage.waypoints[0].x) - 4}
          y={cx(passage.waypoints[0].y) - 2}
          width={8} height={4}
          fill={passage.locked ? '#ef4444' : '#fbbf24'}
          stroke="#1f2937" strokeWidth={1}
        />
      )}
      {passage.connectionType === 'stairs' && midWp && (
        <text x={cx(midWp.x)} y={cx(midWp.y)} textAnchor="middle" dominantBaseline="central" fontSize={7} fill="rgba(255,255,255,0.8)">↕</text>
      )}
      {hasTrap && midWp && (
        <circle cx={cx(midWp.x)} cy={cx(midWp.y)} r={4} fill="#f97316" opacity={0.9} />
      )}
    </g>
  )
}

export function SpatialDungeonRenderer({ dungeon, selectedRoomPoiId, roomIdToPoiId, onRoomClick, onDungeonChange, className }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [viewBox, setViewBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null)
  const lastTouchDist = useRef<number | null>(null)
  const dragMoved = useRef(false)

  // Edit mode state
  const [editMode, setEditMode] = useState(false)
  const [selectedEditRoomId, setSelectedEditRoomId] = useState<string | null>(null)
  const [addRoomGridPos, setAddRoomGridPos] = useState<{ x: number; y: number } | null>(null)
  const [addRoomType, setAddRoomType] = useState<RoomType>('chamber')
  const [addRoomName, setAddRoomName] = useState('')
  const [connectToRoomId, setConnectToRoomId] = useState<string>('none')
  const [connectFrom, setConnectFrom] = useState<string>('none')

  const bounds = computeBounds(dungeon)
  const defaultVB = { x: bounds.minX, y: bounds.minY, w: bounds.maxX - bounds.minX, h: bounds.maxY - bounds.minY }
  const vb = viewBox ?? defaultVB

  // --- Zoom / pan handlers ---

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
    dragMoved.current = false
    setIsPanning(true)
    const current = viewBox ?? defaultVB
    panStart.current = { x: e.clientX, y: e.clientY, vx: current.x, vy: current.y }
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }, [viewBox, defaultVB])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning || !panStart.current || !svgRef.current) return
    const dx = e.clientX - panStart.current.x
    const dy = e.clientY - panStart.current.y
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
      dragMoved.current = true
    }
    const rect = svgRef.current.getBoundingClientRect()
    const current = viewBox ?? defaultVB
    const pdx = dx / rect.width * current.w
    const pdy = dy / rect.height * current.h
    setViewBox({ ...current, x: panStart.current.vx - pdx, y: panStart.current.vy - pdy })
  }, [isPanning, viewBox, defaultVB])

  const handlePointerUp = useCallback(() => { setIsPanning(false); panStart.current = null }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 2) { lastTouchDist.current = null; return }
    const t1 = e.touches[0], t2 = e.touches[1]
    const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
    if (lastTouchDist.current !== null) {
      const factor = lastTouchDist.current / dist
      const current = viewBox ?? defaultVB
      const nw = current.w * factor, nh = current.h * factor
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

  // --- Edit mode click handler ---

  const handleSvgClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!editMode || dragMoved.current) return

    // Walk up from target to find a room group
    let el = e.target as Element | null
    let clickedRoomId: string | null = null
    while (el && el !== svgRef.current) {
      const rid = el.getAttribute('data-room-id')
      if (rid) { clickedRoomId = rid; break }
      el = el.parentElement
    }

    if (clickedRoomId) {
      setSelectedEditRoomId(clickedRoomId)
      setAddRoomGridPos(null)
    } else {
      // Empty space — compute grid position for new room
      const svg = svgRef.current!
      const rect = svg.getBoundingClientRect()
      const svgX = vb.x + (e.clientX - rect.left) / rect.width * vb.w
      const svgY = vb.y + (e.clientY - rect.top) / rect.height * vb.h
      setAddRoomGridPos({ x: Math.floor(svgX / CELL_SIZE), y: Math.floor(svgY / CELL_SIZE) })
      setSelectedEditRoomId(null)
    }
  }, [editMode, vb])

  // --- Dungeon mutation helpers ---

  const handleDeleteRoom = useCallback((roomId: string) => {
    if (!onDungeonChange) return
    onDungeonChange({
      ...dungeon,
      rooms: dungeon.rooms.filter(r => r.id !== roomId),
      passages: dungeon.passages.filter(p => p.fromRoomId !== roomId && p.toRoomId !== roomId),
    })
    setSelectedEditRoomId(null)
  }, [dungeon, onDungeonChange])

  const handleAddRoom = useCallback(() => {
    if (!onDungeonChange || !addRoomGridPos) return
    const SIZE = addRoomType === 'corridor' ? 2 : 5
    const H = addRoomType === 'corridor' ? 5 : 4
    const newRoom: SpatialRoom = {
      id: newId(),
      name: addRoomName.trim() || ROOM_TYPE_LABELS[addRoomType],
      description: '',
      type: addRoomType,
      size: 'medium',
      depth: 1,
      bounds: {
        x: addRoomGridPos.x - Math.floor(SIZE / 2),
        y: addRoomGridPos.y - Math.floor(H / 2),
        width: SIZE,
        height: H,
      },
      encounters: [],
      treasure: [],
      features: [],
      hazards: [],
      secrets: [],
      discoveries: [],
      explored: false,
    }
    const newPassages: Passage[] = []
    if (connectToRoomId && connectToRoomId !== 'none') {
      const target = dungeon.rooms.find(r => r.id === connectToRoomId)
      if (target) newPassages.push(makePassage(target, newRoom))
    }
    onDungeonChange({
      ...dungeon,
      rooms: [...dungeon.rooms, newRoom],
      passages: [...dungeon.passages, ...newPassages],
    })
    setAddRoomGridPos(null)
    setAddRoomName('')
    setConnectToRoomId('none')
  }, [dungeon, onDungeonChange, addRoomGridPos, addRoomType, addRoomName, connectToRoomId])

  const handleAddPassage = useCallback((fromId: string, toId: string) => {
    if (!onDungeonChange) return
    const from = dungeon.rooms.find(r => r.id === fromId)
    const to = dungeon.rooms.find(r => r.id === toId)
    if (!from || !to) return
    // Don't duplicate
    const exists = dungeon.passages.some(
      p => (p.fromRoomId === fromId && p.toRoomId === toId) || (p.fromRoomId === toId && p.toRoomId === fromId)
    )
    if (exists) return
    onDungeonChange({ ...dungeon, passages: [...dungeon.passages, makePassage(from, to)] })
    setConnectFrom('none')
  }, [dungeon, onDungeonChange])

  const handleDeletePassage = useCallback((fromId: string, toId: string) => {
    if (!onDungeonChange) return
    onDungeonChange({
      ...dungeon,
      passages: dungeon.passages.filter(
        p => !((p.fromRoomId === fromId && p.toRoomId === toId) || (p.fromRoomId === toId && p.toRoomId === fromId))
      ),
    })
  }, [dungeon, onDungeonChange])

  // --- Derived data ---

  const roomNumberMap = new Map(dungeon.rooms.map((r, i) => [r.id, i + 1]))
  const roomsWithNPCs = new Set((dungeon.dungeonNPCs ?? []).map((n) => n.roomId))
  const roomsWithTreasure = new Set(dungeon.roomHasTreasure ?? [])
  const selectedRoomId = selectedRoomPoiId && roomIdToPoiId
    ? [...roomIdToPoiId.entries()].find(([, poiId]) => poiId === selectedRoomPoiId)?.[0]
    : undefined
  const themeColors = THEME_COLORS[dungeon.theme] ?? THEME_COLORS.cave

  const selectedEditRoom = editMode && selectedEditRoomId
    ? dungeon.rooms.find(r => r.id === selectedEditRoomId) ?? null
    : null

  // Passages connected to the currently selected room
  const selectedRoomPassages = selectedEditRoom
    ? dungeon.passages.filter(p => p.fromRoomId === selectedEditRoom.id || p.toRoomId === selectedEditRoom.id)
    : []

  // Rooms that the selected room is NOT yet connected to (for "add passage" dropdown)
  const unconnectedRooms = selectedEditRoom
    ? dungeon.rooms.filter(r => {
        if (r.id === selectedEditRoom.id) return false
        return !dungeon.passages.some(
          p => (p.fromRoomId === selectedEditRoom.id && p.toRoomId === r.id) ||
               (p.fromRoomId === r.id && p.toRoomId === selectedEditRoom.id)
        )
      })
    : []

  return (
    <div className={`relative flex flex-col ${className ?? ''}`}>
      <svg
        ref={svgRef}
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        className="w-full flex-1 rounded-lg touch-none bg-stone-100 dark:bg-stone-900"
        style={{ minHeight: 280 }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onTouchMove={handleTouchMove}
        onTouchEnd={() => { lastTouchDist.current = null }}
        onClick={editMode ? handleSvgClick : undefined}
      >
        <defs>
          <pattern id="dg" width={CELL_SIZE} height={CELL_SIZE} patternUnits="userSpaceOnUse">
            <path d={`M ${CELL_SIZE} 0 L 0 0 0 ${CELL_SIZE}`} fill="none" stroke="rgba(128,128,128,0.15)" strokeWidth={0.5} />
          </pattern>
        </defs>
        <rect x={bounds.minX} y={bounds.minY} width={bounds.maxX - bounds.minX} height={bounds.maxY - bounds.minY} fill="url(#dg)" />

        {dungeon.passages.map((p) => (
          <PassageShape key={p.id} passage={p} theme={dungeon.theme} />
        ))}

        {dungeon.rooms.map((room) => {
          const poiId = roomIdToPoiId?.get(room.id)
          return (
            <RoomShape
              key={room.id}
              room={room}
              theme={dungeon.theme}
              isSelected={!editMode && room.id === selectedRoomId}
              isEditSelected={editMode && room.id === selectedEditRoomId}
              roomNumber={roomNumberMap.get(room.id) ?? 0}
              hasNPCs={roomsWithNPCs.has(room.id)}
              hasTreasure={roomsWithTreasure.has(room.id)}
              onClick={!editMode && onRoomClick && poiId ? () => onRoomClick(poiId) : undefined}
            />
          )
        })}

        {/* New room placement ghost */}
        {editMode && addRoomGridPos && (
          <rect
            x={px(addRoomGridPos.x - 2)} y={px(addRoomGridPos.y - 2)}
            width={px(5)} height={px(4)}
            fill="rgba(59,130,246,0.2)" stroke="#3b82f6" strokeWidth={1.5}
            strokeDasharray="3 2" rx={2}
            style={{ pointerEvents: 'none' }}
          />
        )}

        {dungeon.keyLockPairs?.map((kl) => {
          const passage = dungeon.passages.find((p) => p.id === kl.lockedPassageId)
          if (!passage || passage.waypoints.length < 1) return null
          const wp = passage.waypoints[Math.floor(passage.waypoints.length / 2)]
          return (
            <text key={kl.keyId} x={cx(wp.x)} y={cx(wp.y) - 6} textAnchor="middle" fontSize={6} fill={themeColors.stroke}>
              🔑
            </text>
          )
        })}
      </svg>

      {/* Toolbar row */}
      <div className="absolute top-2 right-2 flex items-center gap-1.5">
        {onDungeonChange && (
          <button
            onClick={() => {
              setEditMode(!editMode)
              setSelectedEditRoomId(null)
              setAddRoomGridPos(null)
            }}
            className={`px-2 py-1 text-xs rounded flex items-center gap-1 transition-colors ${
              editMode
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-background/90 border border-border text-foreground hover:bg-muted'
            }`}
          >
            <Pencil className="size-3" />
            {editMode ? 'Done' : 'Edit'}
          </button>
        )}
        {viewBox && (
          <button
            onClick={() => setViewBox(null)}
            className="px-2 py-1 text-xs bg-background/90 border border-border text-foreground rounded hover:bg-muted"
          >
            Reset
          </button>
        )}
      </div>

      {/* Legend (hidden in edit mode to save space) */}
      {!editMode && (
        <div className="absolute bottom-2 left-2 flex gap-3 text-xs bg-background/90 border border-border rounded px-2 py-1 text-muted-foreground">
          <span className="flex items-center gap-1"><span className="text-orange-400 font-bold">⚠</span> Trap</span>
          <span className="flex items-center gap-1"><span className="text-yellow-400 font-bold">◈</span> Treasure</span>
          <span className="flex items-center gap-1"><span className="text-blue-300 font-bold">☻</span> NPC</span>
          <span className="flex items-center gap-1"><span className="text-purple-400 font-bold">?</span> Secret</span>
          <span className="flex items-center gap-1"><span className="text-emerald-300 font-bold">!</span> Discovery</span>
        </div>
      )}

      {/* Edit panel — selected room */}
      {editMode && selectedEditRoom && (
        <div className="border border-border border-t-0 rounded-b-lg bg-background/98 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base">{ROOM_SYMBOLS[selectedEditRoom.type] ?? '□'}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium leading-none truncate">{selectedEditRoom.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{ROOM_TYPE_LABELS[selectedEditRoom.type]} · Room {roomNumberMap.get(selectedEditRoom.id)}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setSelectedEditRoomId(null)}
              >
                <X className="size-3.5" />
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="h-7 px-2 text-xs gap-1"
                onClick={() => handleDeleteRoom(selectedEditRoom.id)}
              >
                <Trash2 className="size-3.5" />
                Delete
              </Button>
            </div>
          </div>

          {/* Passages */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Connections ({selectedRoomPassages.length})</p>
            {selectedRoomPassages.map(p => {
              const otherId = p.fromRoomId === selectedEditRoom.id ? p.toRoomId : p.fromRoomId
              const other = dungeon.rooms.find(r => r.id === otherId)
              if (!other) return null
              return (
                <div key={p.id} className="flex items-center justify-between text-xs bg-muted/50 rounded px-2 py-1">
                  <span className="flex items-center gap-1.5">
                    <Link2 className="size-3 text-muted-foreground" />
                    <span>{other.name}</span>
                    <span className="text-muted-foreground">({p.connectionType})</span>
                  </span>
                  <button
                    onClick={() => handleDeletePassage(selectedEditRoom.id, otherId)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    title="Remove connection"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              )
            })}

            {/* Add passage to another room */}
            {unconnectedRooms.length > 0 && (
              <div className="flex items-center gap-1.5 pt-1">
                <Select value={connectFrom} onValueChange={setConnectFrom}>
                  <SelectTrigger className="h-7 text-xs flex-1">
                    <SelectValue placeholder="Connect to…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Connect to…</SelectItem>
                    {unconnectedRooms.map(r => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs gap-1 shrink-0"
                  disabled={!connectFrom || connectFrom === 'none'}
                  onClick={() => handleAddPassage(selectedEditRoom.id, connectFrom)}
                >
                  <Plus className="size-3" />
                  Add
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit panel — add room */}
      {editMode && addRoomGridPos && !selectedEditRoom && (
        <div className="border border-border border-t-0 rounded-b-lg bg-background/98 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Add Room</p>
            <button
              onClick={() => setAddRoomGridPos(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select value={addRoomType} onValueChange={(v) => setAddRoomType(v as RoomType)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ADDABLE_ROOM_TYPES.map(t => (
                  <SelectItem key={t} value={t}>{ROOM_SYMBOLS[t]} {ROOM_TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Name (optional)"
              value={addRoomName}
              onChange={e => setAddRoomName(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <Select value={connectToRoomId} onValueChange={setConnectToRoomId}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue placeholder="Connect to…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No connection</SelectItem>
                {dungeon.rooms.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" className="h-8 px-3 text-xs gap-1 shrink-0" onClick={handleAddRoom}>
              <Plus className="size-3.5" />
              Add Room
            </Button>
          </div>
        </div>
      )}

      {/* Edit hint when mode is active but nothing selected */}
      {editMode && !selectedEditRoom && !addRoomGridPos && (
        <div className="border border-border border-t-0 rounded-b-lg bg-muted/30 px-3 py-2 text-xs text-muted-foreground text-center">
          Click a room to select it · Click empty space to add a room
        </div>
      )}
    </div>
  )
}
