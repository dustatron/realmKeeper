import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { queryDb, Schema } from '@livestore/livestore'
import { useQuery } from '@livestore/react'
import { useContainer } from '~/ui/hooks/useContainer'
import { useRealmPOIs } from '~/ui/hooks/usePOIs'
import { useUIStore } from '~/ui/stores/uiStore'
import { executeUpdatePOIEvent } from '@application/use-cases/UpdatePOIEvent'
import { executeDeletePOIEvent } from '@application/use-cases/DeletePOIEvent'
import type { POIEventType, Season } from '@shared/constants'
import { POI_EVENT_TYPES, SEASONS } from '@shared/constants'
import { ConfirmDialog } from '~/components/shared/ConfirmDialog'
import { TagInput } from '~/components/shared/TagInput'
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
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '~/components/ui/sheet'
import {
  CalendarClock,
  ChevronLeft,
  Clock,
  MapPin,
  Pencil,
  RefreshCw,
  Trash2,
  Zap,
  ZapOff,
} from 'lucide-react'
import type { POIEvent } from '@domain/entities/POIEvent'

export const Route = createFileRoute('/_app/realms/events_/$eventId')({
  component: EventDetailPage,
})

function EventDetailPage() {
  const { eventId } = Route.useParams()
  const navigate = useNavigate()
  const container = useContainer()
  const activeRealmId = useUIStore((s) => s.activeRealmId)
  const pois = useRealmPOIs(activeRealmId)

  const eventResults = useQuery(queryDb({
    query: 'SELECT * FROM poiEvents WHERE id = $id LIMIT 1',
    schema: Schema.Array(Schema.Unknown),
    bindValues: { id: eventId ?? '' },
  }, { deps: eventId })) as POIEvent[]
  const event = eventResults[0]

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
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

  if (!event) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Event not found.
      </div>
    )
  }

  const poiName = pois.find((p) => p.id === event.poiId)?.name ?? 'Unknown'
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

  const formatTrigger = () => {
    const parts: string[] = []
    if (event.trigger.year !== null) parts.push(`Year ${event.trigger.year}`)
    else parts.push('Every year')
    parts.push(cap(event.trigger.season))
    parts.push(`Day ${event.trigger.day}`)
    if (event.trigger.watch !== null) parts.push(`Watch ${event.trigger.watch}`)
    else parts.push('All day')
    return parts.join(' · ')
  }

  const openEdit = () => {
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
    setEditOpen(true)
  }

  const handleSave = async () => {
    if (!editForm.name.trim() || !editForm.poiId) return
    await executeUpdatePOIEvent(
      {
        ...event,
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
    setEditOpen(false)
  }

  const handleToggleActive = async () => {
    await executeUpdatePOIEvent(
      { ...event, isActive: !event.isActive },
      { poiEventRepo: container.poiEventRepo }
    )
  }

  const handleDelete = async () => {
    await executeDeletePOIEvent(eventId, { poiEventRepo: container.poiEventRepo })
    navigate({ to: '/realms/calendar' })
  }

  return (
    <div className="space-y-6 p-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/realms/calendar">
          <Button variant="ghost" size="icon" className="size-8">
            <ChevronLeft className="size-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <CalendarClock className="size-5 text-muted-foreground" />
            <h1 className="text-2xl font-bold">{event.name}</h1>
            {event.isActive ? (
              <Badge className="bg-green-600 text-white">Active</Badge>
            ) : (
              <Badge variant="outline">Inactive</Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <MapPin className="size-3.5" />
            <Link
              to="/realms/pois/$poiId"
              params={{ poiId: event.poiId }}
              className="hover:underline text-primary"
            >
              {poiName}
            </Link>
            <span>&middot;</span>
            <Badge variant="outline" className="text-xs">{event.type}</Badge>
            {event.recurring && <Badge variant="secondary" className="text-xs">Recurring</Badge>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={openEdit}>
            <Pencil className="size-3.5 mr-1.5" />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={handleToggleActive}>
            {event.isActive ? (
              <><ZapOff className="size-3.5 mr-1.5" /> Deactivate</>
            ) : (
              <><Zap className="size-3.5 mr-1.5" /> Activate</>
            )}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteConfirmOpen(true)}
          >
            <Trash2 className="size-3.5 mr-1.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* Details Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              <Clock className="size-4" />
              Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm">{formatTrigger()}</div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>Duration: {event.durationWatches} watch{event.durationWatches !== 1 ? 'es' : ''}</span>
              {event.recurring && (
                <span className="flex items-center gap-1">
                  <RefreshCw className="size-3" /> Recurring
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1.5">
              <MapPin className="size-4" />
              Location
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              to="/realms/pois/$poiId"
              params={{ poiId: event.poiId }}
              className="text-sm text-primary hover:underline"
            >
              {poiName}
            </Link>
          </CardContent>
        </Card>
      </div>

      {event.description && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{event.description}</p>
          </CardContent>
        </Card>
      )}

      {event.effects && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Effects</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{event.effects}</p>
          </CardContent>
        </Card>
      )}

      {event.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {event.tags.map((tag) => (
            <Badge key={tag} variant="secondary">{tag}</Badge>
          ))}
        </div>
      )}

      {/* Edit Sheet */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
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
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
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
                  <SelectTrigger id="edit-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {POI_EVENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
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
                  <SelectTrigger id="edit-poi"><SelectValue placeholder="Select POI" /></SelectTrigger>
                  <SelectContent>
                    {pois.map((poi) => (
                      <SelectItem key={poi.id} value={poi.id}>{poi.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Trigger Date</Label>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <Label className="text-xs">Year</Label>
                  <Input
                    type="number"
                    value={editForm.year ?? ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, year: e.target.value ? parseInt(e.target.value) : null }))}
                    placeholder="Any"
                  />
                </div>
                <div>
                  <Label className="text-xs">Season</Label>
                  <Select
                    value={editForm.season}
                    onValueChange={(value) => setEditForm((f) => ({ ...f, season: value as Season }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SEASONS.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Day</Label>
                  <Input
                    type="number"
                    min="1"
                    value={editForm.day}
                    onChange={(e) => setEditForm((f) => ({ ...f, day: parseInt(e.target.value) || 1 }))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Watch</Label>
                  <Input
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
                <Label className="text-sm">Duration (watches)</Label>
                <Input
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
          </div>
          <SheetFooter>
            <div className="flex w-full gap-2">
              <Button variant="outline" onClick={() => setEditOpen(false)} className="mr-auto">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!editForm.name.trim() || !editForm.poiId}>
                Save
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Event"
        description="Are you sure you want to delete this event? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
