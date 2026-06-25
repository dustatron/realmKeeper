export type HookType =
  | 'missing_person' | 'lost_item' | 'theft' | 'relation'
  | 'revenge' | 'delivery' | 'escort' | 'artifact'

export type HookStatus = 'open' | 'active' | 'resolved' | 'abandoned'

export interface HookSecret {
  kind: 'captive' | 'hidden_item' | 'culprit' | 'destination' | 'truth'
  targetType: 'poi' | 'npc' | 'faction'
  targetId: string
  detail: string
}

export interface Hook {
  id: string
  worldId: string
  type: HookType
  title: string
  status: HookStatus
  contactNpcId: string | null
  rewardText: string
  secret: HookSecret
  createdAt: number
  updatedAt: number
}
