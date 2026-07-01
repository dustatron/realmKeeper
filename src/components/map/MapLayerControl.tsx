import { Button } from '~/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover'
import {
  Waves,
  TrendingUp,
  Coins,
  Boxes,
  Gem,
  Check,
  Layers3,
} from 'lucide-react'
import type { MapLayerId } from './MapViewer'

interface LayerMeta {
  id: MapLayerId
  label: string
  icon: React.ComponentType<{ className?: string }>
}

// Order matches the visual stack from terrain up: water → economy → loot.
const LAYER_META: LayerMeta[] = [
  { id: 'rivers', label: 'Rivers & crossings', icon: Waves },
  { id: 'trade', label: 'Trade routes', icon: TrendingUp },
  { id: 'wealth', label: 'Settlement wealth', icon: Coins },
  { id: 'resources', label: 'Resources', icon: Boxes },
  { id: 'treasure', label: 'Treasure', icon: Gem },
]

interface MapLayerControlProps {
  layers: Record<MapLayerId, boolean>
  onChange: (layers: Record<MapLayerId, boolean>) => void
}

/**
 * A compact popover checklist that toggles the Phase-4 overlay layers
 * (rivers, trade, wealth, resources, treasure). Mirrors MapToolbar's button
 * styling; uses a check-button row per layer (no Checkbox primitive in the kit).
 */
export function MapLayerControl({ layers, onChange }: MapLayerControlProps) {
  const activeCount = LAYER_META.filter((m) => layers[m.id]).length
  const toggle = (id: MapLayerId) =>
    onChange({ ...layers, [id]: !layers[id] })

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          title="Toggle map layers"
          aria-label="Toggle map layers"
        >
          <Layers3 className="size-4" />
          {activeCount > 0 && (
            <span className="ml-1 text-xs tabular-nums">{activeCount}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-2">
        <div className="px-1 pb-1.5 text-xs font-semibold uppercase text-muted-foreground">
          Map layers
        </div>
        <div className="space-y-0.5">
          {LAYER_META.map((meta) => {
            const Icon = meta.icon
            const active = layers[meta.id]
            return (
              <button
                key={meta.id}
                type="button"
                onClick={() => toggle(meta.id)}
                aria-pressed={active}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent ${
                  active ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                <Icon className="size-4 shrink-0" />
                <span className="flex-1 truncate">{meta.label}</span>
                <span
                  className={`flex size-4 shrink-0 items-center justify-center rounded border ${
                    active
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input'
                  }`}
                >
                  {active && <Check className="size-3" />}
                </span>
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
