import type { DungeonTheme, SpatialRoom, DungeonEcology, CreatureActivity } from '../types'
import { SeededRandom } from '../SeededRandom'

const BUILDER_CULTURES: Partial<Record<DungeonTheme, string[]>> = {
  tomb: ['ancient empire', 'forgotten dynasty', 'death cult', 'noble house'],
  temple: ['old faith', 'heretical sect', 'druidic order', 'sun worshippers'],
  crypt: ['wealthy family', 'holy order', 'plague-era city', 'vampire lord'],
  fortress: ['fallen kingdom', 'orc warlord', 'dwarven clan', 'imperial legion'],
  cave: ['natural formation', 'giant burrowers', 'primordial forces'],
  mine: ['dwarven company', 'human prospectors', 'gnomish engineers', 'goblin tribe'],
  sewer: ['ancient city', 'forgotten civilization', 'thieves\' guild', 'plague doctors'],
  bandit_hideout: ['smugglers', 'deserters', 'outlaws', 'rebel faction'],
  cultist_lair: ['demon cult', 'aberrant worshippers', 'necromancer circle', 'chaos cult'],
  witch_hut: ['hedge witch', 'coven', 'fey creature', 'hermit mage'],
  sea_cave: ['pirates', 'merfolk', 'sea hag', 'smugglers'],
  beast_den: ['territorial beast', 'pack alpha', 'monstrous creature', 'dragon'],
  lair: ['goblin tribe', 'hobgoblin warlord', 'bugbear gang', 'troll'],
  shrine: ['village faithful', 'wandering priest', 'nature spirit', 'forgotten god'],
  floating_keep: ['sky mages', 'cloud giants', 'elemental cultists', 'ancient artificers'],
}

const CURRENT_INHABITANTS: Partial<Record<DungeonTheme, string[]>> = {
  tomb: ['undead guardians', 'tomb robbers', 'cursed spirits', 'mummy lord and servants'],
  temple: ['corrupted clergy', 'demon-possessed', 'zealot cultists', 'angelic guardians'],
  crypt: ['ghouls and ghasts', 'vampire spawn', 'necromancer and minions', 'restless dead'],
  fortress: ['orc warband', 'goblin tribe', 'bandit company', 'undead garrison'],
  cave: ['monster nest', 'beast pack', 'giant spiders', 'troll lair'],
  mine: ['kobold miners', 'derro mad ones', 'duergar slavers', 'abandoned and haunted'],
  sewer: ['wererats', 'otyugh nest', 'thieves\' den', 'cultist hideout'],
  bandit_hideout: ['bandit gang', 'smuggler ring', 'escaped prisoners', 'revolutionary cell'],
  cultist_lair: ['demon cult', 'devil worshippers', 'aberrant servants', 'undead congregation'],
  witch_hut: ['hag and minions', 'fey creatures', 'corrupted animals', 'apprentice gone mad'],
  sea_cave: ['sahuagin raiders', 'pirate crew', 'sea spawn', 'kraken cultists'],
  beast_den: ['territorial predator', 'beast pack', 'dragon and kobolds', 'elemental creature'],
  lair: ['goblin horde', 'hobgoblin legion', 'bugbear gang', 'troll and minions'],
  shrine: ['corrupted guardians', 'desecrators', 'nature spirits', 'pilgrims and protectors'],
  floating_keep: ['cloud giant court', 'elemental servants', 'sky pirates', 'arcane constructs'],
}

const ACTIVITY_DISTRIBUTIONS: Partial<Record<DungeonTheme, Record<CreatureActivity, number>>> = {
  tomb: { sleeping: 30, patrolling: 15, guarding: 25, eating: 5, working: 5, worshipping: 10, hiding: 5, fighting: 5, socializing: 0 },
  temple: { sleeping: 10, patrolling: 15, guarding: 20, eating: 5, working: 10, worshipping: 30, hiding: 5, fighting: 5, socializing: 0 },
  fortress: { sleeping: 15, patrolling: 30, guarding: 25, eating: 10, working: 10, worshipping: 0, hiding: 5, fighting: 5, socializing: 0 },
  cave: { sleeping: 35, patrolling: 10, guarding: 15, eating: 20, working: 0, worshipping: 0, hiding: 15, fighting: 5, socializing: 0 },
  bandit_hideout: { sleeping: 20, patrolling: 15, guarding: 15, eating: 15, working: 10, worshipping: 0, hiding: 10, fighting: 5, socializing: 10 },
  cultist_lair: { sleeping: 10, patrolling: 10, guarding: 15, eating: 5, working: 15, worshipping: 40, hiding: 0, fighting: 5, socializing: 0 },
  sewer: { sleeping: 25, patrolling: 15, guarding: 10, eating: 25, working: 5, worshipping: 5, hiding: 10, fighting: 5, socializing: 0 },
}

