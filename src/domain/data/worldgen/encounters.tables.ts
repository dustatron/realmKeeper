import type { TableDef, TableSet } from '@domain/entities/TableDef'
import { listTable } from './tableViewUtils'

// Original Realm Keeper encounter tables (grounded + light whimsy). Browsable and
// rollable — meant to be rolled live when the party is in a forest or walking a
// town's streets. (Not yet wired into the category-based region cascade.)
//
// Table categories inspired by OSR Vault (https://osrvault.com) — the entries
// below are original wording, not copied from that (all-rights-reserved) site.

const SET_ID = 'tableset-rk-encounters'
export const FOREST_ENCOUNTER_TABLE_ID = 'table-rk-forest-encounter'
export const SETTLEMENT_ENCOUNTER_TABLE_ID = 'table-rk-settlement-encounter'

export const FOREST_ENCOUNTERS = [
  'A clearing where every tree is carved with the same unknown rune.',
  'A deer with too many eyes watches, unafraid, then walks away.',
  'An overgrown shrine, its offering bowl freshly filled.',
  'A charcoal-burner\'s camp, fire still warm, owner nowhere in sight.',
  'A rope bridge over a gorge, half its planks missing.',
  'Fireflies drifting in deliberate, beckoning patterns.',
  'A snare, and in it, something that should not have been caught.',
  'A ring of mushrooms; the air inside it is noticeably colder.',
  'A weeping sound, always just past the next stand of trees.',
  'A fallen giant\'s skeleton, mossed over, big enough to shelter in.',
  'A pack of wolves that pace the party but do not attack.',
  'A child\'s shoes set neatly on a stump, laces tied.',
  'A spring that runs uphill.',
  'A woodcutter who warns you to be gone before dark, and won\'t say why.',
  'All the birdsong stops at once.',
  'A trail of discarded belongings leading off the path.',
  'A bear with a cart-axle through its shoulder, in pain and furious.',
  'An old woman gathering herbs who already knows your names.',
  'Trees grown around old armor and the bones inside it.',
  'A field of flowers that turn to follow you, not the sun.',
  'A treant, ancient and slow, deciding whether you are a threat.',
  'A hermit\'s hut with a stew pot and two empty bowls set out.',
  'A wounded stag that leads you somewhere, if followed.',
  'A patch of forest burned in a perfect circle, long ago.',
  'A merchant\'s wagon, stripped bare, with no tracks leaving it.',
  'Lit lanterns hung in the branches, miles from any road.',
  'A pit trap, freshly dug, poorly hidden.',
  'A pond so still it reflects a sky that isn\'t above you.',
  'Goblins arguing loudly over a map none of them can read.',
  'A standing stone that is warm to the touch.',
  'Crows that follow, dropping small bright objects.',
  'Refugees hiding in the brush from something on the road.',
  'A great web between two trees — spinner gone, prey still fresh.',
  'A freestanding door, in the middle of the trees, slightly ajar.',
  'A boar the size of an ox, asleep across the only dry path.',
  'Saplings planted in tidy rows by no farmer for miles.',
  'A bard, lost three days, who will pay to be guided out.',
  'Woodsmoke and faint singing carried on the wind.',
  'A fox that drops a ring at your feet and waits.',
  'A grove where it is somehow always autumn.',
]

export const SETTLEMENT_ENCOUNTERS = [
  'A pickpocket bumps you, then bolts into the crowd.',
  'A town crier shouts news three days stale and badly wrong.',
  'A funeral procession blocks the street; the mourners eye you.',
  'Two merchants come to blows over a debt.',
  'A child tugs your sleeve, begging you to come quick.',
  'A drunk loudly recognizes one of you — wrongly. Or not.',
  'A loose pig careens through the market, owner in pursuit.',
  'A preacher promises the world\'s end by week\'s end.',
  'Guards stop you to ask after a description that fits a friend.',
  'A puppet show whose villain looks suspiciously like the local lord.',
  'A fortune-teller calls you over by name.',
  'A building is burning, and the bucket line is short of hands.',
  'A duel is forming in the square; seconds are being chosen.',
  'A beggar who, up close, is wearing very fine boots.',
  'A tax collector with an armed escort works down the row.',
  'A sale crowd surges and carries you along with it.',
  'A cart loses a wheel, spilling fruit across the cobbles.',
  'A noble\'s carriage splashes you and does not stop.',
  'Someone tries to hire you on the spot, mistaking you for sellswords.',
  'A tavern brawl spills out into your path.',
  'A stray dog adopts the party and will not be dissuaded.',
  'A street musician plays a tune one of you swears you\'ve dreamt.',
  'Two guards argue over which of them has to handle something.',
  'A vendor presses "free" samples that are very much not free.',
  'A procession carries an idol none of you recognize.',
  'A pamphleteer thrusts a seditious leaflet into your hands.',
  'A child has climbed too high after a kite and can\'t get down.',
  'A body is loaded onto a cart; no one will say whose.',
  'A rival adventuring party, louder and worse-dressed than you.',
  'A merchant begs you to watch his stall "just for a moment."',
  'A runaway horse clatters past, reins dragging, eyes wild.',
  'A crowd has gathered around an obelisk that wasn\'t there yesterday.',
  'A cutpurse in the stocks spits the names of accomplices.',
  'A drunk, generous wedding party insists you join.',
  'A messenger sprints past, then doubles back to ask directions.',
  'An old soldier sells medals he clearly earned.',
  'A gambler waves you toward a game that is surely rigged.',
  'A shopkeeper chases a thief who shares a face with a stranger.',
  'A street magician whose tricks might not be tricks.',
  'A quiet alley where someone is plainly waiting for someone.',
]

export const encounterTableSets: TableSet[] = [
  {
    id: SET_ID,
    name: 'Encounters',
    source: 'Realm Keeper',
    systemId: null,
    tableIds: [FOREST_ENCOUNTER_TABLE_ID, SETTLEMENT_ENCOUNTER_TABLE_ID],
  },
]

export const encounterTableDefs: TableDef[] = [
  listTable(FOREST_ENCOUNTER_TABLE_ID, SET_ID, 'Forest Encounter', FOREST_ENCOUNTERS, ['worldgen', 'travel', 'forest', 'encounter']),
  listTable(SETTLEMENT_ENCOUNTER_TABLE_ID, SET_ID, 'Settlement Street Encounter', SETTLEMENT_ENCOUNTERS, ['worldgen', 'settlement', 'encounter']),
]
