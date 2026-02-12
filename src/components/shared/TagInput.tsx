import { useState } from 'react'
import { X } from 'lucide-react'
import { Badge } from '~/components/ui/badge'
import { Input } from '~/components/ui/input'

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}

export function TagInput({ tags, onChange, placeholder = 'Add tag...' }: TagInputProps) {
  const [input, setInput] = useState('')

  const addTag = () => {
    const tag = input.trim().toLowerCase()
    if (tag && !tags.includes(tag)) {
      onChange([...tags, tag])
    }
    setInput('')
  }

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag))
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1">
            {tag}
            <button onClick={() => removeTag(tag)} className="hover:text-destructive">
              <X className="size-3" />
            </button>
          </Badge>
        ))}
      </div>
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); addTag() }
          if (e.key === 'Backspace' && !input && tags.length) {
            removeTag(tags[tags.length - 1])
          }
        }}
        placeholder={placeholder}
      />
    </div>
  )
}
