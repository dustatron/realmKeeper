interface ReadAloudBlockProps {
  text: string
}

export function ReadAloudBlock({ text }: ReadAloudBlockProps) {
  if (!text) return null

  return (
    <div className="rounded-md border-l-4 border-amber-500 bg-amber-500/5 p-3">
      <p className="text-sm italic leading-relaxed whitespace-pre-wrap">{text}</p>
    </div>
  )
}
