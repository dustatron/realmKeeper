import { useState } from 'react'
import { useContainer } from '~/ui/hooks/useContainer'
import { executeCreatePOI } from '@application/use-cases/CreatePOI'
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '~/components/ui/sheet'
import { TagInput } from '~/components/shared/TagInput'
import { POI_TYPES, type PoiType } from '@shared/constants'
import type { POI } from '@domain/entities/POI'

interface CreateChildSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  parentPoi: POI
}

export function CreateChildSheet({ open, onOpenChange, parentPoi }: CreateChildSheetProps) {
  const container = useContainer()
  const [form, setForm] = useState({
    name: '',
    description: '',
    type: 'building' as PoiType,
    subtypeLabel: '',
    floor: null as number | null,
    tags: [] as string[],
  })

  const reset = () => setForm({ name: '', description: '', type: 'building', subtypeLabel: '', floor: null, tags: [] })

  const handleCreate = async () => {
    if (!form.name.trim()) return
    await executeCreatePOI(
      {
        name: form.name,
        description: form.description,
        type: form.type,
        regionId: parentPoi.regionId,
        parentPoiId: parentPoi.id,
        subtypeLabel: form.subtypeLabel || null,
        floor: form.floor,
        tags: form.tags,
      },
      { poiRepo: container.poiRepo }
    )
    reset()
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o) }}>
      <SheetContent side="right" className="sm:max-w-lg overflow-y-auto p-6">
        <SheetHeader>
          <SheetTitle>Add Child Location</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="child-name">Name *</Label>
            <Input
              id="child-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Name of the location"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="child-description">Description</Label>
            <Textarea
              id="child-description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Describe this location..."
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="child-type">Type</Label>
              <Select
                value={form.type}
                onValueChange={(value) => setForm((f) => ({ ...f, type: value as PoiType }))}
              >
                <SelectTrigger id="child-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {POI_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="child-subtype">Subtype Label</Label>
              <Input
                id="child-subtype"
                value={form.subtypeLabel}
                onChange={(e) => setForm((f) => ({ ...f, subtypeLabel: e.target.value }))}
                placeholder="e.g., Tavern, Tower"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="child-floor">Floor (Optional)</Label>
            <Input
              id="child-floor"
              type="number"
              value={form.floor ?? ''}
              onChange={(e) => {
                const val = e.target.value
                setForm((f) => ({ ...f, floor: val ? parseInt(val, 10) : null }))
              }}
              placeholder="e.g., 1, 2, -1"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Tags</Label>
            <TagInput
              tags={form.tags}
              onChange={(tags) => setForm((f) => ({ ...f, tags }))}
            />
          </div>
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false) }}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!form.name.trim()}>Create</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
