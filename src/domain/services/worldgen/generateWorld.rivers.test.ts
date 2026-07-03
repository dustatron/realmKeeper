import { describe, it, expect } from 'vitest'
import { generateWorld } from '~/domain/services/worldgen/generateWorld'
import type { HexCell } from '@domain/entities/GameMap'

// Regression guard for the "large map, only two rivers one hex long" bug. Its
// root cause was river SOURCES landing on the map edge (they terminate before a
// single step → 1-hex stubs that render as nothing) and, secondarily, sources
// chosen by mountain-biome on an elevation field decoupled from biome. The fix:
// biome-biased elevation, elevation-highland sources, edge-source exclusion, and
// pit overflow. These assertions would all fail under the old behaviour.

/** Longest connected downstream chain (in cells) over the river network. */
function longestRiverRun(cells: HexCell[]): number {
  const byCoord = new Map(cells.map((c) => [`${c.q},${c.r}`, c]))
  const river = cells.filter((c) => c.river === true)
  let longest = 0
  for (const head of river) {
    let len = 1
    let cur = head.riverTo
    const seen = new Set([`${head.q},${head.r}`])
    while (cur && !seen.has(`${cur.q},${cur.r}`)) {
      seen.add(`${cur.q},${cur.r}`)
      len++
      cur = byCoord.get(`${cur.q},${cur.r}`)?.riverTo ?? null
    }
    if (len > longest) longest = len
  }
  return longest
}

function riverStats(cols: number, rows: number, seed: string) {
  const { gameMap } = generateWorld('rivers-regression', seed, { cols, rows })
  const cells = gameMap.hexCells ?? []
  const withFlow = cells.filter((c) => c.river === true && c.riverTo != null).length
  return { withFlow, longest: longestRiverRun(cells) }
}

describe('generateWorld river network', () => {
  it('large maps never collapse to a handful of 1-hex stubs', () => {
    // Every seed at a large size must produce a substantial, connected network.
    for (let i = 0; i < 12; i++) {
      const { withFlow, longest } = riverStats(40, 30, `rk-large-${i}`)
      expect(withFlow, `seed rk-large-${i} withFlow`).toBeGreaterThanOrEqual(20)
      expect(longest, `seed rk-large-${i} longest run`).toBeGreaterThanOrEqual(5)
    }
  })

  it('medium maps produce real multi-hex rivers on every seed', () => {
    for (let i = 0; i < 12; i++) {
      const { withFlow, longest } = riverStats(20, 16, `rk-med-${i}`)
      // The old edge-source bug produced all-length-1 chains here (longest === 1).
      expect(longest, `seed rk-med-${i} longest run`).toBeGreaterThanOrEqual(3)
      expect(withFlow, `seed rk-med-${i} withFlow`).toBeGreaterThanOrEqual(5)
    }
  })

  it('even small maps avoid the all-stubs degenerate case', () => {
    for (let i = 0; i < 12; i++) {
      const { longest } = riverStats(12, 12, `rk-small-${i}`)
      expect(longest, `seed rk-small-${i} longest run`).toBeGreaterThanOrEqual(2)
    }
  })
})
