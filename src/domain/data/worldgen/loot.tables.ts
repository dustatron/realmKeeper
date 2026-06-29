import type { TableDef, TableSet } from '@domain/entities/TableDef'
import { listTable } from './tableViewUtils'

// Original Realm Keeper loot/flavor tables (grounded + light whimsy). Browsable
// and rollable — roll one when looting an NPC, a body, a crypt, or a camp.
//
// Table categories inspired by OSR Vault (https://osrvault.com) — the entries
// below are original wording, not copied from that (all-rights-reserved) site.

const SET_ID = 'tableset-rk-loot'
export const WONDROUS_TRINKET_TABLE_ID = 'table-rk-loot-wondrous-trinket'
export const GOBLIN_TRINKET_TABLE_ID = 'table-rk-loot-goblin-trinket'
export const BLACK_MARKET_TABLE_ID = 'table-rk-loot-black-market'
export const CRYPT_ITEM_TABLE_ID = 'table-rk-loot-crypt-item'
export const CAMPSITE_ITEM_TABLE_ID = 'table-rk-loot-campsite-item'

export const WONDROUS_TRINKETS = [
  'A brass key that is always slightly warm.',
  'A pocket mirror that shows you asleep, never awake.',
  'A candle that burns but gives no heat.',
  'A coin that always lands on its edge.',
  'A small bell that rings only when no one is listening.',
  'A vial of water that never empties, nor fills.',
  'A ring that resizes to fit whoever puts it on.',
  'A feather that falls upward, slowly.',
  'A music box playing a tune you can never recall afterward.',
  'A pouch that always holds exactly one acorn.',
  'A compass that points at the nearest liar.',
  'A child\'s drawing of a place none of you have been — yet.',
  'A snow globe with weather that matches tomorrow\'s.',
  'A spoon that stirs on its own when unwatched.',
  'A locket whose painted portrait slowly ages.',
  'A whistle only dogs and the dead seem to hear.',
  'A die that rolls the number you most fear.',
  'A dried flower that blooms when held by someone in love.',
  'A thimble that mends a single stitch each night.',
  'A map that shows only where you have already been.',
  'A glass eye that weeps when a lie is told nearby.',
  'A tuning fork that hums near hidden doors.',
  'A scrap of cloth that is always dry.',
  'A jar of fireflies that spell a different word each dusk.',
  'A quill that writes in a hand not your own.',
  'A stone that grows heavier the longer you hold it.',
  'A teacup that keeps tea hot for exactly one day.',
  'A wax seal stamp bearing a crest no herald recognizes.',
]

export const GOBLIN_TRINKETS = [
  'A "lucky" rock with a face drawn on it.',
  'A single boot, worn as a hat.',
  'A string of mismatched buttons, fiercely guarded.',
  'A spoon sharpened into a tiny, terrible sword.',
  'A doll made of chicken bones and twine.',
  'A jar of teeth, sorted by size.',
  'A shiny belt buckle worn as a medallion.',
  'A "map" that is just a drawing of a bigger goblin.',
  'A thighbone whistle, deeply out of tune.',
  'A ring of keys that open nothing.',
  'A cracked monocle, worn proudly.',
  'A pouch of "gems" — river pebbles, painted.',
  'A rat skull crowned with a bottle cap.',
  'A fork bent into a grappling hook that does not work.',
  'A snail kept as a war-mount, named and beloved.',
  'A length of ribbon stolen from a wedding.',
  'A "wand" (a stick) the owner insists is magic.',
  'A tiny portrait of a dog, much cherished.',
  'A jar labeled DO NOT OPEN, containing one beetle.',
  'A coin purse of acorns and a single real coin.',
  'A "treasure map" leading to another goblin\'s identical stash.',
  'A cowbell, now a holy relic.',
]

