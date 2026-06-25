import type { SeededRandom } from '~/lib/dungeon/SeededRandom'
import type { DiceResult } from '@shared/dice'

const NOTATION_RE = /^(\d*)d(\d+)(?:k([hl])(\d+))?$/i

// Builds a deterministic dice roller backed by a SeededRandom, matching the
// signature the SystemConfigService stat/HP rollers expect. This lets NPC
// generation reuse rollStats/rollHpForLevel while staying seed-deterministic
// (the production rollDice uses crypto randomness).
export function makeSeededDice(rng: SeededRandom): (notation: string) => DiceResult {
  return (notation: string): DiceResult => {
    const match = notation.match(NOTATION_RE)
    if (!match) throw new Error(`Invalid dice notation: ${notation}`)
    const count = parseInt(match[1] || '1', 10)
    const sides = parseInt(match[2], 10)
    const keepDir = match[3]?.toLowerCase() as 'h' | 'l' | undefined
    const keepCount = match[4] ? parseInt(match[4], 10) : undefined

    const rolls: number[] = []
    for (let i = 0; i < count; i++) rolls.push(rng.between(1, sides))

    let kept: number[]
    if (keepDir && keepCount !== undefined) {
      const sorted = [...rolls].sort((a, b) => (keepDir === 'h' ? b - a : a - b))
      kept = sorted.slice(0, keepCount)
    } else {
      kept = [...rolls]
    }
    return { total: kept.reduce((a, b) => a + b, 0), rolls, kept, notation }
  }
}
