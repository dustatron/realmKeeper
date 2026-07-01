import type { SeededRandom } from '~/lib/dungeon/SeededRandom'
import type { Faction } from '@domain/entities/Faction'
import type { POI } from '@domain/entities/POI'
import type { WorldEvent } from '@domain/entities/WorldEvent'
import type { POIEvent } from '@domain/entities/POIEvent'
import type { Hook } from '@domain/entities/Hook'
import type { Notice } from '@domain/entities/Notice'
import type { Rumor } from '@domain/entities/Rumor'
import type { Season } from '@shared/constants'
import type { Doom } from '@domain/entities/Doom'
import { newId } from '@shared/ulid'
import { resolveDoomTheme } from '@domain/services/doom/doomThemes'

export interface DoomClock {
  year: number
  season: Season
  day: number
  watch: number
  daysPerSeason: number
  watchesPerDay?: number
}

export interface DoomBundle {
  event: WorldEvent
  poiEvents: POIEvent[]
  rumors: Rumor[]
  notices: Notice[]
  hooks: Hook[]
}

const SEASONS: Season[] = ['spring', 'summer', 'fall', 'winter']

// Advance a world date by a number of days, wrapping seasons/years.
function addDays(clock: DoomClock, days: number): { year: number; season: Season; day: number; watch: number } {
  const perYear = 4 * clock.daysPerSeason
  const total =
    (clock.year - 1) * perYear +
    SEASONS.indexOf(clock.season) * clock.daysPerSeason +
    (clock.day - 1) +
    days
  const year = Math.floor(total / perYear) + 1
  const rem = total % perYear
  const season = SEASONS[Math.floor(rem / clock.daysPerSeason)]
  const day = (rem % clock.daysPerSeason) + 1
  return { year, season, day, watch: clock.watch }
}

const DOOM_CONSEQUENCES = [
  'the land itself will wither for a generation',
  'the dead will rise to walk among the living',
  'a long darkness will fall across the realm',
  'old powers will wake from their slumber',
  'blood will run in every river',
  'a madness will spread from town to town',
  'the sky will burn and the seasons break',
  'what they unleash cannot ever be put back',
]

const DOOM_RUMORS = [
  'Travelers whisper that the {faction} are gathering for something terrible.',
  'They say strange omens follow the agents of the {faction} wherever they go.',
  'A hedge-witch swears the {faction} will bring ruin before the year is out.',
  'Folk have seen the banners of the {faction} moving by night, toward no town anyone knows.',
  'The animals are restless, and the old folk blame the {faction}.',
]

