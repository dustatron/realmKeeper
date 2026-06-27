import type { RuinArea } from '@domain/entities/RuinSite'
import type { NPC } from '@domain/entities/NPC'
import type { TreasureItem } from '@domain/value-objects/TreasureItem'
import { areaView } from './ruinAreas'

export function RuinAreasSection({
  areas,
  npcs,
  treasure,
}: {
  areas: RuinArea[]
  npcs: NPC[]
  treasure: TreasureItem[]
}) {
  const sorted = [...areas].sort((a, b) => a.order - b.order)

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Areas</h3>
      {sorted.map((area) => {
        const view = areaView(area, npcs, treasure)
        return (
          <div key={area.order} className="rounded-md border p-3 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{view.name}</span>
              {view.isEntry && (
                <span className="text-xs text-muted-foreground">(entry)</span>
              )}
            </div>
            {view.readAloud && (
              <p className="text-sm italic text-foreground leading-snug">{view.readAloud}</p>
            )}
            {view.detail && (
              <p className="text-xs text-muted-foreground">{view.detail}</p>
            )}
            {view.discovery && (
              <p className="text-xs text-foreground">🔍 {view.discovery}</p>
            )}
            {view.occupantNames.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Occupants: {view.occupantNames.join(', ')}
                {view.activity ? ` — ${view.activity}` : ''}
              </p>
            )}
            {view.loot.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Loot: {view.loot.map((t) => t.name + (t.notable ? ' ★' : '')).join(', ')}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
