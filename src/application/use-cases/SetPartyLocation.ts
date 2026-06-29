import type { IFactionRepository } from '@application/ports/IFactionRepository'
import type { IWorldEventRepository } from '@application/ports/IWorldEventRepository'
import type { Faction } from '@domain/entities/Faction'
import type { WorldDateTime } from '@domain/value-objects/WorldDate'
import { newId } from '@shared/ulid'

export interface SetPartyLocationInput {
  /** The party faction whose location is being set. */
  partyFaction: Faction
  /** POI node the party is now at, or null to clear. */
  poiId: string | null
  /** Name of the destination POI, used for the timeline event. */
  poiName?: string
  /** Current world date/time, stamped on the travel event. */
  now: WorldDateTime
}

/**
 * Sets the party faction's current location and logs a travel WorldEvent.
 * No-op if the location is unchanged.
 */
export async function executeSetPartyLocation(
  input: SetPartyLocationInput,
  deps: { factionRepo: IFactionRepository; worldEventRepo: IWorldEventRepository }
): Promise<void> {
  const { partyFaction, poiId } = input
  if ((partyFaction.currentPoiId ?? null) === poiId) return

  await deps.factionRepo.update({
    ...partyFaction,
    currentPoiId: poiId,
    updatedAt: Date.now(),
  })

  if (poiId) {
    await deps.worldEventRepo.create({
      id: newId(),
      worldId: partyFaction.worldId,
      year: input.now.year,
      season: input.now.season,
      day: input.now.day,
      watch: input.now.watch,
      type: 'travel',
      title: `Party traveled to ${input.poiName ?? 'a new location'}`,
      description: '',
      relatedEntityIds: [poiId, partyFaction.id],
      createdAt: Date.now(),
    })
  }
}
