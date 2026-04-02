import { Events, Schema } from '@livestore/livestore'

// --- SystemConfig ---

export const systemConfigCreated = Events.synced({
  name: 'v1.SystemConfigCreated',
  schema: Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    slug: Schema.String,
    statFields: Schema.Unknown,
    hasHitProtection: Schema.Boolean,
    hasLevel: Schema.Boolean,
    hasClass: Schema.Boolean,
    hasArmor: Schema.Boolean,
    armorLabel: Schema.String,
    hpLabel: Schema.String,
    hpFormula: Schema.String,
    namingTableIds: Schema.Unknown,
  }),
})

export const systemConfigUpdated = Events.synced({
  name: 'v1.SystemConfigUpdated',
  schema: Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    slug: Schema.String,
    statFields: Schema.Unknown,
    hasHitProtection: Schema.Boolean,
    hasLevel: Schema.Boolean,
    hasClass: Schema.Boolean,
    hasArmor: Schema.Boolean,
    armorLabel: Schema.String,
    hpLabel: Schema.String,
    hpFormula: Schema.String,
    namingTableIds: Schema.Unknown,
  }),
})

export const systemConfigDeleted = Events.synced({
  name: 'v1.SystemConfigDeleted',
  schema: Schema.Struct({ id: Schema.String }),
})

// --- World ---

export const worldCreated = Events.synced({
  name: 'v1.WorldCreated',
  schema: Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    systemId: Schema.String,
    description: Schema.String,
    currentYear: Schema.Number,
    currentSeason: Schema.String,
    currentDay: Schema.Number,
    currentWatch: Schema.Number,
    daysPerSeason: Schema.Number,
    daysPerWeek: Schema.Number,
    watchesPerDay: Schema.Number,
    factionTurnTrigger: Schema.String,
    completedThroughDay: Schema.Number,
    customRaces: Schema.Unknown,
    raceColors: Schema.Unknown,
    starredMonsterIds: Schema.Unknown,
    starredSpellIds: Schema.Unknown,
    starredMagicItemIds: Schema.Unknown,
    createdAt: Schema.Number,
    updatedAt: Schema.Number,
  }),
})

export const worldUpdated = Events.synced({
  name: 'v1.WorldUpdated',
  schema: Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    systemId: Schema.String,
    description: Schema.String,
    currentYear: Schema.Number,
    currentSeason: Schema.String,
    currentDay: Schema.Number,
    currentWatch: Schema.Number,
    daysPerSeason: Schema.Number,
    daysPerWeek: Schema.Number,
    watchesPerDay: Schema.Number,
    factionTurnTrigger: Schema.String,
    completedThroughDay: Schema.Number,
    customRaces: Schema.Unknown,
    raceColors: Schema.Unknown,
    starredMonsterIds: Schema.Unknown,
    starredSpellIds: Schema.Unknown,
    starredMagicItemIds: Schema.Unknown,
    createdAt: Schema.Number,
    updatedAt: Schema.Number,
  }),
})

export const worldDeleted = Events.synced({
  name: 'v1.WorldDeleted',
  schema: Schema.Struct({ id: Schema.String }),
})

// --- Region ---

export const regionCreated = Events.synced({
  name: 'v1.RegionCreated',
  schema: Schema.Struct({
    id: Schema.String,
    worldId: Schema.String,
    name: Schema.String,
    description: Schema.String,
    terrain: Schema.String,
    features: Schema.Unknown,
    dangers: Schema.Unknown,
    settlements: Schema.Unknown,
    resources: Schema.Unknown,
    boundary: Schema.NullOr(Schema.Unknown),
    color: Schema.NullOr(Schema.String),
    imageUrl: Schema.NullOr(Schema.String),
    createdAt: Schema.Number,
    updatedAt: Schema.Number,
  }),
})

export const regionUpdated = Events.synced({
  name: 'v1.RegionUpdated',
  schema: Schema.Struct({
    id: Schema.String,
    worldId: Schema.String,
    name: Schema.String,
    description: Schema.String,
    terrain: Schema.String,
    features: Schema.Unknown,
    dangers: Schema.Unknown,
    settlements: Schema.Unknown,
    resources: Schema.Unknown,
    boundary: Schema.NullOr(Schema.Unknown),
    color: Schema.NullOr(Schema.String),
    imageUrl: Schema.NullOr(Schema.String),
    createdAt: Schema.Number,
    updatedAt: Schema.Number,
  }),
})

