export type RuinState = 'empty' | 'beast-claimed' | 'faction-held' | 'haunted' | 'cult-site'

export interface OccupantGroup {
  npcIds: string[]   // link to NPC entities (all linked to the ruin POI's id)
  activity: string   // one-line behavior, e.g. "denning", "standing guard"
}

export interface RuinArea {
  name: string
  order: number               // 0 = entry/approach … last = heart
  isEntry: boolean            // exactly one area true
  readAloud: string
  detail: string              // feature / structural hazard (system-agnostic text)
  discovery: string | null    // a concrete find: document, remains, clue
  occupants: OccupantGroup[]
}

export interface RuinSite {
  origin: string
  fall: string
  builderCulture: string
  era: string
  currentState: RuinState
  factionId: string | null            // set only when currentState === 'faction-held'
  hook: string                        // themed around the notable prize + its area
  notablePrizeItemId: string | null   // id into poi.treasure (the notable:true item)
  areas: RuinArea[]                   // 2–4, ordered
}
