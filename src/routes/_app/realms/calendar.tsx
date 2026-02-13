import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { useUIStore } from '~/ui/stores/uiStore'
import { useActiveRealm } from '~/ui/hooks/useActiveRealm'
import { useContainer } from '~/ui/hooks/useContainer'
import { useDayLog } from '~/ui/hooks/useDayLog'
import { toDayKey } from '@domain/value-objects/DayKey'
import { executeAdvanceDay, executeFactionTurns, type AdvanceDayDeps } from '@application/use-cases/AdvanceClock'
import { executeRewindDay } from '@application/use-cases/RewindDay'
import { executeGenerateForecast } from '@application/use-cases/GenerateForecast'
import { rollDice } from '@shared/dice'
import { EmptyState } from '~/components/shared/EmptyState'
import { Scroll } from 'lucide-react'
import { StickyTimeBar } from '~/components/calendar/StickyTimeBar'
import { DayLogTable } from '~/components/calendar/DayLogTable'

export const Route = createFileRoute('/_app/realms/calendar')({
  component: CalendarPage,
})

const PAGE_SIZE = 28
const FUTURE_DAYS = 28

function CalendarPage() {
  const activeRealmId = useUIStore((s) => s.activeRealmId)
  const realm = useActiveRealm()
  const container = useContainer()

  // Pagination
  const [pageStartKey, setPageStartKey] = useState(0)

  // Center on current day when realm loads
  useEffect(() => {
    if (realm) {
      const currentKey = toDayKey(realm.currentYear, realm.currentSeason, realm.currentDay, realm.daysPerSeason)
      setPageStartKey(Math.max(0, currentKey - Math.floor(PAGE_SIZE / 2)))
    }
  }, [realm?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Day log data
  const entries = useDayLog(activeRealmId, pageStartKey, PAGE_SIZE)

  // Advancing state
  const [isAdvancing, setIsAdvancing] = useState(false)

  // Generate 7-day weather forecast on mount + after any clock change
  const forecastDeps = useCallback(() => ({
    realmRepo: container.realmRepo,
    weatherRepo: container.weatherRepo,
    rollDice,
  }), [container])

  const generateForecast = useCallback(async () => {
    if (!activeRealmId) return
    await executeGenerateForecast(activeRealmId, forecastDeps())
  }, [activeRealmId, forecastDeps])

  // Generate forecast on first load
  useEffect(() => {
    generateForecast()
  }, [generateForecast])

  if (!realm) {
    return <EmptyState icon={Scroll} title="No realm selected" />
  }

  const day1Key = toDayKey(1, 'spring', 1, realm.daysPerSeason)
  const currentDayKey = toDayKey(realm.currentYear, realm.currentSeason, realm.currentDay, realm.daysPerSeason)
  const maxStartKey = currentDayKey + FUTURE_DAYS - PAGE_SIZE + 1

  // ── Deps for advance use-case ─────────────────────────

  const advanceDeps: AdvanceDayDeps = {
    realmRepo: container.realmRepo,
    weatherRepo: container.weatherRepo,
    factionRepo: container.factionRepo,
    relationshipRepo: container.factionRelationshipRepo,
    npcRepo: container.npcRepo,
    worldEventRepo: container.worldEventRepo,
    eventBus: container.eventBus,
    rollDice,
  }

  // ── Navigation ────────────────────────────────────────

  const handlePrev = () => setPageStartKey((k) => Math.max(day1Key, k - PAGE_SIZE))
  const handleNext = () => setPageStartKey((k) => Math.min(maxStartKey, k + PAGE_SIZE))
  const handleToday = () => setPageStartKey(Math.max(day1Key, currentDayKey - Math.floor(PAGE_SIZE / 2)))

  // ── Mark as happened ──────────────────────────────────

  const handleMarkDayComplete = async (dayKey: number) => {
    const current = realm.completedThroughDay ?? -1
    const newValue = dayKey <= current ? dayKey - 1 : dayKey
    await container.realmRepo.update({
      ...realm,
      completedThroughDay: newValue,
      updatedAt: Date.now(),
    })
  }

  const handleMarkWeekComplete = async () => {
    const current = realm.completedThroughDay ?? -1
    const newValue = Math.min(current + realm.daysPerWeek, currentDayKey)
    await container.realmRepo.update({
      ...realm,
      completedThroughDay: newValue,
      updatedAt: Date.now(),
    })
  }

  // ── Advance / Rewind ──────────────────────────────────

  const handleAdvanceDay = async () => {
    if (!activeRealmId) return
    setIsAdvancing(true)
    try {
      await executeAdvanceDay(activeRealmId, advanceDeps)
      await generateForecast()
    } finally {
      setIsAdvancing(false)
    }
  }

  const handleAdvanceWeek = async () => {
    if (!activeRealmId) return
    setIsAdvancing(true)
    try {
      for (let i = 0; i < realm.daysPerWeek; i++) {
        await executeAdvanceDay(activeRealmId, advanceDeps)
      }
      if (realm.factionTurnTrigger === 'week') {
        const updatedRealm = await container.realmRepo.getById(activeRealmId)
        if (updatedRealm) {
          await executeFactionTurns(
            activeRealmId,
            {
              year: updatedRealm.currentYear,
              season: updatedRealm.currentSeason,
              day: updatedRealm.currentDay,
              watch: updatedRealm.currentWatch,
            },
            advanceDeps
          )
        }
      }
      await generateForecast()
    } finally {
      setIsAdvancing(false)
    }
  }

  const handleRewindDay = async () => {
    if (!activeRealmId) return
    setIsAdvancing(true)
    try {
      await executeRewindDay(activeRealmId, {
        realmRepo: container.realmRepo,
        weatherRepo: container.weatherRepo,
        worldEventRepo: container.worldEventRepo,
      })
      await generateForecast()
    } finally {
      setIsAdvancing(false)
    }
  }

  return (
    <div>
      <StickyTimeBar
        realm={realm}
        isAdvancing={isAdvancing}
        onRewindDay={handleRewindDay}
        onAdvanceDay={handleAdvanceDay}
        onAdvanceWeek={handleAdvanceWeek}
      />

      <DayLogTable
        entries={entries}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        onMarkDayComplete={handleMarkDayComplete}
        onMarkWeekComplete={handleMarkWeekComplete}
        canGoPrev={pageStartKey > day1Key}
        canGoNext={pageStartKey < maxStartKey}
        realmId={activeRealmId!}
      />
    </div>
  )
}
