import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@infrastructure/dexie/db'
import { createContainer } from '@infrastructure/container'
import { cairnSystemConfig } from '@infrastructure/dexie/seed-system-configs'
import { executeGenerateWorld } from './GenerateWorld'

const container = createContainer()

beforeEach(async () => {
  await db.open()
  await Promise.all([db.worlds.clear(), db.gameMaps.clear(), db.factions.clear(), db.factionPresences.clear(), db.factionRelationships.clear(), db.npcs.clear(), db.connections.clear(), db.hooks.clear(), db.notices.clear(), db.rumors.clear(), db.worldEvents.clear(), db.poiEvents.clear(), db.regions.clear(), db.pois.clear(), db.paths.clear()])
  // NPC generation rolls a system-correct stat block, so the system config must exist.
  await db.systemConfigs.put(cairnSystemConfig)
})

const deps = () => ({
  realmRepo: container.realmRepo,
  regionRepo: container.regionRepo,
  factionRepo: container.factionRepo,
  realmNoteRepo: container.realmNoteRepo,
  poiRepo: container.poiRepo,
  npcRepo: container.npcRepo,
  pathRepo: container.pathRepo,
  factionPresenceRepo: container.factionPresenceRepo,
  poiEventRepo: container.poiEventRepo,
  hookRepo: container.hookRepo,
  rumorRepo: container.rumorRepo,
  noticeRepo: container.noticeRepo,
  tableRepo: container.tableRepo,
})

