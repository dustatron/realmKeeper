import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { queryDb, Schema } from '@livestore/livestore'
import { useQuery } from '@livestore/react'
import { parseJsonRows } from '@shared/parseJsonRow'
import { useUIStore } from '~/ui/stores/uiStore'
import { useActiveRealm } from '~/ui/hooks/useActiveRealm'
import { useRealmPOIs } from '~/ui/hooks/usePOIs'
import { useContainer } from '~/ui/hooks/useContainer'
import { useDayLog } from '~/ui/hooks/useDayLog'
import { toDayKey } from '@domain/value-objects/DayKey'
import { executeAdvanceDay, executeFactionTurns, type AdvanceDayDeps } from '@application/use-cases/AdvanceClock'
import { executeRewindDay } from '@application/use-cases/RewindDay'
import { executeGenerateForecast } from '@application/use-cases/GenerateForecast'
import { executeCreatePOIEvent } from '@application/use-cases/CreatePOIEvent'
import { executeUpdatePOIEvent } from '@application/use-cases/UpdatePOIEvent'
import { executeDeletePOIEvent } from '@application/use-cases/DeletePOIEvent'
import type { POIEvent } from '@domain/entities/POIEvent'
import type { POIEventType, Season } from '@shared/constants'
import { POI_EVENT_TYPES, SEASONS } from '@shared/constants'
import { rollDice } from '@shared/dice'
import { EmptyState } from '~/components/shared/EmptyState'
import { ConfirmDialog } from '~/components/shared/ConfirmDialog'
import { TagInput } from '~/components/shared/TagInput'
import { StickyTimeBar } from '~/components/calendar/StickyTimeBar'
import { DayLogTable } from '~/components/calendar/DayLogTable'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '~/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '~/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Badge } from '~/components/ui/badge'
import { Switch } from '~/components/ui/switch'
import { Scroll, CalendarClock, Plus, Trash2, Zap, ZapOff } from 'lucide-react'
export const Route = createFileRoute('/_app/realms/calendar')({
  component: CalendarPage,
})

const PAGE_SIZE = 28
const FUTURE_DAYS = 28
const SEASON_ORDER: Record<string, number> = { spring: 0, summer: 1, fall: 2, winter: 3 }

type CalendarTab = 'timeline' | 'events'
type StatusFilter = 'all' | 'active' | 'upcoming' | 'past'

