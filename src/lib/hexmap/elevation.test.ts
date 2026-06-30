import { describe, it, expect } from 'vitest'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { buildElevationField, biomeFromElevation } from './elevation'
import type { Axial } from './hex'

// A rectangular block of axial cells (offset rows) — enough to exercise the noise.
function gridCells(cols: number, rows: number): Axial[] {
  const cells: Axial[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({ q: c - (r >> 1), r })
    }
  }
  return cells
}

describe('buildElevationField', () => {
  const cells = gridCells(10, 10)

  it('returns one entry per cell, all in [0,1]', () => {
    const field = buildElevationField(cells, new SeededRandom('seed-a'))
    expect(field.size).toBe(cells.length)
    for (const cell of cells) {
      const v = field.get(`${cell.q},${cell.r}`)
      expect(v).toBeDefined()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })

  it('is deterministic for the same seed', () => {
    const a = buildElevationField(cells, new SeededRandom('seed-x'))
    const b = buildElevationField(cells, new SeededRandom('seed-x'))
    expect([...a.entries()]).toEqual([...b.entries()])
  })

  it('differs across seeds', () => {
    const a = buildElevationField(cells, new SeededRandom('seed-1'))
    const b = buildElevationField(cells, new SeededRandom('seed-2'))
    expect([...a.entries()]).not.toEqual([...b.entries()])
  })

  it('spans the full [0,1] range (normalised)', () => {
    const field = buildElevationField(cells, new SeededRandom('range'))
    const vals = [...field.values()]
    expect(Math.min(...vals)).toBeCloseTo(0, 6)
    expect(Math.max(...vals)).toBeCloseTo(1, 6)
  })

  it('handles empty and single-cell inputs', () => {
    expect(buildElevationField([], new SeededRandom('e')).size).toBe(0)
    const single = buildElevationField([{ q: 0, r: 0 }], new SeededRandom('s'))
    expect(single.get('0,0')).toBe(0.5)
  })
})

describe('biomeFromElevation', () => {
  it('returns the region biome unchanged when provided (authoritative)', () => {
    expect(biomeFromElevation(0.95, 'desert')).toBe('desert')
    expect(biomeFromElevation(0.0, 'jungle')).toBe('jungle')
  })

  it('suggests by elevation band when no region biome', () => {
    expect(biomeFromElevation(0.9)).toBe('mountains')
    expect(biomeFromElevation(0.6)).toBe('hills')
    expect(biomeFromElevation(0.4)).toBe('grasslands')
    expect(biomeFromElevation(0.15)).toBe('marsh')
    expect(biomeFromElevation(0.02)).toBe('lake')
  })
})
