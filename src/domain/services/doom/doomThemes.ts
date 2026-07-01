import type { SeededRandom } from '~/lib/dungeon/SeededRandom'
import type { DoomVector } from '@domain/entities/Doom'

export interface ResolvedDoomTheme {
  name: string
  vector: DoomVector
  keyedResource: string | null
  keyedBiome: string | null
  stages: Array<{ threshold: number; portent: string }> // fired defaults to false when built into a Doom
}

// Internal record includes pack membership for pool filtering
interface DoomThemeEntry extends ResolvedDoomTheme {
  pack: string
}

// Mirror of DOOM_NAMES_BY_PACK from src/routes/_app/realms/new.tsx
// Packs: 'low-fantasy' | 'high-fantasy' | 'sci-fi' | 'doomed'
// Labels (verbatim from new.tsx):
//   low-fantasy:  "The Salt-Death", "The Long Hunger", "War of the Silver Mine"
//   high-fantasy: "The Crystal Wakes", "The Wyrm Claims the Peak", "The Blight Spreads"
//   sci-fi:       "The Machine Below Stirs", "Mutagen Bloom"
//   doomed:       "The Tide of Ash", "The Cursed Lode", "The Dead Walk the Roads"

const DOOM_THEMES: Record<string, DoomThemeEntry> = {
  'The Salt-Death': {
    pack: 'low-fantasy',
    name: 'The Salt-Death',
    vector: 'water',
    keyedResource: 'Salt',
    keyedBiome: null,
    stages: [
      { threshold: 2, portent: 'Wells near the salt flats run bitter; livestock refuse to drink.' },
      { threshold: 4, portent: 'Trade caravans report the rivers slow and grey-white. Fish die by the cartload.' },
      { threshold: 6, portent: 'The drinking water turns to brine. Fields crack and nothing will grow again.' },
    ],
  },
  'The Long Hunger': {
    pack: 'low-fantasy',
    name: 'The Long Hunger',
    vector: 'resource',
    keyedResource: 'Grain',
    keyedBiome: 'plains',
    stages: [
      { threshold: 2, portent: 'Granaries report unexplained spoilage; prices rise and tempers shorten.' },
      { threshold: 4, portent: 'Beggars flood the roads; the first riots break out in the market towns.' },
      { threshold: 6, portent: 'The last stores are gone. What follows is famine, flight, and desperation without end.' },
    ],
  },
  'War of the Silver Mine': {
    pack: 'low-fantasy',
    name: 'War of the Silver Mine',
    vector: 'resource',
    keyedResource: 'Silver',
    keyedBiome: 'mountains',
    stages: [
      { threshold: 2, portent: 'Claim-jumpers and hired swords gather around the disputed shafts.' },
      { threshold: 4, portent: 'The first blood is shed; a minor lord raises a banner over the mine entrance.' },
      { threshold: 6, portent: 'Open war erupts across the passes. The silver flows only to fund further bloodshed.' },
    ],
  },
  'The Crystal Wakes': {
    pack: 'high-fantasy',
    name: 'The Crystal Wakes',
    vector: 'blight',
    keyedResource: null,
    keyedBiome: null,
    stages: [
      { threshold: 2, portent: 'Crystalline growths appear overnight on standing stones and old ruins.' },
      { threshold: 4, portent: 'Those who touch the formations report dreamless sleep and waking visions of another world.' },
      { threshold: 6, portent: 'The crystals pulse with cold light and begin to spread. The world beneath them is slowly becoming something else.' },
    ],
  },
  'The Wyrm Claims the Peak': {
    pack: 'high-fantasy',
    name: 'The Wyrm Claims the Peak',
    vector: 'roads',
    keyedResource: null,
    keyedBiome: 'mountains',
    stages: [
      { threshold: 2, portent: 'Mountain passes close as something large and old drives out the local clans.' },
      { threshold: 4, portent: 'The high road is impassable; caravans vanish and their cargo shows up scorched.' },
      { threshold: 6, portent: 'The wyrm descends from the peak. Every road through the range is its hunting ground.' },
    ],
  },
  'The Blight Spreads': {
    pack: 'high-fantasy',
    name: 'The Blight Spreads',
    vector: 'blight',
    keyedResource: null,
    keyedBiome: 'forest',
    stages: [
      { threshold: 2, portent: 'Leaves turn black and fall out of season. The herbalists find no cure.' },
      { threshold: 4, portent: 'Animals flee ahead of the spreading grey rot. Farms at the forest edge fail.' },
      { threshold: 6, portent: 'The blight crosses the tree-line. It will not stop until nothing green remains.' },
    ],
  },
  'The Machine Below Stirs': {
    pack: 'sci-fi',
    name: 'The Machine Below Stirs',
    vector: 'blight',
    keyedResource: null,
    keyedBiome: null,
    stages: [
      { threshold: 2, portent: 'Tremors shake the lowlands at irregular intervals; deep surveyors hear rhythmic sound from below.' },
      { threshold: 4, portent: 'Boreholes collapse as something vast shifts beneath the bedrock; interference scrambles instruments for leagues.' },
      { threshold: 6, portent: 'The machine surfaces. Its purpose is unknown — but everything built above it is already debris.' },
    ],
  },
  'Mutagen Bloom': {
    pack: 'sci-fi',
    name: 'Mutagen Bloom',
    vector: 'water',
    keyedResource: null,
    keyedBiome: null,
    stages: [
      { threshold: 2, portent: 'A slow discoloration spreads downstream from an old research site; wildlife near the water changes.' },
      { threshold: 4, portent: 'Livestock and then people near the affected water begin to shift. It is not always painful.' },
      { threshold: 6, portent: 'The mutagen reaches the water table. Everyone drinks. No one stays the same.' },
    ],
  },
  'The Tide of Ash': {
    pack: 'doomed',
    name: 'The Tide of Ash',
    vector: 'blight',
    keyedResource: null,
    keyedBiome: null,
    stages: [
      { threshold: 2, portent: 'A fine grey dust settles on everything to the north. Nothing grows where it lies thick.' },
      { threshold: 4, portent: 'The ash moves against the wind now. Witnesses say it drifts with intent.' },
      { threshold: 6, portent: 'The tide arrives in earnest. What it covers stays covered. There is no cleaning it off.' },
    ],
  },
  'The Cursed Lode': {
    pack: 'doomed',
    name: 'The Cursed Lode',
    vector: 'resource',
    keyedResource: null,
    keyedBiome: 'mountains',
    stages: [
      { threshold: 2, portent: 'Miners who work the new vein bring back ore — and nightmares.' },
      { threshold: 4, portent: 'The lode-curse spreads to anyone who handles the refined metal. It wants to be found.' },
      { threshold: 6, portent: 'The curse has a mind. It reaches now for anyone who merely knows of its existence.' },
    ],
  },
  'The Dead Walk the Roads': {
    pack: 'doomed',
    name: 'The Dead Walk the Roads',
    vector: 'roads',
    keyedResource: null,
    keyedBiome: null,
    stages: [
      { threshold: 2, portent: 'Travellers report figures walking at night who do not respond and cast no shadows.' },
      { threshold: 4, portent: 'The figures are recognizable now — faces of people buried in the nearest village.' },
      { threshold: 6, portent: 'The dead crowd every road by dusk. The living dare not travel. The roads belong to them.' },
    ],
  },
}

