import { db } from '@infrastructure/dexie/db'
import type { IWeatherRepository } from '@application/ports/IWeatherRepository'
import type { WeatherHistory } from '@domain/entities/WeatherHistory'
import type { Season } from '@shared/constants'

export class WeatherRepository implements IWeatherRepository {
  async getById(id: string): Promise<WeatherHistory | undefined> {
    return db.weatherHistory.get(id)
  }

  async getByDate(
    worldId: string,
    year: number,
    season: Season,
    day: number
  ): Promise<WeatherHistory[]> {
    return db.weatherHistory
      .where('[year+season+day]')
      .equals([year, season, day])
      .filter((w) => w.worldId === worldId)
      .toArray()
  }

  async getRecent(worldId: string, limit: number): Promise<WeatherHistory[]> {
    const all = await db.weatherHistory
      .where('worldId')
      .equals(worldId)
      .toArray()
    return all.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit)
  }

  async create(weather: WeatherHistory): Promise<void> {
    await db.weatherHistory.put(weather)
  }

  async delete(id: string): Promise<void> {
    await db.weatherHistory.delete(id)
  }
}
