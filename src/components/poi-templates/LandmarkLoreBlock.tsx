import type { LandmarkLore } from '@domain/entities/LandmarkLore'

function Row({ label, text }: { label: string; text: string }) {
  if (!text) return null
  return (
    <p className="text-sm">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}: </span>
      {text}
    </p>
  )
}

export function LandmarkLoreBlock({ lore }: { lore: LandmarkLore }) {
  return (
    <div className="space-y-2 rounded-md border bg-muted/30 p-3">
      <div className="flex items-center gap-2">
        <span className="text-xs">✨</span>
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Landmark Lore</span>
      </div>
      {lore.sensory && (
        <p className="text-sm italic text-muted-foreground">{lore.sensory}</p>
      )}
      <Row label="Legend" text={lore.legend} />
      <Row label="Truth" text={lore.truth} />
      <Row label="Interaction" text={`${lore.interactionTrigger} ${lore.interactionEffect}`} />
      <Row label="Secret" text={lore.secret} />
      <Row label="Quest" text={lore.questHook} />
    </div>
  )
}
