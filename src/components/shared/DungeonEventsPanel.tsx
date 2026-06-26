import { useState } from 'react'
import { Button } from '~/components/ui/button'
import { Dices, X, ChevronDown, ChevronRight } from 'lucide-react'
import { rollDice } from '@shared/dice'
import { rollOnTable } from '@domain/services/RandomTableEngine'
import { dungeonEventTableDefs } from '@domain/data/dungeon-event-tables'
import { EncounterTableUI } from '~/components/shared/EncounterTableUI'
import type { EncounterTable } from '@domain/entities/EncounterTable'
import type { RollEncounterResult } from '@application/use-cases/RollEncounter'

interface DungeonEventsPanelProps {
  encounterTable?: EncounterTable | null
  onRollEncounter?: () => Promise<RollEncounterResult>
  onSaveEncounterTable?: (entries: Pick<EncounterTable, 'creature' | 'signOmen' | 'loss' | 'npc' | 'discovery' | 'treasure' | 'customSections' | 'disabledCategories'>) => void
}

const eventTable = dungeonEventTableDefs.find((t) => t.id === 'table-dungeon-event')!
const activityTable = dungeonEventTableDefs.find((t) => t.id === 'table-monster-activity')!
const reactionTable = dungeonEventTableDefs.find((t) => t.id === 'table-npc-reaction')!

interface EventResult {
  event: string
  roll: number
  activity?: string
  activityRoll?: number
  reaction?: string
  reactionRoll?: number
}

const EVENT_CONFIG: Record<string, { emoji: string; color: string; hint: string }> = {
  Encounter: { emoji: '🔴', color: 'border-red-500/50 bg-red-500/10', hint: '' },
  Sign: { emoji: '🟡', color: 'border-yellow-500/50 bg-yellow-500/10', hint: 'Clue, spoor, or tracks nearby' },
  Environment: { emoji: '🟠', color: 'border-orange-500/50 bg-orange-500/10', hint: 'Surroundings shift — collapse, flooding, draft...' },
  Loss: { emoji: '🔵', color: 'border-blue-500/50 bg-blue-500/10', hint: 'Torches gutter, equipment fails, spells fizzle' },
  Exhaustion: { emoji: '🟣', color: 'border-purple-500/50 bg-purple-500/10', hint: 'Rest required — add Fatigue or consume rations' },
  Quiet: { emoji: '🟢', color: 'border-green-500/50 bg-green-500/10', hint: 'Nothing stirs... for now' },
}

export function DungeonEventsPanel({ encounterTable, onRollEncounter, onSaveEncounterTable }: DungeonEventsPanelProps) {
  const [result, setResult] = useState<EventResult | null>(null)
  const [showEncounterTable, setShowEncounterTable] = useState(false)

  const handleCheck = () => {
    const eventRoll = rollOnTable(eventTable, rollDice)
    const event = eventRoll.entry.text

    const res: EventResult = {
      event,
      roll: eventRoll.diceResult.total,
    }

    if (event === 'Encounter') {
      const actRoll = rollOnTable(activityTable, rollDice)
      const reactRoll = rollOnTable(reactionTable, rollDice)
      res.activity = actRoll.entry.text
      res.activityRoll = actRoll.diceResult.total
      res.reaction = reactRoll.entry.text
      res.reactionRoll = reactRoll.diceResult.total
    }

    setResult(res)
  }

  const config = result ? EVENT_CONFIG[result.event] : null

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          🎲 Dungeon Events
        </h4>
        <Button size="sm" variant="outline" onClick={handleCheck}>
          <Dices className="mr-1.5 size-3.5" />
          Check for Events
        </Button>
      </div>

      {result && config && (
        <div className={`rounded-lg border-2 p-3 space-y-2 ${config.color}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">{config.emoji}</span>
              <span className="font-semibold text-sm">{result.event}</span>
              <span className="text-xs text-muted-foreground">(d6: {result.roll})</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="size-6 p-0 text-muted-foreground"
              onClick={() => setResult(null)}
            >
              <X className="size-3" />
            </Button>
          </div>

          {result.event === 'Encounter' && (
            <div className="space-y-1 text-sm pl-7">
              <p>
                <span className="font-medium">Activity:</span>{' '}
                {result.activity}
                <span className="text-xs text-muted-foreground ml-1">(d20: {result.activityRoll})</span>
              </p>
              <p>
                <span className="font-medium">Reaction:</span>{' '}
                {result.reaction}
                <span className="text-xs text-muted-foreground ml-1">(2d6: {result.reactionRoll})</span>
              </p>
            </div>
          )}

          {result.event !== 'Encounter' && config.hint && (
            <p className="text-sm text-muted-foreground pl-7">{config.hint}</p>
          )}

          {/* Expandable encounter table when result is Encounter */}
          {result.event === 'Encounter' && onRollEncounter && (
            <div className="pt-2 border-t border-border/50">
              <button
                onClick={() => setShowEncounterTable(!showEncounterTable)}
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {showEncounterTable ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                Encounter Table
              </button>
              {showEncounterTable && (
                <div className="mt-2">
                  <EncounterTableUI
                    table={encounterTable}
                    onRoll={onRollEncounter}
                    onSave={onSaveEncounterTable}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
