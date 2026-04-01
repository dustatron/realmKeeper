import { newId } from '@shared/ulid'
import type { DungeonTheme, SpatialRoom, HistoryLayer, Discovery } from '../types'
import { SeededRandom } from '../SeededRandom'

interface EraTemplate {
  era: string
  builders: string
  fate: string
  clueTypes: string[]
}

const ORIGINAL_BUILDER_TEMPLATES: Partial<Record<DungeonTheme, EraTemplate[]>> = {
  tomb: [
    { era: 'centuries ago', builders: 'ancient dynasty', fate: 'sealed after the royal line ended', clueTypes: ['hieroglyphs', 'sarcophagi', 'ceremonial urns'] },
    { era: 'ages past', builders: 'death cult', fate: 'abandoned when the cult was purged', clueTypes: ['ritual markings', 'bone altars', 'sacrificial blades'] },
  ],
  temple: [
    { era: 'long ago', builders: 'old faith', fate: 'desecrated during a religious war', clueTypes: ['defaced icons', 'shattered altars', 'holy texts'] },
    { era: 'centuries past', builders: 'sun worshippers', fate: 'abandoned when the faith waned', clueTypes: ['sun symbols', 'light shafts', 'gold decorations'] },
  ],
  cave: [
    { era: 'in primordial times', builders: 'natural forces', fate: 'carved by underground rivers', clueTypes: ['water erosion', 'stalactites', 'mineral deposits'] },
    { era: 'ages ago', builders: 'giant burrowers', fate: 'abandoned when the creatures moved on', clueTypes: ['claw marks', 'massive tunnels', 'shed carapaces'] },
  ],
  fortress: [
    { era: 'decades ago', builders: 'fallen kingdom', fate: 'sacked during the last war', clueTypes: ['war damage', 'broken banners', 'scattered weapons'] },
    { era: 'generations past', builders: 'dwarven clan', fate: 'abandoned after a plague', clueTypes: ['stone masonry', 'rune carvings', 'empty forges'] },
  ],
  mine: [
    { era: 'decades ago', builders: 'dwarven company', fate: 'sealed after they dug too deep', clueTypes: ['mine carts', 'ore veins', 'collapsed shafts'] },
    { era: 'years ago', builders: 'human prospectors', fate: 'abandoned when the ore ran out', clueTypes: ['pickaxes', 'mine tracks', 'empty crates'] },
  ],
  sewer: [
    { era: 'centuries ago', builders: 'ancient city', fate: 'buried when the city above fell', clueTypes: ['brick arches', 'drainage grates', 'water channels'] },
  ],
  cultist_lair: [
    { era: 'decades ago', builders: 'demon cult', fate: 'scattered when their ritual failed', clueTypes: ['summoning circles', 'blood stains', 'unholy texts'] },
  ],
  bandit_hideout: [
    { era: 'years ago', builders: 'smugglers', fate: 'abandoned when their leader was caught', clueTypes: ['hidden caches', 'escape routes', 'contraband'] },
  ],
}

const SECONDARY_OCCUPANTS: EraTemplate[] = [
  { era: 'decades ago', builders: 'necromancer', fate: 'destroyed by adventurers', clueTypes: ['alchemical stains', 'shattered vials', 'undead remains'] },
  { era: 'years ago', builders: 'bandit gang', fate: 'wiped out by militia', clueTypes: ['makeshift beds', 'stolen goods', 'crude repairs'] },
  { era: 'recently', builders: 'goblin tribe', fate: 'moved in from the wilds', clueTypes: ['graffiti', 'gnawed bones', 'crude traps'] },
  { era: 'a generation past', builders: 'mad wizard', fate: 'disappeared mysteriously', clueTypes: ['arcane diagrams', 'strange apparatus', 'warped reality'] },
]

const ENVIRONMENTAL_CLUES: Record<string, string[]> = {
  hieroglyphs: ['Faded hieroglyphs depict a coronation ceremony', 'Ancient pictographs show a great journey'],
  sarcophagi: ['An empty sarcophagus bears the name of a long-dead king', 'Smashed tomb lids reveal the bodies were removed'],
  ritual_markings: ['Dark stains form patterns around a central altar', 'Chalk circles cover the floor, partially scuffed away'],
  defaced_icons: ['Statue faces have been systematically smashed', 'Holy symbols are scratched over with profane marks'],
  war_damage: ['Sword cuts score the stone walls', 'Scorch marks from magical battle cover the ceiling'],
  cave_paintings: ['Primitive figures hunt massive beasts across the wall', 'Handprints in ochre mark a sacred boundary'],
  mine_carts: ['Rusted ore carts sit abandoned on broken tracks', 'Tool racks still hold corroded implements'],
  summoning_circles: ['A circle of blood-red runes pulses faintly with power', 'Salt lines mark a protective barrier around a dark stain'],
  gnawed_bones: ['Gnawed bones are scattered near a cold fire pit', 'A pile of cracked bones suggests recent feeding'],
  stolen_goods: ['Merchant crates bear the seals of nearby towns', 'A pile of jewelry and coins sits half-sorted'],
}

const DOCUMENT_TEMPLATES = [
  {
    title: 'Tattered Journal',
    template: 'Day [NUMBER]: The [CREATURE]s grow bolder. I\'ve hidden [ITEM] where they won\'t find it. If I don\'t make it out, tell [NAME] I tried.',
  },
  {
    title: 'Bloodstained Letter',
    template: 'My dearest [NAME], by the time you read this I will be deep within the [DUNGEON]. If we succeed, we\'ll be rich. If not... don\'t let them forget us.',
  },
  {
    title: 'Crude Map',
    template: 'Shows a rough sketch of the dungeon, with \'DANGER\' scrawled near [ROOM] and an \'X\' marking what appears to be [ITEM].',
  },
  {
    title: 'Faction Orders',
    template: 'By order of [FACTION], secure the [ITEM] at all costs. Eliminate any who interfere. Glory to [FACTION].',
  },
]

