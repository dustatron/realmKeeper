/** A GM-added reference from a rumor/notice to a POI or NPC in the world. */
export interface EntityLink {
  type: 'poi' | 'npc'
  id: string
}
