export type CustomMonsterData = {
  ac: number | null
  hp: number | null
  speed: string
  attacks: string
  abilities: string // markdown
  cr: string
}

export type CustomSpellData = {
  level: string
  school: string
  castingTime: string
  range: string
  duration: string
  components: string
  classes: string[]
}

export type CustomMagicItemData = {
  rarity: string
  itemType: string // "Weapon", "Wondrous Item", etc.
  attunement: boolean
  charges: string | null
  properties: string[]
}

export interface CustomCompendiumEntry {
  id: string
  worldId: string
  kind: 'monster' | 'spell' | 'magicItem'
  name: string
  description: string // markdown
  monsterData?: CustomMonsterData
  spellData?: CustomSpellData
  magicItemData?: CustomMagicItemData
  createdAt: number
  updatedAt: number
}
