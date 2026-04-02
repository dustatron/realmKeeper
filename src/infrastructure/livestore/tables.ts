import { Schema, State } from '@livestore/livestore'

const { table, text, integer, real: _real, json, boolean } = State.SQLite

// ---------------------------------------------------------------------------
// systemConfigs
// ---------------------------------------------------------------------------
export const systemConfigsTable = table({
  name: 'systemConfigs',
  columns: {
    id: text({ primaryKey: true }),
    name: text(),
    slug: text(),
    statFields: json(),
    hasHitProtection: boolean(),
    hasLevel: boolean(),
    hasClass: boolean(),
    hasArmor: boolean(),
    armorLabel: text(),
    hpLabel: text(),
    hpFormula: text(),
    namingTableIds: json({ schema: Schema.Array(Schema.String) }),
  },
})

// ---------------------------------------------------------------------------
// worlds (Realm)
// ---------------------------------------------------------------------------
export const worldsTable = table({
  name: 'worlds',
  columns: {
    id: text({ primaryKey: true }),
    name: text(),
    systemId: text(),
    description: text({ default: '' }),
    currentYear: integer({ default: 1 }),
    currentSeason: text({ default: 'spring' }),
    currentDay: integer({ default: 1 }),
    currentWatch: integer({ default: 1 }),
    daysPerSeason: integer({ default: 30 }),
    daysPerWeek: integer({ default: 7 }),
    watchesPerDay: integer({ default: 3 }),
    factionTurnTrigger: text({ default: 'week' }),
    completedThroughDay: integer({ default: -1 }),
    customRaces: json({ schema: Schema.Array(Schema.String) }),
    raceColors: json(),
    starredMonsterIds: json({ schema: Schema.Array(Schema.String) }),
    starredSpellIds: json({ schema: Schema.Array(Schema.String) }),
    starredMagicItemIds: json({ schema: Schema.Array(Schema.String) }),
    createdAt: integer(),
    updatedAt: integer(),
  },
})

// ---------------------------------------------------------------------------
// regions
// ---------------------------------------------------------------------------
export const regionsTable = table({
  name: 'regions',
  columns: {
    id: text({ primaryKey: true }),
    worldId: text(),
    name: text(),
    description: text({ default: '' }),
    terrain: text({ default: '' }),
    features: json({ schema: Schema.Array(Schema.String) }),
    dangers: json({ schema: Schema.Array(Schema.String) }),
    settlements: json({ schema: Schema.Array(Schema.String) }),
    resources: json({ schema: Schema.Array(Schema.String) }),
    boundary: json({ nullable: true }),
    color: text({ nullable: true }),
    imageUrl: text({ nullable: true }),
    createdAt: integer(),
    updatedAt: integer(),
  },
})

// ---------------------------------------------------------------------------
// factions
// ---------------------------------------------------------------------------
export const factionsTable = table({
  name: 'factions',
  columns: {
    id: text({ primaryKey: true }),
    worldId: text(),
    name: text(),
    description: text({ default: '' }),
    type: text({ default: '' }),
    status: text({ default: 'active' }),
    isParty: boolean({ default: false }),
    regionId: text({ nullable: true }),
    headquartersPoiId: text({ nullable: true }),
    leaderNpcId: text({ nullable: true }),
    agentNpcIds: json({ schema: Schema.Array(Schema.String) }),
    agendaGoals: json(),
    advantages: json(),
    obstacles: json(),
    traits: json({ schema: Schema.Array(Schema.String) }),
    sortOrder: integer({ default: 0 }),
    createdAt: integer(),
    updatedAt: integer(),
  },
})

