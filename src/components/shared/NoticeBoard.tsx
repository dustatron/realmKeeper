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
import { Plus, Trash2 } from 'lucide-react'
import { NOTICE_TYPES, type NoticeType } from '@shared/constants'
import type { Notice } from '@domain/entities/Notice'

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
  onCreate: (input: { title: string; description: string; type: NoticeType; reward: string }) => void
  onDelete: (id: string) => void
  resolveTarget?: (hookId: string) => string | null
}

export function NoticeBoard({ notices, onToggleUsed, onCreate, onDelete, resolveTarget }: NoticeBoardProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'job' as NoticeType,
    reward: '',
  })

  const handleCreate = () => {
    if (!form.title.trim()) return
    onCreate(form)
    setForm({ title: '', description: '', type: 'job', reward: '' })
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
              className="flex items-start gap-2 rounded-md border p-2 group"
            >
              <input
                type="checkbox"
                checked={notice.isUsed}
                onChange={() => onToggleUsed(notice)}
                className="mt-1 rounded"
              />
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
                {notice.hookId && resolveTarget?.(notice.hookId) && (
                  <p className="text-xs text-muted-foreground">🔑 Points to: {resolveTarget(notice.hookId)}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="size-7 p-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(notice.id)}
              >
                <Trash2 className="size-3.5" />
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
