import type { TableDef, TableSet } from '@domain/entities/TableDef'
import { listTable } from './tableViewUtils'

// Two severity tiers, curated from user-provided source:
//  - JOB hooks: grounded, public — fit for a settlement job/notice board.
//  - ILLICIT hooks: schemes a public board would never post; delivered privately
//    by a faction or NPC patron. (Curated from the "Dirty Deeds" list plus a few
//    reskinned campy plots; jokes/modern refs/attributions stripped.)

const SET_ID = 'tableset-rk-hooks'
export const PLOT_HOOKS_JOB_TABLE_ID = 'table-rk-hooks-job'
export const PLOT_HOOKS_ILLICIT_TABLE_ID = 'table-rk-hooks-illicit'

// Grounded medieval grievances (from real court rolls). Public-board safe.
export const PLOT_HOOKS_JOB = [
  'The lord revives an obsolete labour-due everyone thought was dead, and the villeins are organizing.',
  'A relic vanished from the church on the eve of the feast — and with it, the pilgrim money the town depends on.',
  'The mill-dam has flooded a tenant\'s hay-meadow, and he swears he\'ll break it open by night.',
  'Someone is moving the boundary stones in the open fields; strips that fed one family now feed another.',
  'A foreign weaver has undercut the guild — the guild wants him run off, but the lord likes his rent.',
  'Plague is three towns east and closing. Shut the gates and starve, or stay open and gamble?',
  'A body was pulled from the millpond, and the fine falls on the whole township unless the dead man is proven a local.',
  'The lord enclosed the common pasture with a new hedge, and by night the hedge keeps coming down.',
  'A wandering friar preaches against the abbey\'s wealth in the square, and the crowds grow daily.',
  'The ale inspector has been bribed, and the whole town just learned it has been drinking short measure for a year.',
  'Two families both claim the same pew in church, and it has come to blows during service.',
  'The lord\'s rabbit warren is eating the seed-corn; poaching is a hanging matter, and someone is poaching anyway.',
  'A daughter has been promised to two men by two different relatives, and both families have paid.',
  'The bridge-chapel hermit has died, and the tolls he collected are now unclaimed — and contested.',
  'A returning soldier claims land that was quietly reassigned while he was gone.',
  'The well has gone foul; the wise-woman blames a curse, the priest blames sin, the truth is a dead sheep upstream.',
  'The reeve has been skimming the lord\'s dues for years and is one audit from the gallows.',
  'A fair has been granted to a rival town on the same day as yours, by the same lord, for a bigger fee.',
  'Charcoal-burners found something in a barrow and won\'t say what; they\'ve stopped coming to market.',
  'The old lord\'s will is missing — three heirs, one manor, and a steward who knows where it is.',
]

// Extreme schemes — patron-only, never a public posting.
export const PLOT_HOOKS_ILLICIT = [
  'Burn out an entire faction\'s stronghold with a smuggled cask of blackpowder.',
  'Assassinate a ruler and their closest advisors in a single coordinated strike.',
  'Seduce a young noble to influence — or blackmail — them.',
  'Accuse a rival of witchcraft with planted, circumstantial evidence.',
  'Murder someone beloved by your employer, then frame a powerful figure for it.',
  'Maim, but do not kill, an heir — weaken their claim enough to spark a succession war.',
  'Drive a vulnerable figure to a breakdown that ends their public life.',
  'Goad two powerful rivals into a duel to the death so their factions never unite.',
  'Stage a hunting accident for a foolhardy noble.',
  'Replace a blunted tourney lance with a lethal one.',
  'Feed a paranoid ruler planted evidence that triggers a purge.',
  'Spread a song or play that turns the public against a chosen target.',
  'Arrange for raiders to seize a traveling noble\'s ship.',
  'Kidnap a bride-to-be before her wedding and frame a neighboring power.',
  'Break into the treasury and replace a warded chest with an identical fake.',
  'Plant a unique blade to frame a noble as a serial murderer.',
  'Manufacture proof tying a respectable house to the slave trade.',
  // Reskinned campy plots (grounded):
  'A relic vanishes from a guarded reliquary with no sign of forced entry — recover it quietly.',
  'The local lord has been taken for ransom; deliver the price, or get them back without paying it.',
  'Someone is leaking a council\'s secrets; only a handful sat in the room.',
  'A famed prize is stolen from a sealed vault behind layered illusions.',
  'The festival\'s prize gardens are torn up a week before judging — and the favorite must win.',
  'The harvest-fair contest is being rigged: tampered entries, a hostage judge.',
  'Witnesses to a crime keep turning up terrified and silent; make sure they stay that way.',
  'A race must be fixed — the finish line trapped, the track strewn with caltrops.',
  'Buy up every ticket to the season\'s great event so a rival\'s gala fails.',
  'Corner the market on a mundane staple — salt, nails — and squeeze the town.',
]

export const plotHookTableSets: TableSet[] = [
  {
    id: SET_ID,
    name: 'Plot Hooks',
    source: 'Realm Keeper',
    systemId: null,
    tableIds: [PLOT_HOOKS_JOB_TABLE_ID, PLOT_HOOKS_ILLICIT_TABLE_ID],
  },
]

export const plotHookTableDefs: TableDef[] = [
  listTable(PLOT_HOOKS_JOB_TABLE_ID, SET_ID, 'Job Board Hooks', PLOT_HOOKS_JOB, ['worldgen', 'hook', 'job']),
  listTable(PLOT_HOOKS_ILLICIT_TABLE_ID, SET_ID, 'Illicit Hooks', PLOT_HOOKS_ILLICIT, ['worldgen', 'hook', 'illicit']),
]
