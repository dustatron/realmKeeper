/**
 * Lay `n` points out in a centered grid within a `width × height` pixel canvas,
 * leaving a margin around the edges. Used to auto-place a settlement's unplaced
 * child buildings so a town generates with all of them in one click; the GM can
 * then drag any marker to rearrange.
 */
export function gridPositions(
  n: number,
  width: number,
  height: number,
): { x: number; y: number }[] {
  if (n <= 0) return []
  const cols = Math.ceil(Math.sqrt(n))
  const rows = Math.ceil(n / cols)
  const mx = width * 0.15
  const my = height * 0.15
  const cw = (width - 2 * mx) / cols
  const ch = (height - 2 * my) / rows
  const out: { x: number; y: number }[] = []
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / cols)
    const c = i % cols
    out.push({ x: mx + cw * (c + 0.5), y: my + ch * (r + 0.5) })
  }
  return out
}
