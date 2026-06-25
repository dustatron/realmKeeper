import { describe, it, expect } from 'vitest'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import type { Faction } from '@domain/entities/Faction'
import type { NPC } from '@domain/entities/NPC'
import type { POI } from '@domain/entities/POI'
import type { Connection } from '@domain/entities/Connection'
import { buildHooks } from './buildHooks'

const faction = (id: string, leader: string, hq: string, region: string, name: string): Faction =>
  ({ id, leaderNpcId: leader, headquartersPoiId: hq, regionId: region, name }) as Faction
const npc = (id: string, name: string): NPC => ({ id, name }) as NPC
const poi = (id: string, type: string, name: string): POI => ({ id, type, name, regionId: 'r' }) as POI
const enemyEdge = (from: string, to: string): Connection =>
  ({ id: `${from}-${to}`, fromType: 'npc', fromId: from, toType: 'npc', toId: to, kind: 'enemy', label: 'sworn enemy of' }) as Connection

const factions = [
  faction('fA', 'lA', 'hqA', 'rA', 'The Order'),
  faction('fB', 'lB', 'hqB', 'rB', 'The Cult'),
]
const npcs = [npc('lA', 'Aldric'), npc('lB', 'Borin')]
const pois = [
  poi('hqA', 'settlement', 'Ashford'),
  poi('hqB', 'settlement', 'Mire'),
  poi('d1', 'dungeon', 'The Crypt'),
]

describe('buildHooks', () => {
  it('creates a recovery hook per faction, pointing at a dungeon, with NPC contact + POI projections', () => {
    const { hooks, notices, rumors } = buildHooks(factions, npcs, pois, [], 'w1', new SeededRandom('s'))
    const recovery = hooks.filter((h) => h.type === 'missing_person')
    expect(recovery.length).toBe(2) // one per faction
    for (const h of recovery) {
      expect(h.worldId).toBe('w1')
      expect(['lA', 'lB']).toContain(h.contactNpcId)
      expect(h.secret.targetType).toBe('poi')
      expect(h.secret.targetId).toBe('d1') // the only dungeon
      expect(h.title.length).toBeGreaterThan(0)
      // a request notice posted at the contact's HQ
      const notice = notices.find((n) => n.hookId === h.id)
      expect(notice?.type).toBe('request')
      expect(['hqA', 'hqB']).toContain(notice?.poiId)
      // a quest-hook rumor at the target dungeon
      const rumor = rumors.find((r) => r.hookId === h.id)
      expect(rumor?.poiId).toBe('d1')
      expect(rumor?.isQuestHook).toBe(true)
    }
  })

  it('creates a revenge hook from an enemy connection, posted as a bounty', () => {
    const { hooks, notices } = buildHooks(factions, npcs, pois, [enemyEdge('lA', 'lB')], 'w1', new SeededRandom('s'))
    const revenge = hooks.find((h) => h.type === 'revenge')
    expect(revenge?.contactNpcId).toBe('lA')
    expect(revenge?.secret.targetType).toBe('npc')
    expect(revenge?.secret.targetId).toBe('lB')
    const bounty = notices.find((n) => n.hookId === revenge?.id)
    expect(bounty?.type).toBe('bounty')
    expect(bounty?.poiId).toBe('hqA') // contact's HQ
  })

  it('skips recovery hooks when there are no dungeons', () => {
    const noDungeon = pois.filter((p) => p.type !== 'dungeon')
    const { hooks } = buildHooks(factions, npcs, noDungeon, [], 'w1', new SeededRandom('s'))
    expect(hooks.some((h) => h.type === 'missing_person')).toBe(false)
  })

  it('is deterministic for a given seed', () => {
    const a = buildHooks(factions, npcs, pois, [enemyEdge('lA', 'lB')], 'w1', new SeededRandom('z'))
    const b = buildHooks(factions, npcs, pois, [enemyEdge('lA', 'lB')], 'w1', new SeededRandom('z'))
    expect(a.hooks.map((h) => `${h.type}:${h.contactNpcId}:${h.secret.targetId}`)).toEqual(
      b.hooks.map((h) => `${h.type}:${h.contactNpcId}:${h.secret.targetId}`),
    )
  })
})
