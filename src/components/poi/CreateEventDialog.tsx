import { useState } from 'react'
import { useContainer } from '~/ui/hooks/useContainer'
import { executeCreatePOIEvent } from '@application/use-cases/CreatePOIEvent'
import { executeDeletePOIEvent } from '@application/use-cases/DeletePOIEvent'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '~/components/ui/dialog'
import { ConfirmDialog } from '~/components/shared/ConfirmDialog'
import { TagInput } from '~/components/shared/TagInput'
import { POI_EVENT_TYPES, SEASONS, type POIEventType, type Season } from '@shared/constants'
import type { POI } from '@domain/entities/POI'
import type { Region } from '@domain/entities/Region'

interface CreateEventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  poi: POI
  region: Region
  /** If set, shows a delete confirm for this event ID */
  deletingEventId: string | null
  onDeleteConfirmClose: () => void
}

export function CreateEventDialog({ open, onOpenChange, poi, region, deletingEventId, onDeleteConfirmClose }: CreateEventDialogProps) {
  const container = useContainer()
  const [form, setForm] = useState({
    name: '',
    description: '',
    type: 'festival' as POIEventType,
    season: 'spring' as Season,
    day: 1,
    year: null as number | null,
    watch: null as number | null,
    recurring: false,
    durationWatches: 1,
    effects: '',
    tags: [] as string[],
  })

  const reset = () => setForm({
    name: '', description: '', type: 'festival', season: 'spring',
    day: 1, year: null, watch: null, recurring: false, durationWatches: 1, effects: '', tags: [],
  })

  const handleCreate = async () => {
    if (!form.name.trim()) return
    await executeCreatePOIEvent(
      {
        poiId: poi.id,
        worldId: region.worldId,
        name: form.name,
        description: form.description,
        type: form.type,
        trigger: { year: form.recurring ? null : form.year, season: form.season, day: form.day, watch: form.watch },
        recurring: form.recurring,
        durationWatches: form.durationWatches,
        effects: form.effects,
        tags: form.tags,
      },
      { poiEventRepo: container.poiEventRepo }
    )
    reset()
    onOpenChange(false)
  }

  const handleDeleteEvent = async () => {
    if (!deletingEventId) return
    await executeDeletePOIEvent(deletingEventId, { poiEventRepo: container.poiEventRepo })
    onDeleteConfirmClose()
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o) }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="event-name">Name *</Label>
              <Input id="event-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Event name" />
            </div>
            <div>
              <Label htmlFor="event-description">Description</Label>
              <Textarea id="event-description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="What happens..." rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="event-type">Event Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as POIEventType }))}>
                  <SelectTrigger id="event-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {POI_EVENT_TYPES.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="event-season">Season</Label>
                <Select value={form.season} onValueChange={(v) => setForm((f) => ({ ...f, season: v as Season }))}>
                  <SelectTrigger id="event-season"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEASONS.map((s) => (<SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="event-day">Day</Label>
                <Input id="event-day" type="number" min="1" value={form.day} onChange={(e) => setForm((f) => ({ ...f, day: parseInt(e.target.value) || 1 }))} />
              </div>
              <div>
                <Label htmlFor="event-year">Year</Label>
                <Input id="event-year" type="number" min="1" value={form.year ?? ''} onChange={(e) => { const v = e.target.value; setForm((f) => ({ ...f, year: v ? parseInt(v) : null })) }} placeholder="Any" />
              </div>
              <div>
                <Label htmlFor="event-watch">Watch</Label>
                <Input id="event-watch" type="number" min="1" value={form.watch ?? ''} onChange={(e) => { const v = e.target.value; setForm((f) => ({ ...f, watch: v ? parseInt(v) : null })) }} placeholder="All day" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="event-duration">Duration (watches)</Label>
                <Input id="event-duration" type="number" min="1" value={form.durationWatches} onChange={(e) => setForm((f) => ({ ...f, durationWatches: parseInt(e.target.value) || 1 }))} />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.recurring} onChange={(e) => setForm((f) => ({ ...f, recurring: e.target.checked }))} className="rounded" />
                  Recurring
                </label>
              </div>
            </div>
            <div>
              <Label htmlFor="event-effects">Effects / GM Notes</Label>
              <Textarea id="event-effects" value={form.effects} onChange={(e) => setForm((f) => ({ ...f, effects: e.target.value }))} placeholder="Mechanical effects, NPC reactions..." rows={2} />
            </div>
            <div>
              <Label>Tags</Label>
              <TagInput tags={form.tags} onChange={(tags) => setForm((f) => ({ ...f, tags }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { reset(); onOpenChange(false) }}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.name.trim()}>Create Event</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deletingEventId !== null}
        onOpenChange={(open) => !open && onDeleteConfirmClose()}
        title="Delete Event"
        description="Are you sure you want to delete this event?"
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDeleteEvent}
      />
    </>
  )
}
