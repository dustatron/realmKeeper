import { newId } from '@shared/ulid'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'
import type { IPOIRepository } from '@application/ports/IPOIRepository'
import type { INPCRepository } from '@application/ports/INPCRepository'
import type { IPathRepository } from '@application/ports/IPathRepository'
import type { POI } from '@domain/entities/POI'
import type { NPC } from '@domain/entities/NPC'
import type { Trap } from '@domain/value-objects/Trap'
import type { WanderingMonsterEntry } from '@domain/value-objects/WanderingMonster'
import type { TreasureItem } from '@domain/value-objects/TreasureItem'
import type { DungeonGenOptions } from '~/lib/dungeon/types'
import { generateDungeon } from '~/lib/dungeon/DungeonGenerator'
import { getBlueprint } from '~/lib/dungeon/dungeon/DungeonBlueprints'
import { generateRoomTreasure, generateMagicItems, generateSpellScrolls, generateWeapons, generateGear } from '~/lib/dungeon/treasure-gen'
import { resolveCreature, systemBlockFromMonster, fallbackSystemBlock, getMonsterDescription } from '~/lib/dungeon/compendium-utils'
import { generateNPCName } from '~/lib/dungeon/npc-names'
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

  const existingChildren = await deps.poiRepo.getChildren(poiId)
  for (const child of existingChildren) {
    const grandchildren = await deps.poiRepo.getChildren(child.id)
    await executeDeletePOIWithChildren(child.id, grandchildren.map((c) => c.id), deps)
  }

  const existingNPCs = await deps.npcRepo.getByPoiId(poiId)
  for (const npc of existingNPCs) {
    await deps.npcRepo.update({ ...npc, poiId: null, updatedAt: now })
  }

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

  // === 3. Build room ID → child POI ID map ===

  const roomIdToPoiId = new Map<string, string>()
  const roomHasTreasure: string[] = []

  // === 4. Create child POIs for each room ===

  for (const room of generated.rooms) {
    const childPoiId = newId()
    roomIdToPoiId.set(room.id, childPoiId)

    const traps: Trap[] = room.hazards.map((h) => ({
      id: newId(),
      name: h.name,
      description: [h.description, h.trigger, h.passiveHint].filter(Boolean).join(' | '),
      dc: parseDC(h.save),
      damage: h.damage ?? '',
      disarmed: false,
    }))

    const treasure = generateRoomTreasure(room, options.treasureLevel, rng.child(`room-${room.id}`))
    if (treasure.length > 0) roomHasTreasure.push(room.id)

    const gmNotesParts: string[] = []
    if (room.historicalClues?.length) gmNotesParts.push(room.historicalClues.join('\n'))
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

    const subtypeLabel = room.themeRoomType
      ? room.themeRoomType.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      : null

    const childPoi: POI = {
      id: childPoiId,
      regionId: poi.regionId,
      parentPoiId: poiId,
      name: room.name,
      description: room.description + (room.activity ? ` Creatures here are ${room.activity}.` : ''),
      type: 'dungeon',
      subtypeLabel,
      floor: null,
      tags: room.isDeadEnd ? ['dead-end'] : [],
      position: null,
      mapRef: null,
      markerColor: null,
      readAloud: room.features.map((f) => f.description).join('. '),
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

  // === 4b. Distribute magic items, spells, weapons, gear across rooms ===

  // Magic items: guaranteed count, distributed to best rooms
  const magicByRoom = generateMagicItems(generated.rooms, options.magicItemCount, systemId, rng.child('magic-items'))
  // Spells: same
  const spellsByRoom = generateSpellScrolls(generated.rooms, options.spellCount, systemId, rng.child('spells'))

  // Weapons & gear: guaranteed distribution based on treasureLevel
  const weaponsByRoom = options.includeWeapons
    ? generateWeapons(generated.rooms, options.treasureLevel, systemId, rng.child('weapons'))
    : new Map<string, TreasureItem[]>()
  const gearByRoom = options.includeGear
    ? generateGear(generated.rooms, options.treasureLevel, systemId, rng.child('gear'))
    : new Map<string, TreasureItem[]>()

  // Apply the extra items to the already-created child POIs
  const allExtraByRoom = new Map<string, TreasureItem[]>()
  for (const [roomId, items] of [...magicByRoom, ...spellsByRoom, ...weaponsByRoom, ...gearByRoom]) {
    const existing = allExtraByRoom.get(roomId) ?? []
    allExtraByRoom.set(roomId, [...existing, ...items])
  }

  for (const [roomId, extraItems] of allExtraByRoom) {
    const childPoiId = roomIdToPoiId.get(roomId)
    if (!childPoiId) continue
    const child = await deps.poiRepo.getById(childPoiId)
    if (!child) continue
    const merged = [...child.treasure, ...extraItems]
    await deps.poiRepo.update({ ...child, treasure: merged, updatedAt: now })
    if (merged.length > 0 && !roomHasTreasure.includes(roomId)) roomHasTreasure.push(roomId)
  }

  // === 5. Create NPC entities ===

  // Guarantee at least one NPC for dungeons with 3+ rooms
  const dungeonNPCs = generated.dungeonNPCs ?? []
  if (dungeonNPCs.length === 0 && generated.rooms.length >= 3) {
    const deepestRoom = generated.rooms.filter((r) => r.type !== 'entrance').sort((a, b) => b.depth - a.depth)[0]
    if (deepestRoom) {
      const inhabitants = generated.ecology?.currentInhabitants ?? 'dungeon denizen'
      dungeonNPCs.push({
        npcId: `inhabitant-${newId()}`,
        category: 'faction_leader',
        roomId: deepestRoom.id,
        disposition: 'hostile',
        hasInfo: `Leader of the ${inhabitants}. Knows the dungeon's secrets.`,
        wants: ['power', 'wealth'],
      })
    }
  }

  for (const dungeonNPC of dungeonNPCs) {
    const npcPoiId = roomIdToPoiId.get(dungeonNPC.roomId) ?? poiId
    const npcName = generateNPCName(rng.child(`npc-name-${dungeonNPC.npcId}`))
    const motivation = dungeonNPC.wants?.join(', ') ?? ''
    const categoryLabel = dungeonNPC.category.replace(/_/g, ' ')

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

  // === 6. Create exit paths ===

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

  // === 7. Wandering monsters (with compendium resolution) ===

  const wmRng = rng.child('wandering-resolve')
  const usedCompendiumIds = new Set<string>()
  const wanderingMonsters: WanderingMonsterEntry[] = (generated.wanderingMonsters?.entries ?? []).reduce<WanderingMonsterEntry[]>((acc, e) => {
    // Try up to 5 times to get a creature not already in the table
    let resolved = resolveCreature(e.creatureType, systemId, wmRng, generated.depth)
    for (let attempt = 0; attempt < 5 && resolved && usedCompendiumIds.has(resolved.id); attempt++) {
      resolved = resolveCreature(`retry-${attempt}-${e.creatureType}`, systemId, wmRng, generated.depth)
    }
    if (resolved) usedCompendiumIds.add(resolved.id)
    acc.push({
      name: resolved?.name ?? e.creatureType,
      creatureType: e.creatureType,
      count: e.count,
      activity: e.activity,
      compendiumId: resolved?.id ?? null,
      npcId: null,
      customStats: null,
    })
    return acc
  }, [])

  // === 7b. Room creatures ===

  const dangerChances: Record<string, number> = { low: 0.25, medium: 0.45, deadly: 0.70, very_deadly: 0.90 }
  const creaturePool = getBlueprint(options.theme).creaturePool
  const creatureRng = rng.child('room-creatures')
  const roomsWithNPC = new Set(dungeonNPCs.map((n) => n.roomId))

  for (const room of generated.rooms) {
    if (room.type === 'entrance' || room.type === 'exit') continue
    if (roomsWithNPC.has(room.id)) continue
    if (!creatureRng.chance(dangerChances[options.dangerLevel] ?? 0.45)) continue

    const creatureSlug = creatureRng.pick(creaturePool)
    const resolved = resolveCreature(creatureSlug, systemId, creatureRng, room.depth)
    const creatureName = resolved?.name ?? creatureSlug
    const compendiumId = resolved?.id ?? null

    const creatureNpc: NPC = {
      id: newId(),
      worldId,
      name: creatureName,
      factionIds: [],
      regionId: poi.regionId,
      poiId: roomIdToPoiId.get(room.id) ?? poiId,
      lifeStatus: 'alive',
      movementStatus: 'present',
      description: [
        compendiumId ? getMonsterDescription(compendiumId) : '',
        `Activity: ${room.activity ?? 'guarding'}.`,
      ].filter(Boolean).join('\n\n'),
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

    await deps.npcRepo.create(creatureNpc)
    dungeonNPCs.push({ npcId: creatureNpc.id, category: 'faction_member', roomId: room.id, disposition: 'hostile' })
  }

  // === 8. Save to parent POI ===

  await deps.poiRepo.update({
    ...poi,
    spatialDungeon: { ...generated, roomPoiMap: Object.fromEntries(roomIdToPoiId), roomHasTreasure },
    dungeonGenOptions: options,
    wanderingMonsters,
    updatedAt: now,
  })
}

function parseDC(save?: string): number | null {
  if (!save) return null
  const match = save.match(/DC\s*(\d+)/)
  return match ? parseInt(match[1], 10) : null
}