// Stage 10: the looming doom. One faction's long-term agenda escalates into a
// dated, world-shaking WorldEvent, foreshadowed by rumors across the map and
// opposed by a quest to avert it (a Hook + a Notice). Pure and deterministic.
export function buildDoom(
  factions: Faction[],
  pois: POI[],
  clock: DoomClock,
  worldId: string,
  rng: SeededRandom,
  theme?: string,   // NEW — create-realm doom label; undefined/'' ⇒ random
): { doom: Doom; bundle: DoomBundle } {
  const now = Date.now()
  const withLeaders = factions.filter((f) => f.leaderNpcId)
  const doomFaction = (withLeaders.length > 0 ? rng.pick(withLeaders) : factions[0])

  const longTerm = doomFaction.agendaGoals.filter((g) => g.timeframe === 'long-term')
  const goal = (longTerm.length > 0 ? rng.pick(longTerm) : doomFaction.agendaGoals[0])?.description ?? 'seize power'
  const consequence = rng.pick(DOOM_CONSEQUENCES)

  // Future date, 45–120 days out.
  const date = addDays(clock, rng.between(45, 120))

  // Resolve theme — undefined/'' picks random across all packs
  const resolvedTheme = resolveDoomTheme(theme ?? '', undefined, rng)

  // Name: use themed name when provided; else keep the classic faction name
  const doomName = (theme && theme !== 'random' && theme !== '')
    ? resolvedTheme.name
    : `The Reckoning of the ${doomFaction.name}`

  const event: WorldEvent = {
    id: newId(),
    worldId,
    year: date.year,
    season: date.season,
    day: date.day,
    watch: date.watch,
    type: 'doom',
    title: doomName,
    description:
      `Unless they are stopped, the ${doomFaction.name} will ${goal.toLowerCase()} — and ${consequence}. ` +
      `The omens all point to this day.`,
    relatedEntityIds: [doomFaction.id, doomFaction.leaderNpcId].filter((x): x is string => !!x),
    createdAt: now,
  }

  // The doom also lands on the calendar as a scheduled POI event at the doom
  // faction's seat of power, so it shows under Scheduled Events as "upcoming".
  const doomPoiId = doomFaction.headquartersPoiId ?? pois[0]?.id ?? ''
  const poiEvents: POIEvent[] = doomPoiId
    ? [
        {
          id: newId(),
          poiId: doomPoiId,
          worldId,
          name: event.title,
          description: event.description,
          type: 'disaster',
          trigger: { year: date.year, season: date.season, day: date.day, watch: date.watch },
          recurring: false,
          durationWatches: 1,
          isActive: false,
          effects: '',
          tags: ['doom'],
          createdAt: now,
          updatedAt: now,
        },
      ]
    : []

  // Avert quest: an opposing leader (or the doom faction's own leader as a last
  // resort) wants the doom stopped; the secret points at the doom faction's HQ.
  const leaderToFaction = new Map(factions.filter((f) => f.leaderNpcId).map((f) => [f.leaderNpcId!, f]))
  const opposing = factions.filter((f) => f.id !== doomFaction.id && f.leaderNpcId)
  const contactId =
    opposing.length > 0 ? rng.pick(opposing).leaderNpcId! : doomFaction.leaderNpcId!
  const contactFaction = leaderToFaction.get(contactId)

  const hookId = newId()
  const hooks: Hook[] = [
    {
      id: hookId,
      worldId,
      type: 'revenge',
      title: `Stop the ${doomFaction.name} before the reckoning`,
      status: 'open',
      contactNpcId: contactId,
      rewardText: "The gratitude of the realm — and a king's ransom, if any survive.",
      secret: {
        kind: 'truth',
        targetType: 'poi',
        targetId: doomFaction.headquartersPoiId ?? pois[0]?.id ?? '',
        detail:
          `"I have seen what the ${doomFaction.name} mean to do. If they are not broken at their seat of power, ` +
          `${consequence}. I cannot stop them alone — but you might."`,
      },
      createdAt: now,
      updatedAt: now,
    },
  ]

  const notices: Notice[] = [
    {
      id: newId(),
      poiId: contactFaction?.headquartersPoiId ?? null,
      regionId: contactFaction?.regionId ?? null,
      worldId,
      title: `A warning: the ${doomFaction.name} must be stopped`,
      description: `Heroes are sought to move against the ${doomFaction.name} before they bring ruin upon us all.`,
      type: 'warning',
      reward: 'The gratitude of the realm.',
      contactNpcId: contactId,
      hookId,
      isUsed: false,
      tags: ['doom'],
      createdAt: now,
      updatedAt: now,
    },
  ]

  // Foreshadowing rumors at a few overworld POIs, all linked to the doom hook.
  const overworld = pois.filter((p) => p.mapRef && p.parentPoiId == null)
  const rumorPois = rng.sample(overworld.length > 0 ? overworld : pois, Math.min(3, Math.max(1, overworld.length || pois.length)))
  const rumors: Rumor[] = rumorPois.map((poi) => ({
    id: newId(),
    poiId: poi.id,
    regionId: poi.regionId ?? null,
    worldId,
    text: rng.pick(DOOM_RUMORS).replace('{faction}', doomFaction.name),
    source: 'fearful whispers',
    isUsed: false,
    isQuestHook: true,
    hookId,
    tags: ['doom'],
    createdAt: now,
    updatedAt: now,
  }))

  const bundle: DoomBundle = { event, poiEvents, rumors, notices, hooks }

  // Build the Doom entity
  const doom: Doom = {
    id: newId(),
    worldId,
    name: doomName,
    theme: theme ?? '',
    description: event.description,
    doomFactionId: doomFaction.id,
    status: 'looming',
    progress: 0,
    segments: 6,
    stages: resolvedTheme.stages.map((s) => ({ ...s, fired: false })),
    vector: resolvedTheme.vector,
    keyedResource: resolvedTheme.keyedResource,
    keyedBiome: resolvedTheme.keyedBiome,
    reckoningDate: { year: date.year, season: date.season, day: date.day, watch: date.watch },
    hookId,
    createdAt: now,
    updatedAt: now,
  }

  return { doom, bundle }
}
