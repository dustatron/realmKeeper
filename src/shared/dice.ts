import type { Disposition } from '@shared/constants'

export interface DiceResult {
  total: number
  rolls: number[]
  kept: number[]
  notation: string
}

const NOTATION_RE = /^(\d*)d(\d+)(?:k([hl])(\d+))?$/i

function secureRandom(max: number): number {
  const arr = new Uint32Array(1)
  crypto.getRandomValues(arr)
  return (arr[0] % max) + 1
}

export function rollDice(notation: string): DiceResult {
  const match = notation.match(NOTATION_RE)
  if (!match) throw new Error(`Invalid dice notation: ${notation}`)

  const count = parseInt(match[1] || '1', 10)
  const sides = parseInt(match[2], 10)
  const keepDir = match[3]?.toLowerCase() as 'h' | 'l' | undefined
  const keepCount = match[4] ? parseInt(match[4], 10) : undefined

  const rolls: number[] = []
  for (let i = 0; i < count; i++) {
    rolls.push(secureRandom(sides))
  }

  let kept: number[]
  if (keepDir && keepCount !== undefined) {
    const sorted = [...rolls].sort((a, b) =>
      keepDir === 'h' ? b - a : a - b,
    )
    kept = sorted.slice(0, keepCount)
  } else {
    kept = [...rolls]
  }

  return {
    total: kept.reduce((sum, v) => sum + v, 0),
    rolls,
    kept,
    notation,
  }
}

export interface ReactionRange { min: number; max: number; disposition: Disposition }

export const REACTION_RANGES: ReactionRange[] = [
  { min: 2, max: 2, disposition: 'hostile' },
  { min: 3, max: 5, disposition: 'wary' },
  { min: 6, max: 8, disposition: 'curious' },
  { min: 9, max: 11, disposition: 'kind' },
  { min: 12, max: 12, disposition: 'helpful' },
]

export function dispositionForRoll(total: number): Disposition {
  return REACTION_RANGES.find((r) => total >= r.min && total <= r.max)?.disposition ?? 'curious'
}

/** Roll 2d6 on the NPC reaction table and return a Disposition. */
export function rollDisposition(): Disposition {
  return dispositionForRoll(rollDice('2d6').total)
}

/** Roll 2d6 reaction, returning the raw total and the mapped Disposition. */
export function rollReaction(): { roll: number; disposition: Disposition } {
  const roll = rollDice('2d6').total
  return { roll, disposition: dispositionForRoll(roll) }
}
