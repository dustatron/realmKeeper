import type { TableDef, TableSet } from '@domain/entities/TableDef'
import { listTable } from './tableViewUtils'

// Original Realm Keeper curse table (grounded + light whimsy). Browsable and
// rollable — apply when a cursed item, place, or deed takes hold.
//
// Table category inspired by OSR Vault (https://osrvault.com) — the entries
// below are original wording, not copied from that (all-rights-reserved) site.

const SET_ID = 'tableset-rk-curses'
export const CURSE_TABLE_ID = 'table-rk-curse'

export const CURSES = [
  'Your reflection lags a heartbeat behind you.',
  'Every mirror you pass quietly cracks.',
  'You age a year each time you knowingly lie.',
  'Food turns to ash in your mouth on holy days.',
  'Your shadow points the wrong way.',
  'You cannot speak the name of someone you love.',
  'Dogs growl at you; cats flee.',
  'You weep small salt-gems, and everyone notices.',
  'The last thing you said is repeated by every echo.',
  'You cannot cross running water unaided.',
  'Your wounds heal, but leave someone else\'s scars.',
  'You forget one memory each dawn.',
  'Flowers wither where you sleep.',
  'You can never feel warm again.',
  'You speak only the truth, and it ruins you.',
  'Your name slips from the minds of all who meet you.',
  'You hunger, and only sorrow fills you.',
  'Every coin you touch turns to lead by morning.',
  'You cannot lie down; sleep finds you only sitting.',
  'Birds follow you everywhere, silent and watchful.',
  'You see everyone\'s death-date, but never the cause.',
  'Your blood runs black, though you are otherwise hale.',
  'You can never again enter a home uninvited.',
  'The dead can see you, and they wave.',
  'You count, compulsively, everything you pass.',
  'Your luck is good — but someone nearby always pays for it.',
]

export const curseTableSets: TableSet[] = [
  { id: SET_ID, name: 'Curses', source: 'Realm Keeper', systemId: null, tableIds: [CURSE_TABLE_ID] },
]

export const curseTableDefs: TableDef[] = [
  listTable(CURSE_TABLE_ID, SET_ID, 'Curse', CURSES, ['curse', 'magic']),
]
