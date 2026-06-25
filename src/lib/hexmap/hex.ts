export interface Axial {
  q: number
  r: number
}

export interface Point {
  x: number
  y: number
}

// Pointy-top axial → pixel center.
export function axialToPixel(h: Axial, size: number): Point {
  const x = size * Math.sqrt(3) * (h.q + h.r / 2)
  const y = size * (3 / 2) * h.r
  return { x, y }
}

// Pixel → nearest axial hex (inverse of axialToPixel, with cube rounding).
export function pixelToAxial(p: Point, size: number): Axial {
  const q = ((Math.sqrt(3) / 3) * p.x - (1 / 3) * p.y) / size
  const r = ((2 / 3) * p.y) / size
  return cubeRound(q, r)
}

function cubeRound(qf: number, rf: number): Axial {
  const sf = -qf - rf
  let q = Math.round(qf)
  let r = Math.round(rf)
  const s = Math.round(sf)
  const dq = Math.abs(q - qf)
  const dr = Math.abs(r - rf)
  const ds = Math.abs(s - sf)
  if (dq > dr && dq > ds) q = -r - s
  else if (dr > ds) r = -q - s
  return { q, r }
}

const AXIAL_DIRECTIONS: Axial[] = [
  { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
  { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 },
]

export function hexNeighbors(h: Axial): Axial[] {
  return AXIAL_DIRECTIONS.map((d) => ({ q: h.q + d.q, r: h.r + d.r }))
}

export function hexDistance(a: Axial, b: Axial): number {
  const dq = a.q - b.q
  const dr = a.r - b.r
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2
}

// Pointy-top corners, starting at the top-right and going clockwise.
export function hexCorners(center: Point, size: number): Point[] {
  const corners: Point[] = []
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30)
    corners.push({
      x: center.x + size * Math.cos(angle),
      y: center.y + size * Math.sin(angle),
    })
  }
  return corners
}
