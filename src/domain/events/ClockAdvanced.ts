import type { WorldDateTime } from '@domain/value-objects/WorldDate'
import type { ClockAdvanceUnit, ClockTrigger } from '@domain/services/ClockEngine'

export interface ClockAdvancedEvent {
  type: 'clock_advanced'
  payload: {
    worldId: string
    unit: ClockAdvanceUnit
    previousDateTime: WorldDateTime
    newDateTime: WorldDateTime
    triggers: ClockTrigger[]
  }
  timestamp: number
}

export function createClockAdvancedEvent(
  worldId: string,
  unit: ClockAdvanceUnit,
  previousDateTime: WorldDateTime,
  newDateTime: WorldDateTime,
  triggers: ClockTrigger[]
): ClockAdvancedEvent {
  return {
    type: 'clock_advanced',
    payload: { worldId, unit, previousDateTime, newDateTime, triggers },
    timestamp: Date.now(),
  }
}