export const regionDeleted = Events.synced({
  name: 'v1.RegionDeleted',
  schema: Schema.Struct({ id: Schema.String }),
})

// --- Faction ---

export const factionCreated = Events.synced({
  name: 'v1.FactionCreated',
  schema: Schema.Struct({
    id: Schema.String,
    worldId: Schema.String,
    name: Schema.String,
    description: Schema.String,
    type: Schema.String,
    status: Schema.String,
    isParty: Schema.Boolean,
    regionId: Schema.NullOr(Schema.String),
    headquartersPoiId: Schema.NullOr(Schema.String),
    leaderNpcId: Schema.NullOr(Schema.String),
    agentNpcIds: Schema.Unknown,
    agendaGoals: Schema.Unknown,
    advantages: Schema.Unknown,
    obstacles: Schema.Unknown,
    traits: Schema.Unknown,
    sortOrder: Schema.Number,
    createdAt: Schema.Number,
    updatedAt: Schema.Number,
  }),
})

export const factionUpdated = Events.synced({
  name: 'v1.FactionUpdated',
  schema: Schema.Struct({
    id: Schema.String,
    worldId: Schema.String,
    name: Schema.String,
    description: Schema.String,
    type: Schema.String,
    status: Schema.String,
    isParty: Schema.Boolean,
    regionId: Schema.NullOr(Schema.String),
    headquartersPoiId: Schema.NullOr(Schema.String),
    leaderNpcId: Schema.NullOr(Schema.String),
    agentNpcIds: Schema.Unknown,
    agendaGoals: Schema.Unknown,
    advantages: Schema.Unknown,
    obstacles: Schema.Unknown,
    traits: Schema.Unknown,
    sortOrder: Schema.Number,
    createdAt: Schema.Number,
    updatedAt: Schema.Number,
  }),
})

export const factionDeleted = Events.synced({
  name: 'v1.FactionDeleted',
  schema: Schema.Struct({ id: Schema.String }),
})

// --- Npc ---

export const npcCreated = Events.synced({
  name: 'v1.NpcCreated',
  schema: Schema.Struct({
    id: Schema.String,
    worldId: Schema.String,
    name: Schema.String,
    race: Schema.NullOr(Schema.String),
    factionIds: Schema.Unknown,
    regionId: Schema.NullOr(Schema.String),
    poiId: Schema.NullOr(Schema.String),
    lifeStatus: Schema.String,
    movementStatus: Schema.String,
    description: Schema.String,
    traits: Schema.Unknown,
    motivation: Schema.String,
    appearance: Schema.String,
    voice: Schema.String,
    want: Schema.String,
    tags: Schema.Unknown,
    imageUrl: Schema.NullOr(Schema.String),
    systemBlock: Schema.Unknown,
    disposition: Schema.NullOr(Schema.String),
    starred: Schema.Boolean,
    createdAt: Schema.Number,
    updatedAt: Schema.Number,
  }),
})

export const npcUpdated = Events.synced({
  name: 'v1.NpcUpdated',
  schema: Schema.Struct({
    id: Schema.String,
    worldId: Schema.String,
    name: Schema.String,
    race: Schema.NullOr(Schema.String),
    factionIds: Schema.Unknown,
    regionId: Schema.NullOr(Schema.String),
    poiId: Schema.NullOr(Schema.String),
    lifeStatus: Schema.String,
    movementStatus: Schema.String,
    description: Schema.String,
    traits: Schema.Unknown,
    motivation: Schema.String,
    appearance: Schema.String,
    voice: Schema.String,
    want: Schema.String,
    tags: Schema.Unknown,
    imageUrl: Schema.NullOr(Schema.String),
    systemBlock: Schema.Unknown,
    disposition: Schema.NullOr(Schema.String),
    starred: Schema.Boolean,
    createdAt: Schema.Number,
    updatedAt: Schema.Number,
  }),
})

export const npcDeleted = Events.synced({
  name: 'v1.NpcDeleted',
  schema: Schema.Struct({ id: Schema.String }),
})

// --- FactionRelationship ---

export const factionRelationshipCreated = Events.synced({
  name: 'v1.FactionRelationshipCreated',
  schema: Schema.Struct({
    id: Schema.String,
    factionId: Schema.String,
    targetId: Schema.String,
    score: Schema.Number,
    events: Schema.Unknown,
    updatedAt: Schema.Number,
  }),
})

