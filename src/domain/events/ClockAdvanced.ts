import type { WorldDateTime } from '@domain/value-objects/WorldDate'
import type { ClockAdvanceUnit, ClockTrigger } from '@domain/services/ClockEngine'

export interface ClockAdvancedEvent {
  type: 'clock_advanced'
  payload: {
    realmId: string
    unit: ClockAdvanceUnit
    previousDateTime: WorldDateTime
    newDateTime: WorldDateTime
    triggers: ClockTrigger[]
  }
  timestamp: number
}

export function createClockAdvancedEvent(
  realmId: string,
  unit: ClockAdvanceUnit,
  previousDateTime: WorldDateTime,
  newDateTime: WorldDateTime,
  triggers: ClockTrigger[]
): ClockAdvancedEvent {
  return {
    type: 'clock_advanced',
    payload: { realmId, unit, previousDateTime, newDateTime, triggers },
    timestamp: Date.now(),
  }
}
