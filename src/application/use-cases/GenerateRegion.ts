import type { Region } from '@domain/entities/Region'
import type { POI } from '@domain/entities/POI'
import type { SystemConfig } from '@domain/entities/SystemConfig'
import type { ITableRepository } from '@application/ports/ITableRepository'
import { rollOnTable } from '@domain/services/RandomTableEngine'
import { rollDice } from '@shared/dice'
import { newId } from '@shared/ulid'
import type { TableDef } from '@domain/entities/TableDef'
import type { PoiType } from '@shared/constants'

export interface GenerateRegionInput {
  worldId: string
  systemConfig: SystemConfig
}

export interface GenerateRegionResult {
  region: Region
  pois: POI[]
}

function findTable(tables: TableDef[], id: string, tag: string): TableDef | undefined {
  return tables.find((t) => t.id === id) ?? tables.find((t) => t.tags.includes(tag))
}

function rollUnique(table: TableDef, count: number): string[] {
  const results: string[] = []
  const seen = new Set<string>()
  let attempts = 0
  while (results.length < count && attempts < count * 3) {
    const text = rollOnTable(table, rollDice).entry.text
    if (!seen.has(text)) {
      seen.add(text)
      results.push(text)
    }
    attempts++
  }
  return results
}

function makePoi(regionId: string, name: string, type: PoiType, description: string, subtypeLabel: string | null = null): POI {
  const now = Date.now()
  return {
    id: newId(),
    regionId,
    parentPoiId: null,
    name,
    description,
    type,
    subtypeLabel,
    floor: null,
    tags: [],
    position: null,
    mapRef: null,
    markerColor: null,
    readAloud: '',
    gmNotes: '',
    trouble: '',
    mood: '',
    sensory: '',
    services: [],
    imageUrl: null,
    monsterRefs: [],
    magicItemRefs: [],
    spellRefs: [],
    equipmentRefs: [],
    locationSeed: null,
    traps: [],
    treasure: [],
    roomWidth: null,
    roomLength: null,
    visited: false,
    lightLevel: null,
    wanderingMonsters: [],
    encounterChance: null,
    watabouSeed: null,
    watabouGenerator: null,
    watabouData: null,
    spatialDungeon: null,
    dungeonGenOptions: null,
    ruinSite: null,
    landmarkLore: null,
    poiGenOptions: null,
    sessionLog: [],
    starred: false,
    createdAt: now,
    updatedAt: now,
  }
}

