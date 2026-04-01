import { newId } from '@shared/ulid'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import type { SpatialRoom } from '~/lib/dungeon/types'
import type { IPOIRepository } from '@application/ports/IPOIRepository'
import type { INPCRepository } from '@application/ports/INPCRepository'
import type { IPathRepository } from '@application/ports/IPathRepository'
import type { POI } from '@domain/entities/POI'
import type { NPC } from '@domain/entities/NPC'
import type { Trap } from '@domain/value-objects/Trap'
import type { TreasureItem } from '@domain/value-objects/TreasureItem'
import type { WanderingMonsterEntry } from '@domain/value-objects/WanderingMonster'
import type { DungeonGenOptions } from '~/lib/dungeon/types'
import { generateDungeon } from '~/lib/dungeon/DungeonGenerator'
import { getBlueprint } from '~/lib/dungeon/dungeon/DungeonBlueprints'
import { searchCompendium, getCompendiumById } from '@domain/data/compendium'
import type { CompendiumMonster } from '@domain/entities/Compendium'
import type { SystemBlock } from '@domain/value-objects/SystemBlock'
import { executeDeletePOIWithChildren } from './DeletePOIWithChildren'
import type { IFactionPresenceRepository } from '@application/ports/IFactionPresenceRepository'
import type { IPOIEventRepository } from '@application/ports/IPOIEventRepository'

export interface GenerateDungeonInput {
  poiId: string
  worldId: string
  systemId: string
  options: DungeonGenOptions
}

export interface GenerateDungeonDeps {
  poiRepo: IPOIRepository
  npcRepo: INPCRepository
  pathRepo: IPathRepository
  factionPresenceRepo: IFactionPresenceRepository
  poiEventRepo: IPOIEventRepository
}

