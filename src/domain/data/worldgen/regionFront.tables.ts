import type { TableDef, TableSet } from '@domain/entities/TableDef'
import { listTable } from './tableViewUtils'

// Regional FRONTS — slow-burning threats that worsen if the table ignores them.
// Each front is a TITLE paired with an ESCALATING DESCRIPTION: it names the
// danger, says what it is doing now, and warns where it ends if nobody acts.
// A mini progress-clock threat (see buildRegionFront), system-agnostic and
// stat-free. All content original. Voice: grounded, with a thread of unease.

const SET_ID = 'tableset-rk-region-fronts'
export const REGION_FRONT_TITLE_TABLE_ID = 'table-rk-region-front-title'
export const REGION_FRONT_DESC_TABLE_ID = 'table-rk-region-front-desc'

// Front titles — evocative, ominous, but plain enough to write on a map.
export const REGION_FRONT_TITLES = [
  'The Toll of the Broken Road',
  'The Mine That Will Not Close',
  'The Quiet in the East',
  'The Spreading Rot',
  'The Debt Comes Due',
  'The Cult of the Open Door',
  'The Drying of the Wells',
  'The Long Hunger',
  'The Banners on the Hill',
  'The Sickness Upstream',
  'The Crows Are Gathering',
  'The Bridge No One Crosses',
  'The Stranger Who Stayed',
  'The Fire Beneath the Floor',
  'The Year the Frost Came Early',
]

// Escalating descriptions — each opens with the present harm and closes with the
// worse end it grows toward if left to fester. Index-aligned in spirit to the
// titles but drawn independently, so any title can ride any escalation.
export const REGION_FRONT_DESCRIPTIONS = [
  'It began with a single toll on the old road, then two, then a tariff on the air itself. Caravans take the long way now, and the long way is worse. Left alone, the road will belong to whoever holds the chokepoint — and the towns it fed will go quiet for want of trade.',
  'The seam should have been worked out a year ago, yet the diggers keep going deeper, and fewer come back up. The overseer pays in coin no one recognizes. If the digging is not stopped, what they are mining for will finish being uncovered.',
  'Word stopped coming from the easternmost holdings a season past. No smoke, no traders, no refugees — just silence, spreading like a stain on the map. Each week the edge of the silence creeps a little nearer. Soon there will be no one left to send word.',
  'A grey rot has taken the fields at the valley\'s low end, and the line of it moves uphill a hand\'s breadth each night. The afflicted soil grows nothing and remembers nothing. Unchecked, it will reach the granaries, and then the wells, and then the people.',
  'A debt was called in, and the one who owed it could not pay. Now the lenders own the mill, the warehouse, the ferry — and the prices climb to match. If the holding is not broken, they will own the whole region in a year, and answer to no lord at all.',
  'They keep a door open in the old chapel, and they will not say to where. Each month a few more of the desperate go in, and the ones who come out are calmer than they should be. If the congregation grows much larger, they will not need to ask politely anymore.',
  'The wells came up brackish in midsummer, then in spring, and now the river runs thin and brown. The herds are sold off cheap; the gardens are dust. If the source of the drought is not found, the towns will empty one wagon at a time.',
  'The granaries opened to find the grain gone to powder and weevils, and the merchants who promised more have not come. Folk are eating the seed-stock now, which means there will be nothing to plant. By the next lean season, hunger will do what no army could.',
  'New banners have risen on the high ground, and the host beneath them grows by the week — deserters, the dispossessed, the simply angry. They have not marched yet. When they do, every town between here and the river will have to choose a side or be trampled.',
  'A foulness has entered the headwaters, and the sickness follows the current downstream, town by town along the bank. The healers are out of cures and nearly out of hope. If the source is not cleansed, the whole watershed will be a graveyard by harvest.',
  'The carrion birds came first, in numbers no one could explain, settling on the rooftops of one village, then the next. The dogs will not bark at them. Wherever they roost, a death soon follows. They are still moving inward, and they are patient.',
  'The bridge still stands, but no one will set foot on it after dark, and now not in daylight either. Trade that crossed in an afternoon takes three days around. Cut off long enough, the far bank will forget it was ever part of the same land.',
  'A traveler arrived in the worst of the winter and never left, and households began to change their minds about old loyalties soon after. No one can say quite what was promised. If the stranger is not unmasked, the region will wake one morning already sold.',
  'Warmth seeps up through the cellar floors now, and a faint singing with it, and the old folk have started barring their doors against the ground. Whatever stirs below is rising. When it reaches the surface, the town above will be the least of its concerns.',
  'The frost came a full month before its season and has not loosened since. Crops froze in the field, livestock in the byre. The cold is unnatural and it is deepening. If its cause is not broken, the region will not see another spring with anyone left to greet it.',
]

export const regionFrontTableSets: TableSet[] = [
  {
    id: SET_ID,
    name: 'Regional Fronts',
    source: 'Realm Keeper',
    systemId: null,
    tableIds: [REGION_FRONT_TITLE_TABLE_ID, REGION_FRONT_DESC_TABLE_ID],
  },
]

export const regionFrontTableDefs: TableDef[] = [
  listTable(REGION_FRONT_TITLE_TABLE_ID, SET_ID, 'Regional Front Title', REGION_FRONT_TITLES, ['worldgen', 'front', 'title']),
  listTable(REGION_FRONT_DESC_TABLE_ID, SET_ID, 'Regional Front Escalation', REGION_FRONT_DESCRIPTIONS, ['worldgen', 'front', 'escalation']),
]
