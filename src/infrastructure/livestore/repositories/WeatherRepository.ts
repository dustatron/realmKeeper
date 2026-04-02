import type { Store } from '@livestore/livestore'
import type { schema } from '../schema'
import { weatherHistoryCreated, weatherHistoryDeleted } from '../events'
import type { WeatherHistory } from '@domain/entities/WeatherHistory'
import type { Season } from '@shared/constants'

export class WeatherRepository {
  constructor(private store: Store<typeof schema>) {}

  async getById(id: string): Promise<WeatherHistory | undefined> {
    const rows = this.store.query(
      { query: 'SELECT * FROM weatherHistory WHERE id = $id', bindValues: { $id: id } }
    ) as WeatherHistory[]
    return rows[0] ?? undefined
  }

  async getByDate(
    worldId: string,
    year: number,
    season: Season,
    day: number
  ): Promise<WeatherHistory[]> {
    return this.store.query(
      { query: 'SELECT * FROM weatherHistory WHERE worldId = $worldId AND year = $year AND season = $season AND day = $day', bindValues: { $worldId: worldId, $year: year, $season: season, $day: day } }
    ) as WeatherHistory[]
  }

  async getRecent(worldId: string, limit: number): Promise<WeatherHistory[]> {
    return this.store.query(
      { query: 'SELECT * FROM weatherHistory WHERE worldId = $worldId ORDER BY createdAt DESC LIMIT $limit', bindValues: { $worldId: worldId, $limit: limit } }
    ) as WeatherHistory[]
  }

  async create(weather: WeatherHistory): Promise<void> {
    this.store.commit(weatherHistoryCreated(weather as any))
  }

  async delete(id: string): Promise<void> {
    this.store.commit(weatherHistoryDeleted({ id }))
  }
}
