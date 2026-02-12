import type { Season, Watch } from '@shared/constants'
import type { WeatherSeverity } from '@domain/services/WeatherEngine'

export interface WeatherRolledEvent {
  type: 'weather_rolled'
  payload: {
    realmId: string
    condition: string
    severity: WeatherSeverity
    season: Season
    year: number
    day: number
    watch: Watch
    rolls: number[]
    total: number
  }
  timestamp: number
}

export function createWeatherRolledEvent(
  realmId: string,
  condition: string,
  severity: WeatherSeverity,
  season: Season,
  year: number,
  day: number,
  watch: Watch,
  rolls: number[],
  total: number
): WeatherRolledEvent {
  return {
    type: 'weather_rolled',
    payload: { realmId, condition, severity, season, year, day, watch, rolls, total },
    timestamp: Date.now(),
  }
}
