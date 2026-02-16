import { useState, useMemo } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '~/components/ui/sheet'
import { Input } from '~/components/ui/input'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Search, Plus } from 'lucide-react'
import type { NPC } from '@domain/entities/NPC'

interface NPCSearchDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  allNPCs: NPC[]
  excludeNpcIds: string[]
  onSelect: (npcId: string) => void
}

export function NPCSearchDrawer({
  open,
  onOpenChange,
  allNPCs,
  excludeNpcIds,
  onSelect,
}: NPCSearchDrawerProps) {
  const [query, setQuery] = useState('')

  const excludeSet = useMemo(() => new Set(excludeNpcIds), [excludeNpcIds])

  const filtered = useMemo(() => {
    const available = allNPCs.filter((n) => !excludeSet.has(n.id))
    if (!query.trim()) return available.slice(0, 30)
    const q = query.toLowerCase()
    return available
      .filter(
        (n) =>
          n.name.toLowerCase().includes(q) ||
          n.description.toLowerCase().includes(q) ||
          n.tags.some((t) => t.toLowerCase().includes(q))
      )
      .slice(0, 30)
  }, [allNPCs, excludeSet, query])

  const handleSelect = (npcId: string) => {
    onSelect(npcId)
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setQuery('') }}>
      <SheetContent className="sm:max-w-md overflow-y-auto p-6">
        <SheetHeader>
          <SheetTitle>Link Existing NPC</SheetTitle>
        </SheetHeader>
        <div className="space-y-3 mt-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, description, or tag..."
              className="pl-9"
              autoFocus
            />
          </div>
          {filtered.length > 0 ? (
            <div className="space-y-1">
              {filtered.map((npc) => (
                <button
                  key={npc.id}
                  onClick={() => handleSelect(npc.id)}
                  className="w-full text-left rounded-md border p-2.5 hover:bg-accent transition-colors flex items-center gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{npc.name}</span>
                      {npc.lifeStatus === 'dead' && (
                        <Badge variant="destructive" className="text-xs">dead</Badge>
                      )}
                    </div>
                    {npc.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{npc.description}</p>
                    )}
                    {npc.tags.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {npc.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <Plus className="size-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              {query ? 'No matching NPCs found.' : 'No unlinked NPCs available.'}
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