export const factionRelationshipUpdated = Events.synced({
  name: 'v1.FactionRelationshipUpdated',
  schema: Schema.Struct({
    id: Schema.String,
    factionId: Schema.String,
    targetId: Schema.String,
    score: Schema.Number,
    events: Schema.Unknown,
    updatedAt: Schema.Number,
  }),
})

export const factionRelationshipDeleted = Events.synced({
  name: 'v1.FactionRelationshipDeleted',
  schema: Schema.Struct({ id: Schema.String }),
})

// --- Poi ---

export const poiCreated = Events.synced({
  name: 'v1.PoiCreated',
  schema: Schema.Struct({
    id: Schema.String,
    regionId: Schema.String,
    parentPoiId: Schema.NullOr(Schema.String),
    name: Schema.String,
    description: Schema.String,
    type: Schema.String,
    subtypeLabel: Schema.NullOr(Schema.String),
    floor: Schema.NullOr(Schema.Number),
    tags: Schema.Unknown,
    position: Schema.NullOr(Schema.Unknown),
    mapRef: Schema.NullOr(Schema.String),
    markerColor: Schema.NullOr(Schema.String),
    readAloud: Schema.String,
    gmNotes: Schema.String,
    trouble: Schema.String,
    mood: Schema.String,
    sensory: Schema.String,
    services: Schema.Unknown,
    imageUrl: Schema.NullOr(Schema.String),
    monsterRefs: Schema.Unknown,
    magicItemRefs: Schema.Unknown,
    spellRefs: Schema.Unknown,
    equipmentRefs: Schema.Unknown,
    locationSeed: Schema.NullOr(Schema.Unknown),
    traps: Schema.Unknown,
    treasure: Schema.Unknown,
    roomWidth: Schema.NullOr(Schema.Number),
    roomLength: Schema.NullOr(Schema.Number),
    visited: Schema.Boolean,
    lightLevel: Schema.NullOr(Schema.String),
    wanderingMonsters: Schema.Unknown,
    watabouSeed: Schema.NullOr(Schema.String),
    watabouGenerator: Schema.NullOr(Schema.String),
    watabouData: Schema.NullOr(Schema.Unknown),
    sessionLog: Schema.Unknown,
    spatialDungeon: Schema.NullOr(Schema.Unknown),
    dungeonGenOptions: Schema.NullOr(Schema.Unknown),
    starred: Schema.Boolean,
    createdAt: Schema.Number,
    updatedAt: Schema.Number,
  }),
})

export const poiUpdated = Events.synced({
  name: 'v1.PoiUpdated',
  schema: Schema.Struct({
    id: Schema.String,
    regionId: Schema.String,
    parentPoiId: Schema.NullOr(Schema.String),
    name: Schema.String,
    description: Schema.String,
    type: Schema.String,
    subtypeLabel: Schema.NullOr(Schema.String),
    floor: Schema.NullOr(Schema.Number),
    tags: Schema.Unknown,
    position: Schema.NullOr(Schema.Unknown),
    mapRef: Schema.NullOr(Schema.String),
    markerColor: Schema.NullOr(Schema.String),
    readAloud: Schema.String,
    gmNotes: Schema.String,
    trouble: Schema.String,
    mood: Schema.String,
    sensory: Schema.String,
    services: Schema.Unknown,
    imageUrl: Schema.NullOr(Schema.String),
    monsterRefs: Schema.Unknown,
    magicItemRefs: Schema.Unknown,
    spellRefs: Schema.Unknown,
    equipmentRefs: Schema.Unknown,
    locationSeed: Schema.NullOr(Schema.Unknown),
    traps: Schema.Unknown,
    treasure: Schema.Unknown,
    roomWidth: Schema.NullOr(Schema.Number),
    roomLength: Schema.NullOr(Schema.Number),
    visited: Schema.Boolean,
    lightLevel: Schema.NullOr(Schema.String),
    wanderingMonsters: Schema.Unknown,
    watabouSeed: Schema.NullOr(Schema.String),
    watabouGenerator: Schema.NullOr(Schema.String),
    watabouData: Schema.NullOr(Schema.Unknown),
    sessionLog: Schema.Unknown,
    spatialDungeon: Schema.NullOr(Schema.Unknown),
    dungeonGenOptions: Schema.NullOr(Schema.Unknown),
    starred: Schema.Boolean,
    createdAt: Schema.Number,
    updatedAt: Schema.Number,
  }),
})