export async function executeGenerateDungeon(
  input: GenerateDungeonInput,
  deps: GenerateDungeonDeps
): Promise<void> {
  const { poiId, worldId, systemId, options } = input
  const now = Date.now()

  const poi = await deps.poiRepo.getById(poiId)
  if (!poi) throw new Error(`POI ${poiId} not found`)

  // === 1. Wipe existing generated content ===

  // Delete all existing child POIs (rooms from previous generation)
  const existingChildren = await deps.poiRepo.getChildren(poiId)
  for (const child of existingChildren) {
    const grandchildren = await deps.poiRepo.getChildren(child.id)
    await executeDeletePOIWithChildren(
      child.id,
      grandchildren.map((c) => c.id),
      deps
    )
  }

  // Delete NPCs at this dungeon POI (generated NPCs from last run)
  const existingNPCs = await deps.npcRepo.getByPoiId(poiId)
  for (const npc of existingNPCs) {
    await deps.npcRepo.update({ ...npc, poiId: null, updatedAt: now })
  }

  // Delete paths created by previous generation (exit connections)
  if (poi.dungeonGenOptions?.exitPoiIds?.length) {
    const existingPaths = await deps.pathRepo.getByPoi(poiId)
    for (const path of existingPaths) {
      const wasGenerated =
        poi.dungeonGenOptions.exitPoiIds.includes(path.fromPoiId) ||
        poi.dungeonGenOptions.exitPoiIds.includes(path.toPoiId)
      if (wasGenerated) await deps.pathRepo.delete(path.id)
    }
  }

  // === 2. Generate dungeon ===

  const generated = generateDungeon(options.seed, options)
  const rng = new SeededRandom(`${options.seed}-use-case`)

  // === 3. Build a room ID → child POI ID map ===
  // We need this so dungeonNPCs can be placed in the right child POI
  const roomIdToPoiId = new Map<string, string>()
  const roomHasTreasure: string[] = []

  // === 4. Create child POIs for each room ===

  for (const room of generated.rooms) {
    const childPoiId = newId()
    roomIdToPoiId.set(room.id, childPoiId)

    // Map dungeon hazards → realmKeeper Trap[]
    const traps: Trap[] = room.hazards.map((h) => ({
      id: newId(),
      name: h.name,
      description: [h.description, h.trigger, h.passiveHint].filter(Boolean).join(' | '),
      dc: parseDC(h.save),
      damage: h.damage ?? '',
      disarmed: false,
    }))

    // Generate treasure based on level and room type
    const treasure: TreasureItem[] = generateRoomTreasure(
      room,
      options.treasureLevel,
      options.includeMagicItems,
      rng.child(`room-${room.id}`)
    )
    if (treasure.length > 0) roomHasTreasure.push(room.id)

    // Build GM notes from historical clues and discoveries
    const gmNotesParts: string[] = []
    if (room.historicalClues?.length) {
      gmNotesParts.push(room.historicalClues.join('\n'))
    }
    if (room.discoveries?.length) {
      for (const d of room.discoveries) {
        gmNotesParts.push(`**${d.type.charAt(0).toUpperCase() + d.type.slice(1)}:** ${d.description}`)
        if (d.content) gmNotesParts.push(d.content)
      }
    }
    if (room.secrets?.length) {
      for (const s of room.secrets) {
        gmNotesParts.push(`**Secret:** ${s.description} (${s.trigger})${s.reward ? ` — ${s.reward}` : ''}`)
      }
    }

    // Build read aloud from room features
    const featuresText = room.features.map((f) => f.description).join(' ')

    const subtypeLabel = room.themeRoomType
      ? room.themeRoomType.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      : null

    const activityText = room.activity ? `Creatures here are ${room.activity}.` : ''

    const childPoi: POI = {
      id: childPoiId,
      regionId: poi.regionId,
      parentPoiId: poiId,
      name: room.name,
      description: room.description + (activityText ? ' ' + activityText : ''),
      type: 'dungeon',
      subtypeLabel,
      floor: null,
      tags: room.isDeadEnd ? ['dead-end'] : [],
      position: null,
      mapRef: null,
      markerColor: null,
      readAloud: featuresText,
      gmNotes: gmNotesParts.join('\n\n'),
      trouble: '',
      mood: '',
      sensory: '',
      services: [],
      imageUrl: null,
      locationSeed: null,
      traps,
      treasure,
      roomWidth: room.bounds.width * 5,
      roomLength: room.bounds.height * 5,
      visited: false,
      lightLevel: null,
      wanderingMonsters: [],
      watabouSeed: null,
      watabouGenerator: null,
      watabouData: null,
      spatialDungeon: null,
      dungeonGenOptions: null,
      sessionLog: [],
      starred: false,
      monsterRefs: [],
      magicItemRefs: [],
      spellRefs: [],
      equipmentRefs: [],
      createdAt: now,
      updatedAt: now,
    }

    await deps.poiRepo.create(childPoi)
  }

  // === 5. Create NPC entities for generated dungeon NPCs ===

  // Guarantee at least one NPC for dungeons with 3+ rooms
  const dungeonNPCs = generated.dungeonNPCs ?? []
  if (dungeonNPCs.length === 0 && generated.rooms.length >= 3) {
    const inhabitantRoom = generated.rooms
      .filter((r) => r.type !== 'entrance')
      .sort((a, b) => b.depth - a.depth)[0]
    if (inhabitantRoom) {
      const inhabitants = generated.ecology?.currentInhabitants ?? 'dungeon denizen'
      dungeonNPCs.push({
        npcId: `inhabitant-${newId()}`,
        category: 'faction_leader',
        roomId: inhabitantRoom.id,
        disposition: 'hostile',
        hasInfo: `Leader of the ${inhabitants}. Knows the dungeon's secrets.`,
        wants: ['power', 'wealth'],
      })
    }
  }

  for (const dungeonNPC of dungeonNPCs) {
    // Find which child POI this NPC belongs to
    const npcPoiId = roomIdToPoiId.get(dungeonNPC.roomId) ?? poiId

    const categoryLabel = dungeonNPC.category.replace(/_/g, ' ')
    const npcName = generateNPCName(dungeonNPC.category)
    const motivation = dungeonNPC.wants?.join(', ') ?? ''

    const npc: NPC = {
      id: newId(),
      worldId,
      name: npcName,
      factionIds: [],
      regionId: poi.regionId,
      poiId: npcPoiId,
      lifeStatus: 'alive',
      movementStatus: 'present',
      description: dungeonNPC.hasInfo ?? `A ${categoryLabel} encountered in the dungeon.`,
      traits: [],
      motivation,
      appearance: '',
      voice: '',
      want: motivation,
      tags: [dungeonNPC.category, dungeonNPC.disposition],
      imageUrl: null,
      systemBlock: fallbackSystemBlock(generated.depth, options.dangerLevel, systemId),
      disposition: dungeonNPC.disposition as NPC['disposition'],
      starred: false,
      createdAt: now,
      updatedAt: now,
    }

    await deps.npcRepo.create(npc)
  }

  // === 6. Create paths for exit connections ===

  for (const exitPoiId of options.exitPoiIds) {
    await deps.pathRepo.create({
      id: newId(),
      fromPoiId: poiId,
      toPoiId: exitPoiId,
      name: 'Exit Passage',
      description: 'A passage connecting this dungeon to a nearby location.',
      type: 'passage',
      baseTravelWatches: 1,
      terrain: 'hills',
      direction: null,
      hasDoor: true,
      isLocked: false,
      doorDescription: '',
      createdAt: now,
      updatedAt: now,
    })
  }

  // === 7. Convert wandering monsters to realmKeeper format (with compendium lookup) ===

  const wanderingMonsters: WanderingMonsterEntry[] = (generated.wanderingMonsters?.entries ?? []).map((e) => {
    const compendiumId = findCompendiumId(e.creatureType, systemId)
    const fallback = fallbackSystemBlock(generated.depth, options.dangerLevel, systemId)
    return {
      name: slugToName(e.creatureType),
      creatureType: e.creatureType,
      count: e.count,
      activity: e.activity,
      compendiumId,
      npcId: null,
      customStats: compendiumId ? null : {
        ac: fallback.armor,
        hp: fallback.hp,
        attacks: fallback.attacks[0]?.damage ?? '1d6',
      },
    }
  })

  // === 7b. Place room creatures based on danger level ===

  const dangerChances: Record<string, number> = {
    low: 0.25, medium: 0.45, deadly: 0.70, very_deadly: 0.90,
  }
  const creaturePool = getBlueprint(options.theme).creaturePool
  const creatureRng = rng.child('room-creatures')
  const roomsAlreadyWithNPC = new Set(dungeonNPCs.map((n) => n.roomId))

  for (const room of generated.rooms) {
    if (room.type === 'entrance' || room.type === 'exit') continue
    if (roomsAlreadyWithNPC.has(room.id)) continue // already has a named NPC
    if (!creatureRng.chance(dangerChances[options.dangerLevel] ?? 0.45)) continue

    const creatureSlug = creatureRng.pick(creaturePool)
    const creatureName = slugToName(creatureSlug)
    const compendiumId = findCompendiumId(creatureSlug, systemId)
    const roomPoiId = roomIdToPoiId.get(room.id) ?? poiId
    const activity = room.activity ?? 'guarding'

    const creatureNpc: NPC = {
      id: newId(),
      worldId,
      name: creatureName,
      factionIds: [],
      regionId: poi.regionId,
      poiId: roomPoiId,
      lifeStatus: 'alive',
      movementStatus: 'present',
      description: `${creatureName} — ${activity}.`,
      traits: [],
      motivation: '',
      appearance: '',
      voice: '',
      want: '',
      tags: ['creature', options.theme],
      imageUrl: null,
      systemBlock: compendiumId
        ? systemBlockFromMonster(compendiumId)
        : fallbackSystemBlock(room.depth, options.dangerLevel, systemId),
      disposition: 'hostile',
      starred: false,
      createdAt: now,
      updatedAt: now,
    }

    // If we have a compendium entry, also add it as a monsterRef on the room POI
    // (NPC creation handles the room link; compendiumId stored in wandering monsters handles stats)
    await deps.npcRepo.create(creatureNpc)

    // Track for the map indicator
    dungeonNPCs.push({
      npcId: creatureNpc.id,
      category: 'faction_member',
      roomId: room.id,
      disposition: 'hostile',
    })
  }

  // === 8. Save generated dungeon on parent POI (with room→POI map) ===

  const generatedWithMap = {
    ...generated,
    roomPoiMap: Object.fromEntries(roomIdToPoiId),
    roomHasTreasure,
  }

  const updatedPoi: POI = {
    ...poi,
    spatialDungeon: generatedWithMap,
    dungeonGenOptions: options,
    wanderingMonsters,
    updatedAt: now,
  }

  await deps.poiRepo.update(updatedPoi)
}

