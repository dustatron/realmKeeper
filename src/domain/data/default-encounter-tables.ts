export const DEFAULT_ENCOUNTER_ENTRIES = {
  creature: [
    'Goblin scouts (2d4)',
    'Wolf pack (1d6)',
    'Giant spider',
    'Bandit ambush (1d6+2)',
    'Stirge swarm (2d4)',
    'Skeleton patrol (1d4)',
  ],
  signOmen: [
    'Claw marks on trees',
    'Strange fog rolls in',
    'Distant war drums',
    'Flock of crows circles overhead',
    'Fresh tracks in the mud',
    'Faint smell of smoke',
  ],
  // Weather, terrain danger, traps, magical phenomena. A trailing token
  // ({creature} / {npc} / {creature|npc}) auto-chains a follow-up roll.
  areaEffect: [
    'Sudden downpour — visibility drops to a stone\'s throw',
    'Rockfall ahead; something startled it loose {creature}',
    'Cold fog settles in, and the temperature drops with it',
    'A thunderstorm builds — sheet lightning, then a strike that starts a fire',
    'An old trap, long forgotten — and the thing that set it {creature|npc}',
    'A dead animal, half-eaten and still warm {creature}',
    'The ground gives way to a sinkhole',
    'Flash flood roars down the draw',
    'An unnatural silence; every creature has fled {creature}',
  ],
  // Resource attrition — the cost of travel. No environmental events (those are
  // areaEffect); this is what the party loses.
  loss: [
    'Rations spoil — lose a day\'s food',
    'A tool or weapon breaks under strain',
    'A pack strap fails; something is dropped and lost',
    'A mount or beast goes lame',
    'The party is lost — burn a watch backtracking',
    'Gear soaked at a crossing; gain fatigue until it dries',
    'The last torch or flask of oil gutters out',
    'A waterskin splits; supplies run short',
  ],
  npc: [
    'Wandering merchant',
    'Lost pilgrim',
    'Wounded soldier',
    'Traveling bard',
    'Suspicious hermit',
    'Tax collector with escort',
  ],
  // Mundane loot only — coins, gems, gear, armor, weapons, consumables. Named
  // generically to stay system-agnostic. No magic items.
  treasure: [
    'A pouch of coins (2d6 gp)',
    'A cut gemstone, worth a tidy sum',
    'A well-kept shortsword',
    'A dented but serviceable shield',
    'A sturdy backpack, barely used',
    'Half a quiver of good arrows',
    'A flask of lamp oil and a tinderbox',
    'Dry rations, three days\' worth',
    'A healing draught',
  ],
} as const

/**
 * What a creature is doing at the moment of the encounter (secondary roll).
 * Global — not per-table editable (see spec Decision A1). Generic enough to fit
 * any creature the table produces.
 */
export const CREATURE_ACTIVITIES = [
  'feeding on a fresh kill',
  'denning or nesting nearby',
  'marking or defending territory',
  'fighting another creature',
  'fleeing something upwind',
  'stalking the party unseen',
  'wounded and dangerous',
  'asleep or torpid',
] as const

/** What an NPC is doing at the moment of the encounter (secondary roll). */
export const NPC_ACTIVITIES = [
  'making or breaking camp',
  'lost, and asking the way',
  'bartering or hawking goods',
  'burying or mourning someone',
  'fleeing some danger behind them',
  'lying in wait — an ambush',
  'injured and in need of aid',
  'searching for something they lost',
] as const
