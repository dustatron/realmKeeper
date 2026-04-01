import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import type { Region } from '@domain/entities/Region'
import type { POI } from '@domain/entities/POI'
import type { DungeonGenerationConfig } from '@generators/dungeon/index'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  regions: Region[]
  allPois: POI[]
  defaultRegionId?: string
  onGenerate: (name: string, regionId: string, connectedPoiId: string | null, config: DungeonGenerationConfig) => Promise<void>
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

export function NewDungeonDialog({ open, onOpenChange, regions, allPois, defaultRegionId, onGenerate }: Props) {
  const [name, setName] = useState('')
  const [regionId, setRegionId] = useState(defaultRegionId ?? '')
  const [connectedPoiSearch, setConnectedPoiSearch] = useState('')
  const [connectedPoiId, setConnectedPoiId] = useState<string | null>(null)
  const [theme, setTheme] = useState<DungeonGenerationConfig['theme']>('random')
  const [size, setSize] = useState<DungeonGenerationConfig['size']>('random')
  const [treasureLevel, setTreasureLevel] = useState<DungeonGenerationConfig['treasureLevel']>('random')
  const [magicItems, setMagicItems] = useState<DungeonGenerationConfig['magicItems']>('random')
  const [monsterDanger, setMonsterDanger] = useState<DungeonGenerationConfig['monsterDanger']>('random')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // POI search for connected POI
  const filteredPois = connectedPoiSearch.length > 1
    ? allPois.filter(p =>
        p.parentPoiId === null &&
        p.name.toLowerCase().includes(connectedPoiSearch.toLowerCase())
      ).slice(0, 8)
    : []

  const selectedPoi = allPois.find(p => p.id === connectedPoiId)

  async function handleSubmit() {
    if (!regionId) { setError('Select a region'); return }
    setError(null)
    setLoading(true)
    try {
      const config: DungeonGenerationConfig = { theme, size, treasureLevel, magicItems, monsterDanger }
      await onGenerate(name.trim(), regionId, connectedPoiId, config)
      onOpenChange(false)
      // Reset
      setName('')
      setConnectedPoiSearch('')
      setConnectedPoiId(null)
      setTheme('random')
      setSize('random')
      setTreasureLevel('random')
      setMagicItems('random')
      setMonsterDanger('random')
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Dungeon</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name */}
          <div className="space-y-1">
            <Label>Name <span className="text-muted-foreground text-xs">(optional, auto-generated if blank)</span></Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="The Forsaken Crypt..." />
          </div>

          {/* Region */}
          <div className="space-y-1">
            <Label>Region *</Label>
            <Select value={regionId} onValueChange={setRegionId}>
              <SelectTrigger>
                <SelectValue placeholder="Select region" />
              </SelectTrigger>
              <SelectContent>
                {regions.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Connected POI */}
          <div className="space-y-1">
            <Label>Connected POI <span className="text-muted-foreground text-xs">(optional)</span></Label>
            {selectedPoi ? (
              <div className="flex items-center gap-2">
                <span className="text-sm">{selectedPoi.name}</span>
                <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => { setConnectedPoiId(null); setConnectedPoiSearch('') }}>✕</Button>
              </div>
            ) : (
              <div className="relative">
                <Input
                  value={connectedPoiSearch}
                  onChange={e => setConnectedPoiSearch(e.target.value)}
                  placeholder="Search POIs..."
                />
                {filteredPois.length > 0 && (
                  <div className="absolute z-10 top-full left-0 right-0 bg-popover border rounded-md shadow-md mt-1">
                    {filteredPois.map(p => (
                      <button
                        key={p.id}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                        onClick={() => { setConnectedPoiId(p.id); setConnectedPoiSearch('') }}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Generating...' : 'Generate Dungeon'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
