import { newId } from '@shared/ulid'
import type {
  DungeonTheme,
  SpatialRoom,
  GeneratedDungeonNPC,
  DungeonNPCCategory,
  DungeonNPCWant,
} from '../types'
import { SeededRandom } from '../SeededRandom'

const RIVAL_PARTY_CHANCE = 0.20
const HERMIT_CHANCE = 0.10
const GHOST_CHANCE = 0.15

const GHOST_THEMES: DungeonTheme[] = ['tomb', 'crypt', 'temple', 'fortress', 'shrine', 'cultist_lair']
const HERMIT_THEMES: DungeonTheme[] = ['cave', 'mine', 'sewer', 'witch_hut', 'sea_cave']

const ADVENTURER_FIRST_NAMES = [
  'Aldric', 'Bran', 'Celia', 'Dorn', 'Elena', 'Finn',
  'Greta', 'Harald', 'Iris', 'Jax', 'Kira', 'Leon',
  'Mira', 'Nox', 'Orin', 'Petra', 'Quinn', 'Raven',
]

const ADVENTURER_EPITHETS = [
  'the Bold', 'the Quick', 'Shadowbane', 'Ironhand',
  'the Wanderer', 'Brightblade', 'the Cunning', 'Stormborn',
]

const ADVENTURER_CLASSES = ['Fighter', 'Rogue', 'Wizard', 'Cleric', 'Ranger', 'Barbarian']

const HERMIT_TYPES = [
  { type: 'mad_scholar', info: 'ancient lore about the dungeon' },
  { type: 'escaped_prisoner', info: 'the layout and dangers within' },
  { type: 'monster_whisperer', info: 'the creatures\' weaknesses' },
  { type: 'treasure_hunter', info: 'the location of hidden valuables' },
  { type: 'cult_defector', info: 'the inhabitants\' plans' },
]

const GHOST_MOTIVATIONS = [
  'seeks revenge on their killer',
  'guards their former treasure',
  'warns explorers of danger',
  'relives their final moments',
  'searches for a lost love',
]

const WANTS_BY_CATEGORY: Record<DungeonNPCCategory, DungeonNPCWant[]> = {
  rival_party: ['wealth', 'information', 'safety'],
  prisoner: ['freedom', 'safety', 'revenge'],
  hermit: ['safety', 'food', 'companionship'],
  ghost: ['revenge', 'freedom', 'information'],
  refugee: ['safety', 'food', 'freedom'],
  faction_leader: ['power', 'wealth', 'information'],
  faction_lieutenant: ['power', 'wealth', 'safety'],
  faction_member: ['wealth', 'safety', 'food'],
  rival_scout: ['safety', 'information', 'freedom'],
}

const WANT_COUNT_BY_CATEGORY: Record<DungeonNPCCategory, [number, number]> = {
  rival_party: [1, 2],
  prisoner: [2, 3],
  hermit: [1, 2],
  ghost: [1, 1],
  refugee: [2, 3],
  faction_leader: [1, 2],
  faction_lieutenant: [1, 2],
  faction_member: [1, 2],
  rival_scout: [2, 2],
}

function generateWants(rng: SeededRandom, category: DungeonNPCCategory): DungeonNPCWant[] {
  const possibleWants = WANTS_BY_CATEGORY[category] ?? ['safety']
  const [min, max] = WANT_COUNT_BY_CATEGORY[category] ?? [1, 2]
  const count = rng.between(min, max)
  return rng.sample(possibleWants, Math.min(count, possibleWants.length))
}

export function generateDungeonNPCs(theme: DungeonTheme, rooms: SpatialRoom[], seed: string): GeneratedDungeonNPC[] {
  const rng = new SeededRandom(`${seed}-dungeon-npcs`)
  const npcs: GeneratedDungeonNPC[] = []

  if (rng.chance(RIVAL_PARTY_CHANCE)) {
    const candidateRooms = rooms.filter((r) => r.depth <= 2)
    if (candidateRooms.length > 0) {
      const room = rng.pick(candidateRooms)
      const partySize = rng.between(2, 4)
      const firstName = rng.pick(ADVENTURER_FIRST_NAMES)
      const epithet = rng.pick(ADVENTURER_EPITHETS)
      const leaderClass = rng.pick(ADVENTURER_CLASSES)
      const dispositionRoll = rng.next()
      const disposition = dispositionRoll < 0.3 ? 'hostile' : dispositionRoll < 0.7 ? 'neutral' : 'friendly'
      npcs.push({
        npcId: `rival-${newId()}`,
        category: 'rival_party',
        roomId: room.id,
        disposition,
        partySize,
        hasInfo: `${firstName} ${epithet}, a ${leaderClass}, leads a party of ${partySize}. They seek treasure and glory.`,
        wants: generateWants(rng, 'rival_party'),
      })
    }
  }

  if (HERMIT_THEMES.includes(theme) && rng.chance(HERMIT_CHANCE)) {
    const candidateRooms = rooms.filter((r) => r.isDeadEnd || r.themeRoomType === 'collapsed_section')
    const deepRooms = candidateRooms.length > 0 ? candidateRooms : rooms.filter((r) => r.depth >= 2)
    if (deepRooms.length > 0) {
      const room = rng.pick(deepRooms)
      const hermitType = rng.pick(HERMIT_TYPES)
      const disposition = rng.chance(0.7) ? 'friendly' : 'neutral'
      npcs.push({
        npcId: `hermit-${newId()}`,
        category: 'hermit',
        roomId: room.id,
        disposition,
        hasInfo: `A ${hermitType.type.replace('_', ' ')} who knows ${hermitType.info}.`,
        wants: generateWants(rng, 'hermit'),
      })
    }
  }

  if (GHOST_THEMES.includes(theme) && rng.chance(GHOST_CHANCE)) {
    const candidateRooms = rooms.filter(
      (r) => r.themeRoomType === 'sarcophagus_chamber' || r.themeRoomType === 'burial_niches' ||
             r.themeRoomType === 'throne_room' || r.themeRoomType === 'altar_room' || r.isDeadEnd
    )
    const deepRooms = candidateRooms.length > 0 ? candidateRooms : rooms.filter((r) => r.depth >= 2)
    if (deepRooms.length > 0) {
      const room = rng.pick(deepRooms)
      const motivation = rng.pick(GHOST_MOTIVATIONS)
      const dispositionRoll = rng.next()
      const disposition = dispositionRoll < 0.4 ? 'hostile' : dispositionRoll < 0.7 ? 'neutral' : 'friendly'
      npcs.push({
        npcId: `ghost-${newId()}`,
        category: 'ghost',
        roomId: room.id,
        disposition,
        hasInfo: `A restless spirit that ${motivation}.`,
        wants: generateWants(rng, 'ghost'),
      })
    }
  }

  return npcs
}
