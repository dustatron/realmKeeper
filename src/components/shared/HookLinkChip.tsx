import { Link } from '@tanstack/react-router'
import { MapPin, User } from 'lucide-react'

export interface HookLink {
  type: 'poi' | 'npc'
  id: string
  name: string
}

export interface HookReveal {
  detail: string
  links: HookLink[]
}

const CHIP_CLASS =
  'inline-flex items-center gap-1 rounded border bg-background px-1.5 py-0.5 text-[11px] font-medium text-foreground/80 hover:bg-accent hover:text-foreground transition-colors'

export function HookLinkChip({ link }: { link: HookLink }) {
  if (link.type === 'poi') {
    return (
      <Link to="/realms/pois/$poiId" params={{ poiId: link.id }} className={CHIP_CLASS}>
        <MapPin className="size-3 shrink-0" />
        {link.name}
      </Link>
    )
  }
  return (
    <Link to="/realms/npcs/$npcId" params={{ npcId: link.id }} className={CHIP_CLASS}>
      <User className="size-3 shrink-0" />
      {link.name}
    </Link>
  )
}
