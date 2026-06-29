import { useState } from 'react'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'
import { Label } from '~/components/ui/label'
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
import { Plus, Trash2, Check, Lock } from 'lucide-react'
import { HookLinkChip, type HookReveal, type HookLink } from '~/components/shared/HookLinkChip'
import { EntityLinkPicker } from '~/components/shared/EntityLinkPicker'
import { NOTICE_TYPES, type NoticeType } from '@shared/constants'
import type { Notice } from '@domain/entities/Notice'
import type { EntityLink } from '@domain/value-objects/EntityLink'

const NOTICE_TYPE_COLORS: Record<NoticeType, string> = {
  bounty: 'bg-red-600 hover:bg-red-600',
  job: 'bg-blue-600 hover:bg-blue-600',
  warning: 'bg-amber-600 hover:bg-amber-600',
  announcement: 'bg-green-600 hover:bg-green-600',
  request: 'bg-purple-600 hover:bg-purple-600',
}

interface NoticeBoardProps {
  notices: Notice[]
  onToggleUsed: (notice: Notice) => void
  onCreate: (input: { title: string; description: string; type: NoticeType; reward: string; links: EntityLink[] }) => void
  onDelete: (id: string) => void
  resolveTarget?: (hookId: string) => HookReveal | null
  /** All POIs/NPCs available to link, for the picker and for resolving stored links. */
  linkOptions?: HookLink[]
}

const EMPTY_FORM = {
  title: '',
  description: '',
  type: 'job' as NoticeType,
  reward: '',
  links: [] as EntityLink[],
}

export function NoticeBoard({ notices, onToggleUsed, onCreate, onDelete, resolveTarget, linkOptions = [] }: NoticeBoardProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const linkNameById = new Map(linkOptions.map((o) => [o.id, o]))

  const handleCreate = () => {
    if (!form.title.trim()) return
    onCreate(form)
    setForm(EMPTY_FORM)
    setDialogOpen(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold">Notice Board ({notices.length})</h4>
        <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1.5 size-3.5" />
          Add
        </Button>
      </div>

      {notices.length > 0 ? (
        <div className="space-y-1">
          {notices.map((notice) => (
            <div
              key={notice.id}
              className="flex items-start gap-2 rounded-md border p-2"
            >
              <button
                type="button"
                onClick={() => onToggleUsed(notice)}
                title={notice.isUsed ? 'Mark as not yet shared' : 'Mark as shared with players'}
                className={`mt-0.5 size-7 shrink-0 rounded-md border flex items-center justify-center transition-colors ${
                  notice.isUsed
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'border-input hover:bg-muted'
                }`}
              >
                {notice.isUsed && <Check className="size-4" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <Badge className={`text-xs text-white ${NOTICE_TYPE_COLORS[notice.type]}`}>
                    {notice.type.toUpperCase()}
                  </Badge>
                  <span className={`text-sm font-medium ${notice.isUsed ? 'line-through text-muted-foreground' : ''}`}>
                    {notice.title}
                  </span>
                </div>
                {notice.description && (
                  <p className={`text-xs mt-0.5 ${notice.isUsed ? 'line-through text-muted-foreground' : 'text-muted-foreground'}`}>
                    {notice.description}
                  </p>
                )}
                {notice.reward && (
                  <p className="text-xs text-amber-600 mt-0.5">Reward: {notice.reward}</p>
                )}
                {(() => {
                  const reveal = notice.hookId ? resolveTarget?.(notice.hookId) : null
                  if (!reveal) return null
                  return (
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
                  )
                })()}
                {notice.links && notice.links.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 mt-1.5">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground mr-0.5">Linked</span>
                    {notice.links.map((link) => {
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
                onClick={() => onDelete(notice.id)}
                title="Delete notice"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No notices posted.</p>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Post Notice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="notice-title">Title *</Label>
              <Input
                id="notice-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="WANTED: Bandit Leader"
              />
            </div>
            <div>
              <Label htmlFor="notice-type">Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm((f) => ({ ...f, type: v as NoticeType }))}
              >
                <SelectTrigger id="notice-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NOTICE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="notice-desc">Description</Label>
              <Textarea
                id="notice-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Details..."
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="notice-reward">Reward</Label>
              <Input
                id="notice-reward"
                value={form.reward}
                onChange={(e) => setForm((f) => ({ ...f, reward: e.target.value }))}
                placeholder="99 gp, A magic item..."
              />
            </div>
            <div>
              <Label>Links</Label>
              <p className="text-xs text-muted-foreground mb-1.5">Connect this notice to locations or NPCs.</p>
              <EntityLinkPicker
                options={linkOptions}
                value={form.links}
                onChange={(links) => setForm((f) => ({ ...f, links }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.title.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