export const poiDeleted = Events.synced({
  name: 'v1.PoiDeleted',
  schema: Schema.Struct({ id: Schema.String }),
})

// --- Path ---

export const pathCreated = Events.synced({
  name: 'v1.PathCreated',
  schema: Schema.Struct({
    id: Schema.String,
    fromPoiId: Schema.String,
    toPoiId: Schema.String,
    name: Schema.String,
    description: Schema.String,
    type: Schema.String,
    baseTravelWatches: Schema.Number,
    terrain: Schema.String,
    direction: Schema.NullOr(Schema.String),
    hasDoor: Schema.Boolean,
    isLocked: Schema.Boolean,
    doorDescription: Schema.String,
    createdAt: Schema.Number,
    updatedAt: Schema.Number,
  }),
})

export const pathUpdated = Events.synced({
  name: 'v1.PathUpdated',
  schema: Schema.Struct({
    id: Schema.String,
    fromPoiId: Schema.String,
    toPoiId: Schema.String,
    name: Schema.String,
    description: Schema.String,
    type: Schema.String,
    baseTravelWatches: Schema.Number,
    terrain: Schema.String,
    direction: Schema.NullOr(Schema.String),
    hasDoor: Schema.Boolean,
    isLocked: Schema.Boolean,
    doorDescription: Schema.String,
    createdAt: Schema.Number,
    updatedAt: Schema.Number,
  }),
})

export const pathDeleted = Events.synced({
  name: 'v1.PathDeleted',
  schema: Schema.Struct({ id: Schema.String }),
})

// --- RealmNote ---

export const realmNoteCreated = Events.synced({
  name: 'v1.RealmNoteCreated',
  schema: Schema.Struct({
    id: Schema.String,
    worldId: Schema.String,
    title: Schema.String,
    content: Schema.String,
    isMain: Schema.Boolean,
    sortOrder: Schema.Number,
    createdAt: Schema.Number,
    updatedAt: Schema.Number,
  }),
})

export const realmNoteUpdated = Events.synced({
  name: 'v1.RealmNoteUpdated',
  schema: Schema.Struct({
    id: Schema.String,
    worldId: Schema.String,
    title: Schema.String,
    content: Schema.String,
    isMain: Schema.Boolean,
    sortOrder: Schema.Number,
    createdAt: Schema.Number,
    updatedAt: Schema.Number,
  }),
})

export const realmNoteDeleted = Events.synced({
  name: 'v1.RealmNoteDeleted',
  schema: Schema.Struct({ id: Schema.String }),
})

// --- WorldEvent ---

export const worldEventCreated = Events.synced({
  name: 'v1.WorldEventCreated',
  schema: Schema.Struct({
    id: Schema.String,
    worldId: Schema.String,
    year: Schema.Number,
    season: Schema.String,
    day: Schema.Number,
    watch: Schema.Number,
    type: Schema.String,
    title: Schema.String,
    description: Schema.String,
    relatedEntityIds: Schema.Unknown,
    createdAt: Schema.Number,
  }),
})

export const worldEventDeleted = Events.synced({
  name: 'v1.WorldEventDeleted',
  schema: Schema.Struct({ id: Schema.String }),
})

// --- WeatherHistory ---

export const weatherHistoryCreated = Events.synced({
  name: 'v1.WeatherHistoryCreated',
  schema: Schema.Struct({
    id: Schema.String,
    worldId: Schema.String,
    year: Schema.Number,
    season: Schema.String,
    day: Schema.Number,
    watch: Schema.Number,
    condition: Schema.String,
    severity: Schema.String,
    createdAt: Schema.Number,
  }),
})

export const weatherHistoryDeleted = Events.synced({
  name: 'v1.WeatherHistoryDeleted',
  schema: Schema.Struct({ id: Schema.String }),
})

// --- TableSet ---

export const tableSetCreated = Events.synced({
  name: 'v1.TableSetCreated',
  schema: Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    source: Schema.String,
    systemId: Schema.NullOr(Schema.String),
    tableIds: Schema.Unknown,
  }),
})

export const tableSetUpdated = Events.synced({
  name: 'v1.TableSetUpdated',
  schema: Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    source: Schema.String,
    systemId: Schema.NullOr(Schema.String),
    tableIds: Schema.Unknown,
  }),
})

export const tableSetDeleted = Events.synced({
  name: 'v1.TableSetDeleted',
  schema: Schema.Struct({ id: Schema.String }),
})

