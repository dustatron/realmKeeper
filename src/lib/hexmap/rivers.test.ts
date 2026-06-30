import { describe, it, expect } from 'vitest'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import { buildElevationField } from './elevation'
import { traceRivers } from './rivers'
import { hexNeighbors, type Axial } from './hex'

function gridCells(cols: number, rows: number): Axial[] {
  const cells: Axial[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({ q: c - (r >> 1), r })
    }
  }
  return cells
}

const key = (c: Axial): string => `${c.q},${c.r}`

describe('traceRivers', () => {
  const cells = gridCells(14, 14)
  const field = buildElevationField(cells, new SeededRandom('world-1'))
  const cellSet = new Set(cells.map(key))
  const isEdge = (c: Axial): boolean =>
    hexNeighbors(c).some((n) => !cellSet.has(key(n)))

  it('is deterministic for the same seed', () => {
    const a = traceRivers(field, cells, new SeededRandom('r'))
    const b = traceRivers(field, cells, new SeededRandom('r'))
    expect(a.paths).toEqual(b.paths)
    expect([...a.riverCells].sort()).toEqual([...b.riverCells].sort())
    expect(a.chokepoints).toEqual(b.chokepoints)
  })

  it('every path is strictly non-increasing in elevation', () => {
    const { paths } = traceRivers(field, cells, new SeededRandom('flow'))
    expect(paths.length).toBeGreaterThan(0)
    for (const path of paths) {
      for (let i = 1; i < path.length; i++) {
        const prev = field.get(key(path[i - 1])) ?? Infinity
        const cur = field.get(key(path[i])) ?? Infinity
        // Last cell may be a water terminus (still <= prev). Non-increasing.
        expect(cur).toBeLessThanOrEqual(prev + 1e-9)
      }
    }
  })

  it('every path terminates at water, a map edge, or a local pit', () => {
    const water = new Set<string>()
    // Flood the lowest 8 cells as "coast".
    const byElev = [...field.entries()].sort((a, b) => a[1] - b[1])
    for (const [k] of byElev.slice(0, 8)) water.add(k)

    const { paths } = traceRivers(field, cells, new SeededRandom('term'), { waterCells: water })
    for (const path of paths) {
      const last = path[path.length - 1]
      const lk = key(last)
      const isWater = water.has(lk)
      const isPit = !hexNeighbors(last).some((n) => {
        const ne = field.get(key(n))
        const here = field.get(lk)
        return ne !== undefined && here !== undefined && ne < here && !water.has(key(n))
      })
      expect(isWater || isEdge(last) || isPit).toBe(true)
    }
  })

  it('produces no orphan river cells (every river cell lies on some path)', () => {
    const { riverCells, paths } = traceRivers(field, cells, new SeededRandom('orphan'))
    const onAPath = new Set<string>()
    for (const path of paths) for (const c of path) onAPath.add(key(c))
    expect([...riverCells].sort()).toEqual([...onAPath].sort())
  })

  it('chokepoints sit on river cells or elevation features', () => {
    const { riverCells, chokepoints } = traceRivers(field, cells, new SeededRandom('choke'))
    for (const cp of chokepoints) {
      const k = `${cp.q},${cp.r}`
      // fords/bridges/passes are all anchored to a real cell that the river uses.
      expect(riverCells.has(k)).toBe(true)
      expect(field.get(k)).toBeDefined()
    }
  })

  it('returns empty result for empty cells', () => {
    const res = traceRivers(new Map(), [], new SeededRandom('x'))
    expect(res.paths).toEqual([])
    expect(res.riverCells.size).toBe(0)
    expect(res.chokepoints).toEqual([])
  })
})