// Flat list of all entries for any-pack random picks
const ALL_ENTRIES: DoomThemeEntry[] = Object.values(DOOM_THEMES)

// Themes grouped by pack for pack-scoped random picks
const ENTRIES_BY_PACK: Record<string, DoomThemeEntry[]> = {}
for (const entry of ALL_ENTRIES) {
  if (!ENTRIES_BY_PACK[entry.pack]) ENTRIES_BY_PACK[entry.pack] = []
  ENTRIES_BY_PACK[entry.pack].push(entry)
}

function toResolved(entry: DoomThemeEntry): ResolvedDoomTheme {
  return {
    name: entry.name,
    vector: entry.vector,
    keyedResource: entry.keyedResource,
    keyedBiome: entry.keyedBiome,
    stages: entry.stages,
  }
}

function pickRandom(pack: string | undefined, rng: SeededRandom): ResolvedDoomTheme {
  const pool = (pack && ENTRIES_BY_PACK[pack]) ? ENTRIES_BY_PACK[pack] : ALL_ENTRIES
  return toResolved(rng.pick(pool))
}

export function resolveDoomTheme(
  label: string,
  pack: string | undefined,
  rng: SeededRandom,
): ResolvedDoomTheme {
  // Random / empty → pick from the given pack (or any pack if none)
  if (!label || label === 'random') {
    return pickRandom(pack, rng)
  }

  // Known label → return that theme
  const found = DOOM_THEMES[label]
  if (found) {
    return toResolved(found)
  }

  // Unknown label → fall back to random (do not throw)
  return pickRandom(pack, rng)
}
