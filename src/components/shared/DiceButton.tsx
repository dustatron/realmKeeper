import { Dices } from 'lucide-react'
import { Button } from '~/components/ui/button'

interface DiceButtonProps {
  notation: string
  onRoll: (notation: string) => void
  size?: 'default' | 'sm' | 'icon'
  variant?: 'default' | 'ghost' | 'outline'
}

export function DiceButton({ notation, onRoll, size = 'sm', variant = 'outline' }: DiceButtonProps) {
  return (
    <Button variant={variant} size={size} onClick={() => onRoll(notation)}>
      <Dices className="mr-1 size-3.5" />
      {notation}
    </Button>
  )
}
