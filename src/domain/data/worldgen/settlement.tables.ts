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
export const NOTABLE_FEATURE_TABLE_ID = 'table-rk-settlement-notable-feature'

// A single striking feature that defines the settlement (curated/condensed from
// user source, grounded + light whimsy).
export const NOTABLE_FEATURES = [
  'it is built atop the ruins of a long-destroyed city, crumbling ramparts ringing it',
  'a lightning-struck stone tower stands abandoned, and entering it during a storm is a local dare',
  'its timber buildings glow faintly at night by a closely guarded technique',
  'it is built into an old opal mine, the walls glistening with rainbow light',
  'it is entirely a village of treehouses high in the canopy',
  'a fountain in the square catches gold dust from the snowmelt, and couples pull a nugget for luck at weddings',
  'a famous bard\'s song celebrates its natural splendor — accurately',
  'it speaks its own tongue, thought to survive from a forgotten age',
  'everything here is decided by games of chance — prices, wages, even leadership',
  'it never rains directly over the village, though the countryside gets its share',
  'it sits on a river island that drifts slowly upstream and back over the year',
  'it is built almost entirely from the bones, tusks, and horns of an extinct giant beast',
  'it has fallen on hard times — rich folk in torn finery and a desperate mayor',
  'the whole village gathers weekly for a communal feast that feeds the poor',
  'it is overrun with bards from a nearby college, music everywhere',
  'the whole village lives in one ever-expanding building, tightly knit',
  'it is carved from the side of a great rock mesa, homes and all',
  'it is famous for a graveyard whose markers are wittily or beautifully inscribed',
  'the village cats do not speak, but plainly understand every word',
  'it is a precious oasis in a barren desert that everyone depends on',
  'it is built around a fast stream lined with great mill-wheels',
  'houses climb a steep hill — front door downstairs, back door up',
  'it is built from beached shipwrecks and ocean debris, cobbled together',
  'it is highly vertical, folk getting around by rope ladders and ziplines',
  'it is renowned for breeding magnificent racing horses, and buyers come from afar',
  'it is built atop a gigantic, peaceful creature that occasionally wanders',
  'it has seven working wells, and a different story for each',
  'it lies in the shadow of a shattered stone pillar whose top litters the base',
  'great wild herbivores wander its streets, and harming them is taboo',
  'its houses stand on stilts joined by causeways against frequent floods',
  'it is obsessed with music — talent and prestige are one and the same',
  'it is shaken by frequent quakes, and everything is built to ride them out',
  'it is home to a monastery, and locals meditate in the open streets',
  'a vast unknown tree showers the village in golden petals each summer',
  'it is built atop a great bridge, trade flowing through constantly',
  'it perches on cliffs, and its folk tame and ride gryphons',
  'dark rumors keep outsiders away — deliberately, it turns out',
  'it is built around limestone sinkholes from which odd artifacts surface',
  'it is kept magically spotless, any filth whisked away at once',
  'it is built around a half-finished bridge that ends in midair, and a legend about crossing it',
  'it sits below a mountaintop shrine and lives off the pilgrim trade',
  'it is built around a fine-stone quarry, and nearly everyone works the stone',
  'mushrooms are everywhere here — farmed, wild, and magically enlarged',
  'its walls and ramparts are built from giant bones',
  'its flat rooftops interconnect into a second street level above',
  'it sits on hot springs and is famous for baths said to heal',
  'the whole village is a workshop, turning raw goods into finished wares',
  'it is famous for its forges, a great multi-forge heating the whole town',
  'it clings to a cliff and rock columns, houses jammed onto every ledge',
  'it is built on swampy islets, folk traveling by boat and rope bridge',
  'it is built around an ancient carved stone said to summon good winds',
  'the dead are buried beneath the floors, and you greet each by name on entering',
  'a grand menagerie of exotic beasts sits at its center',
  'it holds the tomb of a revered hero, whose likeness is everywhere',
  'it openly operates what other towns forbid — gambling halls and worse',
  'it boasts one of the realm\'s great libraries, three stories tall',
  'a spring at its heart is said to heal, and all gather there for water',
  'it is built from the repurposed remains of an old dungeon',
]

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
    tableIds: [DISTRICT_TABLE_ID, KNOWN_FOR_TABLE_ID, STRUCTURE_QUIRK_TABLE_ID, GUILD_TABLE_ID, SHOP_QUIRK_TABLE_ID, NOTABLE_FEATURE_TABLE_ID],
  },
]

export const settlementTableDefs: TableDef[] = [
  listTable(DISTRICT_TABLE_ID, SET_ID, 'Settlement District', DISTRICTS, ['worldgen', 'settlement', 'district']),
  listTable(KNOWN_FOR_TABLE_ID, SET_ID, 'Settlement Known For', KNOWN_FOR, ['worldgen', 'settlement']),
  listTable(STRUCTURE_QUIRK_TABLE_ID, SET_ID, 'Settlement Structure Quirk', STRUCTURE_QUIRKS, ['worldgen', 'settlement']),
  listTable(GUILD_TABLE_ID, SET_ID, 'Settlement Guild', GUILDS, ['worldgen', 'settlement', 'guild']),
  listTable(SHOP_QUIRK_TABLE_ID, SET_ID, 'Shop Quirk', SHOP_QUIRKS, ['worldgen', 'shop', 'quirk']),
  listTable(NOTABLE_FEATURE_TABLE_ID, SET_ID, 'Settlement Notable Feature', NOTABLE_FEATURES, ['worldgen', 'settlement', 'feature']),
]