// === Helpers ===

function parseDC(save?: string): number | null {
  if (!save) return null
  const match = save.match(/DC\s*(\d+)/)
  return match ? parseInt(match[1], 10) : null
}


// Treasure tables by level
const COIN_TREASURE: Record<string, { name: string; value: string }[]> = {
  poor:     [{ name: 'Handful of copper pieces', value: '1d6 cp' }, { name: 'Tarnished silver coins', value: '2d6 sp' }],
  standard: [{ name: 'Silver coins', value: '2d10 sp' }, { name: 'Gold pieces', value: '1d6 gp' }, { name: 'Gem (rough)', value: '10 gp' }],
  rich:     [{ name: 'Gold pieces', value: '3d6 gp' }, { name: 'Polished gem', value: '50 gp' }, { name: 'Jeweled goblet', value: '100 gp' }],
  hoard:    [{ name: 'Gold & platinum coins', value: '5d10 gp' }, { name: 'Precious gem', value: '250 gp' }, { name: 'Ornate art object', value: '500 gp' }, { name: 'Ancient coin cache', value: '1d6 × 100 gp' }],
}

const MAGIC_ITEM_NAMES = [
  'Potion of Healing', 'Scroll of Arcane Knowledge', 'Enchanted Blade Fragment',
  'Ring of Minor Ward', 'Wand of Sparks', 'Amulet of Whispers',
  'Vial of Witch-Fire', 'Cloak of Shadows (tattered)', 'Lens of True Sight',
  'Boot of Silent Step', 'Dagger of Returning', 'Horn of the Fallen',
]

