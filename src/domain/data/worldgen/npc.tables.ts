import type { TableDef, TableSet } from '@domain/entities/TableDef'
import { listTable } from './tableViewUtils'
import { NPC_FAVORS, NPC_PURSUITS } from './npcWants'

// Browsable NPC generation tables. Curated from user-provided source (structured
// 2d10 tables). Registered for the Tables UI; NOT yet wired into npcFactory —
// that rewire is a follow-up. NPC favors/pursuits are the existing worldgen
// pools, surfaced here under the same NPC set.

const SET_ID = 'tableset-rk-npc'

export const NPC_MOTIVATION_TABLE_ID = 'table-rk-npc-motivation'
export const NPC_PERSONALITY_TABLE_ID = 'table-rk-npc-personality'
export const NPC_PHYSICAL_TRAIT_TABLE_ID = 'table-rk-npc-physical-trait'
export const NPC_FAVOR_TABLE_ID = 'table-rk-npc-favor'
export const NPC_PURSUIT_TABLE_ID = 'table-rk-npc-pursuit'
export const NPC_FLAW_TABLE_ID = 'table-rk-npc-flaw'

// Ironic / tragic flaws (curated from user source; grounded + light whimsy,
// modern/meme entries dropped). Profession-agnostic so they apply to any NPC;
// appended to some NPCs' descriptions as a memorable hook.
export const NPC_FLAWS = [
  'Faints at the sight of blood',
  'Terrified of the dark; sleeps with a lantern lit',
  'Compulsively honest at the worst possible moments',
  'Cannot actually read, and hides it well',
  'Allergic to smoke and dust',
  'Quietly losing their faith',
  'Secretly cannot stand people',
  'Stutters badly — except when singing',
  'Nearly blind once the sun goes down',
  'Has lost their sense of taste',
  'Hopeless with directions',
  'Cannot do sums in their head',
  'Flinches at loud noises',
  'Believes none of their own claims',
  'Gets violently seasick',
  'Has gone soft and avoids a fight',
  'Plagued by a trembling hand',
  'Sleepwalks, sometimes far',
  'Colorblind, to their constant trouble',
  'Forgets what they were saying halfway through',
  'Cannot hold their drink at all',
  'Slowly going deaf, and too proud to admit it',
  'Seized at times by a sudden conscience',
  'Superstitious to the point of paralysis',
]

const PROFESSIONS = [
  'Merchant', 'Artisan / Specialist', 'Beggar / Wretch', 'Servant / Worker', 'Guard / Soldier',
  'Miller / Baker', 'Hunter / Trapper', 'Fisher', 'Villager', 'Labourer', 'Farmer', 'Shepherd',
  'Leader / Wisewoman', 'Field Worker', 'Servant', 'Noble',
]

const ARTISAN_TRADES = [
  'Bookseller / Illuminator', 'Bookbinder / Copyist', 'Pursemaker', 'Fishmonger', 'Blacksmith',
  'Weaver', 'Baker', 'Furrier', 'Barber / Chandler', 'General Crafts', 'Shoemaker', 'Pastrycook',
  'Tailor', 'Painter', 'Butcher', 'Saddler', 'Stonemason / Carpenter', 'Hatmaker / Cooper',
]

const RARE_TRADES = [
  'Alchemist / Apothecary', 'Master Glassmaker', 'Cartographer / Surveyor', 'Astrologer / Scholar',
  'Master Jeweler / Gemcutter', 'Exotic Importer', 'Guild Master / Overseer',
  'Weapon / Armour Specialist', 'Magical Artisan', 'Secret / Unique Profession',
]

export const MOTIVATIONS = [
  'Revenge — obsessive, grudge-driven', 'Escape — wants to leave danger or place',
  'Survival — food, shelter, safety', 'Approval — wants respect or praise',
  'Belonging — friendship, loyalty, community', 'Knowledge — learning, discovering secrets',
  'Order — maintain rules, law, or routine', 'Power — influence over others, authority',
  'Wealth — money, possessions, trade', 'Safety — own safety or that of others',
  'Family — protect or provide for family', 'Duty — moral, religious, or professional obligation',
  'Justice — right wrongs, enforce fairness', 'Curiosity — investigate, explore, experiment',
  'Ambition — long-term personal advancement', 'Passion — creative or emotional drive',
  'Glory — fame, renown, heroism', 'Chaos — desire to disrupt or cause confusion',
  'Obsession — single-minded, extreme pursuit', 'Greed — never enough, hoards and grasps',
]

