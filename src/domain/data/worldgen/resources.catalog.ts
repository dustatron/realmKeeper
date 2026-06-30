import type { Biome } from './biomes'

// The resource catalog — the spine of resource-driven world generation.
//
// Raw resources DETERMINE biomes (a region rich in iron is mountainous); finished
// goods are made by hub towns and are biome-agnostic (`biome: null`). Theme packs
// are additive tag-sources: enabling a pack widens the pool a world can draw from,
// and a user can also cherry-pick individual cross-pack resources. All content is
// original and system-agnostic (no rules/stat references).

export type ResourcePack = 'low-fantasy' | 'high-fantasy' | 'sci-fi' | 'doomed'
export type ResourceTier = 'raw' | 'finished'

export interface ResourceDef {
  name: string
  /** Which theme packs offer this resource. A resource may belong to several. */
  packs: ResourcePack[]
  tier: ResourceTier
  /** Land biome a RAW resource implies; `null` for finished goods. Never 'lake'. */
  biome: Biome | null
  /** Commonness in auto-propose; higher = more common. Luxuries are rare (low). */
  rarityWeight: number
  /**
   * Trade range class. `bulk` goods move only between adjacent settlements;
   * `luxury` goods (gems, precious metals, finished arms, etc.) travel map-wide.
   */
  weightClass: 'bulk' | 'luxury'
  /**
   * For FINISHED goods only: the catalog goods that are refined to make this one.
   * Advisory — a referenced raw may come from a pack the world has not enabled.
   */
  inputs?: string[]
  /** One-line, table-voice flavor surfaced to the GM. */
  lore: string
  /** The kind of people/faction this resource tends to spawn. */
  cultureArchetype: string
}

// Land biomes a raw resource may map to (everything except the water overlay).
export const RESOURCE_BIOMES: Exclude<Biome, 'lake'>[] = [
  'forest', 'mountains', 'grasslands', 'desert', 'marsh', 'frozen', 'blighted', 'hills', 'jungle',
]

