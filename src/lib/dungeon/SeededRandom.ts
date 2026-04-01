/**
 * Deterministic random number generator using mulberry32 algorithm.
 * Same seed always produces same sequence of random values.
 */
export class SeededRandom {
  private state: number

  constructor(seed: string | number) {
    this.state = typeof seed === 'string' ? this.hashString(seed) : seed
    if (this.state === 0) this.state = 1
  }

  private hashString(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash
    }
    return Math.abs(hash) || 1
  }

  next(): number {
    let t = (this.state += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  between(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min
  }

  float(min: number, max: number): number {
    return this.next() * (max - min) + min
  }

  pick<T>(array: readonly T[]): T {
    if (array.length === 0) throw new Error('Cannot pick from empty array')
    return array[Math.floor(this.next() * array.length)]
  }

  pickWeighted<T>(table: WeightedTable<T>): T {
    const totalWeight = table.entries.reduce((sum, e) => sum + e.weight, 0)
    let roll = this.next() * totalWeight
    for (const entry of table.entries) {
      roll -= entry.weight
      if (roll <= 0) return entry.value
    }
    return table.entries[table.entries.length - 1].value
  }

  sample<T>(array: readonly T[], n: number): T[] {
    if (n >= array.length) return this.shuffle([...array])
    const result: T[] = []
    const copy = [...array]
    for (let i = 0; i < n; i++) {
      const index = Math.floor(this.next() * copy.length)
      result.push(copy[index])
      copy.splice(index, 1)
    }
    return result
  }

  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1))
      ;[array[i], array[j]] = [array[j], array[i]]
    }
    return array
  }

  chance(probability: number): boolean {
    return this.next() < probability
  }

  roll(dice: string): number {
    const match = dice.match(/^(\d+)d(\d+)$/)
    if (!match) throw new Error(`Invalid dice format: ${dice}`)
    const count = parseInt(match[1], 10)
    const sides = parseInt(match[2], 10)
    let total = 0
    for (let i = 0; i < count; i++) {
      total += this.between(1, sides)
    }
    return total
  }

  child(suffix: string): SeededRandom {
    return new SeededRandom(`${this.state}-${suffix}`)
  }
}

export interface WeightedEntry<T> {
  weight: number
  value: T
}

export interface WeightedTable<T> {
  entries: WeightedEntry<T>[]
}

export function createWeightedTable<T extends string>(
  weights: Record<T, number>
): WeightedTable<T> {
  return {
    entries: Object.entries(weights).map(([value, weight]) => ({
      value: value as T,
      weight: weight as number,
    })),
  }
}
