import type { RuinSite } from '@domain/entities/RuinSite'

export function RuinLoreBlock({ site }: { site: RuinSite }) {
  return (
    <div className="space-y-2 rounded-md border bg-muted/30 p-3">
      <div className="flex items-center gap-2">
        <span className="text-xs">🏚</span>
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ruin Lore</span>
      </div>
      <p className="text-sm italic text-foreground">{site.origin} {site.fall}</p>
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span>Built by: <span className="font-medium capitalize text-foreground">{site.builderCulture}</span></span>
        <span>Era: <span className="font-medium text-foreground">{site.era}</span></span>
        <span>State: <span className="font-medium capitalize text-foreground">{site.currentState.replace(/-/g, ' ')}</span></span>
      </div>
      {site.hook && (
        <p className="border-t border-border pt-1 text-sm text-foreground">
          Hook: <span className="italic">{site.hook}</span>
        </p>
      )}
    </div>
  )
}
