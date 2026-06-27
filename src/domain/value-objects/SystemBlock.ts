export interface StatValue {
  key: string
  value: number
  modifier?: number
  max?: number
}

export interface Attack {
  name: string
  damage: string
  description: string
}

export interface InventoryItem {
  name: string
  slots: number
  description: string
  quantity?: number
  value?: string
  source?: 'manual' | 'compendium' | 'treasure'
  compendiumId?: string
  compendiumKind?: 'magicItem' | 'equipment'
  compendiumSource?: 'system' | 'custom'
  notable?: boolean
}

export interface NpcConnection {
  id: string
  targetNpcId: string
  relationship: string
  description: string
}

// NOTE: systemId is optional for backward-compat with existing DB records that predate this field.
// A full discriminated union (e.g. CairnSystemBlock | ShadowdarkSystemBlock) was deferred because
// it requires a Dexie migration to backfill systemId on all existing NPCs. Revisit when the
// storage layer is replaced. Until then, use systemId for narrowing where it is present.
export interface SystemBlock {
  systemId?: string
  stats: StatValue[]
  hp: number
  maxHp: number
  armor: number
  /** Shadowdark only */
  level?: number
  /** Shadowdark only */
  className?: string
  attacks: Attack[]
  inventory: InventoryItem[]
  abilities: string[]
  notes: string
}
