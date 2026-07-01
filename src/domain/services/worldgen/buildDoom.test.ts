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
  it('returns { doom, bundle } shape', () => {
    const result = buildDoom(factions, pois, clock, 'w1', new SeededRandom('s'))
    expect(result).toHaveProperty('doom')
    expect(result).toHaveProperty('bundle')
  })

  it('creates a future-dated doom WorldEvent tied to a faction', () => {
    const { bundle: { event } } = buildDoom(factions, pois, clock, 'w1', new SeededRandom('s'))
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
    const { bundle: { rumors, hooks } } = buildDoom(factions, pois, clock, 'w1', new SeededRandom('s'))
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
    const { bundle: { hooks, notices } } = buildDoom(factions, pois, clock, 'w1', new SeededRandom('s'))
    expect(hooks.length).toBeGreaterThanOrEqual(1)
    const doomHook = hooks[0]
    // contact is a faction leader, target is the doom faction's HQ
    expect(['lA', 'lB']).toContain(doomHook.contactNpcId)
    expect(notices.some((n) => n.hookId === doomHook.id)).toBe(true)
  })

  it('schedules the doom as a future POI event at the doom faction seat', () => {
    const { bundle: { event, poiEvents } } = buildDoom(factions, pois, clock, 'w1', new SeededRandom('s'))
    expect(poiEvents).toHaveLength(1)
    const pe = poiEvents[0]
    expect(['hqA', 'hqB']).toContain(pe.poiId)
    expect(pe.tags).toContain('doom')
    expect(pe.isActive).toBe(false)
    // its trigger matches the doom's date
    expect(pe.trigger.year).toBe(event.year)
    expect(pe.trigger.season).toBe(event.season)
    expect(pe.trigger.day).toBe(event.day)
  })

  it('is deterministic for a given seed', () => {
    const a = buildDoom(factions, pois, clock, 'w1', new SeededRandom('z'))
    const b = buildDoom(factions, pois, clock, 'w1', new SeededRandom('z'))
    expect(`${a.bundle.event.year}-${a.bundle.event.season}-${a.bundle.event.day}`).toBe(`${b.bundle.event.year}-${b.bundle.event.season}-${b.bundle.event.day}`)
    expect(a.bundle.event.title).toBe(b.bundle.event.title)
  })

  // ─── New Doom entity tests ───────────────────────────────────────────────────

  it('doom entity has correct default shape', () => {
    const { doom } = buildDoom(factions, pois, clock, 'w1', new SeededRandom('s'))
    expect(doom.status).toBe('looming')
    expect(doom.segments).toBe(6)
    expect(doom.progress).toBe(0)
    expect(doom.worldId).toBe('w1')
    // startDate must match the input clock
    expect(doom.startDate.year).toBe(clock.year)
    expect(doom.startDate.season).toBe(clock.season)
    expect(doom.startDate.day).toBe(clock.day)
    expect(doom.startDate.watch).toBe(clock.watch)
  })

  it('doom.stages has ≥3 entries with ascending thresholds, all unfired', () => {
    const { doom } = buildDoom(factions, pois, clock, 'w1', new SeededRandom('s'))
    expect(doom.stages.length).toBeGreaterThanOrEqual(3)
    for (let i = 1; i < doom.stages.length; i++) {
      expect(doom.stages[i].threshold).toBeGreaterThan(doom.stages[i - 1].threshold)
    }
    expect(doom.stages.every((s) => s.fired === false)).toBe(true)
  })

  it('doom.doomFactionId is one of the input faction ids', () => {
    const { doom } = buildDoom(factions, pois, clock, 'w1', new SeededRandom('s'))
    expect(['fA', 'fB']).toContain(doom.doomFactionId)
  })

  it('doom.hookId equals the bundle hook id', () => {
    const { doom, bundle: { hooks } } = buildDoom(factions, pois, clock, 'w1', new SeededRandom('s'))
    expect(hooks.length).toBeGreaterThanOrEqual(1)
    expect(doom.hookId).toBe(hooks[0].id)
  })

  it('doom.reckoningDate matches bundle event date', () => {
    const { doom, bundle: { event } } = buildDoom(factions, pois, clock, 'w1', new SeededRandom('s'))
    expect(doom.reckoningDate.year).toBe(event.year)
    expect(doom.reckoningDate.season).toBe(event.season)
    expect(doom.reckoningDate.day).toBe(event.day)
    expect(doom.reckoningDate.watch).toBe(event.watch)
  })

  it('passing a known theme label sets doom.name and doom.vector deterministically', () => {
    const { doom } = buildDoom(factions, pois, clock, 'w1', new SeededRandom('s'), 'The Salt-Death')
    expect(doom.name).toBe('The Salt-Death')
    expect(doom.vector).toBe('water')
    expect(doom.theme).toBe('The Salt-Death')
  })

  it('passing no theme uses faction-based name', () => {
    const { doom } = buildDoom(factions, pois, clock, 'w1', new SeededRandom('s'))
    expect(doom.name).toMatch(/The Reckoning of the/)
    expect(doom.theme).toBe('')
  })

  it('doom name is deterministic under a fixed seed with theme', () => {
    const a = buildDoom(factions, pois, clock, 'w1', new SeededRandom('fixed'), 'The Wyrm Claims the Peak')
    const b = buildDoom(factions, pois, clock, 'w1', new SeededRandom('fixed'), 'The Wyrm Claims the Peak')
    expect(a.doom.name).toBe(b.doom.name)
    expect(a.doom.vector).toBe(b.doom.vector)
  })
})
