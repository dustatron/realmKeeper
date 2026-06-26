import { axialToPixel, hexCorners, type Point } from './hex'
import type { Biome } from '~/domain/data/worldgen/biomes'

export const BIOME_COLORS: Record<Biome, string> = {
  forest: '#2f6b3a',
  mountains: '#6b6b6b',
  grasslands: '#8db94e',
  desert: '#d9c27a',
  marsh: '#4f6b52',
  frozen: '#cfe3ef',
  blighted: '#3a2b35',
  hills: '#9c8a4e',
  jungle: '#1f6b46',
  lake: '#3b6ea5',
}

// Distinct colors for region outlines/labels — kept visually separate from the
// biome terrain colors so a region's boundary reads even when two adjacent
// regions share a biome. Assigned per-region by index (cycling).
export const REGION_PALETTE: string[] = [
  '#e6194b',
  '#4363d8',
  '#f58231',
  '#911eb4',
  '#3cb44b',
  '#e6b800',
  '#46c2c2',
  '#f032e6',
  '#9a6324',
  '#008080',
  '#bcf60c',
  '#fa8072',
]

interface LaidOutCell {
  q: number
  r: number
  cx: number
  cy: number
  corners: Point[]
}

function vkey(p: Point): string {
  return `${Math.round(p.x * 100) / 100},${Math.round(p.y * 100) / 100}`
}

/**
 * Outline polygon (single ring of pixel points) of a cluster of hexes.
 *
 * An edge shared by two cells of the cluster is interior; an edge belonging to
 * only one cell is on the boundary. We tally edges, keep the count-1 ones, and
 * chain them tip-to-tail into a ring. For contiguous, hole-free clusters (the
 * Voronoi regions the generator produces) this yields one closed outline.
 */
export function hexClusterOutline(cells: { corners: Point[] }[]): Point[] {
  const edges = new Map<string, { a: Point; b: Point; n: number }>()
  for (const cell of cells) {
    const cs = cell.corners
    for (let i = 0; i < cs.length; i++) {
      const a = cs[i]
      const b = cs[(i + 1) % cs.length]
      const ka = vkey(a)
      const kb = vkey(b)
      const key = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`
      const e = edges.get(key)
      if (e) e.n++
      else edges.set(key, { a, b, n: 1 })
    }
  }

  const boundary = [...edges.values()].filter((e) => e.n === 1)
  if (boundary.length === 0) return []

  const adj = new Map<string, { key: string; pt: Point }[]>()
  const ptByKey = new Map<string, Point>()
  for (const e of boundary) {
    const ka = vkey(e.a)
    const kb = vkey(e.b)
    ptByKey.set(ka, e.a)
    ptByKey.set(kb, e.b)
    if (!adj.has(ka)) adj.set(ka, [])
    if (!adj.has(kb)) adj.set(kb, [])
    adj.get(ka)!.push({ key: kb, pt: e.b })
    adj.get(kb)!.push({ key: ka, pt: e.a })
  }

  const edgeId = (k1: string, k2: string) => (k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`)
  const used = new Set<string>()
  const startKey = vkey(boundary[0].a)
  const ring: Point[] = [ptByKey.get(startKey)!]
  let cur = startKey
  while (true) {
    const neighbors = adj.get(cur) ?? []
    let next: { key: string; pt: Point } | null = null
    for (const nb of neighbors) {
      if (!used.has(edgeId(cur, nb.key))) {
        next = nb
        break
      }
    }
    if (!next) break
    used.add(edgeId(cur, next.key))
    if (next.key === startKey) break // ring closed
    ring.push(next.pt)
    cur = next.key
  }
  return ring
}

// Offset (col,row) → axial (pointy-top, odd-r style), with all geometry
// translated so the minimum corner is (0,0).
export function layoutHexGrid(
  cols: number,
  rows: number,
  hexSize: number
): { cells: LaidOutCell[]; width: number; height: number } {
  const raw: LaidOutCell[] = []
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const q = col - (row - (row & 1)) / 2
      const r = row
      const center = axialToPixel({ q, r }, hexSize)
      const corners = hexCorners(center, hexSize)
      raw.push({ q, r, cx: center.x, cy: center.y, corners })
    }
  }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const cell of raw) {
    for (const c of cell.corners) {
      if (c.x < minX) minX = c.x
      if (c.y < minY) minY = c.y
      if (c.x > maxX) maxX = c.x
      if (c.y > maxY) maxY = c.y
    }
  }

  const cells = raw.map((cell) => ({
    q: cell.q,
    r: cell.r,
    cx: cell.cx - minX,
    cy: cell.cy - minY,
    corners: cell.corners.map((c) => ({ x: c.x - minX, y: c.y - minY })),
  }))

  return { cells, width: maxX - minX, height: maxY - minY }
}
