export interface Trap {
  id: string
  name: string
  description: string
  dc: number | null
  damage: string
  disarmed: boolean
  trigger?: string
  passiveHint?: string
  activeHint?: string
  disarmMethods?: string[]
  consequence?: string
  targetAttribute?: 'STR' | 'DEX' | 'WIS' | 'CON'
}
