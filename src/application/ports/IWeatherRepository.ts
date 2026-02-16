import type { WeatherHistory } from '@domain/entities/WeatherHistory'
import type { Season } from '@shared/constants'

export interface IWeatherRepository {
  getById(id: string): Promise<WeatherHistory | undefined>
  getByDate(worldId: string, year: number, season: Season, day: number): Promise<WeatherHistory[]>
  getRecent(worldId: string, limit: number): Promise<WeatherHistory[]>
  create(weather: WeatherHistory): Promise<void>
  delete(id: string): Promise<void>
}