// --- TableDef ---

export const tableDefCreated = Events.synced({
  name: 'v1.TableDefCreated',
  schema: Schema.Struct({
    id: Schema.String,
    setId: Schema.String,
    name: Schema.String,
    diceFormula: Schema.String,
    entries: Schema.Unknown,
    tags: Schema.Unknown,
    systemId: Schema.NullOr(Schema.String),
  }),
})

export const tableDefUpdated = Events.synced({
  name: 'v1.TableDefUpdated',
  schema: Schema.Struct({
    id: Schema.String,
    setId: Schema.String,
    name: Schema.String,
    diceFormula: Schema.String,
    entries: Schema.Unknown,
    tags: Schema.Unknown,
    systemId: Schema.NullOr(Schema.String),
  }),
})

export const tableDefDeleted = Events.synced({
  name: 'v1.TableDefDeleted',
  schema: Schema.Struct({ id: Schema.String }),
})

// --- RollHistory ---

export const rollHistoryCreated = Events.synced({
  name: 'v1.RollHistoryCreated',
  schema: Schema.Struct({
    id: Schema.String,
    worldId: Schema.String,
    tableId: Schema.String,
    tableName: Schema.String,
    result: Schema.String,
    rolls: Schema.Unknown,
    total: Schema.Number,
    timestamp: Schema.Number,
  }),
})

// --- FactionPresence ---

export const factionPresenceCreated = Events.synced({
  name: 'v1.FactionPresenceCreated',
  schema: Schema.Struct({
    id: Schema.String,
    factionId: Schema.String,
    poiId: Schema.String,
    type: Schema.String,
    notes: Schema.String,
    createdAt: Schema.Number,
    updatedAt: Schema.Number,
  }),
})

export const factionPresenceUpdated = Events.synced({
  name: 'v1.FactionPresenceUpdated',
  schema: Schema.Struct({
    id: Schema.String,
    factionId: Schema.String,
    poiId: Schema.String,
    type: Schema.String,
    notes: Schema.String,
    createdAt: Schema.Number,
    updatedAt: Schema.Number,
  }),
})

export const factionPresenceDeleted = Events.synced({
  name: 'v1.FactionPresenceDeleted',
  schema: Schema.Struct({ id: Schema.String }),
})

// --- PoiEvent ---

export const poiEventCreated = Events.synced({
  name: 'v1.PoiEventCreated',
  schema: Schema.Struct({
    id: Schema.String,
    poiId: Schema.String,
    worldId: Schema.String,
    name: Schema.String,
    description: Schema.String,
    type: Schema.String,
    trigger: Schema.Unknown,
    recurring: Schema.Boolean,
    durationWatches: Schema.Number,
    isActive: Schema.Boolean,
    effects: Schema.String,
    tags: Schema.Unknown,
    createdAt: Schema.Number,
    updatedAt: Schema.Number,
  }),
})

export const poiEventUpdated = Events.synced({
  name: 'v1.PoiEventUpdated',
  schema: Schema.Struct({
    id: Schema.String,
    poiId: Schema.String,
    worldId: Schema.String,
    name: Schema.String,
    description: Schema.String,
    type: Schema.String,
    trigger: Schema.Unknown,
    recurring: Schema.Boolean,
    durationWatches: Schema.Number,
    isActive: Schema.Boolean,
    effects: Schema.String,
    tags: Schema.Unknown,
    createdAt: Schema.Number,
    updatedAt: Schema.Number,
  }),
})

export const poiEventDeleted = Events.synced({
  name: 'v1.PoiEventDeleted',
  schema: Schema.Struct({ id: Schema.String }),
})

// --- GameMap ---

export const gameMapCreated = Events.synced({
  name: 'v1.GameMapCreated',
  schema: Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    ownerRealmId: Schema.NullOr(Schema.String),
    ownerPoiId: Schema.NullOr(Schema.String),
    imageUrl: Schema.String,
    width: Schema.Number,
    height: Schema.Number,
    sortOrder: Schema.Number,
    createdAt: Schema.Number,
    updatedAt: Schema.Number,
  }),
})

export const gameMapUpdated = Events.synced({
  name: 'v1.GameMapUpdated',
  schema: Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    ownerRealmId: Schema.NullOr(Schema.String),
    ownerPoiId: Schema.NullOr(Schema.String),
    imageUrl: Schema.String,
    width: Schema.Number,
    height: Schema.Number,
    sortOrder: Schema.Number,
    createdAt: Schema.Number,
    updatedAt: Schema.Number,
  }),
})

