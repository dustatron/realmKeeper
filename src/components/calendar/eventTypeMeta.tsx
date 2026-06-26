import {
  PartyPopper, Coins, Sparkles, Flame, Swords, CloudRain,
  Footprints, Landmark, Ghost, Tag, type LucideIcon,
} from 'lucide-react'
import type { POIEventType } from '@shared/constants'
import { Badge } from '~/components/ui/badge'

export const EVENT_TYPE_META: Record<POIEventType, { icon: LucideIcon; className: string; label: string }> = {
  festival:    { icon: PartyPopper, className: 'bg-amber-100 text-amber-800',   label: 'Festival' },
  market:      { icon: Coins,       className: 'bg-green-100 text-green-800',   label: 'Market' },
  ceremony:    { icon: Sparkles,    className: 'bg-violet-100 text-violet-800', label: 'Ceremony' },
  disaster:    { icon: Flame,       className: 'bg-red-100 text-red-800',       label: 'Disaster' },
  siege:       { icon: Swords,      className: 'bg-red-100 text-red-800',       label: 'Siege' },
  weather:     { icon: CloudRain,   className: 'bg-sky-100 text-sky-800',       label: 'Weather' },
  migration:   { icon: Footprints,  className: 'bg-teal-100 text-teal-800',    label: 'Migration' },
  political:   { icon: Landmark,    className: 'bg-indigo-100 text-indigo-800', label: 'Political' },
  supernatural:{ icon: Ghost,       className: 'bg-fuchsia-100 text-fuchsia-800', label: 'Supernatural' },
  custom:      { icon: Tag,         className: 'bg-muted text-muted-foreground', label: 'Event' },
}

export function EventTypeBadge({ type }: { type: POIEventType }) {
  const meta = EVENT_TYPE_META[type] ?? EVENT_TYPE_META.custom
  const Icon = meta.icon
  return (
    <Badge variant="outline" className={`text-xs gap-1 ${meta.className}`}>
      <Icon className="size-3" />
      {meta.label}
    </Badge>
  )
}
