import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '~/components/ui/sheet'
import { Button } from '~/components/ui/button'
import { Label } from '~/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { AlertTriangle } from 'lucide-react'
import type { DungeonGenerationConfig, ResolvedDungeonConfig } from '@generators/dungeon/index'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialConfig: ResolvedDungeonConfig
  onRegenerate: (config: DungeonGenerationConfig) => Promise<void>
}

const THEMES = [
  { value: 'random', label: 'Random' },
  { value: 'tomb', label: 'Tomb' },
  { value: 'cave', label: 'Cave' },
  { value: 'temple', label: 'Temple' },
  { value: 'mine', label: 'Mine' },
  { value: 'fortress', label: 'Fortress' },
  { value: 'sewer', label: 'Sewer' },
  { value: 'crypt', label: 'Crypt' },
  { value: 'lair', label: 'Lair' },
  { value: 'shrine', label: 'Shrine' },
  { value: 'bandit_hideout', label: 'Bandit Hideout' },
  { value: 'cultist_lair', label: 'Cultist Lair' },
  { value: 'witch_hut', label: 'Witch Hut' },
  { value: 'sea_cave', label: 'Sea Cave' },
  { value: 'beast_den', label: 'Beast Den' },
  { value: 'floating_keep', label: 'Floating Keep' },
] as const

const SIZES = [
  { value: 'random', label: 'Random' },
  { value: 'lair', label: 'Lair (3–5 rooms)' },
  { value: 'small', label: 'Small (5–8 rooms)' },
  { value: 'medium', label: 'Medium (8–12 rooms)' },
  { value: 'large', label: 'Large (12–20 rooms)' },
  { value: 'megadungeon', label: 'Megadungeon (20–30 rooms)' },
] as const

const TREASURE_LEVELS = [
  { value: 'random', label: 'Random' },
  { value: 'scarce', label: 'Scarce' },
  { value: 'modest', label: 'Modest' },
  { value: 'rich', label: 'Rich' },
  { value: 'hoard', label: 'Hoard' },
] as const

const MAGIC_ITEMS = [
  { value: 'random', label: 'Random' },
  { value: 'none', label: 'None' },
  { value: 'rare', label: 'Rare' },
  { value: 'some', label: 'Some' },
  { value: 'plentiful', label: 'Plentiful' },
] as const

const MONSTER_DANGER = [
  { value: 'random', label: 'Random' },
  { value: 'nuisance', label: 'Nuisance' },
  { value: 'dangerous', label: 'Dangerous' },
  { value: 'deadly', label: 'Deadly' },
  { value: 'legendary', label: 'Legendary' },
] as const

export function RegenerateDungeonSheet({ open, onOpenChange, initialConfig, onRegenerate }: Props) {
  const [theme, setTheme] = useState<DungeonGenerationConfig['theme']>(initialConfig.theme)
  const [size, setSize] = useState<DungeonGenerationConfig['size']>(initialConfig.size)
  const [treasureLevel, setTreasureLevel] = useState<DungeonGenerationConfig['treasureLevel']>(initialConfig.treasureLevel)
  const [magicItems, setMagicItems] = useState<DungeonGenerationConfig['magicItems']>(initialConfig.magicItems)
  const [monsterDanger, setMonsterDanger] = useState<DungeonGenerationConfig['monsterDanger']>(initialConfig.monsterDanger)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRegenerate() {
    setError(null)
    setLoading(true)
    try {
      await onRegenerate({ theme, size, treasureLevel, magicItems, monsterDanger })
      onOpenChange(false)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Regenerate Dungeon</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 py-4">
          {/* Warning */}
          <div className="flex gap-2 p-3 bg-destructive/10 rounded-md border border-destructive/30">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">
              Regenerating will delete and recreate all room POIs. Manual edits to rooms will be lost.
            </p>
          </div>

          {/* Theme */}
          <div className="space-y-1">
            <Label>Theme</Label>
            <Select value={theme} onValueChange={v => setTheme(v as typeof theme)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {THEMES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Size */}
          <div className="space-y-1">
            <Label>Size</Label>
            <Select value={size} onValueChange={v => setSize(v as typeof size)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SIZES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Treasure Level */}
          <div className="space-y-1">
            <Label>Treasure Level</Label>
            <Select value={treasureLevel} onValueChange={v => setTreasureLevel(v as typeof treasureLevel)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TREASURE_LEVELS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Magic Items */}
          <div className="space-y-1">
            <Label>Magic Items</Label>
            <Select value={magicItems} onValueChange={v => setMagicItems(v as typeof magicItems)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MAGIC_ITEMS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Monster Danger */}
          <div className="space-y-1">
            <Label>Monster Danger</Label>
            <Select value={monsterDanger} onValueChange={v => setMonsterDanger(v as typeof monsterDanger)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONSTER_DANGER.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button variant="destructive" onClick={handleRegenerate} disabled={loading}>
            {loading ? 'Regenerating...' : 'Regenerate'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
