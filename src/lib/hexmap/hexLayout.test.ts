import { describe, it, expect } from 'vitest'
import { layoutHexGrid, BIOME_COLORS, REGION_PALETTE, hexClusterOutline } from './hexLayout'
import { BIOMES } from '~/domain/data/worldgen/biomes'

describe('hexClusterOutline', () => {
  it('a single hex outlines to its 6 corners', () => {
    const { cells } = layoutHexGrid(3, 3, 40)
    const ring = hexClusterOutline([cells[0]])
    expect(ring).toHaveLength(6)
  })

  it('two adjacent hexes share an edge (outline has fewer than 12 vertices)', () => {
    const { cells } = layoutHexGrid(3, 3, 40)
    // cells[0] and its right neighbor in the same row are adjacent
    const a = cells[0]
    const b = cells.find((c) => c.r === a.r && c.q === a.q + 1)!
    const ring = hexClusterOutline([a, b])
    expect(ring.length).toBeGreaterThanOrEqual(6)
    expect(ring.length).toBeLessThan(12) // shared edge removed
  })

  it('a full grid cluster outlines to a closed ring', () => {
    const { cells } = layoutHexGrid(4, 4, 40)
    const ring = hexClusterOutline(cells)
    expect(ring.length).toBeGreaterThanOrEqual(3)
  })
})

describe('REGION_PALETTE', () => {
  it('has several distinct hex colors', () => {
    expect(REGION_PALETTE.length).toBeGreaterThanOrEqual(8)
    for (const c of REGION_PALETTE) expect(c).toMatch(/^#[0-9a-fA-F]{6}$/)
    expect(new Set(REGION_PALETTE).size).toBe(REGION_PALETTE.length)
  })
})

describe('layoutHexGrid', () => {
  it('produces cols*rows cells', () => {
    const { cells } = layoutHexGrid(8, 8, 40)
    expect(cells).toHaveLength(64)
  })

  it('normalizes geometry into a positive bounding box', () => {
    const { cells, width, height } = layoutHexGrid(5, 5, 30)
    expect(width).toBeGreaterThan(0)
    expect(height).toBeGreaterThan(0)
    for (const cell of cells) {
      for (const c of cell.corners) {
        expect(c.x).toBeGreaterThanOrEqual(-0.001)
        expect(c.y).toBeGreaterThanOrEqual(-0.001)
        expect(c.x).toBeLessThanOrEqual(width + 0.001)
        expect(c.y).toBeLessThanOrEqual(height + 0.001)
      }
    }
  })

  it('gives every cell 6 corners and distinct axial coords', () => {
    const { cells } = layoutHexGrid(4, 3, 20)
    for (const cell of cells) expect(cell.corners).toHaveLength(6)
    const keys = new Set(cells.map((c) => `${c.q},${c.r}`))
    expect(keys.size).toBe(12)
  })
})

describe('BIOME_COLORS', () => {
  it('has a color for every biome', () => {
    for (const b of BIOMES) {
      expect(BIOME_COLORS[b]).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })
})
