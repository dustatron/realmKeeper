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
}

export interface NpcConnection {
  id: string
  targetNpcId: string
  relationship: string
  description: string
}

export interface SystemBlock {
  stats: StatValue[]
  hp: number
  maxHp: number
  armor: number
  level?: number
  className?: string
  attacks: Attack[]
  inventory: InventoryItem[]
  abilities: string[]
  notes: string
}