export const gameMapDeleted = Events.synced({
  name: 'v1.GameMapDeleted',
  schema: Schema.Struct({ id: Schema.String }),
})

// --- Rumor ---

export const rumorCreated = Events.synced({
  name: 'v1.RumorCreated',
  schema: Schema.Struct({
    id: Schema.String,
    poiId: Schema.NullOr(Schema.String),
    regionId: Schema.NullOr(Schema.String),
    worldId: Schema.String,
    text: Schema.String,
    source: Schema.String,
    isUsed: Schema.Boolean,
    isQuestHook: Schema.Boolean,
    tags: Schema.Unknown,
    createdAt: Schema.Number,
    updatedAt: Schema.Number,
  }),
})

export const rumorUpdated = Events.synced({
  name: 'v1.RumorUpdated',
  schema: Schema.Struct({
    id: Schema.String,
    poiId: Schema.NullOr(Schema.String),
    regionId: Schema.NullOr(Schema.String),
    worldId: Schema.String,
    text: Schema.String,
    source: Schema.String,
    isUsed: Schema.Boolean,
    isQuestHook: Schema.Boolean,
    tags: Schema.Unknown,
    createdAt: Schema.Number,
    updatedAt: Schema.Number,
  }),
})

export const rumorDeleted = Events.synced({
  name: 'v1.RumorDeleted',
  schema: Schema.Struct({ id: Schema.String }),
})

// --- Notice ---

export const noticeCreated = Events.synced({
  name: 'v1.NoticeCreated',
  schema: Schema.Struct({
    id: Schema.String,
    poiId: Schema.NullOr(Schema.String),
    regionId: Schema.NullOr(Schema.String),
    worldId: Schema.String,
    title: Schema.String,
    description: Schema.String,
    type: Schema.String,
    reward: Schema.String,
    contactNpcId: Schema.NullOr(Schema.String),
    isUsed: Schema.Boolean,
    tags: Schema.Unknown,
    createdAt: Schema.Number,
    updatedAt: Schema.Number,
  }),
})

export const noticeUpdated = Events.synced({
  name: 'v1.NoticeUpdated',
  schema: Schema.Struct({
    id: Schema.String,
    poiId: Schema.NullOr(Schema.String),
    regionId: Schema.NullOr(Schema.String),
    worldId: Schema.String,
    title: Schema.String,
    description: Schema.String,
    type: Schema.String,
    reward: Schema.String,
    contactNpcId: Schema.NullOr(Schema.String),
    isUsed: Schema.Boolean,
    tags: Schema.Unknown,
    createdAt: Schema.Number,
    updatedAt: Schema.Number,
  }),
})

export const noticeDeleted = Events.synced({
  name: 'v1.NoticeDeleted',
  schema: Schema.Struct({ id: Schema.String }),
})

// --- EncounterTable ---

export const encounterTableCreated = Events.synced({
  name: 'v1.EncounterTableCreated',
  schema: Schema.Struct({
    id: Schema.String,
    ownerPoiId: Schema.NullOr(Schema.String),
    ownerRegionId: Schema.NullOr(Schema.String),
    worldId: Schema.String,
    creature: Schema.Unknown,
    signOmen: Schema.Unknown,
    loss: Schema.Unknown,
    npc: Schema.Unknown,
    discovery: Schema.Unknown,
    treasure: Schema.Unknown,
    customSections: Schema.Unknown,
    disabledCategories: Schema.Unknown,
    createdAt: Schema.Number,
    updatedAt: Schema.Number,
  }),
})

export const encounterTableUpdated = Events.synced({
  name: 'v1.EncounterTableUpdated',
  schema: Schema.Struct({
    id: Schema.String,
    ownerPoiId: Schema.NullOr(Schema.String),
    ownerRegionId: Schema.NullOr(Schema.String),
    worldId: Schema.String,
    creature: Schema.Unknown,
    signOmen: Schema.Unknown,
    loss: Schema.Unknown,
    npc: Schema.Unknown,
    discovery: Schema.Unknown,
    treasure: Schema.Unknown,
    customSections: Schema.Unknown,
    disabledCategories: Schema.Unknown,
    createdAt: Schema.Number,
    updatedAt: Schema.Number,
  }),
})

