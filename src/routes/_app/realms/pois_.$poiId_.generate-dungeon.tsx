import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { usePOI, useRealmPOIs } from '~/ui/hooks/usePOIs'
import { useRegions } from '~/ui/hooks/useRegions'
import { useActiveRealm } from '~/ui/hooks/useActiveRealm'
import { useContainer } from '~/ui/hooks/useContainer'
import { executeGenerateDungeon } from '@application/use-cases/GenerateDungeon'
import { executeUpdatePOI } from '@application/use-cases/UpdatePOI'
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
import { Switch } from '~/components/ui/switch'
import { ArrowLeft, AlertTriangle, Wand2, RefreshCw } from 'lucide-react'
import type { DungeonGenOptions, DungeonTheme, DungeonSize } from '~/lib/dungeon/types'
import { SeededRandom } from '~/lib/dungeon/SeededRandom'

export const Route = createFileRoute('/_app/realms/pois_/$poiId_/generate-dungeon')({
  component: GenerateDungeonPage,
})

const THEME_GROUPS: { label: string; icon: string; themes: { value: DungeonTheme; label: string; desc: string }[] }[] = [
  {
    label: 'Sacred',
    icon: '⛩',
    themes: [
      { value: 'temple',  label: 'Temple',  desc: 'Active or corrupted place of worship' },
      { value: 'shrine',  label: 'Shrine',  desc: 'Small sacred site or oracle' },
      { value: 'tomb',    label: 'Tomb',    desc: 'Burial complex with guardians' },
      { value: 'crypt',   label: 'Crypt',   desc: 'Ossuary or charnel catacombs' },
    ],
  },
  {
    label: 'Underground',
    icon: '⛏',
    themes: [
      { value: 'cave',    label: 'Cave',    desc: 'Natural cavern system' },
      { value: 'mine',    label: 'Mine',    desc: 'Abandoned or haunted excavation' },
      { value: 'sewer',   label: 'Sewer',   desc: 'Undercity tunnels and drains' },
      { value: 'sea_cave', label: 'Sea Cave', desc: 'Coastal grotto, tidal passages' },
    ],
  },
  {
    label: 'Stronghold',
    icon: '🏰',
    themes: [
      { value: 'fortress',        label: 'Fortress',        desc: 'Military keep or garrison' },
      { value: 'bandit_hideout',  label: 'Bandit Hideout',  desc: 'Outlaw camp or smuggler den' },
      { value: 'floating_keep',   label: 'Floating Keep',   desc: 'Arcane citadel in the sky' },
    ],
  },
  {
    label: 'Wilderness Lair',
    icon: '🐾',
    themes: [
      { value: 'lair',          label: 'Lair',          desc: 'Monster den or nest' },
      { value: 'beast_den',     label: 'Beast Den',     desc: 'Large predator territory' },
      { value: 'witch_hut',     label: 'Witch Hut',     desc: 'Hag dwelling or fey sanctum' },
      { value: 'cultist_lair',  label: 'Cultist Lair',  desc: 'Dark ritual grounds' },
    ],
  },
]

const SIZES: { value: DungeonSize; label: string; desc: string }[] = [
  { value: 'lair', label: 'Lair', desc: '3–5 rooms' },
  { value: 'small', label: 'Small', desc: '5–8 rooms' },
  { value: 'medium', label: 'Medium', desc: '8–12 rooms' },
  { value: 'large', label: 'Large', desc: '12–20 rooms' },
  { value: 'megadungeon', label: 'Megadungeon', desc: '20–30 rooms' },
]

const DUNGEON_ADJECTIVES = [
  'Forsaken', 'Sunken', 'Ruined', 'Shadowed', 'Haunted', 'Lost',
  'Ancient', 'Cursed', 'Hidden', 'Forgotten', 'Blighted', 'Twisted',
  'Shattered', 'Drowned', 'Burning', 'Silent', 'Hollow', 'Ashen',
]

const DUNGEON_NOUNS: Record<DungeonTheme, string[]> = {
  tomb: ['Tomb', 'Mausoleum', 'Crypt', 'Barrow', 'Sepulcher'],
  cave: ['Cavern', 'Grotto', 'Caves', 'Chasm', 'Depths'],
  temple: ['Temple', 'Sanctuary', 'Shrine', 'Chapel', 'Cathedral'],
  mine: ['Mines', 'Quarry', 'Pit', 'Excavation', 'Tunnels'],
  fortress: ['Fortress', 'Keep', 'Stronghold', 'Bastion', 'Citadel'],
  sewer: ['Sewers', 'Undercity', 'Drains', 'Warrens', 'Tunnels'],
  crypt: ['Crypt', 'Ossuary', 'Charnel House', 'Vault', 'Catacombs'],
  lair: ['Lair', 'Den', 'Nest', 'Burrow', 'Hideout'],
  shrine: ['Shrine', 'Sanctum', 'Fane', 'Sacred Grove', 'Reliquary'],
  bandit_hideout: ['Hideout', 'Camp', 'Stronghold', 'Outpost', 'Den'],
  cultist_lair: ['Sanctum', 'Temple', 'Altar', 'Chamber', 'Lair'],
  witch_hut: ['Hut', 'Cottage', 'Hovel', 'Dwelling', 'Sanctum'],
  sea_cave: ['Grotto', 'Cove', 'Cavern', 'Hideaway', 'Lair'],
  beast_den: ['Den', 'Lair', 'Nest', 'Warren', 'Cave'],
  floating_keep: ['Keep', 'Citadel', 'Tower', 'Fortress', 'Spire'],
}

