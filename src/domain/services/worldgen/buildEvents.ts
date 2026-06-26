import type { SeededRandom } from '~/lib/dungeon/SeededRandom'
import type { POI } from '@domain/entities/POI'
import type { POIEvent } from '@domain/entities/POIEvent'
import { SEASONS, type Season } from '@shared/constants'
import { settlementSize } from '@domain/data/worldgen/settlementSize'
import { buildCivicFlavor, type CivicType } from '@domain/data/worldgen/eventFlavor'
import { newId } from '@shared/ulid'

const TYPES_BY_SIZE: Record<'small' | 'medium' | 'large', CivicType[]> = {
  small: ['market'],
  medium: ['market', 'festival'],
  large: ['market', 'festival', 'ceremony'],
}

export function buildEvents(
  settlements: POI[],
  worldId: string,
  daysPerSeason: number,
  watchesPerDay: number,
  rng: SeededRandom,
): POIEvent[] {
  if (settlements.length === 0) return []
  const now = Date.now()
  const events: POIEvent[] = []

  const make = (poi: POI, type: CivicType, season: Season): POIEvent => {
    const flavor = buildCivicFlavor(type, season, poi.name, rng)
    return {
      id: newId(),
      poiId: poi.id,
      worldId,
      name: flavor.name,
      description: flavor.description,
      type,
      trigger: { year: null, season, day: rng.between(1, daysPerSeason), watch: null },
      recurring: true,
      durationWatches: watchesPerDay,
      isActive: false,
      effects: '',
      tags: ['civic'],
      createdAt: now,
      updatedAt: now,
    }
  }

  // Step 1: per-settlement civic events, scaled by size.
  for (const poi of settlements) {
    for (const type of TYPES_BY_SIZE[settlementSize(poi.subtypeLabel)]) {
      events.push(make(poi, type, rng.pick(SEASONS as readonly Season[])))
    }
  }

  // Step 2: seasonal coverage — ensure each season has `target` distinct settlements.
  const n = settlements.length
  const target = Math.min(n, Math.max(2, Math.min(4, Math.round(n / 4))))
  for (const season of SEASONS) {
    const celebrating = new Set(events.filter((e) => e.trigger.season === season).map((e) => e.poiId))
    const candidates = settlements.filter((p) => !celebrating.has(p.id))
    let i = 0
    while (celebrating.size < target && i < candidates.length) {
      const poi = candidates[i++]
      events.push(make(poi, 'festival', season))
      celebrating.add(poi.id)
    }
  }

  return events
}
