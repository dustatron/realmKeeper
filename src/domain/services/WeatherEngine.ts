import type { Season } from '@shared/constants'
import type { DiceResult } from '@shared/dice'

export type WeatherSeverity = 'normal' | 'extreme' | 'catastrophic'

export interface WeatherResult {
  condition: string
  severity: WeatherSeverity
  diceResult: DiceResult
}

// 6 conditions per season, index 0-5 maps to d6 roll 1-6
// Last entry (index 5) in each season is the "extreme" weather
const WEATHER_TABLES: Record<Season, string[]> = {
  spring: ['Gentle rain', 'Mild and breezy', 'Overcast', 'Clear skies', 'Warm and sunny', 'Thunderstorm'],
  summer: ['Clear and hot', 'Warm breeze', 'Humid and still', 'Afternoon storms', 'Scorching heat', 'Drought conditions'],
  fall: ['Cool and crisp', 'Light rain', 'Fog and mist', 'Overcast', 'Windy', 'Early frost'],
  winter: ['Clear and frigid', 'Light snow', 'Freezing rain', 'Bitter cold', 'Heavy snow', 'Blizzard'],
}

// Extreme conditions are a roll of 6 only (~17%)
const EXTREME_THRESHOLD = 6

// Catastrophic upgrades for each season (when extreme happens twice)
const CATASTROPHIC_CONDITIONS: Record<Season, string> = {
  spring: 'Tornado',
  summer: 'Wildfire',
  fall: 'Hurricane winds',
  winter: 'Ice storm',
}

export function rollWeather(
  season: Season,
  previousSeverity: WeatherSeverity | null,
  rollDice: (notation: string) => DiceResult
): WeatherResult {
  const diceResult = rollDice('1d6')
  const roll = diceResult.total
  const table = WEATHER_TABLES[season]
  const condition = table[roll - 1]
  const isExtreme = roll >= EXTREME_THRESHOLD

  // Check for catastrophic: extreme twice in a row
  if (isExtreme && previousSeverity === 'extreme') {
    return {
      condition: CATASTROPHIC_CONDITIONS[season],
      severity: 'catastrophic',
      diceResult,
    }
  }

  return {
    condition,
    severity: isExtreme ? 'extreme' : 'normal',
    diceResult,
  }
}

// Get all conditions for a season (useful for UI display)
export function getSeasonConditions(season: Season): string[] {
  return WEATHER_TABLES[season]
}
