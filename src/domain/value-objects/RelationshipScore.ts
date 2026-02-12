import { RELATIONSHIP_SCALE } from '@shared/constants'

export type RelationshipStatus = typeof RELATIONSHIP_SCALE[keyof typeof RELATIONSHIP_SCALE]

export function clampScore(score: number): number {
  return Math.max(-6, Math.min(6, Math.round(score)))
}

export function deriveStatus(score: number): string {
  const clamped = clampScore(score)
  return RELATIONSHIP_SCALE[String(clamped) as keyof typeof RELATIONSHIP_SCALE]
}
