import { useState, useCallback, useRef, useEffect } from 'react'
import type { WatabouCityData, WatabouCityFeature, WatabouCityFeatureGeometry } from '@domain/value-objects/WatabouCityData'

interface Props {
  data: WatabouCityData
  className?: string
}

// MFCG feature classification by property id or geometry patterns
type FeatureKind =
  | 'earth' | 'water' | 'farm' | 'plaza' | 'tree' | 'road' | 'river'
  | 'wall' | 'building' | 'tower' | 'unknown'

function classifyFeature(f: WatabouCityFeature): FeatureKind {
  const id = f.properties?.id ?? ''
  const idStr = typeof id === 'string' ? id : ''
  if (idStr === 'earth') return 'earth'
  if (idStr.includes('wall') || idStr === 'walls') return 'wall'
  if (idStr.includes('tower')) return 'tower'
  if (idStr.includes('plank') || idStr.includes('road') || idStr.includes('street') || idStr === 'roads') return 'road'
  if (idStr.includes('river') || idStr === 'rivers') return 'river'
  if (idStr.includes('water') || idStr === 'sea' || idStr === 'ocean') return 'water'
  if (idStr.includes('tree') || idStr === 'trees') return 'tree'
  if (idStr.includes('plaza') || idStr.includes('square') || idStr === 'squares' || idStr === 'greens') return 'plaza'
  if (idStr.includes('building') || idStr === 'buildings' || idStr === 'prisms') return 'building'
  if (idStr.includes('farm') || idStr === 'fields') return 'farm'
  // Heuristic fallback by geometry type.
  if (f.geometry.type === 'MultiPolygon') return 'building'
  if (f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString') return 'road'
  if (f.geometry.type === 'MultiPoint' || f.geometry.type === 'Point') return 'tree'
  if (f.geometry.type === 'Polygon') return 'plaza'
  return 'unknown'
}

const COLORS: Record<string, { fill: string; stroke: string; strokeWidth: number; opacity?: number }> = {
  earth: { fill: '#e8dcc0', stroke: '#d8c8a0', strokeWidth: 0.3 },
  tree: { fill: '#7fa05a', stroke: 'none', strokeWidth: 1.4, opacity: 0.7 },
  building: { fill: '#b8a88a', stroke: '#6b5c3e', strokeWidth: 0.3 },
  wall: { fill: 'none', stroke: '#5a4a30', strokeWidth: 1.5 },
  tower: { fill: '#8a7a5a', stroke: '#5a4a30', strokeWidth: 0.5 },
  road: { fill: 'none', stroke: '#c8b898', strokeWidth: 1 },
  river: { fill: 'none', stroke: '#6ba3be', strokeWidth: 2 },
  water: { fill: '#6ba3be', stroke: '#4a8aa0', strokeWidth: 0.5, opacity: 0.6 },
  plaza: { fill: '#c8d8a8', stroke: '#a0b888', strokeWidth: 0.3, opacity: 0.5 },
  farm: { fill: '#d4dca0', stroke: '#b0b880', strokeWidth: 0.2, opacity: 0.4 },
  unknown: { fill: '#aaa', stroke: '#888', strokeWidth: 0.2 },
}

function coordsToPath(coords: number[][]): string {
  return coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c[0]},${c[1]}`).join(' ') + ' Z'
}

function renderGeometry(geom: WatabouCityFeatureGeometry, style: typeof COLORS.building, key: string) {
  const { fill, stroke, strokeWidth, opacity } = style

  switch (geom.type) {
    case 'Polygon': {
      const rings = geom.coordinates as number[][][]
      const d = rings.map(coordsToPath).join(' ')
      return <path key={key} d={d} fill={fill} stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} fillRule="evenodd" />
    }
    case 'MultiPolygon': {
      const polys = geom.coordinates as number[][][][]
      return (
        <g key={key}>
          {polys.map((poly, i) => {
            const d = poly.map(coordsToPath).join(' ')
            return <path key={`${key}-${i}`} d={d} fill={fill} stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} fillRule="evenodd" />
          })}
        </g>
      )
    }
    case 'LineString': {
      const coords = geom.coordinates as number[][]
      const d = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c[0]},${c[1]}`).join(' ')
      return <path key={key} d={d} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    }
    case 'MultiLineString': {
      const lines = geom.coordinates as number[][][]
      return (
        <g key={key}>
          {lines.map((line, i) => {
            const d = line.map((c, j) => `${j === 0 ? 'M' : 'L'}${c[0]},${c[1]}`).join(' ')
            return <path key={`${key}-${i}`} d={d} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
          })}
        </g>
      )
    }
    case 'Point': {
      const [x, y] = geom.coordinates as number[]
      return <circle key={key} cx={x} cy={y} r={strokeWidth * 2} fill={fill === 'none' ? stroke : fill} opacity={opacity} />
    }
    case 'MultiPoint': {
      const pts = geom.coordinates as number[][]
      const r = Math.max(strokeWidth, 1)
      return (
        <g key={key}>
          {pts.map(([x, y], i) => (
            <circle key={`${key}-${i}`} cx={x} cy={y} r={r} fill={fill === 'none' ? stroke : fill} opacity={opacity} />
          ))}
        </g>
      )
    }
    default:
      return null
  }
}

function computeBounds(features: WatabouCityFeature[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

  function scanCoords(coords: unknown) {
    if (!Array.isArray(coords)) return
    if (coords.length >= 2 && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      minX = Math.min(minX, coords[0])
      minY = Math.min(minY, coords[1])
      maxX = Math.max(maxX, coords[0])
      maxY = Math.max(maxY, coords[1])
    } else {
      for (const c of coords) scanCoords(c)
    }
  }

  for (const f of features) {
    if (f.geometry?.coordinates) scanCoords(f.geometry.coordinates)
  }

  if (!isFinite(minX)) return { minX: 0, minY: 0, maxX: 100, maxY: 100 }
  const padX = (maxX - minX) * 0.05
  const padY = (maxY - minY) * 0.05
  return { minX: minX - padX, minY: minY - padY, maxX: maxX + padX, maxY: maxY + padY }
}

export function WatabouCityRenderer({ data, className }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [viewBox, setViewBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null)

  const bounds = computeBounds(data.features)
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

  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const prevent = (e: Event) => e.preventDefault()
    el.addEventListener('wheel', prevent, { passive: false })
    return () => el.removeEventListener('wheel', prevent)
  }, [])

  // Sort features by render order (bottom → top).
  const renderOrder = ['earth', 'water', 'farm', 'plaza', 'tree', 'road', 'river', 'wall', 'building', 'tower', 'unknown'] as const
  const classified = data.features
    .filter(f => f.geometry)
    .map(f => ({ feature: f, kind: classifyFeature(f) }))
    .sort((a, b) => renderOrder.indexOf(a.kind) - renderOrder.indexOf(b.kind))

  return (
    <div className={`relative ${className ?? ''}`}>
      <svg
        ref={svgRef}
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        className="w-full h-full bg-amber-50 dark:bg-stone-800 rounded-lg touch-none"
        style={{ minHeight: 300 }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {classified.map(({ feature, kind }, i) => {
          const style = COLORS[kind] ?? COLORS.unknown
          return renderGeometry(feature.geometry, style, `f-${i}`)
        })}
      </svg>

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
