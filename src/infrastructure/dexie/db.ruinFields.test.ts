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
})
