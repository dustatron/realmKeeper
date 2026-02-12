import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useUIStore } from '~/ui/stores/uiStore'
import { useActiveRealm } from '~/ui/hooks/useActiveRealm'
import { useRecentWeather } from '~/ui/hooks/useWeather'
import { useTimeline } from '~/ui/hooks/useTimeline'
import { useContainer } from '~/ui/hooks/useContainer'
import { executeAdvanceClock, type AdvanceClockPreview } from '@application/use-cases/AdvanceClock'
import { executeCommitClockAdvance } from '@application/use-cases/CommitClockAdvance'
import { executeConfirmFactionTurn } from '@application/use-cases/ConfirmFactionTurn'
import { type ClockAdvanceUnit } from '@domain/services/ClockEngine'
import { type FactionTurnSuggestion } from '@domain/services/FactionTurnEngine'
import { formatWorldDateTime, formatWorldDate } from '@domain/value-objects/WorldDate'
import { SEASONS, WATCHES } from '@shared/constants'
import { rollDice } from '@shared/dice'
import { PageHeader } from '~/components/shared/PageHeader'
import { EmptyState } from '~/components/shared/EmptyState'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '~/components/ui/dialog'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { ScrollArea } from '~/components/ui/scroll-area'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '~/components/ui/tabs'
import {
  Scroll,
  Clock,
  Sun,
  CloudRain,
  Swords,
  ChevronRight,
  Check,
  X
} from 'lucide-react'

export const Route = createFileRoute('/_app/realms/calendar')({
  component: CalendarPage,
})

interface RelationshipChangeState {
  factionId: string
  targetId: string
  delta: number
  reason: string
  accepted: boolean
}

interface FactionTurnState extends FactionTurnSuggestion {
  relationshipChanges: RelationshipChangeState[]
}