const PARTY_NAMES = [
  'The Silver Shields', 'Company of the Dragon', 'The Seekers',
  'Band of the Broken Blade', 'The Fortune Hunters', 'The Reckless Few',
]

const PARTY_FATES = [
  'overwhelmed by the inhabitants', 'split up and picked off one by one',
  'caught in a trap', 'betrayed by one of their own', 'succumbed to a curse',
]

const ADVENTURER_GEAR = [
  'rusty shortsword', 'torn leather armor', 'empty potion vial', 'broken lantern',
  'snapped crossbow', 'tattered rope', 'cracked shield', 'dented helm',
]

export function generateDungeonHistory(theme: DungeonTheme, rooms: SpatialRoom[], seed: string): HistoryLayer[] {
  const rng = new SeededRandom(`${seed}-history`)
  const layers: HistoryLayer[] = []

  const originalTemplates = ORIGINAL_BUILDER_TEMPLATES[theme] ?? ORIGINAL_BUILDER_TEMPLATES.fortress ?? []
  if (originalTemplates.length > 0) layers.push({ ...rng.pick(originalTemplates) })
  if (rng.chance(0.6)) layers.push({ ...rng.pick(SECONDARY_OCCUPANTS) })

  if (layers.length === 0) {
    layers.push({ era: 'long ago', builders: 'unknown builders', fate: 'abandoned for unknown reasons', clueTypes: ['old ruins'] })
  }

  // Add historical clues to rooms
  for (const room of rooms) {
    if (room.type === 'entrance') continue
    if (!rng.chance(0.4)) continue
    const layer = rng.pick(layers)
    const clueType = rng.pick(layer.clueTypes)
    const clueKey = clueType.replace(/\s+/g, '_').toLowerCase()
    const clueOptions = ENVIRONMENTAL_CLUES[clueKey]
    if (clueOptions) {
      room.historicalClues = [rng.pick(clueOptions)]
    } else {
      room.historicalClues = [`Signs of the ${layer.builders} are visible: ${clueType}`]
    }
  }

  // Add discoveries
  const discoveryCount = rng.between(2, 4)
  const eligibleRooms = rooms.filter((r) => r.type !== 'entrance' && r.depth >= 1)
  for (let i = 0; i < discoveryCount && eligibleRooms.length > 0; i++) {
    const room = rng.pick(eligibleRooms)
    const discovery = generateDiscovery(rng, layers, theme)
    if (!room.discoveries) room.discoveries = []
    room.discoveries.push(discovery)
  }

  // 30% chance of failed adventuring party
  if (rng.chance(0.3)) {
    const deepRooms = rooms.filter((r) => r.depth >= 2)
    if (deepRooms.length > 0) {
      const room = rng.pick(deepRooms)
      const partyName = rng.pick(PARTY_NAMES)
      const fate = rng.pick(PARTY_FATES)
      const gear = rng.sample(ADVENTURER_GEAR, rng.between(2, 4))
      const discovery: Discovery = {
        id: `discovery-${newId()}`,
        type: 'evidence',
        description: `The remains of an adventurer from ${partyName}. Nearby: ${gear.join(', ')}`,
        content: `Final Entry of ${partyName}'s Journal\n\nWe were ${fate}. If anyone finds this, the treasure is in the deepest chamber. Don't make our mistake.`,
        found: false,
      }
      if (!room.discoveries) room.discoveries = []
      room.discoveries.push(discovery)
    }
  }

  return layers
}

function generateDiscovery(rng: SeededRandom, layers: HistoryLayer[], theme: string): Discovery {
  const typeRoll = rng.next()
  const type = typeRoll < 0.3 ? 'document' : typeRoll < 0.6 ? 'evidence' : typeRoll < 0.85 ? 'clue' : 'secret'
  const layer = rng.pick(layers)

  let description: string
  switch (type) {
    case 'document':
      description = rng.pick([
        'A weathered journal lies half-buried in debris',
        'A sealed letter is tucked into a crack in the wall',
        'Parchment scraps are scattered across the floor',
      ])
      break
    case 'evidence':
      description = rng.pick([
        `Skeletal remains wearing gear from ${layer.era}`,
        'A blood trail leads to a hidden alcove',
        'Signs of a fierce battle mark this area',
      ])
      break
    case 'clue':
      description = rng.pick([
        'Fresh footprints in the dust suggest recent passage',
        'Supplies have been recently disturbed',
        'A recently-used campfire still holds warmth',
      ])
      break
    default:
      description = rng.pick([
        'A loose stone conceals a small hidden space',
        'The wall here sounds hollow when tapped',
        'Scratch marks suggest something was moved regularly',
      ])
  }

  let content: string | undefined
  if (type === 'document') {
    const template = rng.pick(DOCUMENT_TEMPLATES)
    content = template.title + '\n\n' + template.template
      .replace('[NUMBER]', String(rng.between(1, 30)))
      .replace('[CREATURE]', rng.pick(['goblin', 'orc', 'undead', 'beast', 'cultist']))
      .replace('[ITEM]', rng.pick(['the gold', 'the artifact', 'the relic', 'the key']))
      .replace('[NAME]', rng.pick(['Elena', 'Marcus', 'Theron', 'Sera', 'Aldric']))
      .replace('[DUNGEON]', theme.replace('_', ' '))
      .replace('[ROOM]', rng.pick(['inner chamber', 'storage room', 'eastern hall']))
      .replace(/\[FACTION\]/g, layer.builders)
  }

  return { id: `discovery-${newId()}`, type: type as Discovery['type'], description, content, found: false }
}
