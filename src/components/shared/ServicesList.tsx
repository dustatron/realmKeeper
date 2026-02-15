import { useState } from 'react'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Plus, X } from 'lucide-react'
import type { Service } from '@domain/value-objects/Service'

interface ServicesListProps {
  services: Service[]
  editable?: boolean
  onChange?: (services: Service[]) => void
}

export function ServicesList({ services, editable, onChange }: ServicesListProps) {
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCost, setNewCost] = useState('')

  const handleAdd = () => {
    if (!newName.trim() || !onChange) return
    onChange([...services, { name: newName.trim(), cost: newCost.trim() }])
    setNewName('')
    setNewCost('')
    setAdding(false)
  }

  const handleRemove = (idx: number) => {
    if (!onChange) return
    onChange(services.filter((_, i) => i !== idx))
  }

  if (services.length === 0 && !editable) return null

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {services.map((s, i) => (
          <Badge key={i} variant="outline" className="text-xs gap-1">
            {s.name}{s.cost ? ` (${s.cost})` : ''}
            {editable && (
              <button onClick={() => handleRemove(i)} className="ml-0.5 hover:text-destructive">
                <X className="size-3" />
              </button>
            )}
          </Badge>
        ))}
      </div>
      {editable && (
        adding ? (
          <div className="flex items-center gap-2 mt-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Service name"
              className="h-8 text-sm"
            />
            <Input
              value={newCost}
              onChange={(e) => setNewCost(e.target.value)}
              placeholder="Cost"
              className="h-8 text-sm w-28"
            />
            <Button size="sm" onClick={handleAdd} disabled={!newName.trim()}>Add</Button>
            <Button size="sm" variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        ) : (
          <Button size="sm" variant="outline" className="mt-2" onClick={() => setAdding(true)}>
            <Plus className="mr-1.5 size-3.5" />
            Add Service
          </Button>
        )
      )}
    </div>
  )
}