export const PERSONALITIES = [
  'Fanatical — preaching, ritualistic, evangelical', 'Manipulative — flattering, guilt-tripping, plays sides',
  'Cruel — mocking, cold, revels in others\' pain', 'Paranoid — whispers, watches exits, tests loyalty',
  'Cowardly — excuses, hides behind others, flees', 'Pessimistic — complaining, bitter, predicts failure',
  'Stubborn — won\'t budge, argues, digs in', 'Anxious — fidgeting, over-planning, apologetic',
  'Curious — asks questions, pokes, eavesdrops', 'Pragmatic — cuts to essentials, avoids drama',
  'Responsible — keeps routines, enforces rules, plans', 'Loyal — defends allies, keeps secrets',
  'Empathetic — listens, comforts, protects the weak', 'Honest — blunt truth, refuses to lie, over-shares',
  'Ambitious — name-drops, takes risks, seeks patrons', 'Idealistic — moral, uncompromising, helps for free',
  'Impulsive — acts before thinking, mood swings', 'Eccentric — strange habits, odd metaphors',
  'Unhinged — erratic, sudden rage or laughter', 'Genial — warm, easy-going, quick to smile',
]

export const PHYSICAL_TRAITS = [
  'Scarred — battle-worn, intimidating', 'Missing limb or deformity — cane, crutch, altered gait',
  'Dirty / unkempt — messy hair, torn clothing', 'Drunk / intoxicated — slurred, wobbling, careless',
  'Elderly — slow, wise, frail', 'Youthful — innocent, energetic, naive', 'Plain / unremarkable — blends in',
  'Well-dressed — polished, neat, aspirant', 'Armed — visible weapons, ready to fight',
  'Healthy / robust — athletic, confident posture', 'Attractive / charming — eye-catching, smiles easily',
  'Tall / imposing — commands attention', 'Tattooed / marked — tribal or personal markings',
  'Unique hairstyle / fashion — colourful, eccentric', 'Noble bearing — posture, etiquette, presence',
  'Injured / bandaged — recovering', 'Exotic features — unusual skin, hair, or build',
  'Ritual appearance — robes, sigils, markings', 'Grotesque — visibly mutated or unnatural',
  'Weathered — sun- and wind-worn, road-hardened',
]

export const npcTableSets: TableSet[] = [
  {
    id: SET_ID,
    name: 'NPCs',
    source: 'Realm Keeper',
    systemId: null,
    tableIds: [
      'table-rk-npc-profession', 'table-rk-npc-artisan-trade', 'table-rk-npc-rare-trade',
      'table-rk-npc-motivation', 'table-rk-npc-personality', 'table-rk-npc-physical-trait',
      'table-rk-npc-favor', 'table-rk-npc-pursuit', NPC_FLAW_TABLE_ID,
    ],
  },
]

export const npcTableDefs: TableDef[] = [
  listTable('table-rk-npc-profession', SET_ID, 'NPC Profession', PROFESSIONS, ['npc', 'profession']),
  listTable('table-rk-npc-artisan-trade', SET_ID, 'Artisan Trade', ARTISAN_TRADES, ['npc', 'profession']),
  listTable('table-rk-npc-rare-trade', SET_ID, 'Rare Trade', RARE_TRADES, ['npc', 'profession']),
  listTable('table-rk-npc-motivation', SET_ID, 'NPC Motivation', MOTIVATIONS, ['npc', 'motivation']),
  listTable('table-rk-npc-personality', SET_ID, 'NPC Personality', PERSONALITIES, ['npc', 'personality']),
  listTable('table-rk-npc-physical-trait', SET_ID, 'NPC Physical Trait', PHYSICAL_TRAITS, ['npc', 'trait']),
  listTable('table-rk-npc-favor', SET_ID, 'NPC Favor', NPC_FAVORS, ['npc', 'want']),
  listTable('table-rk-npc-pursuit', SET_ID, 'NPC Pursuit', NPC_PURSUITS, ['npc', 'want']),
  listTable(NPC_FLAW_TABLE_ID, SET_ID, 'NPC Tragic Flaw', NPC_FLAWS, ['npc', 'flaw']),
]
