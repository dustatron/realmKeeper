import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { Button } from '~/components/ui/button'

interface ReadAloudBlockProps {
  text: string
}

export function ReadAloudBlock({ text }: ReadAloudBlockProps) {
  const [copied, setCopied] = useState(false)

  if (!text) return null

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative rounded-md border-l-4 border-amber-500 bg-amber-500/5 p-3 group">
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-1.5 right-1.5 size-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleCopy}
        title="Copy read-aloud text"
      >
        {copied ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
      </Button>
      <p className="text-sm italic leading-relaxed whitespace-pre-wrap pr-8">{text}</p>
    </div>
  )
}