export const RESOURCE_CATALOG: ResourceDef[] = [
  // ─────────────────────────── LOW FANTASY (baseline) ───────────────────────────
  // mountains
  { name: 'iron ore', packs: ['low-fantasy'], tier: 'raw', biome: 'mountains', rarityWeight: 5, weightClass: 'bulk', lore: 'the backbone of every blade and plough.', cultureArchetype: 'mining clans' },
  { name: 'coal', packs: ['low-fantasy'], tier: 'raw', biome: 'mountains', rarityWeight: 5, weightClass: 'bulk', lore: 'black rock that makes the forges roar.', cultureArchetype: 'colliers and smiths' },
  { name: 'building stone', packs: ['low-fantasy'], tier: 'raw', biome: 'mountains', rarityWeight: 4, weightClass: 'bulk', lore: 'quarried block that raises walls and keeps.', cultureArchetype: 'stonemasons' },
  { name: 'silver', packs: ['low-fantasy'], tier: 'raw', biome: 'mountains', rarityWeight: 2, weightClass: 'luxury', lore: 'soft, bright, and minted into power.', cultureArchetype: 'mint-guilds' },
  { name: 'gemstones', packs: ['low-fantasy'], tier: 'raw', biome: 'mountains', rarityWeight: 1, weightClass: 'luxury', lore: 'small enough to carry a fortune across a continent.', cultureArchetype: 'jewel cutters' },
  // hills
  { name: 'copper', packs: ['low-fantasy'], tier: 'raw', biome: 'hills', rarityWeight: 5, weightClass: 'bulk', lore: 'green-veined ore, first metal of any people.', cultureArchetype: 'tinkers' },
  { name: 'tin', packs: ['low-fantasy'], tier: 'raw', biome: 'hills', rarityWeight: 4, weightClass: 'bulk', lore: 'copper’s partner; together they make bronze.', cultureArchetype: 'prospectors' },
  { name: 'marble', packs: ['low-fantasy'], tier: 'raw', biome: 'hills', rarityWeight: 3, weightClass: 'bulk', lore: 'pale stone for temples and the proud dead.', cultureArchetype: 'sculptors' },
  // forest
  { name: 'timber', packs: ['low-fantasy'], tier: 'raw', biome: 'forest', rarityWeight: 5, weightClass: 'bulk', lore: 'beams and keels and a winter’s warmth.', cultureArchetype: 'woodcutters' },
  { name: 'charcoal', packs: ['low-fantasy'], tier: 'raw', biome: 'forest', rarityWeight: 4, weightClass: 'bulk', lore: 'slow-burnt wood the smiths cannot do without.', cultureArchetype: 'charcoal-burners' },
  { name: 'game', packs: ['low-fantasy'], tier: 'raw', biome: 'forest', rarityWeight: 4, weightClass: 'bulk', lore: 'meat and hide from the deep wood.', cultureArchetype: 'hunters' },
  { name: 'pelts', packs: ['low-fantasy'], tier: 'raw', biome: 'forest', rarityWeight: 3, weightClass: 'bulk', lore: 'warm furs the cold north pays well for.', cultureArchetype: 'trappers' },
  // grasslands
  { name: 'grain', packs: ['low-fantasy'], tier: 'raw', biome: 'grasslands', rarityWeight: 5, weightClass: 'bulk', lore: 'bread, beer, and the count of a town’s years.', cultureArchetype: 'farming villages' },
  { name: 'livestock', packs: ['low-fantasy'], tier: 'raw', biome: 'grasslands', rarityWeight: 5, weightClass: 'bulk', lore: 'herds that walk themselves to market.', cultureArchetype: 'herders' },
  { name: 'wool', packs: ['low-fantasy'], tier: 'raw', biome: 'grasslands', rarityWeight: 4, weightClass: 'bulk', lore: 'the cloth trade begins on a sheep’s back.', cultureArchetype: 'shepherds' },
  { name: 'horses', packs: ['low-fantasy'], tier: 'raw', biome: 'grasslands', rarityWeight: 2, weightClass: 'bulk', lore: 'speed, war, and pride, all in one beast.', cultureArchetype: 'horse-lords' },
  // desert
  { name: 'salt', packs: ['low-fantasy'], tier: 'raw', biome: 'desert', rarityWeight: 4, weightClass: 'bulk', lore: 'it keeps meat through winter; wars are fought for it.', cultureArchetype: 'salt caravans' },
  { name: 'glass-sand', packs: ['low-fantasy'], tier: 'raw', biome: 'desert', rarityWeight: 3, weightClass: 'bulk', lore: 'fine sand the glassblowers turn to light.', cultureArchetype: 'glassblowers' },
  { name: 'date palm', packs: ['low-fantasy'], tier: 'raw', biome: 'desert', rarityWeight: 3, weightClass: 'bulk', lore: 'sweetness and shade where little else grows.', cultureArchetype: 'oasis keepers' },
  // jungle
  { name: 'hardwood', packs: ['low-fantasy'], tier: 'raw', biome: 'jungle', rarityWeight: 4, weightClass: 'bulk', lore: 'dense, dark wood that outlasts its carvers.', cultureArchetype: 'logging camps' },
  { name: 'plant dye', packs: ['low-fantasy'], tier: 'raw', biome: 'jungle', rarityWeight: 3, weightClass: 'bulk', lore: 'colours the rich will ruin themselves to wear.', cultureArchetype: 'dye-masters' },
  { name: 'exotic spice', packs: ['low-fantasy'], tier: 'raw', biome: 'jungle', rarityWeight: 2, weightClass: 'luxury', lore: 'a pinch worth its weight in silver, far from home.', cultureArchetype: 'spice traders' },
  // marsh
  { name: 'peat', packs: ['low-fantasy'], tier: 'raw', biome: 'marsh', rarityWeight: 4, weightClass: 'bulk', lore: 'cut from the bog and dried for the hearth.', cultureArchetype: 'fen-folk' },
  { name: 'reeds', packs: ['low-fantasy'], tier: 'raw', biome: 'marsh', rarityWeight: 4, weightClass: 'bulk', lore: 'thatch, baskets, and boats from the shallows.', cultureArchetype: 'reed-cutters' },
  { name: 'medicinal herbs', packs: ['low-fantasy'], tier: 'raw', biome: 'marsh', rarityWeight: 2, weightClass: 'bulk', lore: 'the cures and the poisons share a stem.', cultureArchetype: 'hedge-witches' },
  // frozen
  { name: 'ice', packs: ['low-fantasy'], tier: 'raw', biome: 'frozen', rarityWeight: 4, weightClass: 'bulk', lore: 'hauled south to keep a lord’s wine cold in summer.', cultureArchetype: 'ice-cutters' },
  { name: 'whale-oil', packs: ['low-fantasy'], tier: 'raw', biome: 'frozen', rarityWeight: 3, weightClass: 'bulk', lore: 'light against the long dark, rendered from the deep.', cultureArchetype: 'whalers' },
  { name: 'walrus-ivory', packs: ['low-fantasy'], tier: 'raw', biome: 'frozen', rarityWeight: 2, weightClass: 'luxury', lore: 'carved tusk that travels far and sells dear.', cultureArchetype: 'ivory traders' },
  // blighted
  { name: 'ashen ore', packs: ['low-fantasy'], tier: 'raw', biome: 'blighted', rarityWeight: 3, weightClass: 'bulk', lore: 'grey metal from poisoned ground; it never quite rusts.', cultureArchetype: 'desperate diggers' },
  { name: 'cursed salt', packs: ['low-fantasy', 'doomed'], tier: 'raw', biome: 'blighted', rarityWeight: 2, weightClass: 'bulk', lore: 'preserves too well; what it salts does not stay dead.', cultureArchetype: 'pariah harvesters' },

  // ─────────────────────────── HIGH FANTASY ───────────────────────────
  { name: 'mithril', packs: ['high-fantasy'], tier: 'raw', biome: 'mountains', rarityWeight: 1, weightClass: 'luxury', lore: 'light as cloth, hard as grief; the old smiths are gone.', cultureArchetype: 'dwarven holds' },
  { name: 'adamant', packs: ['high-fantasy'], tier: 'raw', biome: 'mountains', rarityWeight: 1, weightClass: 'luxury', lore: 'it breaks the tools that try to break it.', cultureArchetype: 'master forgemasters' },
  { name: 'dragonbone', packs: ['high-fantasy'], tier: 'raw', biome: 'mountains', rarityWeight: 1, weightClass: 'luxury', lore: 'a relic of when the peaks still burned.', cultureArchetype: 'relic-hunters' },
  { name: 'heartwood', packs: ['high-fantasy'], tier: 'raw', biome: 'forest', rarityWeight: 2, weightClass: 'bulk', lore: 'cut from a tree that remembers; it bleeds sap like tears.', cultureArchetype: 'grove-wardens' },
  { name: 'feywood', packs: ['high-fantasy'], tier: 'raw', biome: 'forest', rarityWeight: 1, weightClass: 'bulk', lore: 'wood that hums; carve it wrong and it sings back.', cultureArchetype: 'fey-touched carvers' },
  { name: 'star-metal', packs: ['high-fantasy', 'sci-fi'], tier: 'raw', biome: 'desert', rarityWeight: 1, weightClass: 'luxury', lore: 'fallen from the sky; it points the way it came.', cultureArchetype: 'sky-fall cults' },
  { name: 'mana crystal', packs: ['high-fantasy'], tier: 'raw', biome: 'blighted', rarityWeight: 1, weightClass: 'luxury', lore: 'it hums and slowly grows; over-harvest draws what feeds on it.', cultureArchetype: 'crystal-cult mages' },
  { name: 'soulstone', packs: ['high-fantasy'], tier: 'raw', biome: 'blighted', rarityWeight: 1, weightClass: 'luxury', lore: 'cold to the touch and warmer the longer you hold it.', cultureArchetype: 'necromancers' },
  { name: 'void shard', packs: ['high-fantasy', 'doomed'], tier: 'raw', biome: 'blighted', rarityWeight: 1, weightClass: 'luxury', lore: 'a sliver of nothing; the eye slides off it.', cultureArchetype: 'void-touched' },

  // ─────────────────────────── SCI-FI ───────────────────────────
  { name: 'titanium', packs: ['sci-fi'], tier: 'raw', biome: 'mountains', rarityWeight: 3, weightClass: 'bulk', lore: 'light, strong, and stubborn against the years.', cultureArchetype: 'industrial cartels' },
  { name: 'uranium ore', packs: ['sci-fi'], tier: 'raw', biome: 'mountains', rarityWeight: 1, weightClass: 'luxury', lore: 'it glows faintly, and the miners do not last.', cultureArchetype: 'reactor-priests' },
  { name: 'silicon sand', packs: ['sci-fi'], tier: 'raw', biome: 'desert', rarityWeight: 3, weightClass: 'bulk', lore: 'the grit that thinking machines are grown from.', cultureArchetype: 'fabricators' },
  { name: 'rare-earth ore', packs: ['sci-fi'], tier: 'raw', biome: 'desert', rarityWeight: 1, weightClass: 'luxury', lore: 'a handful runs a city; everyone wants the handful.', cultureArchetype: 'salvage barons' },
  { name: 'deuterium ice', packs: ['sci-fi'], tier: 'raw', biome: 'frozen', rarityWeight: 2, weightClass: 'bulk', lore: 'heavy ice that feeds the reactors and the rockets.', cultureArchetype: 'ice-rig crews' },
  { name: 'bio-gel', packs: ['sci-fi'], tier: 'raw', biome: 'marsh', rarityWeight: 2, weightClass: 'bulk', lore: 'living slurry that knits flesh and circuitry alike.', cultureArchetype: 'wet-lab harvesters' },
  { name: 'fallout glass', packs: ['sci-fi', 'doomed'], tier: 'raw', biome: 'blighted', rarityWeight: 2, weightClass: 'bulk', lore: 'fused green glass where the sky once fell.', cultureArchetype: 'scavenger clans' },
  { name: 'mutagen ore', packs: ['sci-fi', 'doomed'], tier: 'raw', biome: 'blighted', rarityWeight: 1, weightClass: 'bulk', lore: 'touch it long enough and you change; some pay for that.', cultureArchetype: 'mutant enclaves' },

  // ─────────────────────────── DOOMED ───────────────────────────
  { name: 'cursed lode', packs: ['doomed'], tier: 'raw', biome: 'blighted', rarityWeight: 2, weightClass: 'bulk', lore: 'rich beyond reason, and everyone who works it is doomed.', cultureArchetype: 'doom cults' },
  { name: 'blightroot', packs: ['doomed'], tier: 'raw', biome: 'blighted', rarityWeight: 2, weightClass: 'bulk', lore: 'it spreads where it is dug; the cure and the rot are one.', cultureArchetype: 'plague-doctors' },
  { name: 'gallows-wood', packs: ['doomed'], tier: 'raw', biome: 'forest', rarityWeight: 2, weightClass: 'bulk', lore: 'from trees that grew on graves; it will not take paint.', cultureArchetype: 'grave-wrights' },
  { name: 'plague-bloom', packs: ['doomed'], tier: 'raw', biome: 'marsh', rarityWeight: 1, weightClass: 'bulk', lore: 'a flower that opens on the sick; it is always in season here.', cultureArchetype: 'fevered pilgrims' },

  // ─────────────────────────── FINISHED GOODS (biome-agnostic) ───────────────────────────
  { name: 'weapons', packs: ['low-fantasy'], tier: 'finished', biome: null, rarityWeight: 4, weightClass: 'bulk', inputs: ['iron ore', 'coal'], lore: 'forged where ore meets coal and a steady hand.', cultureArchetype: 'weaponsmith guilds' },
  { name: 'tools', packs: ['low-fantasy'], tier: 'finished', biome: null, rarityWeight: 4, weightClass: 'bulk', inputs: ['iron ore'], lore: 'the quiet trade every other trade depends on.', cultureArchetype: 'toolwrights' },
  { name: 'textiles', packs: ['low-fantasy'], tier: 'finished', biome: null, rarityWeight: 4, weightClass: 'bulk', inputs: ['wool'], lore: 'wool and dye spun into a town’s wealth.', cultureArchetype: 'weavers’ guilds' },
  { name: 'pottery', packs: ['low-fantasy'], tier: 'finished', biome: null, rarityWeight: 3, weightClass: 'bulk', inputs: [], lore: 'clay made useful, then made beautiful.', cultureArchetype: 'potters' },
  { name: 'leather goods', packs: ['low-fantasy'], tier: 'finished', biome: null, rarityWeight: 3, weightClass: 'bulk', inputs: ['pelts'], lore: 'hide tanned, cut, and sold at every gate.', cultureArchetype: 'tanners’ row' },
  { name: 'ale', packs: ['low-fantasy'], tier: 'finished', biome: null, rarityWeight: 3, weightClass: 'bulk', inputs: ['grain'], lore: 'grain made glad; the best travels three days’ ride.', cultureArchetype: 'brewers’ guilds' },
  { name: 'enchanted arms', packs: ['high-fantasy'], tier: 'finished', biome: null, rarityWeight: 2, weightClass: 'luxury', inputs: ['weapons', 'mana crystal'], lore: 'steel and sorcery wed; the bill is paid twice.', cultureArchetype: 'battle-mages' },
  { name: 'potions', packs: ['high-fantasy'], tier: 'finished', biome: null, rarityWeight: 2, weightClass: 'luxury', inputs: ['medicinal herbs'], lore: 'a vial for courage, a vial for regret.', cultureArchetype: 'alchemists' },
  { name: 'warding charms', packs: ['high-fantasy'], tier: 'finished', biome: null, rarityWeight: 2, weightClass: 'luxury', inputs: ['soulstone'], lore: 'they keep something out, or keep something in.', cultureArchetype: 'charm-wrights' },
  { name: 'energy cells', packs: ['sci-fi'], tier: 'finished', biome: null, rarityWeight: 2, weightClass: 'luxury', inputs: ['uranium ore'], lore: 'bottled lightning; do not puncture.', cultureArchetype: 'power-brokers' },
  { name: 'cybernetics', packs: ['sci-fi'], tier: 'finished', biome: null, rarityWeight: 1, weightClass: 'luxury', inputs: ['plasteel', 'energy cells'], lore: 'a better arm, a colder eye, a longer debt.', cultureArchetype: 'augment clinics' },
  { name: 'plasteel', packs: ['sci-fi'], tier: 'finished', biome: null, rarityWeight: 2, weightClass: 'bulk', inputs: ['titanium'], lore: 'cheap, tough, and everywhere once you look.', cultureArchetype: 'fab-shops' },
  { name: 'grave-wards', packs: ['doomed'], tier: 'finished', biome: null, rarityWeight: 1, weightClass: 'luxury', inputs: ['gallows-wood'], lore: 'they keep the dead lying down — mostly.', cultureArchetype: 'grave-keepers' },
  { name: 'bone charms', packs: ['doomed'], tier: 'finished', biome: null, rarityWeight: 1, weightClass: 'luxury', inputs: ['cursed salt'], lore: 'luck carved from something that ran out of it.', cultureArchetype: 'bone-carvers' },
]

const BY_NAME = new Map(RESOURCE_CATALOG.map((r) => [r.name, r]))

export function resourceByName(name: string): ResourceDef | undefined {
  return BY_NAME.get(name)
}

/** All raw resources offered by any of the enabled packs. */
export function rawResourcesForPacks(packs: readonly ResourcePack[]): ResourceDef[] {
  const enabled = new Set(packs)
  return RESOURCE_CATALOG.filter((r) => r.tier === 'raw' && r.packs.some((p) => enabled.has(p)))
}

/**
 * The biome distribution implied by a set of resource NAMES. Counts each raw
 * resource against its biome; finished goods (biome null) and unknown names
 * contribute nothing. Shared by the create-realm biome preview AND generation so
 * preview always matches the world that gets built.
 */
export function resourcesToBiomes(resources: readonly string[]): Partial<Record<Biome, number>> {
  const counts: Partial<Record<Biome, number>> = {}
  for (const name of resources) {
    const def = BY_NAME.get(name)
    if (!def || def.tier !== 'raw' || def.biome == null) continue
    counts[def.biome] = (counts[def.biome] ?? 0) + 1
  }
  return counts
}