// ---------------------------------------------------------------------------
// npcs
// ---------------------------------------------------------------------------
export const npcsTable = table({
  name: 'npcs',
  columns: {
    id: text({ primaryKey: true }),
    worldId: text(),
    name: text(),
    race: text({ nullable: true }),
    factionIds: json({ schema: Schema.Array(Schema.String) }),
    regionId: text({ nullable: true }),
    poiId: text({ nullable: true }),
    lifeStatus: text({ default: 'alive' }),
    movementStatus: text({ default: 'present' }),
    description: text({ default: '' }),
    traits: json({ schema: Schema.Array(Schema.String) }),
    motivation: text({ default: '' }),
    appearance: text({ default: '' }),
    voice: text({ default: '' }),
    want: text({ default: '' }),
    tags: json({ schema: Schema.Array(Schema.String) }),
    imageUrl: text({ nullable: true }),
    systemBlock: json(),
    disposition: text({ nullable: true }),
    starred: boolean({ default: false }),
    createdAt: integer(),
    updatedAt: integer(),
  },
})

// ---------------------------------------------------------------------------
// factionRelationships
// ---------------------------------------------------------------------------
export const factionRelationshipsTable = table({
  name: 'factionRelationships',
  columns: {
    id: text({ primaryKey: true }),
    factionId: text(),
    targetId: text(),
    score: integer({ default: 0 }),
    events: json(),
    updatedAt: integer(),
  },
})

// ---------------------------------------------------------------------------
// pois
// ---------------------------------------------------------------------------
export const poisTable = table({
  name: 'pois',
  columns: {
    id: text({ primaryKey: true }),
    regionId: text(),
    parentPoiId: text({ nullable: true }),
    name: text(),
    description: text({ default: '' }),
    type: text(),
    subtypeLabel: text({ nullable: true }),
    floor: integer({ nullable: true }),
    tags: json({ schema: Schema.Array(Schema.String) }),
    position: json({ nullable: true }),
    mapRef: text({ nullable: true }),
    markerColor: text({ nullable: true }),
    readAloud: text({ default: '' }),
    gmNotes: text({ default: '' }),
    trouble: text({ default: '' }),
    mood: text({ default: '' }),
    sensory: text({ default: '' }),
    services: json(),
    imageUrl: text({ nullable: true }),
    monsterRefs: json(),
    magicItemRefs: json(),
    spellRefs: json(),
    equipmentRefs: json(),
    locationSeed: json({ nullable: true }),
    traps: json(),
    treasure: json(),
    roomWidth: integer({ nullable: true }),
    roomLength: integer({ nullable: true }),
    visited: boolean({ default: false }),
    lightLevel: text({ nullable: true }),
    wanderingMonsters: json(),
    watabouSeed: text({ nullable: true }),
    watabouGenerator: text({ nullable: true }),
    watabouData: json({ nullable: true }),
    sessionLog: json(),
    spatialDungeon: json({ nullable: true }),
    dungeonGenOptions: json({ nullable: true }),
    starred: boolean({ default: false }),
    createdAt: integer(),
    updatedAt: integer(),
  },
})

// ---------------------------------------------------------------------------
// paths
// ---------------------------------------------------------------------------
export const pathsTable = table({
  name: 'paths',
  columns: {
    id: text({ primaryKey: true }),
    fromPoiId: text(),
    toPoiId: text(),
    name: text({ default: '' }),
    description: text({ default: '' }),
    type: text({ default: 'road' }),
    baseTravelWatches: integer({ default: 3 }),
    terrain: text({ default: '' }),
    direction: text({ nullable: true }),
    hasDoor: boolean({ default: false }),
    isLocked: boolean({ default: false }),
    doorDescription: text({ default: '' }),
    createdAt: integer(),
    updatedAt: integer(),
  },
})

// ---------------------------------------------------------------------------
// realmNotes
// ---------------------------------------------------------------------------
export const realmNotesTable = table({
  name: 'realmNotes',
  columns: {
    id: text({ primaryKey: true }),
    worldId: text(),
    title: text(),
    content: text({ default: '' }),
    isMain: boolean({ default: false }),
    sortOrder: integer({ default: 0 }),
    createdAt: integer(),
    updatedAt: integer(),
  },
})