function generateRoomTreasure(
  room: SpatialRoom,
  level: string,
  includeMagicItems: boolean,
  rng: SeededRandom
): TreasureItem[] {
  const isTreasureRoom = room.themeRoomType === 'treasure_vault' ||
    room.themeRoomType === 'loot_storage' ||
    room.themeRoomType === 'treasure_grotto'

  const chances: Record<string, { deadEnd: number; treasure: number; other: number }> = {
    poor:     { deadEnd: 0.35, treasure: 0.85, other: 0.05 },
    standard: { deadEnd: 0.60, treasure: 1.00, other: 0.15 },
    rich:     { deadEnd: 0.85, treasure: 1.00, other: 0.35 },
    hoard:    { deadEnd: 1.00, treasure: 1.00, other: 0.55 },
  }
  const chance = chances[level] ?? chances.standard
  const roll = isTreasureRoom ? chance.treasure : room.isDeadEnd ? chance.deadEnd : chance.other

  if (!rng.chance(roll)) return []

  const items: TreasureItem[] = []
  const pool = COIN_TREASURE[level] ?? COIN_TREASURE.standard
  const count = isTreasureRoom ? rng.between(2, 4) : rng.between(1, 2)

  for (let i = 0; i < count; i++) {
    const pick = rng.pick(pool)
    items.push({ id: newId(), name: pick.name, description: '', value: pick.value, quantity: 1, collected: false })
  }

  // Magic item chance
  if (includeMagicItems && (isTreasureRoom || room.isDeadEnd) && rng.chance(0.35)) {
    items.push({
      id: newId(),
      name: rng.pick(MAGIC_ITEM_NAMES),
      description: 'A magical item found among the dungeon\'s treasures.',
      value: 'priceless',
      quantity: 1,
      collected: false,
      isMagic: true,
    })
  }

  return items
}

/** Build a SystemBlock from a compendium monster entry */
function systemBlockFromMonster(id: string): SystemBlock {
  const entry = getCompendiumById(id) as CompendiumMonster | undefined
  if (!entry) return emptySystemBlock()

  const sd = entry.systemData
  if (sd.system === 'shadowdark') {
    const d = sd.data
    return {
      stats: [
        { key: 'STR', value: d.strength },
        { key: 'DEX', value: d.dexterity },
        { key: 'CON', value: d.constitution },
        { key: 'INT', value: d.intelligence },
        { key: 'WIS', value: d.wisdom },
        { key: 'CHA', value: d.charisma },
      ],
      hp: d.hitPoints,
      maxHp: d.hitPoints,
      armor: d.armorClass,
      level: d.level,
      attacks: d.attacks ? [{ name: 'Attack', damage: d.attacks, description: '' }] : [],
      inventory: [],
      abilities: d.traits?.map((t) => `${t.name}: ${t.description}`) ?? [],
      notes: [d.armorType, d.movement, d.alignment].filter(Boolean).join(' | '),
    }
  }

  if (sd.system === 'cairn') {
    const d = sd.data
    const s = d.stats ?? ''
    // Parse: "4 HP, 1 Armor, 8 STR, 11 DEX, 14 WIL, claws (d6)"
    const hp = parseInt(s.match(/(\d+)\s*HP/i)?.[1] ?? '0')
    const armor = parseInt(s.match(/(\d+)\s*Armor/i)?.[1] ?? '0')
    const str = parseInt(s.match(/(\d+)\s*STR/i)?.[1] ?? '0')
    const dex = parseInt(s.match(/(\d+)\s*DEX/i)?.[1] ?? '0')
    const wil = parseInt(s.match(/(\d+)\s*WIL/i)?.[1] ?? '0')
    // Last token with a damage die: "claws (d6)" or "bite (d8+d6)"
    const attackMatch = s.match(/([^,]+\([\dd+]+\))[^,]*$/)
    const attackStr = attackMatch?.[1]?.trim() ?? ''
    const [attackName, attackDamage] = attackStr.includes('(')
      ? [attackStr.slice(0, attackStr.indexOf('(')).trim(), attackStr.match(/\(([\dd+]+)\)/)?.[1] ?? '']
      : [attackStr, '']

    return {
      stats: [
        ...(str > 0 ? [{ key: 'STR', value: str }] : []),
        ...(dex > 0 ? [{ key: 'DEX', value: dex }] : []),
        ...(wil > 0 ? [{ key: 'WIL', value: wil }] : []),
      ],
      hp,
      maxHp: hp,
      armor,
      attacks: attackDamage ? [{ name: attackName || 'Attack', damage: attackDamage, description: '' }] : [],
      inventory: [],
      abilities: d.details ?? [],
      notes: s,
    }
  }

  return emptySystemBlock()
}

