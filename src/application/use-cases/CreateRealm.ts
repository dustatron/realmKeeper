import type { IRealmRepository } from '@application/ports/IRealmRepository'
import type { IFactionRepository } from '@application/ports/IFactionRepository'
import type { IRealmNoteRepository } from '@application/ports/IRealmNoteRepository'
import type { Realm } from '@domain/entities/Realm'
import { newId } from '@shared/ulid'
import { DEFAULT_DAYS_PER_SEASON, DEFAULT_WATCHES_PER_DAY } from '@shared/constants'

export interface CreateRealmInput {
  name: string
  systemId: string
  description?: string
  watchesPerDay?: number
  daysPerSeason?: number
  daysPerWeek?: number
  factionTurnTrigger?: 'day' | 'week' | 'manual'
}

export interface CreateRealmDeps {
  realmRepo: IRealmRepository
  factionRepo: IFactionRepository
  realmNoteRepo: IRealmNoteRepository
}

export async function executeCreateRealm(
  input: CreateRealmInput,
  deps: CreateRealmDeps
): Promise<Realm> {
  const now = Date.now()
  const realm: Realm = {
    id: newId(),
    name: input.name,
    systemId: input.systemId,
    description: input.description ?? '',
    currentYear: 1,
    currentSeason: 'spring',
    currentDay: 1,
    currentWatch: 1,
    daysPerSeason: input.daysPerSeason ?? DEFAULT_DAYS_PER_SEASON,
    daysPerWeek: input.daysPerWeek ?? 7,
    watchesPerDay: input.watchesPerDay ?? DEFAULT_WATCHES_PER_DAY,
    factionTurnTrigger: input.factionTurnTrigger ?? 'day',
    completedThroughDay: -1,
    customRaces: [],
    raceColors: {},
    createdAt: now,
    updatedAt: now,
  }

  await deps.realmRepo.create(realm)

  // Auto-create party faction
  await deps.factionRepo.create({
    id: newId(),
    worldId: realm.id,
    name: 'The Party',
    description: 'Player characters',
    type: 'party',
    status: 'active',
    isParty: true,
    regionId: null,
    headquartersPoiId: null,
    leaderNpcId: null,
    agentNpcIds: [],
    agendaGoals: [],
    advantages: [],
    obstacles: [],
    traits: [],
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
  })

  // Auto-create main note
  await deps.realmNoteRepo.create({
    id: newId(),
    worldId: realm.id,
    title: 'Realm Notes',
    content: `# ${realm.name}\n\nMain notes for your realm.`,
    isMain: true,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
  })

  return realm
}
