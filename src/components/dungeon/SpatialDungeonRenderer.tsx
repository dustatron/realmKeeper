import { useState, useCallback, useRef, useEffect } from 'react'
import type { GeneratedDungeon, SpatialRoom, Passage, DungeonTheme } from '~/lib/dungeon/types'

interface Props {
  dungeon: GeneratedDungeon
  /** Child POI id currently selected (highlights the matching room) */
  selectedRoomPoiId?: string
  /** Map from generated room.id → child POI id */
  roomIdToPoiId?: Map<string, string>
  /** Called when user clicks a room */
  onRoomClick?: (childPoiId: string) => void
  className?: string
}

// 1 cell = CELL_SIZE pixels
const CELL_SIZE = 10
const PASSAGE_WIDTH = 8

// Theme-based colors matching hexbinder
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

// Unicode symbols for room types (no external icon lib needed)
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

function RoomShape({ room, theme, isSelected, roomNumber, hasNPCs, hasTreasure, onClick }: {
  room: SpatialRoom
  theme: DungeonTheme
  isSelected: boolean
  roomNumber: number
  hasNPCs: boolean
  hasTreasure: boolean
  onClick?: () => void
}) {
  const themeColors = THEME_COLORS[theme] ?? THEME_COLORS.cave
  const isEntrance = room.type === 'entrance' || room.type === 'exit'
  const fill = isSelected ? '#7c2d12' : isEntrance ? ENTRANCE_COLORS.fill : themeColors.fill
  const stroke = isSelected ? SELECTED_STROKE : isEntrance ? ENTRANCE_COLORS.stroke : themeColors.stroke
  const strokeWidth = isSelected ? 2 : 1.5

  const x = px(room.bounds.x)
  const y = px(room.bounds.y)
  const w = px(room.bounds.width)
  const h = px(room.bounds.height)

  // Content icons to display — collect what this room has
  const icons: { icon: string; color: string }[] = []
  if (room.hazards.some((h) => !h.disarmed))      icons.push({ icon: '⚠', color: '#f97316' })
  if (hasTreasure)                                 icons.push({ icon: '◈', color: '#eab308' })
  if (hasNPCs)                                     icons.push({ icon: '☻', color: '#93c5fd' })
  if (room.secrets?.some((s) => !s.discovered))   icons.push({ icon: '?', color: '#a78bfa' })
  if (room.discoveries?.some((d) => !d.found))    icons.push({ icon: '!', color: '#6ee7b7' })

  // Icon size and layout
  const iconSize = Math.max(5, Math.min(w, h) * 0.38)
  const iconPad = 2
  const contentCenterX = x + w / 2
  const contentCenterY = y + h / 2

  // If icons fit in one row, spread them; otherwise stack
  const iconSpacing = iconSize + 1.5
  const totalIconWidth = icons.length * iconSpacing - 1.5
  const iconStartX = contentCenterX - totalIconWidth / 2

  // Room number — top-right corner
  const numSize = Math.max(5, Math.min(w, h) * 0.35)

  return (
    <g onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <rect x={x} y={y} width={w} height={h} fill={fill} stroke={stroke} strokeWidth={strokeWidth} rx={2} />

      {/* Content icons centered in room */}
      {icons.length > 0 ? (
        icons.map((ic, i) => (
          <text
            key={i}
            x={iconStartX + i * iconSpacing + iconSpacing / 2}
            y={contentCenterY}
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
        /* Empty room — show faint type symbol so it's not a blank square */
        <text
          x={contentCenterX} y={contentCenterY}
          textAnchor="middle" dominantBaseline="central"
          fontSize={Math.max(6, Math.min(w, h) * 0.45)}
          fill="rgba(255,255,255,0.2)"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {ROOM_SYMBOLS[room.type] ?? '·'}
        </text>
      )}

      {/* Room number — top-right */}
      <text
        x={x + w - iconPad} y={y + iconPad + numSize * 0.7}
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
      {/* Main passage */}
      <path
        d={pathData}
        stroke={colors.passage}
        strokeWidth={PASSAGE_WIDTH}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Secret passage overlay */}
      {passage.hidden && (
        <path d={pathData} stroke="#a3a3a3" strokeWidth={2} fill="none" strokeDasharray="4 4" strokeLinecap="round" />
      )}
      {/* Door marker */}
      {passage.connectionType === 'door' && passage.waypoints.length >= 2 && (
        <rect
          x={cx(passage.waypoints[0].x) - 4}
          y={cx(passage.waypoints[0].y) - 2}
          width={8} height={4}
          fill={passage.locked ? '#ef4444' : '#fbbf24'}
          stroke="#1f2937" strokeWidth={1}
        />
      )}
      {/* Stairs marker */}
      {passage.connectionType === 'stairs' && midWp && (
        <text
          x={cx(midWp.x)} y={cx(midWp.y)}
          textAnchor="middle" dominantBaseline="central"
          fontSize={7} fill="rgba(255,255,255,0.8)"
        >
          ↕
        </text>
      )}
      {/* Trap marker */}
      {hasTrap && midWp && (
        <circle cx={cx(midWp.x)} cy={cx(midWp.y)} r={4} fill="#f97316" opacity={0.9} />
      )}
    </g>
  )
}

export function SpatialDungeonRenderer({ dungeon, selectedRoomPoiId, roomIdToPoiId, onRoomClick, className }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [viewBox, setViewBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null)
  const lastTouchDist = useRef<number | null>(null)

  const bounds = computeBounds(dungeon)
  const defaultVB = { x: bounds.minX, y: bounds.minY, w: bounds.maxX - bounds.minX, h: bounds.maxY - bounds.minY }
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

  // Build reverse lookup: generated room.id → 1-based display number
  const roomNumberMap = new Map(dungeon.rooms.map((r, i) => [r.id, i + 1]))

  // Which rooms have generated NPCs / treasure
  const roomsWithNPCs = new Set((dungeon.dungeonNPCs ?? []).map((n) => n.roomId))
  const roomsWithTreasure = new Set(dungeon.roomHasTreasure ?? [])

  // Reverse lookup: child POI id → generated room id (for highlighting)
  const selectedRoomId = selectedRoomPoiId && roomIdToPoiId
    ? [...roomIdToPoiId.entries()].find(([, poiId]) => poiId === selectedRoomPoiId)?.[0]
    : undefined

  const themeColors = THEME_COLORS[dungeon.theme] ?? THEME_COLORS.cave

  return (
    <div className={`relative ${className ?? ''}`}>
      <svg
        ref={svgRef}
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        className="w-full h-full rounded-lg touch-none bg-stone-100 dark:bg-stone-900"
        style={{ minHeight: 300 }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onTouchMove={handleTouchMove}
        onTouchEnd={() => { lastTouchDist.current = null }}
      >
        {/* Subtle grid */}
        <defs>
          <pattern id="dg" width={CELL_SIZE} height={CELL_SIZE} patternUnits="userSpaceOnUse">
            <path d={`M ${CELL_SIZE} 0 L 0 0 0 ${CELL_SIZE}`} fill="none" stroke="rgba(128,128,128,0.15)" strokeWidth={0.5} />
          </pattern>
        </defs>
        <rect x={bounds.minX} y={bounds.minY} width={bounds.maxX - bounds.minX} height={bounds.maxY - bounds.minY} fill="url(#dg)" />

        {/* Passages (behind rooms) */}
        {dungeon.passages.map((p) => (
          <PassageShape key={p.id} passage={p} theme={dungeon.theme} />
        ))}

        {/* Rooms */}
        {dungeon.rooms.map((room) => {
          const poiId = roomIdToPoiId?.get(room.id)
          return (
            <RoomShape
              key={room.id}
              room={room}
              theme={dungeon.theme}
              isSelected={room.id === selectedRoomId}
              roomNumber={roomNumberMap.get(room.id) ?? 0}
              hasNPCs={roomsWithNPCs.has(room.id)}
              hasTreasure={roomsWithTreasure.has(room.id)}
              onClick={onRoomClick && poiId ? () => onRoomClick(poiId) : undefined}
            />
          )
        })}

        {/* Key lock indicators */}
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

      {/* Legend */}
      <div className="absolute bottom-2 left-2 flex gap-3 text-xs bg-background/90 border border-border rounded px-2 py-1 text-muted-foreground">
        <span className="flex items-center gap-1"><span className="text-orange-400 font-bold">⚠</span> Trap</span>
        <span className="flex items-center gap-1"><span className="text-yellow-400 font-bold">◈</span> Treasure</span>
        <span className="flex items-center gap-1"><span className="text-blue-300 font-bold">☻</span> NPC</span>
        <span className="flex items-center gap-1"><span className="text-purple-400 font-bold">?</span> Secret</span>
        <span className="flex items-center gap-1"><span className="text-emerald-300 font-bold">!</span> Discovery</span>
      </div>

      {viewBox && (
        <button
          onClick={() => setViewBox(null)}
          className="absolute top-2 right-2 px-2 py-1 text-xs bg-background/90 border border-border text-foreground rounded hover:bg-muted"
        >
          Reset
        </button>
      )}
    </div>
  )
}
