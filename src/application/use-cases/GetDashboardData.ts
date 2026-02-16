import type { IRealmRepository } from '@application/ports/IRealmRepository'
import type { IFactionRepository } from '@application/ports/IFactionRepository'
import type { INPCRepository } from '@application/ports/INPCRepository'
import type { IWorldEventRepository } from '@application/ports/IWorldEventRepository'
import type { IWeatherRepository } from '@application/ports/IWeatherRepository'
import type { Realm } from '@domain/entities/Realm'
import type { Faction } from '@domain/entities/Faction'
import type { WorldEvent } from '@domain/entities/WorldEvent'
import type { WeatherHistory } from '@domain/entities/WeatherHistory'

export interface DashboardData {
  realm: Realm
  factionCount: number
  activeFactions: Faction[]
  npcCount: number
  recentEvents: WorldEvent[]
  latestWeather: WeatherHistory | undefined
}

export interface GetDashboardDataDeps {
  realmRepo: IRealmRepository
  factionRepo: IFactionRepository
  npcRepo: INPCRepository
  worldEventRepo: IWorldEventRepository
  weatherRepo: IWeatherRepository
}

export async function executeGetDashboardData(
  worldId: string,
  deps: GetDashboardDataDeps
): Promise<DashboardData | null> {
  const realm = await deps.realmRepo.getById(worldId)
  if (!realm) return null

  const factions = await deps.factionRepo.getByRealmId(worldId)
  const activeFactions = factions.filter((f) => f.status === 'active' && !f.isParty)
  const npcs = await deps.npcRepo.getByRealmId(worldId)
  const recentEvents = await deps.worldEventRepo.getRecent(worldId, 10)
  const recentWeather = await deps.weatherRepo.getRecent(worldId, 1)

  return {
    realm,
    factionCount: factions.length,
    activeFactions,
    npcCount: npcs.length,
    recentEvents,
    latestWeather: recentWeather[0],
  }
}
