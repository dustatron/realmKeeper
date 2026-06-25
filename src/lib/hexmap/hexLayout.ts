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

interface LaidOutCell {
  q: number
  r: number
  cx: number
  cy: number
  corners: Point[]
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
