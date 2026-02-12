export interface StatFieldDef {
  key: string
  label: string
  rollFormula: string
  hasModifier: boolean
}

export interface SystemConfig {
  id: string
  name: string
  slug: string
  statFields: StatFieldDef[]
  hasHitProtection: boolean
  hasLevel: boolean
  hasClass: boolean
  hasArmor: boolean
  armorLabel: string
  hpLabel: string
  hpFormula: string
  namingTableIds: string[]
}
