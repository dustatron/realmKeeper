import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { usePOI, useRealmPOIs } from '~/ui/hooks/usePOIs'
import { useRegions } from '~/ui/hooks/useRegions'
import { useActiveRealm } from '~/ui/hooks/useActiveRealm'
import { useContainer } from '~/ui/hooks/useContainer'
import { executeUpdatePOI } from '@application/use-cases/UpdatePOI'
import { executeDeletePOI } from '@application/use-cases/DeletePOI'
import { ConfirmDialog } from '~/components/shared/ConfirmDialog'
import { ImagePicker } from '~/components/shared/ImagePicker'
import { ServicesList } from '~/components/shared/ServicesList'
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
import { ArrowLeft, Trash2 } from 'lucide-react'
import { POI_TYPES, type PoiType } from '@shared/constants'
import type { Service } from '@domain/value-objects/Service'

export const Route = createFileRoute('/_app/realms/pois_/$poiId_/edit')({
  component: POIEditPage,
})

function POIEditPage() {
  const { poiId } = Route.useParams()
  const navigate = useNavigate()
  const poi = usePOI(poiId)
  const realm = useActiveRealm()
  const regions = useRegions(realm?.id ?? null)
  const allPois = useRealmPOIs(realm?.id ?? null)
  const container = useContainer()

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [form, setForm] = useState<{
    name: string
    description: string
    type: PoiType
    regionId: string
    parentPoiId: string | null
    subtypeLabel: string
    floor: number | null
    tags: string[]
    readAloud: string
    gmNotes: string
    trouble: string
    mood: string
    sensory: string
    services: Service[]
    imageUrl: string | null
    roomWidth: number | null
    roomLength: number | null
  } | null>(null)

  // Initialize form from POI on first load
  if (poi && !form) {
    // Using a direct set — runs once when poi loads
    const initial = {
      name: poi.name,
      description: poi.description,
      type: poi.type,
      regionId: poi.regionId,
      parentPoiId: poi.parentPoiId,
      subtypeLabel: poi.subtypeLabel ?? '',
      floor: poi.floor,
      tags: poi.tags,
      readAloud: poi.readAloud,
      gmNotes: poi.gmNotes,
      trouble: poi.trouble,
      mood: poi.mood,
      sensory: poi.sensory,
      services: poi.services,
      imageUrl: poi.imageUrl,
      roomWidth: poi.roomWidth ?? null,
      roomLength: poi.roomLength ?? null,
    }
    setForm(initial)
  }

  const handleSave = async () => {
    if (!poi || !form || !form.name.trim()) return
    await executeUpdatePOI(
      {
        ...poi,
        name: form.name,
        description: form.description,
        type: form.type,
        regionId: form.regionId,
        parentPoiId: form.parentPoiId,
        subtypeLabel: form.subtypeLabel || null,
        floor: form.floor,
        tags: form.tags,
        readAloud: form.readAloud,
        gmNotes: form.gmNotes,
        trouble: form.trouble,
        mood: form.mood,
        sensory: form.sensory,
        services: form.services,
        imageUrl: form.imageUrl,
        roomWidth: form.roomWidth,
        roomLength: form.roomLength,
      },
      { poiRepo: container.poiRepo }
    )
    navigate({ to: '/realms/pois/$poiId', params: { poiId } })
  }

  const handleDelete = async () => {
    if (!poi) return
    await executeDeletePOI(poi.id, { poiRepo: container.poiRepo })
    setDeleteConfirmOpen(false)
    navigate({ to: '/realms/locations/pois' })
  }

  if (poi === undefined) {
    return <div className="py-8 text-center text-muted-foreground">Loading...</div>
  }

  if (poi === null) {
    return <div className="py-8 text-center text-muted-foreground">POI not found.</div>
  }

  if (!form) return null

  // Filter parent POI options: exclude self and own children
  const parentOptions = allPois.filter((p) => p.id !== poiId)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/realms/pois/$poiId', params: { poiId } })}>
          <ArrowLeft className="mr-1.5 size-4" />
          Back
        </Button>
        <span className="font-medium mr-auto">Edit POI</span>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setDeleteConfirmOpen(true)}
        >
          <Trash2 className="mr-2 size-4" />
          Delete
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate({ to: '/realms/pois/$poiId', params: { poiId } })}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleSave} disabled={!form.name.trim()}>
          Save
        </Button>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="edit-name">Name *</Label>
          <Input
            id="edit-name"
            value={form.name}
            onChange={(e) => setForm((f) => f && ({ ...f, name: e.target.value }))}
            placeholder="Name of the POI"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-description">Description</Label>
          <Textarea
            id="edit-description"
            value={form.description}
            onChange={(e) => setForm((f) => f && ({ ...f, description: e.target.value }))}
            placeholder="Describe this location..."
            rows={3}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Image</Label>
          <ImagePicker
            imageUrl={form.imageUrl}
            onImageChange={(url) => setForm((f) => f && ({ ...f, imageUrl: url }))}
          />
        </div>
        <div className="grid grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="edit-type">Type</Label>
            <Select
              value={form.type}
              onValueChange={(value) => setForm((f) => f && ({ ...f, type: value as PoiType }))}
            >
              <SelectTrigger id="edit-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                {POI_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-subtype">Subtype</Label>
            <Input
              id="edit-subtype"
              value={form.subtypeLabel}
              onChange={(e) => setForm((f) => f && ({ ...f, subtypeLabel: e.target.value }))}
              placeholder="e.g., Tavern, Tower"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-region">Region</Label>
            <Select
              value={form.regionId}
              onValueChange={(v) => setForm((f) => f && ({ ...f, regionId: v }))}
            >
              <SelectTrigger id="edit-region"><SelectValue /></SelectTrigger>
              <SelectContent>
                {regions.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-parent">Parent POI</Label>
            <Select
              value={form.parentPoiId ?? 'none'}
              onValueChange={(v) => setForm((f) => f && ({ ...f, parentPoiId: v === 'none' ? null : v }))}
            >
              <SelectTrigger id="edit-parent"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {parentOptions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-mood">Mood</Label>
            <Input
              id="edit-mood"
              value={form.mood}
              onChange={(e) => setForm((f) => f && ({ ...f, mood: e.target.value }))}
              placeholder="prosperous, fearful, lawless..."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-floor">Floor</Label>
            <Input
              id="edit-floor"
              type="number"
              value={form.floor ?? ''}
              onChange={(e) => {
                const val = e.target.value
                setForm((f) => f && ({ ...f, floor: val ? parseInt(val, 10) : null }))
              }}
              placeholder="e.g., 1, 2, -1"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-trouble">Trouble</Label>
            <Input
              id="edit-trouble"
              value={form.trouble}
              onChange={(e) => setForm((f) => f && ({ ...f, trouble: e.target.value }))}
              placeholder="Current tension or conflict..."
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-room-width">Room Width (ft)</Label>
            <Input
              id="edit-room-width"
              type="number"
              min="1"
              value={form.roomWidth ?? ''}
              onChange={(e) => {
                const val = e.target.value
                setForm((f) => f && ({ ...f, roomWidth: val ? parseInt(val, 10) : null }))
              }}
              placeholder="e.g., 30"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-room-length">Room Length (ft)</Label>
            <Input
              id="edit-room-length"
              type="number"
              min="1"
              value={form.roomLength ?? ''}
              onChange={(e) => {
                const val = e.target.value
                setForm((f) => f && ({ ...f, roomLength: val ? parseInt(val, 10) : null }))
              }}
              placeholder="e.g., 40"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-readaloud">Read Aloud</Label>
          <Textarea
            id="edit-readaloud"
            value={form.readAloud}
            onChange={(e) => setForm((f) => f && ({ ...f, readAloud: e.target.value }))}
            placeholder="Player-facing description to read aloud..."
            rows={3}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-sensory">Sensory Details</Label>
          <Input
            id="edit-sensory"
            value={form.sensory}
            onChange={(e) => setForm((f) => f && ({ ...f, sensory: e.target.value }))}
            placeholder="Sights, sounds, smells..."
          />
        </div>
        <div className="space-y-1.5">
          <Label>Services</Label>
          <ServicesList
            services={form.services}
            editable
            onChange={(services) => setForm((f) => f && ({ ...f, services }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Tags</Label>
          <TagInput
            tags={form.tags}
            onChange={(tags) => setForm((f) => f && ({ ...f, tags }))}
          />
        </div>
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete POI"
        description={`Are you sure you want to delete "${poi.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}
