import type { IRealmRepository } from '@application/ports/IRealmRepository'
import type { IFactionRepository } from '@application/ports/IFactionRepository'
import type { IRealmNoteRepository } from '@application/ports/IRealmNoteRepository'
import type { Realm } from '@domain/entities/Realm'
import { newId } from '@shared/ulid'
import { DEFAULT_DAYS_PER_SEASON } from '@shared/constants'

export interface CreateRealmInput {
  name: string
  systemId: string
  description?: string
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
    currentWatch: 'morning',
    daysPerSeason: DEFAULT_DAYS_PER_SEASON,
    factionTurnTrigger: 'day',
    createdAt: now,
    updatedAt: now,
  }

  await deps.realmRepo.create(realm)

  // Auto-create party faction
  await deps.factionRepo.create({
    id: newId(),
    realmId: realm.id,
    name: 'The Party',
    description: 'Player characters',
    type: 'party',
    status: 'active',
    isParty: true,
    agentNpcIds: [],
    agendaGoals: [],
    advantages: [],
    traits: [],
    createdAt: now,
    updatedAt: now,
  })

  // Auto-create main note
  await deps.realmNoteRepo.create({
    id: newId(),
    realmId: realm.id,
    title: 'Realm Notes',
    content: `# ${realm.name}\n\nMain notes for your realm.`,
    isMain: true,
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
  })

  return realm
}
