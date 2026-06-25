import { describe, it, expect } from 'vitest'
import { layoutHexGrid, BIOME_COLORS } from './hexLayout'
import { BIOMES } from '~/domain/data/worldgen/biomes'

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