// ---------------------------------------------------------------------------
// worldEvents
// ---------------------------------------------------------------------------
export const worldEventsTable = table({
  name: 'worldEvents',
  columns: {
    id: text({ primaryKey: true }),
    worldId: text(),
    year: integer(),
    season: text(),
    day: integer(),
    watch: integer(),
    type: text(),
    title: text(),
    description: text({ default: '' }),
    relatedEntityIds: json({ schema: Schema.Array(Schema.String) }),
    createdAt: integer(),
  },
})

// ---------------------------------------------------------------------------
// weatherHistory
// ---------------------------------------------------------------------------
export const weatherHistoryTable = table({
  name: 'weatherHistory',
  columns: {
    id: text({ primaryKey: true }),
    worldId: text(),
    year: integer(),
    season: text(),
    day: integer(),
    watch: integer(),
    condition: text(),
    severity: text({ default: 'normal' }),
    createdAt: integer(),
  },
})

// ---------------------------------------------------------------------------
// tableSets
// ---------------------------------------------------------------------------
export const tableSetsTable = table({
  name: 'tableSets',
  columns: {
    id: text({ primaryKey: true }),
    name: text(),
    source: text({ default: '' }),
    systemId: text({ nullable: true }),
    tableIds: json({ schema: Schema.Array(Schema.String) }),
  },
})

// ---------------------------------------------------------------------------
// tableDefs
// ---------------------------------------------------------------------------
export const tableDefsTable = table({
  name: 'tableDefs',
  columns: {
    id: text({ primaryKey: true }),
    setId: text(),
    name: text(),
    diceFormula: text(),
    entries: json(),
    tags: json({ schema: Schema.Array(Schema.String) }),
    systemId: text({ nullable: true }),
  },
})

// ---------------------------------------------------------------------------
// rollHistory
// ---------------------------------------------------------------------------
export const rollHistoryTable = table({
  name: 'rollHistory',
  columns: {
    id: text({ primaryKey: true }),
    worldId: text(),
    tableId: text(),
    tableName: text(),
    result: text(),
    rolls: json({ schema: Schema.Array(Schema.Number) }),
    total: integer({ default: 0 }),
    timestamp: integer(),
  },
})

// ---------------------------------------------------------------------------
// factionPresences
// ---------------------------------------------------------------------------
export const factionPresencesTable = table({
  name: 'factionPresences',
  columns: {
    id: text({ primaryKey: true }),
    factionId: text(),
    poiId: text(),
    type: text(),
    notes: text({ default: '' }),
    createdAt: integer(),
    updatedAt: integer(),
  },
})

// ---------------------------------------------------------------------------
// poiEvents
// ---------------------------------------------------------------------------
export const poiEventsTable = table({
  name: 'poiEvents',
  columns: {
    id: text({ primaryKey: true }),
    poiId: text(),
    worldId: text(),
    name: text(),
    description: text({ default: '' }),
    type: text(),
    trigger: json(),
    recurring: boolean({ default: false }),
    durationWatches: integer({ default: 1 }),
    isActive: boolean({ default: true }),
    effects: text({ default: '' }),
    tags: json({ schema: Schema.Array(Schema.String) }),
    createdAt: integer(),
    updatedAt: integer(),
  },
})

// ---------------------------------------------------------------------------
// gameMaps
// ---------------------------------------------------------------------------
export const gameMapsTable = table({
  name: 'gameMaps',
  columns: {
    id: text({ primaryKey: true }),
    name: text(),
    ownerRealmId: text({ nullable: true }),
    ownerPoiId: text({ nullable: true }),
    imageUrl: text({ default: '' }),
    width: integer({ default: 0 }),
    height: integer({ default: 0 }),
    sortOrder: integer({ default: 0 }),
    createdAt: integer(),
    updatedAt: integer(),
  },
})