function emptySystemBlock(): SystemBlock {
  return { stats: [], hp: 0, maxHp: 0, armor: 0, attacks: [], inventory: [], abilities: [], notes: '' }
}

/**
 * Fallback stat block based on dungeon depth + danger level + system.
 * Cairn uses armor 0–3 and HP 2–14. Shadowdark uses AC 10–17 and higher HP.
 */
function fallbackSystemBlock(depth: number, dangerLevel: string, systemId = ''): SystemBlock {
  const dangerBonus = { low: -1, medium: 0, deadly: 1, very_deadly: 2 }[dangerLevel] ?? 0
  const tier = Math.max(0, Math.min(3, (depth - 1) + dangerBonus))

  const isCairn = systemId.toLowerCase().includes('cairn')

  // Cairn: armor 0-3, HP 2-14, attack d4–d10 (d12 basically unheard of)
  const cairnTiers = [
    { hp: 3,  armor: 0, attack: 'd6',  level: 1, note: 'Weak creature'      },
    { hp: 6,  armor: 1, attack: 'd6',  level: 2, note: 'Average creature'   },
    { hp: 10, armor: 2, attack: 'd8',  level: 4, note: 'Tough creature'     },
    { hp: 14, armor: 3, attack: 'd10', level: 6, note: 'Dangerous creature' },
  ]

  // Shadowdark / generic: D&D-style AC 11–17, HP 4–24
  const shadowdarkTiers = [
    { hp: 4,  armor: 11, attack: '1d6',  level: 1, note: 'Weak creature'      },
    { hp: 10, armor: 13, attack: '1d8',  level: 2, note: 'Average creature'   },
    { hp: 16, armor: 15, attack: '1d10', level: 4, note: 'Tough creature'     },
    { hp: 24, armor: 17, attack: '1d12', level: 6, note: 'Dangerous creature' },
  ]

  const t = (isCairn ? cairnTiers : shadowdarkTiers)[tier]
  return {
    stats: [],
    hp: t.hp,
    maxHp: t.hp,
    armor: t.armor,
    level: t.level,
    attacks: [{ name: 'Attack', damage: t.attack, description: '' }],
    inventory: [],
    abilities: [],
    notes: t.note,
  }
}

/** Convert a creature slug to display name, e.g. "giant_spider" → "Giant Spider" */
function slugToName(slug: string): string {
  return slug.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

/** Look up a creature slug in the compendium by name, filtered to the realm's system */
function findCompendiumId(slug: string, systemId: string): string | null {
  const name = slugToName(slug)
  const results = searchCompendium(name, systemId, 'monster')
  return results[0]?.id ?? null
}

function generateNPCName(category: string): string {
  const names: Record<string, string> = {
    rival_party: 'Rival Adventurer',
    prisoner: 'Prisoner',
    hermit: 'Hermit',
    ghost: 'Restless Spirit',
    refugee: 'Refugee',
    faction_leader: 'Faction Leader',
    faction_lieutenant: 'Faction Lieutenant',
    faction_member: 'Faction Member',
    rival_scout: 'Rival Scout',
  }
  return names[category] ?? 'Unknown Figure'
}
