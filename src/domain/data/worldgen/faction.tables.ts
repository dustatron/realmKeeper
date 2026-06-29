import type { TableDef, TableSet } from '@domain/entities/TableDef'
import { listTable } from './tableViewUtils'

// Original Realm Keeper content (grounded + light whimsy). Faction motivations
// enrich generated factions; noble secrets attach to Noble House factions.
//
// Table categories inspired by OSR Vault (https://osrvault.com) — the entries
// below are original wording, not copied from that (all-rights-reserved) site.

const SET_ID = 'tableset-rk-faction'
export const FACTION_MOTIVATION_TABLE_ID = 'table-rk-faction-motivation'
export const NOBLE_SECRET_TABLE_ID = 'table-rk-faction-noble-secret'

// Phrased to follow "They seek to ___".
export const FACTION_MOTIVATIONS = [
  'restore a fallen house to its former glory',
  'monopolize a vital trade and crush all rivals',
  'awaken — or appease — something sleeping beneath the land',
  'purify the realm of a people or practice they despise',
  'hoard forbidden knowledge and guard it jealously',
  'install a hidden hand behind the throne',
  'avenge an old betrayal, however many must fall',
  'keep an ancient pact everyone else has forgotten',
  'expand their territory by any means short of open war',
  'preserve a dying tradition against the changing age',
  'profit from a war they quietly keep simmering',
  'find and control a bloodline, or a chosen one',
  'supplant the gods\' favor with their own',
  'reclaim a relic they believe is rightfully theirs',
  'protect a secret that would topple them if known',
  'recruit and convert until they outnumber all others',
  'bleed a richer neighbor dry through debt and favors',
  'return a banished leader to power',
  'erase every record of a shameful past',
  'broker a peace in which they alone hold the strings',
  'harvest something the land — or its people — produce',
  'prove their worth to a patron who scorns them',
  'outlast their rivals and inherit what remains',
  'make themselves indispensable to whoever rules',
]

// Phrased as a standalone clause: "Secret: ___."
export const NOBLE_SECRETS = [
  'the true heir was switched at birth, and they know it',
  'the family fortune is long gone — the wealth is all show',
  'their founding title was bought with a massacre',
  'the patriarch has been dead for months, his orders forged',
  'they owe everything to a creditor no one has ever met',
  'something is kept, and fed, in the cellars',
  'the late ruler was poisoned by their own kin',
  'their bloodline carries a curse that surfaces each generation',
  'they trade quietly with an enemy they publicly revile',
  'the heir is secretly lowborn, raised to pass',
  'a sibling is imprisoned in the house, declared dead',
  'they bargained with something inhuman for their rank',
  'the family relic is a forgery; the real one was lost',
  'they fund the very bandits they pay to be protected from',
  'an old crime lies buried, literally, beneath the estate',
  'the matriarch is not who she claims to be',
  'they are blackmailing the crown — and being blackmailed in turn',
  'their lands sit atop something that must never be dug up',
  'the marriage that secured their power was never legal',
  'a forbidden romance threatens to expose everything',
  'they have quietly been selling titles they do not hold',
  'the heir despises the family and plots its ruin',
  'their famed ancestor\'s deeds were all another\'s',
  'they keep a prophet locked away and obey its every word',
]

export const factionTableSets: TableSet[] = [
  {
    id: SET_ID,
    name: 'Factions',
    source: 'Realm Keeper',
    systemId: null,
    tableIds: [FACTION_MOTIVATION_TABLE_ID, NOBLE_SECRET_TABLE_ID],
  },
]

export const factionTableDefs: TableDef[] = [
  listTable(FACTION_MOTIVATION_TABLE_ID, SET_ID, 'Faction Motivation', FACTION_MOTIVATIONS, ['worldgen', 'faction', 'motivation']),
  listTable(NOBLE_SECRET_TABLE_ID, SET_ID, 'Noble House Secret', NOBLE_SECRETS, ['worldgen', 'faction', 'secret']),
]