function CalendarPage() {
  const activeRealmId = useUIStore((s) => s.activeRealmId)
  const realm = useActiveRealm()
  const container = useContainer()
  const pois = useRealmPOIs(activeRealmId)

  const [tab, setTab] = useState<CalendarTab>('timeline')

  // ── Timeline state ──────────────────────────────────────
  const [pageStartKey, setPageStartKey] = useState(0)

  useEffect(() => {
    if (realm) {
      const d1 = toDayKey(1, 'spring', 1, realm.daysPerSeason)
      const currentKey = toDayKey(realm.currentYear, realm.currentSeason, realm.currentDay, realm.daysPerSeason)
      setPageStartKey(Math.max(d1, currentKey - Math.floor(PAGE_SIZE / 2)))
    }
  }, [realm?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const entries = useDayLog(activeRealmId, pageStartKey, PAGE_SIZE)
  const [isAdvancing, setIsAdvancing] = useState(false)

  const forecastDeps = useCallback(() => ({
    realmRepo: container.realmRepo,
    weatherRepo: container.weatherRepo,
    rollDice,
  }), [container])

  const generateForecast = useCallback(async () => {
    if (!activeRealmId) return
    await executeGenerateForecast(activeRealmId, forecastDeps())
  }, [activeRealmId, forecastDeps])

  useEffect(() => {
    generateForecast()
  }, [generateForecast])

  // ── Events state ────────────────────────────────────────
  const [eventFilter, setEventFilter] = useState<StatusFilter>('all')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<POIEvent | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null)

  const events = useQuery(queryDb({
    query: activeRealmId
      ? 'SELECT * FROM poiEvents WHERE worldId = $worldId'
      : 'SELECT * FROM poiEvents WHERE 1 = 0',
    schema: Schema.Array(Schema.Unknown),
    bindValues: activeRealmId ? { worldId: activeRealmId } : {},
  }, { deps: [activeRealmId], map: parseJsonRows })) as POIEvent[]

  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    type: 'festival' as POIEventType,
    poiId: '',
    year: null as number | null,
    season: 'spring' as Season,
    day: 1,
    watch: null as number | null,
    recurring: false,
    durationWatches: 1,
    effects: '',
    tags: [] as string[],
  })

  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    type: 'festival' as POIEventType,
    poiId: '',
    year: null as number | null,
    season: 'spring' as Season,
    day: 1,
    watch: null as number | null,
    recurring: false,
    durationWatches: 1,
    effects: '',
    tags: [] as string[],
  })

  // ── No realm guard ──────────────────────────────────────
  if (!realm) {
    return <EmptyState icon={Scroll} title="No realm selected" />
  }

  // ── Timeline helpers ────────────────────────────────────
  const day1Key = toDayKey(1, 'spring', 1, realm.daysPerSeason)
  const currentDayKey = toDayKey(realm.currentYear, realm.currentSeason, realm.currentDay, realm.daysPerSeason)
  const maxStartKey = currentDayKey + FUTURE_DAYS - PAGE_SIZE + 1

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

  const handlePrev = () => setPageStartKey((k) => Math.max(day1Key, k - PAGE_SIZE))
  const handleNext = () => setPageStartKey((k) => Math.min(maxStartKey, k + PAGE_SIZE))
  const handleToday = () => setPageStartKey(Math.max(day1Key, currentDayKey - Math.floor(PAGE_SIZE / 2)))

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

  // ── Events helpers ──────────────────────────────────────

  const getPOIName = (poiId: string): string => {
    return pois.find((p) => p.id === poiId)?.name ?? 'Unknown'
  }

  const formatTriggerDate = (trigger: POIEvent['trigger']): string => {
    const parts: string[] = []
    if (trigger.year !== null) parts.push(`Y${trigger.year}`)
    parts.push(trigger.season.charAt(0).toUpperCase() + trigger.season.slice(1))
    parts.push(`D${trigger.day}`)
    if (trigger.watch !== null) parts.push(`W${trigger.watch}`)
    return parts.join(' ')
  }

  const getEventStatus = (event: POIEvent): 'active' | 'upcoming' | 'past' => {
    if (event.isActive) return 'active'

    if (event.recurring && event.trigger.year === null) return 'upcoming'

    if (event.trigger.year !== null) {
      if (event.trigger.year > realm.currentYear) return 'upcoming'
      if (event.trigger.year < realm.currentYear) return 'past'
    }

    const eventSeasonOrder = SEASON_ORDER[event.trigger.season] ?? 0
    const currentSeasonOrder = SEASON_ORDER[realm.currentSeason] ?? 0
    if (eventSeasonOrder > currentSeasonOrder) return 'upcoming'
    if (eventSeasonOrder < currentSeasonOrder) return 'past'

    if (event.trigger.day > realm.currentDay) return 'upcoming'
    if (event.trigger.day < realm.currentDay) return 'past'

    return 'upcoming'
  }

  const STATUS_BADGE: Record<string, { label: string; className: string }> = {
    active: { label: 'Active', className: 'bg-green-600 text-white hover:bg-green-600' },
    upcoming: { label: 'Upcoming', className: 'bg-blue-500/10 text-blue-700 border-blue-500/20 hover:bg-blue-500/10' },
    past: { label: 'Past', className: 'bg-slate-500/10 text-slate-500 border-slate-500/20 hover:bg-slate-500/10' },
  }

  const sortedEvents = (() => {
    const withStatus = events.map((e) => ({ event: e, status: getEventStatus(e) }))
    const filtered = eventFilter === 'all' ? withStatus : withStatus.filter((e) => e.status === eventFilter)
    const statusPriority: Record<string, number> = { active: 0, upcoming: 1, past: 2 }
    filtered.sort((a, b) => {
      const pA = statusPriority[a.status] ?? 2
      const pB = statusPriority[b.status] ?? 2
      if (pA !== pB) return pA - pB
      const aYear = a.event.trigger.year ?? 0
      const bYear = b.event.trigger.year ?? 0
      if (aYear !== bYear) return aYear - bYear
      const aSeason = SEASON_ORDER[a.event.trigger.season] ?? 0
      const bSeason = SEASON_ORDER[b.event.trigger.season] ?? 0
      if (aSeason !== bSeason) return aSeason - bSeason
      return a.event.trigger.day - b.event.trigger.day
    })
    return filtered
  })()

  const eventCounts = (() => {
    const c = { all: events.length, active: 0, upcoming: 0, past: 0 }
    for (const e of events) c[getEventStatus(e)]++
    return c
  })()

  const handleCreateEvent = async () => {
    if (!createForm.name.trim() || !createForm.poiId || !activeRealmId) return
    await executeCreatePOIEvent(
      {
        poiId: createForm.poiId,
        worldId: activeRealmId,
        name: createForm.name,
        description: createForm.description,
        type: createForm.type,
        trigger: {
          year: createForm.year,
          season: createForm.season,
          day: createForm.day,
          watch: createForm.watch,
        },
        recurring: createForm.recurring,
        durationWatches: createForm.durationWatches,
        effects: createForm.effects,
        tags: createForm.tags,
      },
      { poiEventRepo: container.poiEventRepo }
    )
    setCreateDialogOpen(false)
    resetCreateForm()
  }

  const resetCreateForm = () => {
    setCreateForm({
      name: '',
      description: '',
      type: 'festival',
      poiId: '',
      year: null,
      season: realm.currentSeason,
      day: realm.currentDay,
      watch: null,
      recurring: false,
      durationWatches: 1,
      effects: '',
      tags: [],
    })
  }

  const handleEditEvent = async () => {
    if (!editingEvent || !editForm.name.trim() || !editForm.poiId) return
    await executeUpdatePOIEvent(
      {
        ...editingEvent,
        name: editForm.name,
        description: editForm.description,
        type: editForm.type,
        poiId: editForm.poiId,
        trigger: {
          year: editForm.year,
          season: editForm.season,
          day: editForm.day,
          watch: editForm.watch,
        },
        recurring: editForm.recurring,
        durationWatches: editForm.durationWatches,
        effects: editForm.effects,
        tags: editForm.tags,
      },
      { poiEventRepo: container.poiEventRepo }
    )
    setEditingEvent(null)
  }

  const handleToggleActive = async (event: POIEvent) => {
    await executeUpdatePOIEvent(
      { ...event, isActive: !event.isActive },
      { poiEventRepo: container.poiEventRepo }
    )
  }

  const handleDeleteEvent = async () => {
    if (!deletingEventId) return
    await executeDeletePOIEvent(deletingEventId, { poiEventRepo: container.poiEventRepo })
    setDeleteConfirmOpen(false)
    setDeletingEventId(null)
    setEditingEvent(null)
  }

  const openCreateDialog = () => {
    resetCreateForm()
    setCreateDialogOpen(true)
  }

  const openEditSheet = (event: POIEvent) => {
    setEditForm({
      name: event.name,
      description: event.description,
      type: event.type,
      poiId: event.poiId,
      year: event.trigger.year,
      season: event.trigger.season,
      day: event.trigger.day,
      watch: event.trigger.watch,
      recurring: event.recurring,
      durationWatches: event.durationWatches,
      effects: event.effects,
      tags: event.tags,
    })
    setEditingEvent(event)
  }

  const openDeleteDialog = (eventId: string) => {
    setDeletingEventId(eventId)
    setDeleteConfirmOpen(true)
  }

  const filterTabs: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: `All (${eventCounts.all})` },
    { key: 'active', label: `Active (${eventCounts.active})` },
    { key: 'upcoming', label: `Upcoming (${eventCounts.upcoming})` },
    { key: 'past', label: `Past (${eventCounts.past})` },
  ]

  // ── Render ──────────────────────────────────────────────

  return (
    <div>
      <StickyTimeBar
        realm={realm}
        isAdvancing={isAdvancing}
        onRewindDay={handleRewindDay}
        onAdvanceDay={handleAdvanceDay}
        onAdvanceWeek={handleAdvanceWeek}
      />

      {/* Tab Bar */}
      <div className="flex items-center gap-1 border-b px-4">
        <button
          onClick={() => setTab('timeline')}
          className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'timeline'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Scroll className="size-4" />
          Timeline
        </button>
        <button
          onClick={() => setTab('events')}
          className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'events'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <CalendarClock className="size-4" />
          Scheduled Events
          {eventCounts.active > 0 && (
            <Badge className="bg-green-600 text-white text-xs px-1.5 py-0 ml-1">
              {eventCounts.active}
            </Badge>
          )}
        </button>
      </div>

      {/* Timeline Tab */}
      {tab === 'timeline' && (
        <DayLogTable
          entries={entries}
          onPrev={handlePrev}
          onNext={handleNext}
          onToday={handleToday}
          onMarkDayComplete={handleMarkDayComplete}
          onMarkWeekComplete={handleMarkWeekComplete}
          canGoPrev={pageStartKey > day1Key}
          canGoNext={pageStartKey < maxStartKey}
          worldId={activeRealmId!}
        />
      )}

      {/* Events Tab */}
      {tab === 'events' && (
        <div className="space-y-4 p-4">
          {/* Filter + Create row */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-1">
              {filterTabs.map((ft) => (
                <button
                  key={ft.key}
                  onClick={() => setEventFilter(ft.key)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    eventFilter === ft.key
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {ft.label}
                </button>
              ))}
            </div>
            <Button size="sm" onClick={openCreateDialog}>
              <Plus className="mr-1.5 size-3.5" />
              New Event
            </Button>
          </div>

          {/* Table */}
          {sortedEvents.length === 0 ? (
            events.length === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title="No scheduled events"
                description="Create events tied to locations that trigger on specific dates."
                action={
                  <Button onClick={openCreateDialog}>
                    <Plus className="mr-2 size-4" />
                    New Event
                  </Button>
                }
              />
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No {eventFilter} events.
              </div>
            )
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[90px]">Status</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead className="w-[70px]">Dur.</TableHead>
                    <TableHead className="w-[90px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedEvents.map(({ event, status }) => (
                    <TableRow
                      key={event.id}
                      className={`cursor-pointer hover:bg-muted/50 ${status === 'past' ? 'opacity-60' : ''}`}
                      onClick={() => openEditSheet(event)}
                    >
                      <TableCell>
                        <Badge className={STATUS_BADGE[status].className}>
                          {STATUS_BADGE[status].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{event.name}</div>
                        {event.recurring && (
                          <span className="text-xs text-muted-foreground">recurring</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{getPOIName(event.poiId)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{event.type}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatTriggerDate(event.trigger)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {event.durationWatches}w
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7"
                            title={event.isActive ? 'Deactivate' : 'Activate'}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleToggleActive(event)
                            }}
                          >
                            {event.isActive ? (
                              <ZapOff className="size-3.5" />
                            ) : (
                              <Zap className="size-3.5" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7 text-destructive hover:text-destructive"
                            title="Delete"
                            onClick={(e) => {
                              e.stopPropagation()
                              openDeleteDialog(event.id)
                            }}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* Create Event Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="create-name">Name *</Label>
              <Input
                id="create-name"
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Event name"
              />
            </div>
            <div>
              <Label htmlFor="create-description">Description</Label>
              <Textarea
                id="create-description"
                value={createForm.description}
                onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="What happens during this event?"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="create-type">Type</Label>
                <Select
                  value={createForm.type}
                  onValueChange={(value) => setCreateForm((f) => ({ ...f, type: value as POIEventType }))}
                >
                  <SelectTrigger id="create-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POI_EVENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="create-poi">Location (POI) *</Label>
                <Select
                  value={createForm.poiId}
                  onValueChange={(value) => setCreateForm((f) => ({ ...f, poiId: value }))}
                >
                  <SelectTrigger id="create-poi">
                    <SelectValue placeholder="Select POI" />
                  </SelectTrigger>
                  <SelectContent>
                    {pois.map((poi) => (
                      <SelectItem key={poi.id} value={poi.id}>
                        {poi.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Trigger Date</Label>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <Label htmlFor="create-year" className="text-xs">Year (optional)</Label>
                  <Input
                    id="create-year"
                    type="number"
                    value={createForm.year ?? ''}
                    onChange={(e) => setCreateForm((f) => ({ ...f, year: e.target.value ? parseInt(e.target.value) : null }))}
                    placeholder="Any"
                  />
                </div>
                <div>
                  <Label htmlFor="create-season" className="text-xs">Season</Label>
                  <Select
                    value={createForm.season}
                    onValueChange={(value) => setCreateForm((f) => ({ ...f, season: value as Season }))}
                  >
                    <SelectTrigger id="create-season">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SEASONS.map((season) => (
                        <SelectItem key={season} value={season}>
                          {season}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="create-day" className="text-xs">Day</Label>
                  <Input
                    id="create-day"
                    type="number"
                    min="1"
                    value={createForm.day}
                    onChange={(e) => setCreateForm((f) => ({ ...f, day: parseInt(e.target.value) || 1 }))}
                  />
                </div>
                <div>
                  <Label htmlFor="create-watch" className="text-xs">Watch (optional)</Label>
                  <Input
                    id="create-watch"
                    type="number"
                    min="1"
                    value={createForm.watch ?? ''}
                    onChange={(e) => setCreateForm((f) => ({ ...f, watch: e.target.value ? parseInt(e.target.value) : null }))}
                    placeholder="All"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="create-recurring"
                  checked={createForm.recurring}
                  onCheckedChange={(checked) => setCreateForm((f) => ({ ...f, recurring: checked }))}
                />
                <Label htmlFor="create-recurring" className="cursor-pointer">Recurring</Label>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="create-duration" className="text-sm">Duration (watches)</Label>
                <Input
                  id="create-duration"
                  type="number"
                  min="1"
                  className="w-20"
                  value={createForm.durationWatches}
                  onChange={(e) => setCreateForm((f) => ({ ...f, durationWatches: parseInt(e.target.value) || 1 }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="create-effects">Effects</Label>
              <Textarea
                id="create-effects"
                value={createForm.effects}
                onChange={(e) => setCreateForm((f) => ({ ...f, effects: e.target.value }))}
                placeholder="What effects does this event have?"
                rows={2}
              />
            </div>
            <div>
              <Label>Tags</Label>
              <TagInput
                tags={createForm.tags}
                onChange={(tags) => setCreateForm((f) => ({ ...f, tags }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateEvent} disabled={!createForm.name.trim() || !createForm.poiId}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Event Sheet */}
      <Sheet open={!!editingEvent} onOpenChange={(open) => !open && setEditingEvent(null)}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Edit Event</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Event name"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="What happens during this event?"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-type">Type</Label>
                <Select
                  value={editForm.type}
                  onValueChange={(value) => setEditForm((f) => ({ ...f, type: value as POIEventType }))}
                >
                  <SelectTrigger id="edit-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POI_EVENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-poi">Location (POI) *</Label>
                <Select
                  value={editForm.poiId}
                  onValueChange={(value) => setEditForm((f) => ({ ...f, poiId: value }))}
                >
                  <SelectTrigger id="edit-poi">
                    <SelectValue placeholder="Select POI" />
                  </SelectTrigger>
                  <SelectContent>
                    {pois.map((poi) => (
                      <SelectItem key={poi.id} value={poi.id}>
                        {poi.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Trigger Date</Label>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <Label htmlFor="edit-year" className="text-xs">Year</Label>
                  <Input
                    id="edit-year"
                    type="number"
                    value={editForm.year ?? ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, year: e.target.value ? parseInt(e.target.value) : null }))}
                    placeholder="Any"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-season" className="text-xs">Season</Label>
                  <Select
                    value={editForm.season}
                    onValueChange={(value) => setEditForm((f) => ({ ...f, season: value as Season }))}
                  >
                    <SelectTrigger id="edit-season">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SEASONS.map((season) => (
                        <SelectItem key={season} value={season}>
                          {season}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-day" className="text-xs">Day</Label>
                  <Input
                    id="edit-day"
                    type="number"
                    min="1"
                    value={editForm.day}
                    onChange={(e) => setEditForm((f) => ({ ...f, day: parseInt(e.target.value) || 1 }))}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-watch" className="text-xs">Watch</Label>
                  <Input
                    id="edit-watch"
                    type="number"
                    min="1"
                    value={editForm.watch ?? ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, watch: e.target.value ? parseInt(e.target.value) : null }))}
                    placeholder="All"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="edit-recurring"
                  checked={editForm.recurring}
                  onCheckedChange={(checked) => setEditForm((f) => ({ ...f, recurring: checked }))}
                />
                <Label htmlFor="edit-recurring" className="cursor-pointer">Recurring</Label>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="edit-duration" className="text-sm">Duration (watches)</Label>
                <Input
                  id="edit-duration"
                  type="number"
                  min="1"
                  className="w-20"
                  value={editForm.durationWatches}
                  onChange={(e) => setEditForm((f) => ({ ...f, durationWatches: parseInt(e.target.value) || 1 }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-effects">Effects</Label>
              <Textarea
                id="edit-effects"
                value={editForm.effects}
                onChange={(e) => setEditForm((f) => ({ ...f, effects: e.target.value }))}
                placeholder="What effects does this event have?"
                rows={2}
              />
            </div>
            <div>
              <Label>Tags</Label>
              <TagInput
                tags={editForm.tags}
                onChange={(tags) => setEditForm((f) => ({ ...f, tags }))}
              />
            </div>
            {editingEvent && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleToggleActive(editingEvent)}
              >
                {editingEvent.isActive ? (
                  <><ZapOff className="mr-2 size-4" /> Deactivate Event</>
                ) : (
                  <><Zap className="mr-2 size-4" /> Activate Event</>
                )}
              </Button>
            )}
          </div>
          <SheetFooter>
            <div className="flex w-full gap-2">
              <Button
                variant="destructive"
                onClick={() => editingEvent && openDeleteDialog(editingEvent.id)}
                className="mr-auto"
              >
                <Trash2 className="mr-2 size-4" />
                Delete
              </Button>
              <Button variant="outline" onClick={() => setEditingEvent(null)}>
                Cancel
              </Button>
              <Button onClick={handleEditEvent} disabled={!editForm.name.trim() || !editForm.poiId}>
                Save
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Event"
        description="Are you sure you want to delete this event? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDeleteEvent}
      />
    </div>
  )
}