describe('executeGenerateWorld', () => {
  it('persists a realm and a small hex map (8x8 = 64 cells), returning their ids', async () => {
    const { realmId, mapId } = await executeGenerateWorld(
      { name: 'Testlands', systemId: 'system-cairn-2e', seed: 'seed-1', size: 'small' },
      deps()
    )

    const realm = await db.worlds.get(realmId)
    const map = await db.gameMaps.get(mapId)
    expect(realm?.name).toBe('Testlands')
    expect(map?.kind).toBe('hex')
    expect(map?.ownerRealmId).toBe(realmId)
    expect(map?.hexCells?.length).toBe(64)
  })

  it('size controls grid dimensions: small=64, medium=144, large=256 cells', async () => {
    const small = await executeGenerateWorld({ name: 'S', systemId: 'system-cairn-2e', seed: 's', size: 'small' }, deps())
    const medium = await executeGenerateWorld({ name: 'M', systemId: 'system-cairn-2e', seed: 'm', size: 'medium' }, deps())
    const large = await executeGenerateWorld({ name: 'L', systemId: 'system-cairn-2e', seed: 'l', size: 'large' }, deps())
    expect((await db.gameMaps.get(small.mapId))?.hexCells?.length).toBe(64)
    expect((await db.gameMaps.get(medium.mapId))?.hexCells?.length).toBe(144)
    expect((await db.gameMaps.get(large.mapId))?.hexCells?.length).toBe(256)
  })

  it('persists regions and POIs linked to the realm and map', async () => {
    const { realmId, mapId } = await executeGenerateWorld(
      { name: 'World', systemId: 'system-cairn-2e', seed: 'seed-1', size: 'small', poiDensity: 'normal' },
      deps()
    )
    const regions = await db.regions.where('worldId').equals(realmId).toArray()
    const pois = await db.pois.where('mapRef').equals(mapId).toArray()
    expect(regions.length).toBeGreaterThan(0)
    expect(pois.length).toBeGreaterThan(0)
    const regionIds = new Set(regions.map((r) => r.id))
    for (const p of pois) expect(regionIds.has(p.regionId)).toBe(true)
  })

  it('persists factions headquartered at generated settlements', async () => {
    const { realmId, mapId } = await executeGenerateWorld(
      { name: 'Powers', systemId: 'system-cairn-2e', seed: 'seed-fac', size: 'medium', factionCount: 3 },
      deps()
    )
    const pois = await db.pois.where('mapRef').equals(mapId).toArray()
    const settlementIds = new Set(pois.filter((p) => p.type === 'settlement').map((p) => p.id))
    const factions = await db.factions.where('worldId').equals(realmId).toArray()
    // generated factions (the party faction created by CreateRealm is isParty)
    const generated = factions.filter((f) => !f.isParty)
    expect(generated.length).toBe(3)
    for (const f of generated) {
      expect(settlementIds.has(f.headquartersPoiId!)).toBe(true)
      expect(f.name.length).toBeGreaterThan(0)
    }
  })

  it('persists faction leaders and agents as NPCs', async () => {
    const { realmId } = await executeGenerateWorld(
      { name: 'Folk', systemId: 'system-cairn-2e', seed: 'seed-npc', size: 'medium', factionCount: 3 },
      deps()
    )
    const factions = (await db.factions.where('worldId').equals(realmId).toArray()).filter((f) => !f.isParty)
    const npcs = await db.npcs.where('worldId').equals(realmId).toArray()
    expect(npcs.length).toBeGreaterThanOrEqual(factions.length * 2)
    for (const f of factions) {
      expect(f.leaderNpcId).not.toBeNull()
      expect(npcs.some((n) => n.id === f.leaderNpcId)).toBe(true)
      expect(f.agentNpcIds.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('pre-generates dungeons (rooms exist, spatial dungeon set) up to the cap', async () => {
    const { mapId } = await executeGenerateWorld(
      { name: 'Depths', systemId: 'system-cairn-2e', seed: 'seed-dungeon', size: 'small' },
      deps()
    )
    const mapPois = await db.pois.where('mapRef').equals(mapId).toArray()
    const dungeons = mapPois.filter((p) => p.type === 'dungeon')
    const built = dungeons.filter((d) => d.spatialDungeon != null)
    expect(built.length).toBeGreaterThan(0)
    // a built dungeon has child room POIs
    const children = await db.pois.where('parentPoiId').equals(built[0].id).toArray()
    expect(children.length).toBeGreaterThan(0)
  })

  it('persists a future-dated doom event with foreshadowing rumors', async () => {
    const { realmId } = await executeGenerateWorld(
      { name: 'Doomed', systemId: 'system-cairn-2e', seed: 'seed-doom', size: 'medium', loomingThreat: true },
      deps()
    )
    const realm = await db.worlds.get(realmId)
    const events = (await db.worldEvents.toArray()).filter((e) => e.worldId === realmId)
    expect(events.length).toBeGreaterThanOrEqual(1)
    const doom = events.find((e) => e.type === 'doom')!
    expect(doom).toBeTruthy()
    // dated strictly in the future relative to the realm's start
    const abs = (e: { year: number; season: string; day: number }) =>
      (e.year - 1) * 4 * realm!.daysPerSeason +
      ['spring', 'summer', 'fall', 'winter'].indexOf(e.season) * realm!.daysPerSeason +
      (e.day - 1)
    const startAbs = (realm!.currentYear - 1) * 4 * realm!.daysPerSeason +
      ['spring', 'summer', 'fall', 'winter'].indexOf(realm!.currentSeason) * realm!.daysPerSeason +
      (realm!.currentDay - 1)
    expect(abs(doom)).toBeGreaterThan(startAbs)
    // foreshadowed by rumors tagged doom
    const doomRumors = (await db.rumors.toArray()).filter((r) => r.worldId === realmId && r.tags.includes('doom'))
    expect(doomRumors.length).toBeGreaterThanOrEqual(1)
  })

  it('persists quest hooks with notices/rumors anchored to NPCs and POIs', async () => {
    const { realmId, mapId } = await executeGenerateWorld(
      { name: 'Quests', systemId: 'system-cairn-2e', seed: 'seed-hooks', size: 'medium', factionCount: 3 },
      deps()
    )
    const npcIds = new Set((await db.npcs.where('worldId').equals(realmId).toArray()).map((n) => n.id))
    const poiIds = new Set((await db.pois.where('mapRef').equals(mapId).toArray()).map((p) => p.id))
    const allHooks = await db.hooks.where('worldId').equals(realmId).toArray()
    // Filter to world-gen hooks (have a contactNpcId and don't target items);
    // treasure-lead hooks (item-targeted or notice/tavern-sourced with null contact) are checked in their own test
    const hooks = allHooks.filter((h) => h.secret.targetType !== 'item' && h.contactNpcId !== null)
    const notices = (await db.notices.toArray()).filter((n) => n.worldId === realmId && n.hookId)
    expect(hooks.length).toBeGreaterThan(0)
    const hookIds = new Set(allHooks.map((h) => h.id))
    for (const h of hooks) {
      // contact is a generated NPC; secret points at a real NPC or POI
      expect(npcIds.has(h.contactNpcId!)).toBe(true)
      const target = h.secret.targetType === 'npc' ? npcIds : poiIds
      expect(target.has(h.secret.targetId)).toBe(true)
    }
    // notices roll up to a POI and reference a real hook
    expect(notices.length).toBeGreaterThan(0)
    for (const n of notices) {
      expect(hookIds.has(n.hookId!)).toBe(true)
      expect(poiIds.has(n.poiId!)).toBe(true)
    }
  })

  it('persists NPC connections (agents serve their leaders)', async () => {
    const { realmId } = await executeGenerateWorld(
      { name: 'Ties', systemId: 'system-cairn-2e', seed: 'seed-conn', size: 'medium', factionCount: 3 },
      deps()
    )
    const npcs = await db.npcs.where('worldId').equals(realmId).toArray()
    const npcIds = new Set(npcs.map((n) => n.id))
    const connections = await db.connections.where('worldId').equals(realmId).toArray()
    expect(connections.length).toBeGreaterThan(0)
    for (const c of connections) {
      expect(npcIds.has(c.fromId)).toBe(true)
      expect(npcIds.has(c.toId)).toBe(true)
    }
  })

  it('persists pairwise relationships among generated factions', async () => {
    const { realmId } = await executeGenerateWorld(
      { name: 'Webs', systemId: 'system-cairn-2e', seed: 'seed-rel', size: 'medium', factionCount: 4 },
      deps()
    )
    const factions = await db.factions.where('worldId').equals(realmId).toArray()
    const generated = factions.filter((f) => !f.isParty)
    const ids = new Set(generated.map((f) => f.id))
    const rels = (await db.factionRelationships.toArray()).filter((r) => ids.has(r.factionId))
    expect(rels.length).toBe(generated.length * (generated.length - 1))
    for (const r of rels) {
      expect(ids.has(r.targetId)).toBe(true)
      expect(r.score).toBeGreaterThanOrEqual(-6)
      expect(r.score).toBeLessThanOrEqual(6)
    }
  })

  it('persists paths linking generated settlements', async () => {
    const { mapId } = await executeGenerateWorld(
      { name: 'Roads', systemId: 'system-cairn-2e', seed: 'seed-paths', size: 'medium', poiDensity: 'normal' },
      deps()
    )
    const pois = await db.pois.where('mapRef').equals(mapId).toArray()
    const settlementIds = new Set(pois.filter((p) => p.type === 'settlement').map((p) => p.id))
    // Portal links (type 'portal') connect gates, not settlements.
    const paths = (await db.paths.toArray()).filter((p) => p.type !== 'portal')
    expect(paths.length).toBeGreaterThan(0)
    for (const path of paths) {
      expect(settlementIds.has(path.fromPoiId)).toBe(true)
      expect(settlementIds.has(path.toPoiId)).toBe(true)
      expect(path.baseTravelWatches).toBeGreaterThan(0)
    }
  })

  it('persists optional treasure, magic item, and monster sprinkling on overworld POIs', async () => {
    const { mapId } = await executeGenerateWorld(
      {
        name: 'Looted',
        systemId: 'system-cairn-2e',
        seed: 'seed-loot',
        size: 'medium',
        poiDensity: 'dense',
        worldTreasureDensity: 'moderate',
        worldMagicDensity: 'moderate',
        worldMonsterDensity: 'moderate',
      },
      deps(),
    )
    const pois = await db.pois.where('mapRef').equals(mapId).toArray()
    expect(pois.filter((p) => p.treasure.length > 0).length).toBeGreaterThan(1)
    expect(pois.filter((p) => p.magicItemRefs.length > 0).length).toBeGreaterThan(0)
    expect(pois.filter((p) => p.monsterRefs.length > 0).length).toBeGreaterThan(1)
  })

  it('seeds recurring civic events covering every season', async () => {
    const { realmId } = await executeGenerateWorld(
      { name: 'Civic', systemId: 'system-cairn-2e', seed: 'civic-1', size: 'small' },
      deps(),
    )
    const events = await db.poiEvents.where('worldId').equals(realmId).toArray()
    const civic = events.filter((e) => e.tags.includes('civic'))
    expect(civic.length).toBeGreaterThan(0)
    expect(civic.every((e) => e.recurring && e.trigger.year === null)).toBe(true)
    const seasons = new Set(civic.map((e) => e.trigger.season))
    expect(seasons.size).toBe(4) // every season represented
  })

  it('seeds treasure on non-dungeon POIs and produces notable finds via per-region path', async () => {
    const { mapId, realmId } = await executeGenerateWorld(
      {
        name: 'T',
        systemId: 'system-cairn-2e',
        seed: 'seed-loot',
        size: 'medium',
        worldTreasureDensity: 'frequent',
        worldMagicDensity: 'moderate',
        worldMonsterDensity: 'moderate',
      },
      deps(),
    )
    const pois = await db.pois.where('mapRef').equals(mapId).toArray()
    // At least one non-dungeon/ruin POI has treasure
    const seeded = pois.filter((p) => p.type !== 'dungeon' && p.type !== 'ruin' && p.treasure.length > 0)
    expect(seeded.length).toBeGreaterThan(0)
    // Per-region path marks items notable; flat fallback does not
    expect(pois.some((p) => p.treasure.some((t) => t.notable))).toBe(true)
    // Faction great-item pass: at least one faction's HQ POI holds a notable item
    const factions = (await db.factions.where('worldId').equals(realmId).toArray()).filter((f) => !f.isParty)
    const hqPoiIds = new Set(factions.map((f) => f.headquartersPoiId).filter(Boolean) as string[])
    const hqPois = pois.filter((p) => hqPoiIds.has(p.id))
    expect(hqPois.some((p) => p.treasure.some((t) => t.notable))).toBe(true)
  })

  it('generates treasure leads after world gen (item-targeted hooks + treasure-lead rumors/notices)', async () => {
    await executeGenerateWorld(
      { name: 'T', systemId: 'system-cairn-2e', seed: 'leadworld', size: 'medium', worldMagicDensity: 'frequent', worldTreasureDensity: 'frequent', worldMonsterDensity: 'moderate' } as any,
      deps() as any,
    )
    const hooks = await db.hooks.toArray()
    expect(hooks.some((h) => h.secret.targetType === 'item')).toBe(true)
    const rumors = await db.rumors.toArray()
    const notices = await db.notices.toArray()
    expect(
      rumors.some((r) => r.tags?.includes('treasure-lead') || r.tags?.includes('faction-seeks')) ||
      notices.some((n) => n.tags?.includes('treasure-lead') || n.tags?.includes('faction-seeks')),
    ).toBe(true)
  })

  it('is deterministic: same seed + size → same biome layout', async () => {
    const a = await executeGenerateWorld({ name: 'A', systemId: 'system-cairn-2e', seed: 'fixed', size: 'small' }, deps())
    const b = await executeGenerateWorld({ name: 'B', systemId: 'system-cairn-2e', seed: 'fixed', size: 'small' }, deps())
    const mapA = await db.gameMaps.get(a.mapId)
    const mapB = await db.gameMaps.get(b.mapId)
    expect(mapA?.hexCells?.map((c) => c.biome)).toEqual(mapB?.hexCells?.map((c) => c.biome))
  })
})

describe('faction count auto-scales with map size when factionCount is omitted', () => {
  it('a large world generates more factions than a small one (engine default)', async () => {
    await executeGenerateWorld(
      { name: 'SmallRealm', systemId: 'system-cairn-2e', seed: 'fac-scale', size: 'small' },
      deps(),
    )
    const small = (await db.factions.toArray()).length
    const clearAll = () => Promise.all([
      db.worlds.clear(), db.gameMaps.clear(), db.factions.clear(), db.factionRelationships.clear(),
      db.npcs.clear(), db.connections.clear(), db.hooks.clear(), db.notices.clear(), db.rumors.clear(),
      db.worldEvents.clear(), db.poiEvents.clear(), db.regions.clear(), db.pois.clear(), db.paths.clear(),
    ])
    await clearAll()
    await executeGenerateWorld(
      { name: 'MediumRealm', systemId: 'system-cairn-2e', seed: 'fac-scale', size: 'medium' },
      deps(),
    )
    const medium = (await db.factions.toArray()).length
    await clearAll()
    await executeGenerateWorld(
      { name: 'LargeRealm', systemId: 'system-cairn-2e', seed: 'fac-scale', size: 'large' },
      deps(),
    )
    const large = (await db.factions.toArray()).length
    // Region-count-driven default scales smoothly across all three sizes.
    expect(small).toBeGreaterThanOrEqual(2)
    expect(medium).toBeGreaterThan(small)
    expect(large).toBeGreaterThan(medium)
  })
})

describe('FactionPresence seeding', () => {
  it('seeds a "controls" presence row at every faction HQ after world-gen', async () => {
    await executeGenerateWorld(
      { name: 'PresenceWorld', systemId: 'system-cairn-2e', seed: 'presence-seed', size: 'small' },
      deps(),
    )

    const factions = await db.factions.toArray()
    const presences = await db.factionPresences.toArray()

    // At least one faction must exist for this test to be meaningful.
    const hqFactions = factions.filter(f => f.headquartersPoiId)
    expect(hqFactions.length).toBeGreaterThanOrEqual(1)

    // Every faction with an HQ gets exactly one 'controls' presence at that POI.
    for (const faction of hqFactions) {
      const row = presences.find(
        p => p.factionId === faction.id && p.poiId === faction.headquartersPoiId,
      )
      expect(row).toBeDefined()
      expect(row?.type).toBe('controls')
    }

    // Total presence count matches the number of HQ-factions.
    expect(presences.length).toBe(hqFactions.length)
  })
})
