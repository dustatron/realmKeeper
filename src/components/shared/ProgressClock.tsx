import { cn } from '~/lib/utils'

interface ProgressClockProps {
  segments: number
  progress: number
  size?: number
  className?: string
}

function wedgePath(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const x1 = cx + r * Math.cos(toRad(startAngle))
  const y1 = cy + r * Math.sin(toRad(startAngle))
  const x2 = cx + r * Math.cos(toRad(endAngle))
  const y2 = cy + r * Math.sin(toRad(endAngle))
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`
}

export function ProgressClock({ segments, progress, size = 24, className }: ProgressClockProps) {
  const clamped = Math.max(0, Math.min(segments, progress))
  const isFull = clamped >= segments
  const r = size / 2 - 1
  const cx = size / 2
  const cy = size / 2
  const anglePerSegment = 360 / segments

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
    >
      {/* Background circle */}
      <circle cx={cx} cy={cy} r={r} className="fill-muted/30 stroke-muted-foreground/30" strokeWidth={1} />

      {/* Wedges */}
      {Array.from({ length: segments }, (_, i) => {
        const startAngle = -90 + i * anglePerSegment
        const endAngle = startAngle + anglePerSegment
        const filled = i < clamped
        return (
          <path
            key={i}
            d={wedgePath(cx, cy, r, startAngle, endAngle)}
            className={cn(
              filled
                ? isFull ? 'fill-green-500' : 'fill-blue-500'
                : 'fill-transparent',
            )}
          />
        )
      })}

      {/* Segment divider lines */}
      {Array.from({ length: segments }, (_, i) => {
        const angle = -90 + i * anglePerSegment
        const rad = (angle * Math.PI) / 180
        const x = cx + r * Math.cos(rad)
        const y = cy + r * Math.sin(rad)
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            className="stroke-background"
            strokeWidth={1.5}
          />
        )
      })}

      {/* Outer ring */}
      <circle cx={cx} cy={cy} r={r} fill="none" className="stroke-muted-foreground/50" strokeWidth={1} />
    </svg>
  )
}
