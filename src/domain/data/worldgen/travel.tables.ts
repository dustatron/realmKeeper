import type { TableDef, TableSet } from '@domain/entities/TableDef'
import { listTable } from './tableViewUtils'

// Non-combat roadside / travel encounters, reskinned to grounded fantasy from
// user-provided source (Dark Sun-specific entries dropped). Browsable + rollable
// in the Tables section (roll one during overland travel). Not yet wired into the
// category-based region-encounter cascade — that's a follow-up.

const SET_ID = 'tableset-rk-travel'
export const TRAVEL_ENCOUNTER_TABLE_ID = 'table-rk-travel-encounter'

export const TRAVEL_ENCOUNTERS = [
  'Dark clouds gather — it may actually rain, hard enough to flood the road.',
  'Bandits lie in wait by the roadside, poorly hidden, hoping to ambush.',
  'Flat stones painted with crude skulls — a warning of danger ahead.',
  'A heavy armored wagon rumbles past with armed outriders who bark at you to clear the road.',
  'A handful of escaped, unarmed captives — they threaten or beg, depending on numbers.',
  'A trader\'s wagon is stranded, a draft animal dead, the owner unable to move the goods.',
  'A ragged old man insists he is someone powerful and harasses you — plainly mad, but harmless.',
  'Settlers are raising a new trade hamlet by the road and are eager to barter.',
  'A slaver\'s train offers to sell you one of its captives; some are children.',
  'A person lies near the road, unconscious and badly beaten.',
  'A child cries by the roadside, just abandoned by their family.',
  'An old traveler has been left behind by their kin, too frail to keep up, and is ready to die.',
  'A great flock of animals blocks the road entirely.',
  'A dead traveler clutches a half-full waterskin — dead of thirst, somehow.',
  'An abandoned wagon or handcart sits roadside, no living soul nearby.',
  'The reeking carcass of a huge beast draws a swarm of scavengers.',
  'Village hunters track a dangerous beast and ask for help, offering a share of the kill.',
  'A frantic parent says slavers just took their child and points the way they fled.',
  'After a storm, crystal formations glitter in the distance, newly uncovered.',
  'An abandoned pack sits in the road — its contents may be good, bad, useless, or gone.',
  'Animals bolt across the road, fleeing something you cannot see.',
  'A shrill whistle pierces the air for several seconds, then stops.',
  'Refugees approach, driven from their village by raiders or a beast.',
  'An overpowering stench drifts from somewhere off the road.',
  'A wall of storm-blown dust races toward you — find shelter, fast.',
  'Several bodies and a smashed wagon litter the road, all signs of violence.',
  'A trail of blood crosses the road and leads off into the wild.',
  'Hardy plants grow nearby — a sign of food, or hidden groundwater.',
  'A wandering priest offers blessings and services, for a price.',
  'An abandoned campsite — and something strange left in the fire pit.',
  'A scrap of vellum blows past, covered in writing none of you can read.',
  'A thirsty infant lies in a basket, a strange birthmark on one cheek.',
  'A lone hide tent stands near the road, seemingly abandoned.',
  'A beggar kneels and swears a year\'s faithful service for food, water, and a single drop of your blood.',
  'A half-sunken giant stone head, once part of a mighty statue, watches the road.',
  'A battered caravan limps along, its wounded many and its guard-captain proud.',
  'Locals try to round up wild beasts and could use another pair of hands.',
  'A crater holds a stoppered bronze bottle — who knows what waits inside.',
  'Moaning drifts from distant ruins; investigate and the movement stops.',
  'A bounty hunter — or several — catches up; there\'s a price on someone here.',
  'Town soldiers are apprehending someone who begs you for help, swearing innocence.',
  'A pillar of dense black smoke rises in the distance.',
  'Freshly disturbed earth beside the road marks a grave, or many.',
  'A traveler begs aid: a plague is killing their settlement.',
  'A ruined fortress looms in the distance, once clearly grand.',
]

export const travelTableSets: TableSet[] = [
  { id: SET_ID, name: 'Travel', source: 'Realm Keeper', systemId: null, tableIds: [TRAVEL_ENCOUNTER_TABLE_ID] },
]

export const travelTableDefs: TableDef[] = [
  listTable(TRAVEL_ENCOUNTER_TABLE_ID, SET_ID, 'Roadside Encounter', TRAVEL_ENCOUNTERS, ['worldgen', 'travel', 'encounter']),
]