export const encounterTableDeleted = Events.synced({
  name: 'v1.EncounterTableDeleted',
  schema: Schema.Struct({ id: Schema.String }),
})

// --- EntityNote ---

export const entityNoteCreated = Events.synced({
  name: 'v1.EntityNoteCreated',
  schema: Schema.Struct({
    id: Schema.String,
    ownerType: Schema.String,
    ownerId: Schema.String,
    worldId: Schema.String,
    title: Schema.String,
    content: Schema.String,
    sortOrder: Schema.Number,
    createdAt: Schema.Number,
    updatedAt: Schema.Number,
  }),
})

export const entityNoteUpdated = Events.synced({
  name: 'v1.EntityNoteUpdated',
  schema: Schema.Struct({
    id: Schema.String,
    ownerType: Schema.String,
    ownerId: Schema.String,
    worldId: Schema.String,
    title: Schema.String,
    content: Schema.String,
    sortOrder: Schema.Number,
    createdAt: Schema.Number,
    updatedAt: Schema.Number,
  }),
})

export const entityNoteDeleted = Events.synced({
  name: 'v1.EntityNoteDeleted',
  schema: Schema.Struct({ id: Schema.String }),
})

// --- CustomCompendiumEntry ---

export const customCompendiumEntryCreated = Events.synced({
  name: 'v1.CustomCompendiumEntryCreated',
  schema: Schema.Struct({
    id: Schema.String,
    worldId: Schema.String,
    kind: Schema.String,
    name: Schema.String,
    description: Schema.String,
    monsterData: Schema.NullOr(Schema.Unknown),
    spellData: Schema.NullOr(Schema.Unknown),
    magicItemData: Schema.NullOr(Schema.Unknown),
    equipmentData: Schema.NullOr(Schema.Unknown),
    createdAt: Schema.Number,
    updatedAt: Schema.Number,
  }),
})

export const customCompendiumEntryUpdated = Events.synced({
  name: 'v1.CustomCompendiumEntryUpdated',
  schema: Schema.Struct({
    id: Schema.String,
    worldId: Schema.String,
    kind: Schema.String,
    name: Schema.String,
    description: Schema.String,
    monsterData: Schema.NullOr(Schema.Unknown),
    spellData: Schema.NullOr(Schema.Unknown),
    magicItemData: Schema.NullOr(Schema.Unknown),
    equipmentData: Schema.NullOr(Schema.Unknown),
    createdAt: Schema.Number,
    updatedAt: Schema.Number,
  }),
})

export const customCompendiumEntryDeleted = Events.synced({
  name: 'v1.CustomCompendiumEntryDeleted',
  schema: Schema.Struct({ id: Schema.String }),
})

// --- Aggregated events object ---

export const events = {
  systemConfigCreated,
  systemConfigUpdated,
  systemConfigDeleted,
  worldCreated,
  worldUpdated,
  worldDeleted,
  regionCreated,
  regionUpdated,
  regionDeleted,
  factionCreated,
  factionUpdated,
  factionDeleted,
  npcCreated,
  npcUpdated,
  npcDeleted,
  factionRelationshipCreated,
  factionRelationshipUpdated,
  factionRelationshipDeleted,
  poiCreated,
  poiUpdated,
  poiDeleted,
  pathCreated,
  pathUpdated,
  pathDeleted,
  realmNoteCreated,
  realmNoteUpdated,
  realmNoteDeleted,
  worldEventCreated,
  worldEventDeleted,
  weatherHistoryCreated,
  weatherHistoryDeleted,
  tableSetCreated,
  tableSetUpdated,
  tableSetDeleted,
  tableDefCreated,
  tableDefUpdated,
  tableDefDeleted,
  rollHistoryCreated,
  factionPresenceCreated,
  factionPresenceUpdated,
  factionPresenceDeleted,
  poiEventCreated,
  poiEventUpdated,
  poiEventDeleted,
  gameMapCreated,
  gameMapUpdated,
  gameMapDeleted,
  rumorCreated,
  rumorUpdated,
  rumorDeleted,
  noticeCreated,
  noticeUpdated,
  noticeDeleted,
  encounterTableCreated,
  encounterTableUpdated,
  encounterTableDeleted,
  entityNoteCreated,
  entityNoteUpdated,
  entityNoteDeleted,
  customCompendiumEntryCreated,
  customCompendiumEntryUpdated,
  customCompendiumEntryDeleted,
}
