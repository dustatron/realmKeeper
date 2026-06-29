import type { TableDef, TableSet } from '@domain/entities/TableDef'
import { listTable } from './tableViewUtils'

// Original Realm Keeper thieves'-guild quest table (grounded + light whimsy).
// Browsable, and folded into the illicit patron-hook pool at generation.
//
// Table category inspired by OSR Vault (https://osrvault.com) — the entries
// below are original wording, not copied from that (all-rights-reserved) site.

const SET_ID = 'tableset-rk-guild'
export const THIEVES_GUILD_QUEST_TABLE_ID = 'table-rk-guild-thieves-quest'

export const THIEVES_GUILD_QUESTS = [
  'Lift a signet ring from a magistrate without leaving a trace.',
  'Plant evidence in a rival\'s safehouse before dawn.',
  'Case a noble\'s manor and map every guard\'s round.',
  'Recover the guild\'s ledger from a turncoat fence.',
  'Rob a shipment, but make it look like the city watch did it.',
  'Replace a temple relic with a flawless fake.',
  'Spring a guild brother from the gaol — quietly.',
  'Collect a debt from someone who can\'t be touched openly.',
  'Burgle the same house twice in a night, to send a message.',
  'Smuggle a sealed crate past the harbor inspectors.',
  'Forge a writ and walk it past the palace gate.',
  'Steal a guest list before a masked ball.',
  'Drug a guard dog (it lives) so it sleeps through the job.',
  'Tail a rival fence and learn who buys their goods.',
  'Crack a merchant-prince\'s vault; leave one coin behind.',
  'Burn one contract — and only that contract — in a locked study.',
  'Swap a duke\'s wine for the guild\'s "special" vintage.',
  'Lift the city-gate keys, copy them, return them by dawn.',
  'Frame a corrupt captain with his own stolen seal.',
  'Retrieve blackmail letters before a rival does.',
  'Empty a rival gang\'s stash and leave their calling card.',
  'Steal a written confession from a priest\'s locked box.',
]

export const guildQuestTableSets: TableSet[] = [
  { id: SET_ID, name: 'Guilds', source: 'Realm Keeper', systemId: null, tableIds: [THIEVES_GUILD_QUEST_TABLE_ID] },
]

export const guildQuestTableDefs: TableDef[] = [
  listTable(THIEVES_GUILD_QUEST_TABLE_ID, SET_ID, 'Thieves\' Guild Quest', THIEVES_GUILD_QUESTS, ['guild', 'thieves', 'quest']),
]
