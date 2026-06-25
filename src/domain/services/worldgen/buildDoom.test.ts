import { describe, it, expect } from 'vitest'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import type { Faction } from '@domain/entities/Faction'
import type { POI } from '@domain/entities/POI'
import { buildDoom, type DoomClock } from './buildDoom'

const faction = (id: string, name: string, leader: string, hq: string): Faction =>
  ({
    id, name, leaderNpcId: leader, headquartersPoiId: hq, regionId: 'r1',
    agendaGoals: [{ id: 'g1', description: 'Spread a Belief', completed: false, timeframe: 'long-term' }],
  }) as Faction

const factions = [faction('fA', 'The Ashen Choir', 'lA', 'hqA'), faction('fB', 'The Wardens', 'lB', 'hqB')]
const pois: POI[] = [
  { id: 'hqA', name: 'Ashmoor', type: 'settlement', regionId: 'r1', mapRef: 'm1' } as POI,
  { id: 'hqB', name: 'Wardhold', type: 'settlement', regionId: 'r1', mapRef: 'm1' } as POI,
  { id: 'p3', name: 'Crow Hill', type: 'landmark', regionId: 'r2', mapRef: 'm1' } as POI,
]
const clock: DoomClock = { year: 1, season: 'spring', day: 1, watch: 1, daysPerSeason: 30 }

describe('buildDoom', () => {
  it('creates a future-dated doom WorldEvent tied to a faction', () => {
    const { event } = buildDoom(factions, pois, clock, 'w1', new SeededRandom('s'))
    expect(event.worldId).toBe('w1')
    expect(event.title.length).toBeGreaterThan(0)
    // dated strictly after the realm's start (year 1, spring, day 1)
    const startAbs = 0
    const eventAbs =
      (event.year - 1) * 4 * 30 + ['spring', 'summer', 'fall', 'winter'].indexOf(event.season) * 30 + (event.day - 1)
    expect(eventAbs).toBeGreaterThan(startAbs)
    // references a real faction
    expect(factions.some((f) => event.relatedEntityIds.includes(f.id))).toBe(true)
  })

  it('foreshadows the doom with rumors placed at overworld POIs, linked to the doom hook', () => {
    const { rumors, hooks } = buildDoom(factions, pois, clock, 'w1', new SeededRandom('s'))
    expect(rumors.length).toBeGreaterThanOrEqual(2)
    const poiIds = new Set(pois.map((p) => p.id))
    for (const r of rumors) {
      expect(poiIds.has(r.poiId!)).toBe(true)
      expect(r.isQuestHook).toBe(true)
    }
    // rumors connect to a generated doom hook
    const hookIds = new Set(hooks.map((h) => h.id))
    expect(rumors.every((r) => r.hookId && hookIds.has(r.hookId))).toBe(true)
  })

  it('offers a quest to avert the doom, contacted by an opposing leader', () => {
    const { hooks, notices } = buildDoom(factions, pois, clock, 'w1', new SeededRandom('s'))
    expect(hooks.length).toBeGreaterThanOrEqual(1)
    const doomHook = hooks[0]
    // contact is a faction leader, target is the doom faction's HQ
    expect(['lA', 'lB']).toContain(doomHook.contactNpcId)
    expect(notices.some((n) => n.hookId === doomHook.id)).toBe(true)
  })

  it('is deterministic for a given seed', () => {
    const a = buildDoom(factions, pois, clock, 'w1', new SeededRandom('z'))
    const b = buildDoom(factions, pois, clock, 'w1', new SeededRandom('z'))
    expect(`${a.event.year}-${a.event.season}-${a.event.day}`).toBe(`${b.event.year}-${b.event.season}-${b.event.day}`)
    expect(a.event.title).toBe(b.event.title)
  })
})
