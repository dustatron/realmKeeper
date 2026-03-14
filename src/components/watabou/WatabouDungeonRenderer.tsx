import { useState, useCallback, useRef, useEffect } from 'react'
import type { WatabouDungeonData, WatabouDungeonRect, WatabouDungeonDoor } from '@domain/value-objects/WatabouDungeonData'

interface Props {
  data: WatabouDungeonData
  className?: string
}

const ROOM_FILL = '#e8dcc8'
const ROOM_STROKE = '#3a3a3a'
const CORRIDOR_FILL = '#d4c9b0'
const WATER_FILL = '#6ba3be'
const COLUMN_FILL = '#555'
const NOTE_COLOR = '#333'
const DOOR_COLOR = '#8b4513'
const GRID_COLOR = '#ccc3b0'

function computeBounds(rects: WatabouDungeonRect[]) {
  if (rects.length === 0) return { minX: 0, minY: 0, maxX: 100, maxY: 100 }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const r of rects) {
    minX = Math.min(minX, r.x)
    minY = Math.min(minY, r.y)
    maxX = Math.max(maxX, r.x + r.w)
    maxY = Math.max(maxY, r.y + r.h)
  }
  const pad = 2
  return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad }
}

function isLikelyCorridor(r: WatabouDungeonRect) {
  return r.w <= 3 || r.h <= 3
}

function renderDoor(door: WatabouDungeonDoor, i: number) {
  const { x, y, type, dir } = door
  const isHorizontal = Math.abs(dir.x) > Math.abs(dir.y)
  const len = 0.8

  switch (type) {
    case 'door':
      return isHorizontal
        ? <rect key={i} x={x - 0.15} y={y - len / 2} width={0.3} height={len} fill={DOOR_COLOR} stroke={ROOM_STROKE} strokeWidth={0.05} />
        : <rect key={i} x={x - len / 2} y={y - 0.15} width={len} height={0.3} fill={DOOR_COLOR} stroke={ROOM_STROKE} strokeWidth={0.05} />
    case 'archway':
      return <circle key={i} cx={x} cy={y} r={0.3} fill="none" stroke={DOOR_COLOR} strokeWidth={0.1} />
    case 'secret':
      return <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={0.7} fill={DOOR_COLOR} fontWeight="bold">S</text>
    case 'barred':
      return (
        <g key={i}>
          {isHorizontal ? (
            <>
              <line x1={x} y1={y - len / 2} x2={x} y2={y + len / 2} stroke={ROOM_STROKE} strokeWidth={0.08} />
              <line x1={x - 0.2} y1={y - len / 3} x2={x + 0.2} y2={y - len / 3} stroke={ROOM_STROKE} strokeWidth={0.06} />
              <line x1={x - 0.2} y1={y} x2={x + 0.2} y2={y} stroke={ROOM_STROKE} strokeWidth={0.06} />
              <line x1={x - 0.2} y1={y + len / 3} x2={x + 0.2} y2={y + len / 3} stroke={ROOM_STROKE} strokeWidth={0.06} />
            </>
          ) : (
            <>
              <line x1={x - len / 2} y1={y} x2={x + len / 2} y2={y} stroke={ROOM_STROKE} strokeWidth={0.08} />
              <line x1={x - len / 3} y1={y - 0.2} x2={x - len / 3} y2={y + 0.2} stroke={ROOM_STROKE} strokeWidth={0.06} />
              <line x1={x} y1={y - 0.2} x2={x} y2={y + 0.2} stroke={ROOM_STROKE} strokeWidth={0.06} />
              <line x1={x + len / 3} y1={y - 0.2} x2={x + len / 3} y2={y + 0.2} stroke={ROOM_STROKE} strokeWidth={0.06} />
            </>
          )}
        </g>
      )
    case 'portcullis':
      return (
        <g key={i}>
          {isHorizontal
            ? <rect x={x - 0.15} y={y - len / 2} width={0.3} height={len} fill="none" stroke={ROOM_STROKE} strokeWidth={0.08} strokeDasharray="0.15 0.1" />
            : <rect x={x - len / 2} y={y - 0.15} width={len} height={0.3} fill="none" stroke={ROOM_STROKE} strokeWidth={0.08} strokeDasharray="0.15 0.1" />
          }
        </g>
      )
    case 'stairs':
      return (
        <g key={i}>
          <rect x={x - 0.4} y={y - 0.4} width={0.8} height={0.8} fill={ROOM_FILL} stroke={ROOM_STROKE} strokeWidth={0.05} />
          <line x1={x - 0.3} y1={y - 0.15} x2={x + 0.3} y2={y - 0.15} stroke={ROOM_STROKE} strokeWidth={0.05} />
          <line x1={x - 0.3} y1={y + 0.15} x2={x + 0.3} y2={y + 0.15} stroke={ROOM_STROKE} strokeWidth={0.05} />
        </g>
      )
    default:
      return isHorizontal
        ? <rect key={i} x={x - 0.1} y={y - len / 2} width={0.2} height={len} fill={DOOR_COLOR} />
        : <rect key={i} x={x - len / 2} y={y - 0.1} width={len} height={0.2} fill={DOOR_COLOR} />
  }
}

