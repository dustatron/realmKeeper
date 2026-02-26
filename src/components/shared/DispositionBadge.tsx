import { Dices } from 'lucide-react'
import { Badge } from '~/components/ui/badge'
import { rollDisposition } from '@shared/dice'
import type { Disposition } from '@shared/constants'
import type { NPC } from '@domain/entities/NPC'

const DISPOSITION_COLORS: Record<Disposition, string> = {
  hostile: 'bg-red-500/15 text-red-500 border-red-500/30',
  wary: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
  curious: 'bg-gray-400/15 text-gray-400 border-gray-400/30',
  kind: 'bg-blue-500/15 text-blue-500 border-blue-500/30',
  helpful: 'bg-green-500/15 text-green-500 border-green-500/30',
}

interface DispositionBadgeProps {
  npc: NPC
  onUpdateNPC?: (npc: NPC) => void
  size?: 'sm' | 'xs'
}

export function DispositionBadge({ npc, onUpdateNPC, size = 'xs' }: DispositionBadgeProps) {
  const disposition = npc.disposition

  const handleRoll = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!onUpdateNPC) return
    onUpdateNPC({ ...npc, disposition: rollDisposition() })
  }

  const textSize = size === 'sm' ? 'text-xs' : 'text-[10px]'

  return (
    <span className="inline-flex items-center gap-0.5">
      {disposition ? (
        <Badge
          variant="outline"
          className={`${textSize} px-1.5 py-0 ${DISPOSITION_COLORS[disposition]}`}
        >
          {disposition}
        </Badge>
      ) : (
        <Badge variant="outline" className={`${textSize} px-1.5 py-0 text-muted-foreground`}>
          unknown
        </Badge>
      )}
      {onUpdateNPC && (
        <button
          onClick={handleRoll}
          className="size-5 rounded flex items-center justify-center hover:bg-muted-foreground/20 text-muted-foreground transition-colors"
          title="Roll disposition (2d6)"
        >
          <Dices className="size-3" />
        </button>
      )}
    </span>
  )
}
