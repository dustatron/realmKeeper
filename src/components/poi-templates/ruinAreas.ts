import type { RuinArea } from '@domain/entities/RuinSite'
import type { NPC } from '@domain/entities/NPC'
import type { TreasureItem } from '@domain/value-objects/TreasureItem'

export interface AreaView {
  name: string
  order: number
  isEntry: boolean
  readAloud: string
  detail: string
  discovery: string | null
  occupantNames: string[]
  activity: string
  loot: TreasureItem[]
}

export function areaView(area: RuinArea, npcs: NPC[], treasure: TreasureItem[]): AreaView {
  const loot = treasure.filter((t) => t.areaIndex === area.order)

  const occupantNames = area.occupants.flatMap((group) =>
    group.npcIds
      .map((id) => npcs.find((n) => n.id === id)?.name)
      .filter((name): name is string => name !== undefined),
  )

  const activity = area.occupants[0]?.activity ?? ''

  return {
    name: area.name,
    order: area.order,
    isEntry: area.isEntry,
    readAloud: area.readAloud,
    detail: area.detail,
    discovery: area.discovery,
    occupantNames,
    activity,
    loot,
  }
}