export const BLACK_MARKET_GOODS = [
  'A writ of passage bearing a forged noble seal.',
  'A vial of poison sold as "headache tonic."',
  'Lockpicks disguised as sewing needles.',
  'A banned holy text from a suppressed faith.',
  'A caged songbird of a protected, sacred species.',
  'A hand-copied map of a lord\'s private vaults.',
  'A barrel of untaxed spirits, the seal scratched off.',
  'Blank manumission papers, ready to forge.',
  'A weapon of a make outlawed since the last war.',
  'A potion that fakes death for a day.',
  'A list of informants, names half-redacted.',
  'Counterfeit coin, good enough by candlelight.',
  'A relic stolen from a temple, still warm with prayer.',
  'A sedated creature that should never be sold.',
  'Smuggled spice, mildly and pleasantly addictive.',
  'A ledger proving a magistrate takes bribes.',
  'A key said to fit the city gaol.',
  'Forbidden spell components in unmarked jars.',
  'A noble\'s private letters, ripe for blackmail.',
  'A "cure-all" that cures nothing and costs everything.',
  'A brand-removal kit for runaway servants.',
  'Tickets to a fight that is very much to the death.',
]

export const CRYPT_ITEMS = [
  'A signet ring, the finger still in it.',
  'A funerary mask of beaten gold, eyes hollow.',
  'A sealed jar of grave-oil, still fragrant.',
  'A bundle of letters never delivered to the dead.',
  'Coins for the eyes, minted in a fallen realm.',
  'A child\'s toy, placed with terrible care.',
  'A folded war banner of a forgotten house.',
  'A vial of tears, crystallized.',
  'A book of names, the last page blank.',
  'A wedding ring sized for two hands clasped.',
  'A dagger driven through a portrait.',
  'Prayer beads with one bead missing.',
  'An urn that is warm to the touch.',
  'A death mask matching no body here.',
  'A key tied to a wrist with red thread.',
  'A jar of honey, still good after centuries.',
  'A medal awarded posthumously, never worn.',
  'A locked diary, its key swallowed long ago.',
  'A bouquet of stone flowers, perfectly carved.',
  'A mirror turned to face the wall.',
]

export const CAMPSITE_ITEMS = [
  'A bedroll, neatly rolled, still warm.',
  'A journal ending mid-sentence.',
  'A pot of stew, fresh and untouched.',
  'Boots set by a cold fire, owner gone barefoot.',
  'A child\'s drawing pinned to a tree.',
  'A whetstone and a half-sharpened blade.',
  'A letter begun "If you\'re reading this—".',
  'A snare line leading off into the dark.',
  'A deck of cards, one hand dealt for someone absent.',
  'A pack rifled through — coin left, papers taken.',
  'A fishing rod, its line still in the water.',
  'A locket hanging from a branch.',
  'A map with one location violently scratched out.',
  'A flute, still wet from playing.',
  'A fresh grave marked only with a sword.',
  'A ring of salt, broken on one side.',
  'A pair of dice, both showing ones.',
  'A cloak, bloodied, folded with care.',
]

export const lootTableSets: TableSet[] = [
  {
    id: SET_ID,
    name: 'Loot & Trinkets',
    source: 'Realm Keeper',
    systemId: null,
    tableIds: [WONDROUS_TRINKET_TABLE_ID, GOBLIN_TRINKET_TABLE_ID, BLACK_MARKET_TABLE_ID, CRYPT_ITEM_TABLE_ID, CAMPSITE_ITEM_TABLE_ID],
  },
]

export const lootTableDefs: TableDef[] = [
  listTable(WONDROUS_TRINKET_TABLE_ID, SET_ID, 'Wondrous Trinket', WONDROUS_TRINKETS, ['loot', 'trinket']),
  listTable(GOBLIN_TRINKET_TABLE_ID, SET_ID, 'Goblin Trinket', GOBLIN_TRINKETS, ['loot', 'trinket', 'goblin']),
  listTable(BLACK_MARKET_TABLE_ID, SET_ID, 'Black Market Goods', BLACK_MARKET_GOODS, ['loot', 'illicit']),
  listTable(CRYPT_ITEM_TABLE_ID, SET_ID, 'Crypt Item', CRYPT_ITEMS, ['loot', 'crypt']),
  listTable(CAMPSITE_ITEM_TABLE_ID, SET_ID, 'Abandoned Campsite Item', CAMPSITE_ITEMS, ['loot', 'campsite']),
]
