import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './db'

describe('POI read-hook defaults for ruin/landmark fields', () => {
  beforeEach(async () => { await db.open(); await db.pois.clear() })

  it('backfills null for new fields on legacy records', async () => {
    // Insert a record missing the new fields (simulate legacy)
    const legacy: any = { id: 'p1', regionId: 'r', parentPoiId: null, name: 'Old', type: 'ruin',
      subtypeLabel: null, floor: null, tags: [], position: null, mapRef: null, markerColor: null,
      readAloud: '', gmNotes: '', trouble: '', mood: '', sensory: '', services: [], imageUrl: null,
      monsterRefs: [], magicItemRefs: [], spellRefs: [], equipmentRefs: [], locationSeed: null,
      traps: [], treasure: [], roomWidth: null, roomLength: null, visited: false, lightLevel: null,
      wanderingMonsters: [], encounterChance: null, watabouSeed: null, watabouGenerator: null,
      watabouData: null, spatialDungeon: null, dungeonGenOptions: null, sessionLog: [], starred: false,
      createdAt: 1, updatedAt: 1 }
    await db.pois.put(legacy)
    const read = await db.pois.get('p1')
    expect(read?.ruinSite).toBeNull()
    expect(read?.landmarkLore).toBeNull()
    expect(read?.poiGenOptions).toBeNull()
  })

  it('backfills exploration-lifecycle + living-world fields on legacy records', async () => {
    const legacy: any = { id: 'p2', regionId: 'r', parentPoiId: null, name: 'Old', type: 'dungeon',
      subtypeLabel: null, floor: null, tags: [], position: null, mapRef: null, markerColor: null,
      readAloud: '', gmNotes: '', trouble: '', mood: '', sensory: '', services: [], imageUrl: null,
      monsterRefs: [], magicItemRefs: [], spellRefs: [], equipmentRefs: [], locationSeed: null,
      traps: [], treasure: [], roomWidth: null, roomLength: null, visited: true, lightLevel: null,
      wanderingMonsters: [], encounterChance: null, watabouSeed: null, watabouGenerator: null,
      watabouData: null, spatialDungeon: null, dungeonGenOptions: null, sessionLog: [], starred: false,
      createdAt: 1, updatedAt: 1 }
    await db.pois.put(legacy)
    const read = await db.pois.get('p2')
    // status derives from the legacy `visited` flag
    expect(read?.status).toBe('explored')
    expect(read?.lastVisitedDate).toBeNull()
    expect(read?.dangerLevel).toBeNull()
    expect(read?.currentOccupant).toBeNull()
  })

  it('derives unexplored status for unvisited legacy records', async () => {
    const legacy: any = { id: 'p3', regionId: 'r', parentPoiId: null, name: 'Fresh', type: 'ruin',
      subtypeLabel: null, floor: null, tags: [], position: null, mapRef: null, markerColor: null,
      readAloud: '', gmNotes: '', trouble: '', mood: '', sensory: '', services: [], imageUrl: null,
      monsterRefs: [], magicItemRefs: [], spellRefs: [], equipmentRefs: [], locationSeed: null,
      traps: [], treasure: [], roomWidth: null, roomLength: null, visited: false, lightLevel: null,
      wanderingMonsters: [], encounterChance: null, watabouSeed: null, watabouGenerator: null,
      watabouData: null, spatialDungeon: null, dungeonGenOptions: null, sessionLog: [], starred: false,
      createdAt: 1, updatedAt: 1 }
    await db.pois.put(legacy)
    const read = await db.pois.get('p3')
    expect(read?.status).toBe('unexplored')
  })
})
