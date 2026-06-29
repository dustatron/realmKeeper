import { useState, useMemo } from 'react'
import { Button } from '~/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover'
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '~/components/ui/command'
import { MapPin, User, Plus, X } from 'lucide-react'
import type { EntityLink } from '@domain/value-objects/EntityLink'
import type { HookLink } from '~/components/shared/HookLinkChip'

interface EntityLinkPickerProps {
  /** All POIs/NPCs available to link, as {type, id, name}. */
  options: HookLink[]
  value: EntityLink[]
  onChange: (value: EntityLink[]) => void
}

export function EntityLinkPicker({ options, value, onChange }: EntityLinkPickerProps) {
  const [open, setOpen] = useState(false)

  const optionById = useMemo(() => new Map(options.map((o) => [o.id, o])), [options])
  const selectedIds = useMemo(() => new Set(value.map((v) => v.id)), [value])

  const available = useMemo(
    () => options.filter((o) => !selectedIds.has(o.id)),
    [options, selectedIds],
  )
  const pois = available.filter((o) => o.type === 'poi')
  const npcs = available.filter((o) => o.type === 'npc')

  const add = (opt: HookLink) => {
    onChange([...value, { type: opt.type, id: opt.id }])
    setOpen(false)
  }
  const remove = (id: string) => onChange(value.filter((v) => v.id !== id))

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {value.map((link) => {
        const opt = optionById.get(link.id)
        const Icon = link.type === 'poi' ? MapPin : User
        return (
          <span
            key={link.id}
            className="inline-flex items-center gap-1 rounded border bg-muted/50 pl-1.5 pr-0.5 py-0.5 text-xs"
          >
            <Icon className="size-3 shrink-0 text-muted-foreground" />
            {opt?.name ?? 'Unknown'}
            <button
              type="button"
              onClick={() => remove(link.id)}
              className="rounded p-0.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              title="Remove link"
            >
              <X className="size-3" />
            </button>
          </span>
        )
      })}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs">
            <Plus className="size-3.5" />
            Add link
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <Command>
            <CommandInput placeholder="Search locations & NPCs…" />
            <CommandList>
              <CommandEmpty>Nothing to link.</CommandEmpty>
              {pois.length > 0 && (
                <CommandGroup heading="Locations">
                  {pois.map((opt) => (
                    <CommandItem key={opt.id} value={`poi ${opt.name}`} onSelect={() => add(opt)}>
                      <MapPin className="size-3.5 text-muted-foreground" />
                      {opt.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {npcs.length > 0 && (
                <CommandGroup heading="NPCs">
                  {npcs.map((opt) => (
                    <CommandItem key={opt.id} value={`npc ${opt.name}`} onSelect={() => add(opt)}>
                      <User className="size-3.5 text-muted-foreground" />
                      {opt.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