export async function executeGenerateRegion(
  input: GenerateRegionInput,
  deps: { tableRepo: ITableRepository }
): Promise<GenerateRegionResult> {
  const allTables = await deps.tableRepo.getTablesBySystemId(input.systemConfig.id)
  const pois: POI[] = []
  const regionId = newId()

  // Step 1: Roll terrain difficulty (1d6: 1-3 easy, 4-5 tough, 6 perilous)
  const diffRoll = rollDice('1d6').total
  let difficulty: 'easy' | 'tough' | 'perilous'
  if (diffRoll <= 3) difficulty = 'easy'
  else if (diffRoll <= 5) difficulty = 'tough'
  else difficulty = 'perilous'

  // Step 2: Roll terrain + landmark for that difficulty
  const terrainTable = findTable(allTables, `table-cairn-terrain-${difficulty}`, `region-terrain-${difficulty}`)
  const landmarkTable = findTable(allTables, `table-cairn-landmark-${difficulty}`, `region-landmark-${difficulty}`)

  const terrain = terrainTable ? rollOnTable(terrainTable, rollDice).entry.text : difficulty
  const landmark = landmarkTable ? rollOnTable(landmarkTable, rollDice).entry.text : ''

  // Step 3: Roll 1-2 settlements (type + feature combined)
  const settlementTable = findTable(allTables, 'table-cairn-settlement', 'region-settlement')
  const settlementFeatureTable = findTable(allTables, 'table-cairn-settlement-feature', 'region-settlement-feature')
  const numSettlements = rollDice('1d2').total
  const settlements: string[] = []
  for (let i = 0; i < numSettlements; i++) {
    const type = settlementTable ? rollOnTable(settlementTable, rollDice).entry.text : ''
    const feature = settlementFeatureTable ? rollOnTable(settlementFeatureTable, rollDice).entry.text : ''
    const label = feature ? `${type} (${feature})` : type
    settlements.push(label)
    pois.push(makePoi(regionId, type, 'settlement', feature ? `Feature: ${feature}` : '', feature || null))
  }

  // Step 4: Roll 1-2 features (curiosity + feature, plus landmark)
  const curiosityTable = findTable(allTables, 'table-cairn-curiosity', 'region-curiosity')
  const curiosityFeatureTable = findTable(allTables, 'table-cairn-curiosity-feature', 'region-curiosity-feature')
  const features: string[] = []
  if (landmark) {
    features.push(landmark)
    pois.push(makePoi(regionId, landmark, 'landmark', ''))
  }
  const numCuriosities = rollDice('1d2').total
  for (let i = 0; i < numCuriosities; i++) {
    const curiosity = curiosityTable ? rollOnTable(curiosityTable, rollDice).entry.text : ''
    const cFeature = curiosityFeatureTable ? rollOnTable(curiosityFeatureTable, rollDice).entry.text : ''
    features.push(cFeature ? `${curiosity} — ${cFeature}` : curiosity)
    pois.push(makePoi(regionId, curiosity, 'natural', cFeature))
  }

  // Step 5: Roll 0-1 danger (lair or dungeon)
  const dangers: string[] = []
  const dangerRoll = rollDice('1d6').total
  if (dangerRoll >= 3) {
    if (dangerRoll <= 4) {
      const lairTable = findTable(allTables, 'table-cairn-lair', 'region-lair')
      const lairFeatureTable = findTable(allTables, 'table-cairn-lair-feature', 'region-lair-feature')
      const lair = lairTable ? rollOnTable(lairTable, rollDice).entry.text : ''
      const lFeature = lairFeatureTable ? rollOnTable(lairFeatureTable, rollDice).entry.text : ''
      dangers.push(lFeature ? `Lair: ${lair} — ${lFeature}` : `Lair: ${lair}`)
      pois.push(makePoi(regionId, lair, 'camp', lFeature))
    } else {
      const dungeonTable = findTable(allTables, 'table-cairn-dungeon', 'region-dungeon')
      const dungeonFeatureTable = findTable(allTables, 'table-cairn-dungeon-feature', 'region-dungeon-feature')
      const dungeon = dungeonTable ? rollOnTable(dungeonTable, rollDice).entry.text : ''
      const dFeature = dungeonFeatureTable ? rollOnTable(dungeonFeatureTable, rollDice).entry.text : ''
      dangers.push(dFeature ? `Dungeon: ${dungeon} — ${dFeature}` : `Dungeon: ${dungeon}`)
      pois.push(makePoi(regionId, dungeon, 'dungeon', dFeature))
    }
  }

  // Step 6: Roll resources (1 abundance + 1 scarcity)
  const resourceTable = findTable(allTables, 'table-cairn-region-resources', 'region-resources')
  const resources: string[] = []
  if (resourceTable) {
    const abundance = rollOnTable(resourceTable, rollDice).entry.text
    let scarcity = rollOnTable(resourceTable, rollDice).entry.text
    let attempts = 0
    while (scarcity === abundance && attempts < 5) {
      scarcity = rollOnTable(resourceTable, rollDice).entry.text
      attempts++
    }
    resources.push(`Abundance: ${abundance}`, `Scarcity: ${scarcity}`)
  }

  // Step 7: Roll people archetypes (1-2)
  const peopleTable = findTable(allTables, 'table-cairn-region-people', 'region-people')
  const people: string[] = peopleTable ? rollUnique(peopleTable, rollDice('1d2').total) : []

  // Step 8: Compose region
  const now = Date.now()
  const name = `The ${terrain}`

  const TERRAIN_CATEGORY: Record<string, string> = {
    // Easy — open land
    Bluffs: 'plains', Dells: 'plains', Farmlands: 'plains', Fells: 'hills',
    Foothills: 'hills', Glens: 'plains', Grasslands: 'plains', Gulleys: 'plains',
    Heaths: 'plains', Lowlands: 'plains', Meadows: 'plains', Moors: 'swamp',
    Pampas: 'plains', Pastures: 'plains', Plains: 'plains', Plateaus: 'hills',
    Prairies: 'plains', Savannas: 'plains', Steppes: 'plains', Valleys: 'plains',
    // Tough — varied terrain
    Barrens: 'desert', Canyons: 'hills', Chaparral: 'forest', 'Coral Reefs': 'coast',
    Deserts: 'desert', Dunes: 'desert', Estuaries: 'coast', Fens: 'swamp',
    Forests: 'forest', Heathlands: 'plains', Hills: 'hills', Mangroves: 'coast',
    Marshlands: 'swamp', Moorlands: 'plains', Rainforests: 'forest', Scrublands: 'desert',
    Taiga: 'forest', Thickets: 'forest', Tundra: 'tundra', Woodlands: 'forest',
    // Perilous — harsh terrain
    'Alpine Meadows': 'mountain', Bogs: 'swamp', Boulders: 'mountain', Caverns: 'mountain',
    Cliffs: 'mountain', Craters: 'mountain', Crevasses: 'mountain', Geysers: 'mountain',
    Glaciers: 'tundra', Gorges: 'mountain', Hollows: 'forest', 'Ice Fields': 'tundra',
    Jungles: 'forest', 'Lava Fields': 'mountain', Mountains: 'mountain', Peatlands: 'swamp',
    Quagmires: 'swamp', Ravine: 'mountain', Swamps: 'swamp', Wastelands: 'desert',
  }
  const terrainCategory = TERRAIN_CATEGORY[terrain] ?? (
    difficulty === 'easy' ? 'plains' : difficulty === 'tough' ? 'forest' : 'mountain'
  )

  const region: Region = {
    id: regionId,
    worldId: input.worldId,
    name,
    description: `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} ${terrain.toLowerCase()} region.`,
    terrain: terrainCategory,
    features,
    dangers,
    settlements,
    resources,
    people,
    boundary: null,
    color: null,
    imageUrl: null,
    createdAt: now,
    updatedAt: now,
  }

  return { region, pois }
}