function CalendarPage() {
  const activeRealmId = useUIStore((s) => s.activeRealmId)
  const realm = useActiveRealm()
  const weather = useRecentWeather(activeRealmId)
  const timeline = useTimeline(activeRealmId)
  const container = useContainer()

  const [clockPreview, setClockPreview] = useState<AdvanceClockPreview | null>(null)
  const [previewUnit, setPreviewUnit] = useState<ClockAdvanceUnit>('watch')
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isAdvancing, setIsAdvancing] = useState(false)
  const [factionTurnStates, setFactionTurnStates] = useState<FactionTurnState[]>([])

  if (!realm) {
    return (
      <div>
        <PageHeader title="Calendar" description="Track time, weather, and world events." />
        <EmptyState icon={Scroll} title="No realm selected" />
      </div>
    )
  }

  const handleAdvanceClick = async (unit: ClockAdvanceUnit) => {
    if (!activeRealmId) return

    setIsAdvancing(true)
    try {
      const preview = await executeAdvanceClock(activeRealmId, unit, {
        realmRepo: container.realmRepo,
        weatherRepo: container.weatherRepo,
        factionRepo: container.factionRepo,
        relationshipRepo: container.factionRelationshipRepo,
        npcRepo: container.npcRepo,
        rollDice,
      })

      if (preview) {
        setClockPreview(preview)
        setPreviewUnit(unit)

        // Initialize faction turn states with all relationship changes accepted by default
        if (preview.factionTurnSuggestions) {
          const states: FactionTurnState[] = preview.factionTurnSuggestions.map(suggestion => ({
            ...suggestion,
            relationshipChanges: suggestion.suggestedRelationshipChanges.map(change => ({
              ...change,
              accepted: true,
            })),
          }))
          setFactionTurnStates(states)
        } else {
          setFactionTurnStates([])
        }

        setIsPreviewOpen(true)
      }
    } finally {
      setIsAdvancing(false)
    }
  }

  const handleConfirm = async () => {
    if (!clockPreview || !activeRealmId) return

    setIsAdvancing(true)
    try {
      // Commit clock advance
      await executeCommitClockAdvance(activeRealmId, previewUnit, clockPreview, {
        realmRepo: container.realmRepo,
        weatherRepo: container.weatherRepo,
        worldEventRepo: container.worldEventRepo,
        eventBus: container.eventBus,
      })

      // Process accepted faction turns
      if (factionTurnStates.length > 0) {
        // Filter to only accepted changes
        const acceptedSuggestions: FactionTurnSuggestion[] = factionTurnStates.map(state => ({
          ...state,
          suggestedRelationshipChanges: state.relationshipChanges
            .filter(change => change.accepted)
            .map(({ accepted, ...change }) => change),
        }))

        await executeConfirmFactionTurn(
          activeRealmId,
          acceptedSuggestions,
          clockPreview.newDateTime,
          {
            factionRepo: container.factionRepo,
            relationshipRepo: container.factionRelationshipRepo,
            worldEventRepo: container.worldEventRepo,
            eventBus: container.eventBus,
          }
        )
      }

      setIsPreviewOpen(false)
      setClockPreview(null)
      setFactionTurnStates([])
    } finally {
      setIsAdvancing(false)
    }
  }

  const handleCancel = () => {
    setIsPreviewOpen(false)
    setClockPreview(null)
    setFactionTurnStates([])
  }

  const toggleRelationshipChange = (factionIndex: number, changeIndex: number) => {
    setFactionTurnStates(prev => {
      const updated = [...prev]
      updated[factionIndex] = {
        ...updated[factionIndex],
        relationshipChanges: updated[factionIndex].relationshipChanges.map((change, idx) =>
          idx === changeIndex ? { ...change, accepted: !change.accepted } : change
        ),
      }
      return updated
    })
  }

  const getSeasonColor = (season: string) => {
    switch (season) {
      case 'spring': return 'text-green-600 dark:text-green-400'
      case 'summer': return 'text-yellow-600 dark:text-yellow-400'
      case 'fall': return 'text-orange-600 dark:text-orange-400'
      case 'winter': return 'text-blue-600 dark:text-blue-400'
      default: return 'text-foreground'
    }
  }

  const getSeverityVariant = (severity: string) => {
    switch (severity) {
      case 'extreme': return 'outline'
      case 'catastrophic': return 'destructive'
      default: return 'secondary'
    }
  }

  const getEventTypeVariant = (type: string) => {
    switch (type) {
      case 'clock_advance': return 'default'
      case 'faction_turn': return 'secondary'
      case 'weather': return 'outline'
      default: return 'secondary'
    }
  }

  const getActionTypeBadge = (actionType: string, blocked?: boolean) => {
    if (blocked) {
      return { className: 'bg-purple-600 text-white', label: 'Blocked' }
    }
    switch (actionType) {
      case 'failure': return { className: 'bg-red-600 text-white', label: 'Failure' }
      case 'setback': return { className: 'bg-orange-500 text-white', label: 'Setback' }
      case 'status_quo': return { className: 'bg-gray-500 text-white', label: 'No Change' }
      case 'mixed_success': return { className: 'bg-yellow-500 text-black', label: 'Mixed Success' }
      case 'success': return { className: 'bg-green-600 text-white', label: 'Success' }
      case 'major_success': return { className: 'bg-emerald-500 text-white', label: 'Major Success' }
      default: return { className: 'bg-gray-500 text-white', label: actionType }
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Calendar" description="Track time, weather, and world events." />

      {/* Current Time Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="size-5" />
            Current Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold mb-4">
            <span>Year {realm.currentYear}</span>
            <span className="mx-2">•</span>
            <span className={getSeasonColor(realm.currentSeason)}>
              {realm.currentSeason.charAt(0).toUpperCase() + realm.currentSeason.slice(1)}
            </span>
            <span className="mx-2">•</span>
            <span>Day {realm.currentDay}</span>
            <span className="mx-2">•</span>
            <span className="text-muted-foreground text-2xl">
              {realm.currentWatch.charAt(0).toUpperCase() + realm.currentWatch.slice(1)}
            </span>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => handleAdvanceClick('watch')}
              disabled={isAdvancing}
            >
              <Clock className="size-4" />
              +Watch
            </Button>
            <Button
              onClick={() => handleAdvanceClick('day')}
              disabled={isAdvancing}
            >
              <Sun className="size-4" />
              +Day
            </Button>
            <Button
              onClick={() => handleAdvanceClick('week')}
              disabled={isAdvancing}
            >
              <CloudRain className="size-4" />
              +Week
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Weather & Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weather Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CloudRain className="size-5" />
              Recent Weather
            </CardTitle>
          </CardHeader>
          <CardContent>
            {weather.length === 0 ? (
              <p className="text-muted-foreground text-sm">No weather recorded yet.</p>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {weather.map((w) => (
                    <div key={w.id} className="border-b pb-3 last:border-b-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm text-muted-foreground">
                          {w.season.charAt(0).toUpperCase() + w.season.slice(1)} {w.day}, {w.watch}
                        </p>
                        <Badge variant={getSeverityVariant(w.severity)}>
                          {w.severity}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium">{w.condition}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Timeline Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scroll className="size-5" />
              World Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            {timeline.length === 0 ? (
              <p className="text-muted-foreground text-sm">No events recorded yet.</p>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {timeline.map((event) => (
                    <div key={event.id} className="border-b pb-3 last:border-b-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-xs text-muted-foreground">
                          Year {event.year}, {event.season.charAt(0).toUpperCase() + event.season.slice(1)} {event.day}
                        </p>
                        <Badge variant={getEventTypeVariant(event.type)} className="text-xs">
                          {event.type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <h4 className="font-semibold text-sm mb-1">{event.title}</h4>
                      <p className="text-sm text-muted-foreground">{event.description}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Advance Time</DialogTitle>
            <DialogDescription>
              Review the changes before confirming
            </DialogDescription>
          </DialogHeader>

          {clockPreview && (
            <div className="space-y-6">
              {/* Time Change */}
              <div className="flex items-center gap-3 text-lg">
                <span className="font-medium">{formatWorldDateTime(clockPreview.previousDateTime)}</span>
                <ChevronRight className="size-5 text-muted-foreground" />
                <span className="font-bold text-primary">{formatWorldDateTime(clockPreview.newDateTime)}</span>
              </div>

              {/* Weather */}
              {clockPreview.weather && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <CloudRain className="size-4" />
                      Weather Rolled
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{clockPreview.weather.condition}</p>
                        <p className="text-sm text-muted-foreground">
                          Dice: {clockPreview.weather.diceResult.rolls.join(', ')} = {clockPreview.weather.diceResult.total}
                        </p>
                      </div>
                      <Badge variant={getSeverityVariant(clockPreview.weather.severity)}>
                        {clockPreview.weather.severity}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Faction Turns */}
              {factionTurnStates.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Swords className="size-4" />
                    Faction Turns
                  </h3>
                  {factionTurnStates.map((state, factionIndex) => {
                    const actionBadge = getActionTypeBadge(state.actionType, state.blocked)

                    return (
                      <Card key={state.factionId}>
                        <CardHeader>
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-base">{state.factionName}</CardTitle>
                            <div className="flex items-center gap-2">
                              <Badge className={actionBadge.className}>{actionBadge.label}</Badge>
                              <Badge variant="outline">{state.blocked ? 'WIL' : 'd6'}: {state.actionRoll.total}</Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm mb-3">{state.description}</p>

                          {/* Opposition Check */}
                          {state.oppositionCheck && (
                            <div className="bg-muted/50 rounded-lg p-3 mb-3 text-sm">
                              <p className="font-medium mb-1">Opposition Check</p>
                              <p className="text-muted-foreground">
                                {state.oppositionCheck.agentName} WIL save: {state.oppositionCheck.wilSave.total} vs {state.oppositionCheck.wilScore}
                                {' — '}
                                <span className={state.oppositionCheck.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                  {state.oppositionCheck.success ? 'Blocked!' : 'Failed'}
                                </span>
                              </p>
                            </div>
                          )}

                          {/* Cairn action details */}
                          <div className="space-y-1 mb-3">
                            {state.suggestedGoalCompleted && (
                              <p className="text-sm text-green-600 dark:text-green-400">
                                Goal: {state.suggestedGoalCompleted}
                              </p>
                            )}
                            {state.suggestedAdvantageGain && (
                              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                                +Advantage: {state.suggestedAdvantageGain}
                              </p>
                            )}
                            {state.suggestedAdvantageLoss && (
                              <p className="text-sm text-red-600 dark:text-red-400">
                                -Advantage: {state.suggestedAdvantageLoss}
                              </p>
                            )}
                            {state.suggestedNewObstacle && (
                              <p className="text-sm text-orange-600 dark:text-orange-400">
                                +Obstacle: {state.suggestedNewObstacle}
                              </p>
                            )}
                          </div>

                          {/* Relationship Changes */}
                          {state.relationshipChanges.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-sm font-medium">Suggested Changes:</p>
                              {state.relationshipChanges.map((change, changeIndex) => (
                                <div
                                  key={`${change.factionId}-${change.targetId}`}
                                  className="flex items-start gap-2 text-sm"
                                >
                                  <input
                                    type="checkbox"
                                    checked={change.accepted}
                                    onChange={() => toggleRelationshipChange(factionIndex, changeIndex)}
                                    className="mt-0.5 size-4 rounded border-input cursor-pointer"
                                  />
                                  <div className="flex-1">
                                    <p>
                                      <span className={change.delta > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                        {change.delta > 0 ? '+' : ''}{change.delta}
                                      </span>
                                      {' relationship'}
                                    </p>
                                    <p className="text-muted-foreground text-xs">{change.reason}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel} disabled={isAdvancing}>
              <X className="size-4" />
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={isAdvancing}>
              <Check className="size-4" />
              {isAdvancing ? 'Confirming...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
