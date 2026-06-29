import type { TableDef, TableSet } from '@domain/entities/TableDef'
import { listTable } from './tableViewUtils'

// Curated from user-provided source (grounded fantasy + light whimsy). Modern /
// sci-fi entries and joke lists were dropped. Browsable in the Tables UI and
// live-driven by buildShops.

const SET_ID = 'tableset-rk-shops'
export const SHOP_TYPES_TABLE_ID = 'table-rk-shops-types'
export const SHOP_NAMES_TABLE_ID = 'table-rk-shops-names'

// Genre-appropriate shop / business types found in a town or city.
export const SHOP_TYPES = [
  'Apothecary', 'Herbalist', 'Armorer', 'Artist\'s Studio', 'Auction House', 'Bakery',
  'Bank / Money Changer', 'Barber', 'Bathhouse', 'Blacksmith', 'Boarding House', 'Bookbinder',
  'Bowyer / Fletcher', 'Brewery', 'Brickmaker', 'Butcher', 'Candle Maker', 'Carpenter',
  'Cartwright', 'Cheesemonger', 'Clothier', 'Cobbler', 'Confectioner', 'Cooper',
  'Courier\'s Office', 'Curio Shop', 'Distillery', 'Dyer', 'Engraver', 'Fishmonger',
  'Flour Mill', 'Fortune Teller', 'Furrier', 'General Goods Store', 'Glassblower', 'Goldsmith',
  'Greengrocer', 'Guildhall', 'Haberdashery', 'Infirmary', 'Inn / Tavern', 'Jeweler',
  'Kennel', 'Leatherworker', 'Library', 'Locksmith', 'Mapmaker', 'Masonry Shop', 'Meadery',
  'Instrument Maker', 'Oil Merchant', 'Pawn Shop', 'Perfumer', 'Potter', 'Restaurant',
  'Rope Maker', 'Rug Merchant', 'Saddler', 'Scribe', 'Shipwright', 'Silversmith', 'Smokehouse',
  'Soap Maker', 'Spice Merchant', 'Stables', 'Street Food Stall', 'Tailor', 'Tannery',
  'Tattoo Parlor', 'Tea House', 'Temple', 'Theater', 'Tilemaker', 'Tool & Hardware Store',
  'Undertaker', 'Wainwright', 'Warehouse', 'Weaponsmith', 'Weaver', 'Wheelwright',
  'Wine Merchant', 'Alchemist', 'Enchanter', 'Magic Shop', 'Scroll Shop', 'Diviner\'s Parlor',
  'Tinkerer', 'Chandler', 'Net Maker',
]

// Evocative shop names (Reddit attributions stripped; modern jokes dropped).
export const SHOP_NAMES = [
  'Heart\'s Enchanted Wares', 'Goldy\'s Locks', 'Drake\'s One-Stop Shop',
  'Edwin\'s Enchantment Emporium', 'Mavek\'s Sortilege', 'Sweet Iron Smithy', 'Jigra\'s General',
  'The Bearded Giant Builders', 'White Mountain Salves & Potables', 'The Warewarren',
  'Three Stones Teahouse', 'The Goblin Emporium', 'Divine Interventions', 'Chimera Forge',
  'Strong Arm Mercenaries', 'Sticks & Stones Scrolls', 'The Smiling Duck', 'The Yodelling Otter',
  'Chaotic Goodwill', 'The Diamond Needle', 'The Giant\'s Left Shoe', 'Second Hand Wishes',
  'Anthemen\'s Bowyer & Lathery', 'The Cart\'s Wheel', 'The Happy Hearth', 'The Sea\'s Song',
  'The Salty Cat', 'Shark & Sharp\'s Smithing Co.', 'Dragon Bones Arms & Armaments',
  'Moonlace Dressmakers', 'The Witches\' Brew', 'Fur & Fangs Pet Emporium',
  'Willowwood Wands & Staffs', 'Rosemary\'s Kitchen', 'Patricia\'s Potions',
  'Wildwood Tack & Saddle', 'Spare a Crumb Bakery', 'Bert\'s Books & Baubles', 'Shiny\'s Shinies',
  'The Iron Claw', 'Toil & Trouble', 'The Afterthought', 'Riffraff', 'The Wolfe Boutique',
  'Algernon\'s Flowers', 'The Chair House', 'He Who Smelt It', 'Loot Locker', 'The Sharper Mage',
  'Booker\'s Bookshop', 'Tate\'s Bait & Tackle', 'Davidson\'s Spellbooks', 'Mr. Twillier\'s Wands',
  'Royal & Royal\'s Funerary Services', 'The Bone Bowl',
]

export const shopTableSets: TableSet[] = [
  {
    id: SET_ID,
    name: 'Shops',
    source: 'Realm Keeper',
    systemId: null,
    tableIds: [SHOP_TYPES_TABLE_ID, SHOP_NAMES_TABLE_ID],
  },
]

export const shopTableDefs: TableDef[] = [
  listTable(SHOP_TYPES_TABLE_ID, SET_ID, 'Shop Types', SHOP_TYPES, ['worldgen', 'shop', 'type']),
  listTable(SHOP_NAMES_TABLE_ID, SET_ID, 'Shop Names', SHOP_NAMES, ['worldgen', 'shop', 'name']),
]
