import { describe, it, expect } from 'vitest'
import { buildTinyHexMap } from './generateTinyWorld'
import { BIOMES } from '~/domain/data/worldgen/biomes'

describe('buildTinyHexMap', () => {
  it('builds a hex GameMap with cols*rows cells', () => {
    const map = buildTinyHexMap('realm-1', 'seed-a', { cols: 8, rows: 8, hexSize: 40 })
    expect(map.kind).toBe('hex')
    expect(map.ownerRealmId).toBe('realm-1')
    expect(map.hexCols).toBe(8)
    expect(map.hexRows).toBe(8)
    expect(map.hexCells).toHaveLength(64)
    expect(map.width).toBeGreaterThan(0)
    expect(map.height).toBeGreaterThan(0)
  })

  it('assigns every cell a known biome', () => {
    const map = buildTinyHexMap('realm-1', 'seed-a')
    for (const cell of map.hexCells!) {
      expect(BIOMES).toContain(cell.biome)
    }
  })

  it('is deterministic for a given seed', () => {
    const a = buildTinyHexMap('realm-1', 'seed-x')
    const b = buildTinyHexMap('realm-1', 'seed-x')
    expect(a.hexCells!.map((c) => c.biome)).toEqual(b.hexCells!.map((c) => c.biome))
  })

  it('produces different biome layouts for different seeds', () => {
    const a = buildTinyHexMap('realm-1', 'seed-1')
    const b = buildTinyHexMap('realm-1', 'seed-2')
    expect(a.hexCells!.map((c) => c.biome)).not.toEqual(b.hexCells!.map((c) => c.biome))
  })
})
