import { useState } from 'react'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Textarea } from '~/components/ui/textarea'
import { ScrollText, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { newId } from '@shared/ulid'
import type { SessionLogEntry } from '@domain/value-objects/SessionLogEntry'

interface SessionLogProps {
  log: SessionLogEntry[]
  onUpdate: (log: SessionLogEntry[]) => void
}

function relativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function SessionLog({ log, onUpdate }: SessionLogProps) {
  const [expanded, setExpanded] = useState(log.length > 0)
  const [adding, setAdding] = useState(false)
  const [text, setText] = useState('')

  const handleAdd = () => {
    if (!text.trim()) return
    const entry: SessionLogEntry = {
      id: newId(),
      text: text.trim(),
      timestamp: Date.now(),
    }
    onUpdate([entry, ...log])
    setText('')
    setAdding(false)
  }

  const handleDelete = (id: string) => {
    onUpdate(log.filter((e) => e.id !== id))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm font-semibold flex items-center gap-2 hover:text-foreground/80"
        >
          {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          <ScrollText className="size-4" />
          Session Log
          {log.length > 0 && (
            <Badge variant="secondary" className="text-xs">{log.length}</Badge>
          )}
        </button>
        {expanded && (
          <Button size="sm" variant="outline" onClick={() => setAdding(!adding)}>
            <Plus className="mr-1.5 size-3.5" />
            Add Note
          </Button>
        )}
      </div>

      {expanded && (
        <>
          {/* Add form */}
          {adding && (
            <div className="space-y-2 mb-3 p-3 rounded-lg border bg-muted/30">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="What happened in this room..."
                rows={2}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAdd()
                }}
              />
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Cmd+Enter to save</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setText('') }}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleAdd} disabled={!text.trim()}>
                    Save
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Log entries */}
          {log.length === 0 && !adding ? (
            <p className="text-sm text-muted-foreground">No session notes yet.</p>
          ) : (
            <div className="space-y-1.5">
              {log.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-2 px-3 py-2 rounded-md border text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <p className="whitespace-pre-wrap">{entry.text}</p>
                    <span className="text-xs text-muted-foreground">{relativeTime(entry.timestamp)}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="size-6 p-0 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(entry.id)}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
