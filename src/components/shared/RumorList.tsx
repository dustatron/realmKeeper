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
import { Plus, Trash2, Check, Lock } from 'lucide-react'
import { HookLinkChip, type HookReveal, type HookLink } from '~/components/shared/HookLinkChip'
import { EntityLinkPicker } from '~/components/shared/EntityLinkPicker'
import type { Rumor } from '@domain/entities/Rumor'
import type { EntityLink } from '@domain/value-objects/EntityLink'

type Reliability = NonNullable<Rumor['reliability']>

const RELIABILITY_CYCLE: (Reliability | undefined)[] = [undefined, 'true', 'uncertain', 'false']

const RELIABILITY_META: Record<Reliability, { label: string; cls: string }> = {
  true: { label: 'likely true', cls: 'bg-green-600/15 text-green-600 border-green-600/40' },
  uncertain: { label: 'uncertain', cls: 'bg-amber-600/15 text-amber-600 border-amber-600/40' },
  false: { label: 'false lead', cls: 'bg-red-600/15 text-red-600 border-red-600/40' },
}

interface RumorListProps {
  rumors: Rumor[]
  onToggleUsed: (rumor: Rumor) => void
  onCreate: (input: { text: string; source: string; isQuestHook: boolean; links: EntityLink[] }) => void
  onDelete: (id: string) => void
  onUpdate?: (rumor: Rumor) => void
  resolveTarget?: (hookId: string) => HookReveal | null
  /** All POIs/NPCs available to link, for the picker and for resolving stored links. */
  linkOptions?: HookLink[]
}

const EMPTY_FORM = { text: '', source: '', isQuestHook: false, links: [] as EntityLink[] }

export function RumorList({ rumors, onToggleUsed, onCreate, onDelete, onUpdate, resolveTarget, linkOptions = [] }: RumorListProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const linkNameById = new Map(linkOptions.map((o) => [o.id, o]))

  const handleCreate = () => {
    if (!form.text.trim()) return
    onCreate(form)
    setForm(EMPTY_FORM)
    setDialogOpen(false)
  }

  const cycleReliability = (rumor: Rumor) => {
    if (!onUpdate) return
    const idx = RELIABILITY_CYCLE.indexOf(rumor.reliability)
    const next = RELIABILITY_CYCLE[(idx + 1) % RELIABILITY_CYCLE.length]
    onUpdate({ ...rumor, reliability: next })
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
          {rumors.map((rumor) => {
            const rel = rumor.reliability ? RELIABILITY_META[rumor.reliability] : null
            const reveal = rumor.hookId ? resolveTarget?.(rumor.hookId) : null
            return (
              <div
                key={rumor.id}
                className="flex items-start gap-2 rounded-md border p-2"
              >
                <button
                  type="button"
                  onClick={() => onToggleUsed(rumor)}
                  title={rumor.isUsed ? 'Mark as not yet shared' : 'Mark as shared with players'}
                  className={`mt-0.5 size-7 shrink-0 rounded-md border flex items-center justify-center transition-colors ${
                    rumor.isUsed
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'border-input hover:bg-muted'
                  }`}
                >
                  {rumor.isUsed && <Check className="size-4" />}
                </button>
                <div className="flex-1 min-w-0">
                  <span className={`text-sm ${rumor.isUsed ? 'line-through text-muted-foreground' : ''}`}>
                    {rumor.text}
                  </span>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {rumor.source && (
                      <span className="text-xs text-muted-foreground">&mdash; {rumor.source}</span>
                    )}
                    {rumor.isQuestHook && (
                      <Badge className="text-xs bg-indigo-600 hover:bg-indigo-600">Quest</Badge>
                    )}
                    {onUpdate ? (
                      <button type="button" onClick={() => cycleReliability(rumor)} title="GM: cycle reliability">
                        <Badge
                          variant="outline"
                          className={`text-xs cursor-pointer ${rel ? rel.cls : 'text-muted-foreground border-dashed'}`}
                        >
                          {rel ? rel.label : 'unverified'}
                        </Badge>
                      </button>
                    ) : (
                      rel && <Badge variant="outline" className={`text-xs ${rel.cls}`}>{rel.label}</Badge>
                    )}
                  </div>
                  {reveal && (
                    <div className="mt-1.5 rounded border border-dashed border-border bg-muted/40 px-2 py-1 text-xs text-muted-foreground">
                      <div className="flex items-start gap-1.5">
                        <Lock className="size-3 mt-0.5 shrink-0" />
                        <span>
                          <span className="font-semibold uppercase tracking-wide text-[10px] mr-1">GM only</span>
                          Points to {reveal.detail}
                        </span>
                      </div>
                      {reveal.links.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5 pl-[1.125rem]">
                          {reveal.links.map((link) => (
                            <HookLinkChip key={link.id} link={link} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {rumor.links && rumor.links.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 mt-1.5">
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground mr-0.5">Linked</span>
                      {rumor.links.map((link) => {
                        const opt = linkNameById.get(link.id)
                        if (!opt) return null
                        return <HookLinkChip key={link.id} link={opt} />
                      })}
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-8 p-0 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => onDelete(rumor.id)}
                  title="Delete rumor"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            )
          })}
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
            <div>
              <Label>Links</Label>
              <p className="text-xs text-muted-foreground mb-1.5">Connect this rumor to locations or NPCs.</p>
              <EntityLinkPicker
                options={linkOptions}
                value={form.links}
                onChange={(links) => setForm((f) => ({ ...f, links }))}
              />
            </div>
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
