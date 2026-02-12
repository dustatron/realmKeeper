import type { SystemConfig } from '@domain/entities/SystemConfig'

export const cairnSystemConfig: SystemConfig = {
  id: 'system-cairn-2e',
  name: 'Cairn 2e',
  slug: 'cairn-2e',
  statFields: [
    { key: 'str', label: 'Strength', rollFormula: '3d6', hasModifier: false },
    { key: 'dex', label: 'Dexterity', rollFormula: '3d6', hasModifier: false },
    { key: 'wil', label: 'Willpower', rollFormula: '3d6', hasModifier: false },
  ],
  hasHitProtection: true,
  hasLevel: false,
  hasClass: false,
  hasArmor: true,
  armorLabel: 'Armor',
  hpLabel: 'Hit Protection',
  hpFormula: '1d6',
  namingTableIds: [
    'table-cairn-names-female',
    'table-cairn-names-male',
    'table-cairn-surnames',
  ],
}

export const shadowdarkSystemConfig: SystemConfig = {
  id: 'system-shadowdark',
  name: 'Shadowdark',
  slug: 'shadowdark',
  statFields: [
    { key: 'str', label: 'Strength', rollFormula: '3d6', hasModifier: true },
    { key: 'dex', label: 'Dexterity', rollFormula: '3d6', hasModifier: true },
    { key: 'con', label: 'Constitution', rollFormula: '3d6', hasModifier: true },
    { key: 'int', label: 'Intelligence', rollFormula: '3d6', hasModifier: true },
    { key: 'wis', label: 'Wisdom', rollFormula: '3d6', hasModifier: true },
    { key: 'cha', label: 'Charisma', rollFormula: '3d6', hasModifier: true },
  ],
  hasHitProtection: false,
  hasLevel: true,
  hasClass: true,
  hasArmor: true,
  armorLabel: 'AC',
  hpLabel: 'HP',
  hpFormula: 'class_die+con_mod',
  namingTableIds: [],
}