function rollDungeonName(theme: DungeonTheme): string {
  const rng = new SeededRandom(Date.now())
  const adj = rng.pick(DUNGEON_ADJECTIVES)
  const noun = rng.pick(DUNGEON_NOUNS[theme])
  return `The ${adj} ${noun}`
}

function GenerateDungeonPage() {
  const { poiId } = Route.useParams()
  const navigate = useNavigate()
  const poi = usePOI(poiId)
  const realm = useActiveRealm()
  const regions = useRegions(realm?.id ?? null)
  const allPois = useRealmPOIs(realm?.id ?? null)
  const container = useContainer()

  const existing = poi?.dungeonGenOptions
  const isRegen = !!poi?.spatialDungeon

  // Identity fields (editable on this page)
  const [name, setName] = useState('')
  const [regionId, setRegionId] = useState('')
  const [parentPoiId, setParentPoiId] = useState<string | null>(null)

  // Generation options
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

  // Seed identity fields from POI once it loads
  useEffect(() => {
    if (!poi) return
    if (!name) setName(poi.name === 'New Dungeon' ? rollDungeonName(theme) : poi.name)
    if (!regionId) setRegionId(poi.regionId)
    if (parentPoiId === null && poi.parentPoiId) setParentPoiId(poi.parentPoiId)
  }, [poi?.id])

  // When theme changes and name looks auto-generated, refresh it
  const rollName = () => setName(rollDungeonName(theme))

  // Same-region POIs for exit connections (exclude self, dungeons)
  const sameRegionPois = allPois.filter(
    (p) => p.regionId === (regionId || poi?.regionId) && p.id !== poiId && p.type !== 'dungeon'
  )

  // POIs that can be parents (non-dungeon-room POIs in the realm, excluding self)
  const parentCandidates = allPois.filter((p) => p.id !== poiId && p.type !== 'dungeon')

  const toggleExitPoi = (id: string) =>
    setExitPoiIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])

  const handleGenerate = async () => {
    if (!poi || !realm || !regionId) return
    setIsGenerating(true)
    try {
      // Update identity fields on the POI first
      await executeUpdatePOI(
        { ...poi, name: name.trim() || poi.name, regionId, parentPoiId, updatedAt: Date.now() },
        { poiRepo: container.poiRepo }
      )

      const options: DungeonGenOptions = { theme, size, treasureLevel, dangerLevel, includeMagicItems, exitPoiIds }
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
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Wand2 className="h-5 w-5" />
          {isRegen ? 'Regenerate Dungeon' : 'Generate Dungeon'}
        </h1>
      </div>

      {/* Regen warning */}
      {isRegen && (
        <div className="flex gap-3 p-4 rounded-lg border border-destructive bg-destructive/10 text-destructive">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-medium text-sm">This will wipe all dungeon content</p>
            <p className="text-xs opacity-90">
              All rooms, NPCs, and generated paths will be deleted and recreated.
              Manual edits to rooms or NPCs will be lost.
            </p>
          </div>
        </div>
      )}

      <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Location</p>

        {/* Name */}
        <div className="space-y-1.5">
          <Label htmlFor="dungeon-name">Name</Label>
          <div className="flex gap-2">
            <Input
              id="dungeon-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="The Forsaken Tomb…"
              className="flex-1"
            />
            <Button variant="outline" size="icon" onClick={rollName} title="Generate name">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Region */}
        <div className="space-y-1.5">
          <Label>Region</Label>
          <Select value={regionId} onValueChange={setRegionId}>
            <SelectTrigger>
              <SelectValue placeholder="Select region" />
            </SelectTrigger>
            <SelectContent>
              {regions.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Parent POI */}
        <div className="space-y-1.5">
          <Label>Parent Location <span className="text-muted-foreground text-xs">(optional)</span></Label>
          <Select value={parentPoiId ?? 'none'} onValueChange={(v) => setParentPoiId(v === 'none' ? null : v)}>
            <SelectTrigger>
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {parentCandidates.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Theme — grouped by location category */}
      <div className="space-y-3">
        <Label>Location Type</Label>
        {THEME_GROUPS.map((group) => (
          <div key={group.label} className="space-y-1.5">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span>{group.icon}</span>
              <span className="uppercase tracking-wide font-medium">{group.label}</span>
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {group.themes.map((t) => (
                <button
                  key={t.value}
                  onClick={() => { setTheme(t.value); rollName() }}
                  className={`flex flex-col items-start p-2.5 rounded-md border text-left transition-colors ${
                    theme === t.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50 hover:bg-accent'
                  }`}
                >
                  <span className="text-sm font-medium">{t.label}</span>
                  <span className="text-xs text-muted-foreground leading-tight mt-0.5">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
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
          <SelectTrigger><SelectValue /></SelectTrigger>
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
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low — fewer monsters, lighter traps</SelectItem>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="deadly">Deadly — heavy encounter density</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Magic Items */}
      <div className="flex items-center gap-3">
        <Switch id="magic-items" checked={includeMagicItems} onCheckedChange={setIncludeMagicItems} />
        <Label htmlFor="magic-items">Include magic items in treasure</Label>
      </div>

      {/* Exit Connections */}
      <div className="space-y-2">
        <Label>Exit Connections <span className="text-muted-foreground text-xs font-normal">— optional</span></Label>
        <p className="text-xs text-muted-foreground">
          Locations in the same region that dungeon exits connect to.
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
        <Button variant="outline" onClick={() => navigate({ to: '/realms/pois/$poiId', params: { poiId } })}>
          Cancel
        </Button>
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !regionId}
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
