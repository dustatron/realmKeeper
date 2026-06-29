import type { TableDef, TableSet } from '@domain/entities/TableDef'
import { listTable } from './tableViewUtils'

// Original Realm Keeper dungeon/crypt atmosphere tables (grounded + light whimsy).
// Browsable and rollable — drop one into a tomb chamber or quiet dungeon room.
//
// Table categories inspired by OSR Vault (https://osrvault.com) — the entries
// below are original wording, not copied from that (all-rights-reserved) site.

const SET_ID = 'tableset-rk-dungeon'
export const CRYPT_DRESSING_TABLE_ID = 'table-rk-dungeon-crypt-dressing'
export const HARMLESS_DENIZEN_TABLE_ID = 'table-rk-dungeon-harmless-denizen'

export const CRYPT_DRESSINGS = [
  'Dust lies thick everywhere — except one clean handprint.',
  'The air drops ten degrees past the threshold.',
  'Niches line the walls, each holding a skull facing out.',
  'A mural of a feast, the diners\' faces all scratched away.',
  'Water drips somewhere, in a rhythm too even to be natural.',
  'Wilted flowers, recently laid, rest on an ancient bier.',
  'A floor mosaic of a sleeping figure; do not step on the face.',
  'Candle stubs, burned down, arranged in a spiral.',
  'Names are carved over every door in an unreadable script.',
  'A statue\'s outstretched hand holds a fresh coin.',
  'The ceiling glitters with tiny embedded teeth.',
  'A draft carries myrrh, and beneath it, rot.',
  'Sarcophagus lids sit ajar — all of them, the same amount.',
  'Footprints in the dust circle the room and never leave.',
  'A bell hangs by each tomb, its string long rotted.',
  'The walls weep a slow, salt-crusted moisture.',
  'Offerings of food, some petrified, some fresh.',
  'A single chair faces the largest tomb, worn smooth.',
  'A fresco of the rising dead, abandoned half-painted.',
  'Every surface is scrupulously, impossibly clean.',
  'Painted child\'s handprints climb one wall to the ceiling.',
  'The dead are seated, not laid, around a long stone table.',
  'A curtain of bone beads divides the chamber.',
  'Echoes return a half-beat late.',
  'Grave goods are arranged as if the owner just stepped out.',
  'The torchlight throws too many shadows.',
]

export const HARMLESS_DENIZENS = [
  'A colony of glowing, palm-sized mushroom-crabs.',
  'A blind cave salamander, curious and slow.',
  'A nest of luminous moths the size of your hand.',
  'A family of ratlings that have learned to bow.',
  'An elderly tortoise wearing a crown of moss.',
  'Pale frogs that croak in eerie harmony.',
  'Will-o\'-wisps that harmlessly mimic your lantern.',
  'A many-tailed cave cat, entirely uninterested in you.',
  'Beetles that have polished a floor to a mirror.',
  'A fist-sized owlbear cub, lost and peeping.',
  'A talking mushroom that only ever says "soon."',
  'A shield-sized snail, slowly redecorating.',
  'Bat-mice that steal buttons and flee.',
  'A gelatinous blob that has eaten only dust, and is sad.',
  'Featherless cave-chicks that imprint on the first face.',
  'A spider that knits instead of webs.',
  'Eyeless fish in a black pool, oddly friendly.',
  'A mole that surfaces to offer you a worm.',
  'Crickets that fall silent, then seem to applaud.',
  'Glow-worms arranged like a constellation.',
  'A very old, well-fed dog that leads you about.',
  'A toad that swallows the light, then politely returns it.',
]

export const dungeonDressingTableSets: TableSet[] = [
  {
    id: SET_ID,
    name: 'Dungeon & Crypt',
    source: 'Realm Keeper',
    systemId: null,
    tableIds: [CRYPT_DRESSING_TABLE_ID, HARMLESS_DENIZEN_TABLE_ID],
  },
]

export const dungeonDressingTableDefs: TableDef[] = [
  listTable(CRYPT_DRESSING_TABLE_ID, SET_ID, 'Crypt Dressing', CRYPT_DRESSINGS, ['dungeon', 'crypt', 'dressing']),
  listTable(HARMLESS_DENIZEN_TABLE_ID, SET_ID, 'Harmless Dungeon Denizen', HARMLESS_DENIZENS, ['dungeon', 'denizen']),
]
