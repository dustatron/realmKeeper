import type { TableDef, TableSet } from '@domain/entities/TableDef'
import { listTable } from './tableViewUtils'

// Settlement-flavor tables (curated from user-provided source, grounded + light
// whimsy). Browsable and live-driven by buildSettlement: each settlement gets a
// district, a "known for", a structure quirk, and sometimes a guild; each shop
// gets a quirk.

const SET_ID = 'tableset-rk-settlement'
export const DISTRICT_TABLE_ID = 'table-rk-settlement-district'
export const KNOWN_FOR_TABLE_ID = 'table-rk-settlement-known-for'
export const STRUCTURE_QUIRK_TABLE_ID = 'table-rk-settlement-structure-quirk'
export const GUILD_TABLE_ID = 'table-rk-settlement-guild'
export const SHOP_QUIRK_TABLE_ID = 'table-rk-settlement-shop-quirk'

export const DISTRICTS = [
  'the Market quarter', 'the Temple district', 'the Docks', 'the Old Town',
  'the Craftsmen\'s row', 'the Noble quarter', 'the Slums', 'the Foreign quarter',
  'the Garden terraces', 'the Red-lantern district', 'the Warehouse district',
  'the Shrine ward', 'the Riverside', 'the High town', 'the Under town', 'the Tannery row',
]

export const KNOWN_FOR = [
  'its cherry trees', 'its fish markets', 'its bells', 'its spice trade', 'its waterfalls',
  'a famous midsummer festival', 'fine horses', 'a grand library', 'a cursed well no one will cap',
  'its blue-glazed rooftops', 'the best ale for three days\' ride', 'a saint\'s relic',
  'its clockwork fountains', 'a yearly boat race', 'its singing stonemasons', 'wines pressed by moonlight',
]

export const STRUCTURE_QUIRKS = [
  'built over older catacombs', 'half-sunken into soft ground', 'perpetually under construction',
  'rumored to be haunted', 'overgrown with stubborn ivy', 'raised on stilts above the mire',
  'walled in black stone', 'terraced into a cliffside', 'ringed by a dry, weedy moat',
  'its streets laid in a baffling spiral', 'crowned by a leaning tower', 'riddled with smugglers\' tunnels',
  'rebuilt atop its own ashes', 'shadowed by an enormous old tree', 'split by a fast green river',
  'its oldest hall slowly tilting',
]

export const GUILDS = [
  'a Thieves\' guild', 'a Masons\' guild', 'a Mages\' circle', 'a Merchants\' consortium',
  'an Alchemists\' guild', 'a Hunters\' lodge', 'a Bards\' college', 'an Assassins\' chapter',
  'a Miners\' union', 'a Cartographers\' society', 'a Smiths\' guild', 'a Tanners\' guild',
  'a Healers\' order', 'a Mercenary company', 'a Relic-hunters\' guild', 'a Brewers\' guild',
]

export const SHOP_QUIRKS = [
  'sells broken trinkets as "working" magic', 'the owner never seems to blink',
  'prices shift with the customer\'s mood', 'a cat appears to run the register',
  'haggling is strictly forbidden', 'everything smells faintly of cinnamon',
  'open only when it rains', 'the back room is always locked',
  'the proprietor speaks only in rhyme', 'keeps a ledger of every customer\'s secrets',
  'the goods rearrange themselves overnight', 'offers a discount for a good story',
  'the sign changes wording by the hour', 'a parrot repeats yesterday\'s gossip',
  'accepts payment in memories, allegedly', 'the door is always slightly too small',
]

export const settlementTableSets: TableSet[] = [
  {
    id: SET_ID,
    name: 'Settlement',
    source: 'Realm Keeper',
    systemId: null,
    tableIds: [DISTRICT_TABLE_ID, KNOWN_FOR_TABLE_ID, STRUCTURE_QUIRK_TABLE_ID, GUILD_TABLE_ID, SHOP_QUIRK_TABLE_ID],
  },
]

export const settlementTableDefs: TableDef[] = [
  listTable(DISTRICT_TABLE_ID, SET_ID, 'Settlement District', DISTRICTS, ['worldgen', 'settlement', 'district']),
  listTable(KNOWN_FOR_TABLE_ID, SET_ID, 'Settlement Known For', KNOWN_FOR, ['worldgen', 'settlement']),
  listTable(STRUCTURE_QUIRK_TABLE_ID, SET_ID, 'Settlement Structure Quirk', STRUCTURE_QUIRKS, ['worldgen', 'settlement']),
  listTable(GUILD_TABLE_ID, SET_ID, 'Settlement Guild', GUILDS, ['worldgen', 'settlement', 'guild']),
  listTable(SHOP_QUIRK_TABLE_ID, SET_ID, 'Shop Quirk', SHOP_QUIRKS, ['worldgen', 'shop', 'quirk']),
]
