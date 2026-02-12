import type { SystemConfig, StatFieldDef } from '@domain/entities/SystemConfig'
import type { SystemBlock, StatValue } from '@domain/value-objects/SystemBlock'
import type { DiceResult } from '@shared/dice'

// Returns stat labels for display
export function getStatLabels(config: SystemConfig): string[] {
  return config.statFields.map((f) => f.label)
}

// Builds an empty SystemBlock with default values from a SystemConfig
export function buildDefaultSystemBlock(config: SystemConfig): SystemBlock {
  return {
    stats: config.statFields.map((f) => ({
      key: f.key,
      value: 0,
      modifier: f.hasModifier ? 0 : undefined,
      max: undefined,
    })),
    hp: 0,
    maxHp: 0,
    armor: 0,
    level: config.hasLevel ? 1 : undefined,
    className: config.hasClass ? '' : undefined,
    attacks: [],
    inventory: [],
    abilities: [],
    notes: '',
  }
}

// Rolls stats for a new NPC using the system's roll formulas
// rollDice is injected to keep domain pure
export function rollStats(
  config: SystemConfig,
  rollDice: (notation: string) => DiceResult
): StatValue[] {
  return config.statFields.map((f) => {
    const result = rollDice(f.rollFormula)
    const value = result.total
    return {
      key: f.key,
      value,
      modifier: f.hasModifier ? deriveModifier(value) : undefined,
    }
  })
}

// Shadowdark-style modifier: (stat - 10) / 2, rounded down
export function deriveModifier(statValue: number): number {
  return Math.floor((statValue - 10) / 2)
}

// Roll HP for a new NPC
export function rollHp(
  config: SystemConfig,
  rollDice: (notation: string) => DiceResult,
  conModifier?: number
): number {
  if (config.hpFormula === 'class_die+con_mod') {
    // Shadowdark: class die + CON modifier, minimum 1
    // Default to d4 if no class specified yet
    const roll = rollDice('1d4')
    return Math.max(1, roll.total + (conModifier ?? 0))
  }
  // Cairn: simple formula like '1d6'
  const roll = rollDice(config.hpFormula)
  return Math.max(1, roll.total)
}
