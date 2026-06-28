export interface TreasureItem {
  id: string
  name: string
  description: string
  value: string // e.g. "500 gp", "priceless"
  quantity: number
  collected: boolean
  isMagic?: boolean
  compendiumId?: string
  areaIndex?: number   // ruin: which area holds this item (single-source loot tag)
  notable?: boolean    // ruin/landmark hook prize; Spec B points leads at notable items
  guardianNpcId?: string | null   // NPC guarding this item, if any
}
