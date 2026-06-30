import type { TableDef, TableSet } from '@domain/entities/TableDef'
import { listTable } from './tableViewUtils'

// Natural-site flavor tables (original, grounded + light whimsy). A natural site
// is a named wild place — a wood, mere, cavern, or fen — that the wilderness
// step drops far from roads and settlements. These tables are system-agnostic:
// no stats, no rules, just identity (a name) and atmosphere (a mood + a trouble
// that quietly raises a question for the GM to answer at the table).

const SET_ID = 'tableset-rk-natural-site'
export const NATURAL_SITE_NAME_TABLE_ID = 'table-rk-natural-site-name'
export const NATURAL_SITE_HAZARD_TABLE_ID = 'table-rk-natural-site-hazard'

// Evocative proper names for wild places. Each reads like somewhere locals would
// already have a story about.
export const NATURAL_SITE_NAMES = [
  'The Hollow Wood',
  'Mournmere',
  'The Singing Caverns',
  'The Weeping Fen',
  'Greythorn Hollow',
  'The Drowned Glade',
  'Stillwater Marsh',
  'The Whispering Pines',
  'Ashfall Gorge',
  'The Sunken Grove',
  'Coldcairn Heath',
  'The Gloaming Tarn',
  'Wyrmtongue Hollow',
  'The Lichen Steps',
  'Brackenmoor',
  'The Hushed Vale',
  'Emberbark Forest',
  'The Glass Pools',
  'Ravenroost Crag',
  'The Murmuring Reeds',
  'Thistlewych',
  'The Pale Hollow',
  'Frostroot Wood',
  'The Bittern Fen',
  'Hollowhorn Cave',
  'The Witchlight Bog',
  'Sablebrook Ravine',
  'The Quiet Tarn',
  'Mossgallow Wood',
  'The Salt Marsh',
]

// A single mood + a trouble for the place, paired so each entry hangs together.
// `mood` sets the air of the site; `trouble` is the live question that gives a GM
// something to push on. Neither asserts a stat or outcome — the table decides.
export interface NaturalSiteHazard {
  mood: string
  trouble: string
}

export const NATURAL_SITE_HAZARDS: NaturalSiteHazard[] = [
  {
    mood: 'a green hush, as if the place is holding its breath',
    trouble: 'paths that seemed plain on the way in do not lead back the way they came',
  },
  {
    mood: 'still, dark water that gives back no reflection',
    trouble: 'something beneath the surface keeps pace with anyone walking the shore',
  },
  {
    mood: 'a faint chorus on the wind that no throat could be making',
    trouble: 'the song grows clearer the deeper you go, and harder to want to leave',
  },
  {
    mood: 'wet, sucking ground and the sweet rot of standing water',
    trouble: 'the firm footing shifts each season, and last year\'s safe path now drowns the careless',
  },
  {
    mood: 'a cold that has nothing to do with the weather',
    trouble: 'animals will not enter, and the ones that do are never seen leaving',
  },
  {
    mood: 'light that falls strangely, as though filtered through deep water',
    trouble: 'travelers misjudge the hour and the distance, and stay far longer than they meant to',
  },
  {
    mood: 'old growth so tall the canopy swallows the sky',
    trouble: 'the trees seem to stand in different places than they did an hour ago',
  },
  {
    mood: 'a sharp mineral tang and a haze that stings the eyes',
    trouble: 'whatever drove the last people out left their belongings exactly where they dropped them',
  },
  {
    mood: 'an unnatural quiet — no birds, no insects, only your own steps',
    trouble: 'the silence breaks all at once when something decides you have come far enough',
  },
  {
    mood: 'mist that clings low and never quite burns off',
    trouble: 'shapes move at the edge of it, and keep the same distance no matter how fast you walk',
  },
  {
    mood: 'a sweetness in the air that turns cloying the longer you breathe it',
    trouble: 'those who linger grow drowsy and content, and stop asking why they came',
  },
  {
    mood: 'twisted, blackened growth recovering slowly from some old burning',
    trouble: 'something survived the fire here, and it remembers who lit it',
  },
]

export const naturalSiteTableSets: TableSet[] = [
  {
    id: SET_ID,
    name: 'Natural Sites',
    source: 'Realm Keeper',
    systemId: null,
    tableIds: [NATURAL_SITE_NAME_TABLE_ID, NATURAL_SITE_HAZARD_TABLE_ID],
  },
]

export const naturalSiteTableDefs: TableDef[] = [
  listTable(NATURAL_SITE_NAME_TABLE_ID, SET_ID, 'Natural Site Name', NATURAL_SITE_NAMES, ['worldgen', 'natural-site', 'name']),
  listTable(
    NATURAL_SITE_HAZARD_TABLE_ID,
    SET_ID,
    'Natural Site Hazard',
    NATURAL_SITE_HAZARDS.map((h) => `${h.mood} — ${h.trouble}`),
    ['worldgen', 'natural-site', 'hazard'],
  ),
]
