import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { markdownOptions } from '~/shared/markdown'
import { Button } from '~/components/ui/button'
import { Textarea } from '~/components/ui/textarea'
import { Pencil, Eye } from 'lucide-react'

interface MarkdownFieldProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minRows?: number
  readOnly?: boolean
}

export function MarkdownField({ value, onChange, placeholder, minRows = 4, readOnly }: MarkdownFieldProps) {
  const [editing, setEditing] = useState(false)

  if (readOnly || !editing) {
    return (
      <div className="group relative">
        <div className="prose prose-sm prose-invert max-w-none min-h-[2rem]">
          {value ? (
            <ReactMarkdown {...markdownOptions}>{value}</ReactMarkdown>
          ) : (
            <p className="text-muted-foreground italic">{placeholder || 'No content'}</p>
          )}
        </div>
        {!readOnly && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-0 right-0 size-7 opacity-0 group-hover:opacity-100"
            onClick={() => setEditing(true)}
          >
            <Pencil className="size-3.5" />
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={minRows}
        autoFocus
      />
      <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
        <Eye className="mr-1 size-3.5" />
        Preview
      </Button>
    </div>
  )
}
