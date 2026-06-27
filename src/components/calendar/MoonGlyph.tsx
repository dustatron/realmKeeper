interface MoonGlyphProps {
  /** Position through the lunar cycle, 0 (new) → 1. 0.5 = full. */
  fraction: number
  size?: number
  className?: string
  title?: string
}

/**
 * A small SVG moon that renders the correct lit shape for any phase: a dark
 * disk with the illuminated region drawn as a semicircle + terminator ellipse.
 * Purely presentational — pass the phase `fraction` from `moonPhase()`.
 */
export function MoonGlyph({ fraction, size = 14, className, title }: MoonGlyphProps) {
  const r = size / 2
  const f = ((fraction % 1) + 1) % 1
  // Lit limb is on the right while waxing (f<0.5), left while waning. The
  // terminator is an ellipse whose signed x-scale k goes 1 (new) → 0 (quarter)
  // → -1 (full). Sample both edges as a polygon to avoid SVG arc-flag pitfalls.
  const sLimb = f < 0.5 ? 1 : -1
  const k = Math.cos(2 * Math.PI * f)
  const N = 24
  const pts: string[] = []
  for (let i = 0; i <= N; i++) {
    const t = (Math.PI * i) / N
    const y = r - r * Math.cos(t)
    const x = r + sLimb * r * Math.sin(t) // lit limb (circle edge)
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`)
  }
  for (let i = N; i >= 0; i--) {
    const t = (Math.PI * i) / N
    const y = r - r * Math.cos(t)
    const x = r + sLimb * k * r * Math.sin(t) // terminator (ellipse)
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`)
  }
  const litPath = `M ${pts.join(' L ')} Z`

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      <circle cx={r} cy={r} r={r - 0.5} className="fill-muted stroke-border" strokeWidth={0.75} />
      <path d={litPath} className="fill-foreground" />
    </svg>
  )
}
