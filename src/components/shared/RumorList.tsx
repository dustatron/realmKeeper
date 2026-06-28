import { useState } from 'react'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'
import { Label } from '~/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '~/components/ui/dialog'
import { Plus, Trash2 } from 'lucide-react'
import type { Rumor } from '@domain/entities/Rumor'

interface RumorListProps {
  rumors: Rumor[]
  onToggleUsed: (rumor: Rumor) => void
  onCreate: (input: { text: string; source: string; isQuestHook: boolean }) => void
  onDelete: (id: string) => void
  resolveTarget?: (hookId: string) => string | null
}

export function RumorList({ rumors, onToggleUsed, onCreate, onDelete, resolveTarget }: RumorListProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ text: '', source: '', isQuestHook: false })

  const handleCreate = () => {
    if (!form.text.trim()) return
    onCreate(form)
    setForm({ text: '', source: '', isQuestHook: false })
    setDialogOpen(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold">Rumors ({rumors.length})</h4>
        <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1.5 size-3.5" />
          Add
        </Button>
      </div>

      {rumors.length > 0 ? (
        <div className="space-y-1">
          {rumors.map((rumor, i) => (
            <div
              key={rumor.id}
              className="flex items-start gap-2 rounded-md border p-2 group"
            >
              <input
                type="checkbox"
                checked={rumor.isUsed}
                onChange={() => onToggleUsed(rumor)}
                className="mt-1 rounded"
              />
              <div className="flex-1 min-w-0">
                <span className={`text-sm ${rumor.isUsed ? 'line-through text-muted-foreground' : ''}`}>
                  <span className="text-muted-foreground mr-1">{i + 1}.</span>
                  {rumor.text}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {rumor.source && (
                    <span className="text-xs text-muted-foreground">&mdash; {rumor.source}</span>
                  )}
                  {rumor.isQuestHook && (
                    <Badge className="text-xs bg-amber-600 hover:bg-amber-600">Quest</Badge>
                  )}
                </div>
                {rumor.hookId && resolveTarget?.(rumor.hookId) && (
                  <p className="text-xs text-muted-foreground">🔑 Points to: {resolveTarget(rumor.hookId)}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="size-7 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(rumor.id)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No rumors yet.</p>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Rumor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rumor-text">Rumor *</Label>
              <Textarea
                id="rumor-text"
                value={form.text}
                onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
                placeholder="What have you heard..."
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="rumor-source">Source</Label>
              <Input
                id="rumor-source"
                value={form.source}
                onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
                placeholder="tavern talk, suspicious stranger..."
              />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.isQuestHook}
                onChange={(e) => setForm((f) => ({ ...f, isQuestHook: e.target.checked }))}
                className="rounded"
              />
              Quest Hook
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.text.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
