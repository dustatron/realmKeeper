export type CompendiumKind = 'monster' | 'spell' | 'magicItem' | 'equipment';

export interface CompendiumEntry {
  id: string;
  systemId: string;
  name: string;
  description: string;
  kind: CompendiumKind;
}

export type CompendiumRef = { id: string; quantity?: number };

// --- Monster ---

export interface CairnMonsterData {
  stats: string;
  details: string[];
}

export interface ShadowdarkMonsterData {
  slug: string;
  armorClass: number;
  armorType: string | null;
  hitPoints: number;
  attacks: string;
  movement: string;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  alignment: string;
  level: number;
  traits: { name: string; description: string }[];
}

export interface CompendiumMonster extends CompendiumEntry {
  kind: 'monster';
  systemData:
    | { system: 'cairn'; data: CairnMonsterData }
    | { system: 'shadowdark'; data: ShadowdarkMonsterData };
}

// --- Spell ---

export interface CairnSpellData {
  number: string;
}

export interface ShadowdarkSpellData {
  slug: string;
  classes: string[];
  duration: string;
  range: string;
  tier: string;
}

export interface CompendiumSpell extends CompendiumEntry {
  kind: 'spell';
  systemData:
    | { system: 'cairn'; data: CairnSpellData }
    | { system: 'shadowdark'; data: ShadowdarkSpellData };
}

// --- Magic Item ---

export interface CairnMagicItemData {
  details: string[];
  recharge: string;
  charges: string | null;
}

export interface ShadowdarkMagicItemData {
  slug: string;
  traits: { name: string; description: string }[];
}

export interface CompendiumMagicItem extends CompendiumEntry {
  kind: 'magicItem';
  systemData:
    | { system: 'cairn'; data: CairnMagicItemData }
    | { system: 'shadowdark'; data: ShadowdarkMagicItemData };
}

// --- Equipment ---

export interface CairnEquipmentData {
  cost: number;
  category: string;
  damage: string | null;
  armor: number | null;
  properties: string[];
  slots: number | null;
}

export interface ShadowdarkEquipmentData {
  uuid: string;
  cost: { amount: number; currency: string };
  attackType: string | null;
  range: string | null;
  damage: string | null;
  properties: string[];
  slot: number;
  itemType: string;
}

export interface CompendiumEquipment extends CompendiumEntry {
  kind: 'equipment';
  systemData:
    | { system: 'cairn'; data: CairnEquipmentData }
    | { system: 'shadowdark'; data: ShadowdarkEquipmentData };
}
