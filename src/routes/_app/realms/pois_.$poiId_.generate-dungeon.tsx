import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { usePOI, useRealmPOIs } from '~/ui/hooks/usePOIs'
import { useActiveRealm } from '~/ui/hooks/useActiveRealm'
import { useContainer } from '~/ui/hooks/useContainer'
import { executeGenerateDungeon } from '@application/use-cases/GenerateDungeon'
import { Button } from '~/components/ui/button'
import { Label } from '~/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Switch } from '~/components/ui/switch'
import { ArrowLeft, AlertTriangle, Wand2 } from 'lucide-react'
import type { DungeonGenOptions, DungeonTheme, DungeonSize } from '~/lib/dungeon/types'

export const Route = createFileRoute('/_app/realms/pois_/$poiId_/generate-dungeon')({
  component: GenerateDungeonPage,
})

const THEMES: { value: DungeonTheme; label: string }[] = [
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
]

const SIZES: { value: DungeonSize; label: string; desc: string }[] = [
  { value: 'lair', label: 'Lair', desc: '3–5 rooms' },
  { value: 'small', label: 'Small', desc: '5–8 rooms' },
  { value: 'medium', label: 'Medium', desc: '8–12 rooms' },
  { value: 'large', label: 'Large', desc: '12–20 rooms' },
  { value: 'megadungeon', label: 'Megadungeon', desc: '20–30 rooms' },
]

function GenerateDungeonPage() {
  const { poiId } = Route.useParams()
  const navigate = useNavigate()
  const poi = usePOI(poiId)
  const realm = useActiveRealm()
  const allPois = useRealmPOIs(realm?.id ?? null)
  const container = useContainer()

  const existing = poi?.dungeonGenOptions
  const isRegen = !!poi?.spatialDungeon

  const [theme, setTheme] = useState<DungeonTheme>(existing?.theme ?? 'cave')
  const [size, setSize] = useState<DungeonSize>(existing?.size ?? 'small')
  const [treasureLevel, setTreasureLevel] = useState<DungeonGenOptions['treasureLevel']>(
    existing?.treasureLevel ?? 'standard'
  )
  const [dangerLevel, setDangerLevel] = useState<DungeonGenOptions['dangerLevel']>(
    existing?.dangerLevel ?? 'standard'
  )
  const [includeMagicItems, setIncludeMagicItems] = useState(existing?.includeMagicItems ?? false)
  const [exitPoiIds, setExitPoiIds] = useState<string[]>(existing?.exitPoiIds ?? [])
  const [isGenerating, setIsGenerating] = useState(false)

  // Same-region POIs for exit connections (exclude self)
  const sameRegionPois = allPois.filter(
    (p) => p.regionId === poi?.regionId && p.id !== poiId && p.type !== 'dungeon'
  )

  const toggleExitPoi = (id: string) => {
    setExitPoiIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleGenerate = async () => {
    if (!poi || !realm) return
    setIsGenerating(true)
    try {
      const options: DungeonGenOptions = {
        theme,
        size,
        treasureLevel,
        dangerLevel,
        includeMagicItems,
        exitPoiIds,
      }
      await executeGenerateDungeon(
        { poiId, worldId: realm.id, options },
        {
          poiRepo: container.poiRepo,
          npcRepo: container.npcRepo,
          pathRepo: container.pathRepo,
          factionPresenceRepo: container.factionPresenceRepo,
          poiEventRepo: container.poiEventRepo,
        }
      )
      navigate({ to: '/realms/pois/$poiId', params: { poiId } })
    } catch (e) {
      console.error('Generation failed:', e)
    } finally {
      setIsGenerating(false)
    }
  }

  if (!poi) return null

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: '/realms/pois/$poiId', params: { poiId } })}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            {isRegen ? 'Regenerate Dungeon' : 'Generate Dungeon'}
          </h1>
          <p className="text-sm text-muted-foreground">{poi.name}</p>
        </div>
      </div>

      {/* Regen warning */}
      {isRegen && (
        <div className="flex gap-3 p-4 rounded-lg border border-destructive bg-destructive/10 text-destructive">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-medium text-sm">This will wipe all dungeon content</p>
            <p className="text-xs opacity-90">
              All rooms, NPCs, and generated paths will be permanently deleted and recreated.
              Any edits you made to individual rooms or NPCs will be lost.
            </p>
          </div>
        </div>
      )}

      {/* Theme */}
      <div className="space-y-2">
        <Label>Theme</Label>
        <Select value={theme} onValueChange={(v) => setTheme(v as DungeonTheme)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {THEMES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Size */}
      <div className="space-y-2">
        <Label>Size</Label>
        <div className="grid grid-cols-5 gap-2">
          {SIZES.map((s) => (
            <button
              key={s.value}
              onClick={() => setSize(s.value)}
              className={`flex flex-col items-center p-2 rounded border text-center transition-colors ${
                size === s.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <span className="text-sm font-medium">{s.label}</span>
              <span className="text-xs text-muted-foreground">{s.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Treasure Level */}
      <div className="space-y-2">
        <Label>Treasure Level</Label>
        <Select value={treasureLevel} onValueChange={(v) => setTreasureLevel(v as DungeonGenOptions['treasureLevel'])}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="poor">Poor — scarce loot</SelectItem>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="rich">Rich — generous loot</SelectItem>
            <SelectItem value="hoard">Hoard — legendary wealth</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Danger Level */}
      <div className="space-y-2">
        <Label>Danger Level</Label>
        <Select value={dangerLevel} onValueChange={(v) => setDangerLevel(v as DungeonGenOptions['dangerLevel'])}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low — fewer monsters, lighter traps</SelectItem>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="deadly">Deadly — heavy encounter density</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Magic Items */}
      <div className="flex items-center gap-3">
        <Switch
          id="magic-items"
          checked={includeMagicItems}
          onCheckedChange={setIncludeMagicItems}
        />
        <Label htmlFor="magic-items">Include magic items in treasure</Label>
      </div>

      {/* Exit Connections */}
      <div className="space-y-2">
        <Label>Exit Connections</Label>
        <p className="text-xs text-muted-foreground">
          Select same-region locations to connect via exit passages. Optional.
        </p>
        {sameRegionPois.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No other locations in this region.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded p-2">
            {sameRegionPois.map((p) => (
              <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={exitPoiIds.includes(p.id)}
                  onChange={() => toggleExitPoi(p.id)}
                  className="rounded border"
                />
                <span className="text-sm truncate">{p.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button
          variant="outline"
          onClick={() => navigate({ to: '/realms/pois/$poiId', params: { poiId } })}
        >
          Cancel
        </Button>
        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          variant={isRegen ? 'destructive' : 'default'}
          className="flex-1"
        >
          {isGenerating
            ? 'Generating…'
            : isRegen
            ? 'Wipe & Regenerate'
            : 'Generate Dungeon'}
        </Button>
      </div>
    </div>
  )
}