export function WatabouDungeonRenderer({ data, className }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [viewBox, setViewBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null)

  const bounds = computeBounds(data.rects)
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
    setViewBox({
      x: current.x + (current.w - nw) * mx,
      y: current.y + (current.h - nh) * my,
      w: nw,
      h: nh,
    })
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

  // Touch pinch zoom
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
      setViewBox({
        x: current.x + (current.w - nw) * 0.5,
        y: current.y + (current.h - nh) * 0.5,
        w: nw,
        h: nh,
      })
    }
    lastTouchDist.current = dist
  }, [viewBox, defaultVB])

  const handleTouchEnd = useCallback(() => { lastTouchDist.current = null }, [])

  // Prevent page scroll when interacting with the SVG
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const prevent = (e: Event) => e.preventDefault()
    el.addEventListener('wheel', prevent, { passive: false })
    return () => el.removeEventListener('wheel', prevent)
  }, [])

  const corridors = data.rects.filter(isLikelyCorridor)
  const rooms = data.rects.filter(r => !isLikelyCorridor(r))

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
        onTouchEnd={handleTouchEnd}
      >
        {/* Corridors */}
        {corridors.map((r, i) => (
          r.rotunda
            ? <circle key={`c-${i}`} cx={r.x + r.w / 2} cy={r.y + r.h / 2} r={Math.max(r.w, r.h) / 2} fill={CORRIDOR_FILL} stroke={ROOM_STROKE} strokeWidth={0.1} />
            : <rect key={`c-${i}`} x={r.x} y={r.y} width={r.w} height={r.h} fill={CORRIDOR_FILL} stroke={ROOM_STROKE} strokeWidth={0.1} />
        ))}

        {/* Rooms */}
        {rooms.map((r, i) => (
          r.rotunda
            ? <circle key={`r-${i}`} cx={r.x + r.w / 2} cy={r.y + r.h / 2} r={Math.max(r.w, r.h) / 2} fill={ROOM_FILL} stroke={ROOM_STROKE} strokeWidth={0.12} />
            : <rect key={`r-${i}`} x={r.x} y={r.y} width={r.w} height={r.h} fill={ROOM_FILL} stroke={ROOM_STROKE} strokeWidth={0.12} />
        ))}

        {/* Water */}
        {data.water.map((w: unknown, i) => {
          const wr = w as WatabouDungeonRect
          if (wr.x !== undefined && wr.y !== undefined && wr.w !== undefined && wr.h !== undefined) {
            return <rect key={`w-${i}`} x={wr.x} y={wr.y} width={wr.w} height={wr.h} fill={WATER_FILL} opacity={0.6} />
          }
          return null
        })}

        {/* Columns */}
        {data.columns.map((c, i) => (
          <circle key={`col-${i}`} cx={c.x} cy={c.y} r={0.25} fill={COLUMN_FILL} />
        ))}

        {/* Doors */}
        {data.doors.map((d, i) => renderDoor(d, i))}

        {/* Notes */}
        {data.notes.map((n, i) => (
          <text
            key={`n-${i}`}
            x={n.x}
            y={n.y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={0.6}
            fill={NOTE_COLOR}
            fontFamily="serif"
          >
            {n.text}
          </text>
        ))}
      </svg>

      {/* Reset zoom button */}
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