const DEFAULT_ACTIVITIES: Record<CreatureActivity, number> = {
  sleeping: 20, patrolling: 20, guarding: 20, eating: 10,
  working: 10, worshipping: 5, hiding: 10, fighting: 5, socializing: 0,
}

const ROOM_ACTIVITY_HINTS: Record<string, CreatureActivity[]> = {
  sleeping_quarters: ['sleeping'],
  barracks: ['sleeping', 'eating'],
  initiates_quarters: ['sleeping', 'worshipping'],
  clergy_quarters: ['sleeping', 'worshipping'],
  priest_quarters: ['sleeping', 'worshipping'],
  guardroom: ['guarding', 'patrolling'],
  watchtower: ['guarding', 'patrolling'],
  armory: ['guarding', 'working'],
  war_room: ['working', 'guarding'],
  altar_room: ['worshipping', 'guarding'],
  sacrifice_altar: ['worshipping', 'working'],
  summoning_circle: ['worshipping', 'working'],
  ritual_pool: ['worshipping'],
  nave: ['worshipping', 'guarding'],
  mess_hall: ['eating'],
  common_area: ['eating', 'sleeping'],
  mushroom_garden: ['eating', 'working'],
  embalming_room: ['working'],
  planning_room: ['working'],
  treasure_vault: ['guarding'],
  loot_storage: ['guarding'],
}

export function generateDungeonEcology(theme: DungeonTheme, rooms: SpatialRoom[], seed: string): DungeonEcology {
  const rng = new SeededRandom(`${seed}-ecology`)
  const builderCulture = rng.pick(BUILDER_CULTURES[theme] ?? ['unknown builders'])
  const currentInhabitants = rng.pick(CURRENT_INHABITANTS[theme] ?? ['various monsters'])
  const activityDist = ACTIVITY_DISTRIBUTIONS[theme] ?? DEFAULT_ACTIVITIES

  for (const room of rooms) {
    if (room.type === 'entrance') continue
    const themeType = room.themeRoomType
    if (themeType && ROOM_ACTIVITY_HINTS[themeType]) {
      room.activity = rng.pick(ROOM_ACTIVITY_HINTS[themeType])
    } else {
      room.activity = selectWeightedActivity(rng, activityDist)
    }
  }

  const ages = ['centuries', 'decades', 'generations', 'ages']
  const age = rng.pick(ages)
  const inhab = currentInhabitants.charAt(0).toUpperCase() + currentInhabitants.slice(1)
  const historyOptions = [
    `Built by the ${builderCulture} ${age} ago, now claimed by ${currentInhabitants}.`,
    `Once a proud creation of the ${builderCulture}, fallen to ${currentInhabitants}.`,
    `The ${builderCulture} abandoned this place long ago. ${inhab} moved in.`,
    `After the fall of the ${builderCulture}, ${currentInhabitants} made this their home.`,
  ]
  const history = rng.pick(historyOptions)

  const factionInfluence: Record<string, string[]> = {}
  const primaryRooms = rooms.filter((r) => r.type !== 'entrance').map((r) => r.id)
  if (primaryRooms.length > 0) factionInfluence[currentInhabitants] = primaryRooms

  return { builderCulture, currentInhabitants, history, factionInfluence }
}

function selectWeightedActivity(rng: SeededRandom, dist: Record<CreatureActivity, number>): CreatureActivity {
  const total = Object.values(dist).reduce((sum, w) => sum + w, 0)
  let roll = rng.next() * total
  for (const [activity, weight] of Object.entries(dist)) {
    roll -= weight
    if (roll <= 0) return activity as CreatureActivity
  }
  return 'guarding'
}
