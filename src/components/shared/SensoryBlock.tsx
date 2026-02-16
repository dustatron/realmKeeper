interface SensoryBlockProps {
  text: string
}

export function SensoryBlock({ text }: SensoryBlockProps) {
  if (!text) return null

  return (
    <div className="rounded-md border-l-4 border-teal-500 bg-teal-500/5 p-3">
      <p className="text-xs font-medium text-teal-600 dark:text-teal-400 mb-1">Sights, Sounds & Smells</p>
      <p className="text-sm leading-relaxed">{text}</p>
    </div>
  )
}