// ---------------------------------------------------------------------------
// rumors
// ---------------------------------------------------------------------------
export const rumorsTable = table({
  name: 'rumors',
  columns: {
    id: text({ primaryKey: true }),
    poiId: text({ nullable: true }),
    regionId: text({ nullable: true }),
    worldId: text(),
    text: text(),
    source: text({ default: '' }),
    isUsed: boolean({ default: false }),
    isQuestHook: boolean({ default: false }),
    tags: json({ schema: Schema.Array(Schema.String) }),
    createdAt: integer(),
    updatedAt: integer(),
  },
})

// ---------------------------------------------------------------------------
// notices
// ---------------------------------------------------------------------------
export const noticesTable = table({
  name: 'notices',
  columns: {
    id: text({ primaryKey: true }),
    poiId: text({ nullable: true }),
    regionId: text({ nullable: true }),
    worldId: text(),
    title: text(),
    description: text({ default: '' }),
    type: text(),
    reward: text({ default: '' }),
    contactNpcId: text({ nullable: true }),
    isUsed: boolean({ default: false }),
    tags: json({ schema: Schema.Array(Schema.String) }),
    createdAt: integer(),
    updatedAt: integer(),
  },
})

// ---------------------------------------------------------------------------
// encounterTables
// ---------------------------------------------------------------------------
export const encounterTablesTable = table({
  name: 'encounterTables',
  columns: {
    id: text({ primaryKey: true }),
    ownerPoiId: text({ nullable: true }),
    ownerRegionId: text({ nullable: true }),
    worldId: text(),
    creature: json({ schema: Schema.Array(Schema.String) }),
    signOmen: json({ schema: Schema.Array(Schema.String) }),
    loss: json({ schema: Schema.Array(Schema.String) }),
    npc: json({ schema: Schema.Array(Schema.String) }),
    discovery: json({ schema: Schema.Array(Schema.String) }),
    treasure: json({ schema: Schema.Array(Schema.String) }),
    customSections: json(),
    disabledCategories: json({ schema: Schema.Array(Schema.String) }),
    createdAt: integer(),
    updatedAt: integer(),
  },
})

// ---------------------------------------------------------------------------
// entityNotes
// ---------------------------------------------------------------------------
export const entityNotesTable = table({
  name: 'entityNotes',
  columns: {
    id: text({ primaryKey: true }),
    ownerType: text(),
    ownerId: text(),
    worldId: text(),
    title: text(),
    content: text({ default: '' }),
    sortOrder: integer({ default: 0 }),
    createdAt: integer(),
    updatedAt: integer(),
  },
})

// ---------------------------------------------------------------------------
// customCompendiumEntries
// ---------------------------------------------------------------------------
export const customCompendiumEntriesTable = table({
  name: 'customCompendiumEntries',
  columns: {
    id: text({ primaryKey: true }),
    worldId: text(),
    kind: text(),
    name: text(),
    description: text({ default: '' }),
    monsterData: json({ nullable: true }),
    spellData: json({ nullable: true }),
    magicItemData: json({ nullable: true }),
    equipmentData: json({ nullable: true }),
    createdAt: integer(),
    updatedAt: integer(),
  },
})

// ---------------------------------------------------------------------------
// Aggregated export
// ---------------------------------------------------------------------------
const tables = {
  systemConfigs: systemConfigsTable,
  worlds: worldsTable,
  regions: regionsTable,
  factions: factionsTable,
  npcs: npcsTable,
  factionRelationships: factionRelationshipsTable,
  pois: poisTable,
  paths: pathsTable,
  realmNotes: realmNotesTable,
  worldEvents: worldEventsTable,
  weatherHistory: weatherHistoryTable,
  tableSets: tableSetsTable,
  tableDefs: tableDefsTable,
  rollHistory: rollHistoryTable,
  factionPresences: factionPresencesTable,
  poiEvents: poiEventsTable,
  gameMaps: gameMapsTable,
  rumors: rumorsTable,
  notices: noticesTable,
  encounterTables: encounterTablesTable,
  entityNotes: entityNotesTable,
  customCompendiumEntries: customCompendiumEntriesTable,
}

export default tables
