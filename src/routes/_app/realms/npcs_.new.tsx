import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useUIStore } from '~/ui/stores/uiStore'
import { useActiveRealm } from '~/ui/hooks/useActiveRealm'
import { useSystemConfig } from '~/ui/hooks/useSystemConfigs'
import { useFactions } from '~/ui/hooks/useFactions'
import { useRegions } from '~/ui/hooks/useRegions'
import { useRealmPOIs } from '~/ui/hooks/usePOIs'
import { useContainer } from '~/ui/hooks/useContainer'
import { executeCreateNPC } from '@application/use-cases/CreateNPC'
import { executeGenerateNPC } from '@application/use-cases/GenerateNPC'
import { runTableChain } from '@domain/services/TableChainRunner'
import { rollDice } from '@shared/dice'
import type { NPC } from '@domain/entities/NPC'
import type { SystemBlock, Attack, InventoryItem } from '@domain/value-objects/SystemBlock'
import { NPC_RACES, getAllRaces, type LifeStatus, type MovementStatus } from '@shared/constants'
import { newId } from '@shared/ulid'
import { PageHeader } from '~/components/shared/PageHeader'
import { TagInput } from '~/components/shared/TagInput'
import { NPCInventoryEditor } from '~/components/shared/NPCInventoryEditor'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Badge } from '~/components/ui/badge'
import { Dices, Save, X, Plus, Trash2, ImageIcon } from 'lucide-react'
import { useRef } from 'react'

export const Route = createFileRoute('/_app/realms/npcs_/new')({
  component: NPCNewPage,
})

function NPCNewPage() {
  const navigate = useNavigate()
  const activeRealmId = useUIStore((s) => s.activeRealmId)
  const realm = useActiveRealm()
  const systemConfig = useSystemConfig(realm?.systemId ?? null)
  const factions = useFactions(activeRealmId)
  const regions = useRegions(activeRealmId)
  const pois = useRealmPOIs(activeRealmId)
  const container = useContainer()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [name, setName] = useState('')
  const [race, setRace] = useState<string>('human')
  const [description, setDescription] = useState('')
  const [notable, setNotable] = useState('')
  const [traits, setTraits] = useState<string[]>([])
  const [motivation, setMotivation] = useState('')
  const [appearance, setAppearance] = useState('')
  const [voice, setVoice] = useState('')
  const [want, setWant] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [factionIds, setFactionIds] = useState<string[]>([])
  const [regionId, setRegionId] = useState<string | null>(null)
  const [poiId, setPoiId] = useState<string | null>(null)
  const [lifeStatus, setLifeStatus] = useState<LifeStatus>('alive')
  const [movementStatus, setMovementStatus] = useState<MovementStatus>('present')
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  // System block state
  const [stats, setStats] = useState<{ key: string; value: number; modifier?: number }[]>([])
  const [hp, setHp] = useState(1)
  const [maxHp, setMaxHp] = useState(1)
  const [armor, setArmor] = useState(0)
  const [level, setLevel] = useState(1)
  const [className, setClassName] = useState('')
  const [attacks, setAttacks] = useState<Attack[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [abilities, setAbilities] = useState<string[]>([])
  const [notes, setNotes] = useState('')

  // UI state
  const [isSaving, setIsSaving] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  // Initialize stats from system config
  useEffect(() => {
    if (systemConfig && stats.length === 0) {
      setStats(
        systemConfig.statFields.map((f) => ({
          key: f.key,
          value: 10,
          modifier: f.hasModifier ? 0 : undefined,
        }))
      )
    }
  }, [systemConfig, stats.length])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setImageUrl(reader.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const updateStat = (key: string, value: number) => {
    setStats((prev) => prev.map((s) => (s.key === key ? { ...s, value } : s)))
  }

  const addAttack = () => setAttacks([...attacks, { name: '', damage: '', description: '' }])
  const updateAttack = (i: number, updates: Partial<Attack>) =>
    setAttacks(attacks.map((a, idx) => (idx === i ? { ...a, ...updates } : a)))
  const removeAttack = (i: number) => setAttacks(attacks.filter((_, idx) => idx !== i))

  // Roll a random name from naming tables (respects selected race)
  const handleRollName = async () => {
    if (!systemConfig) return
    const allTables = await container.tableRepo.getTablesBySystemId(systemConfig.id)
    const gender = Math.random() < 0.5 ? 'female' : 'male'

    // Try race-specific table first, fall back to generic
    let firstNameTable = allTables.find((t) =>
      t.tags.includes('name') && t.tags.includes(gender) && t.tags.includes(race)
    )
    if (!firstNameTable) {
      firstNameTable = allTables.find((t) =>
        t.tags.includes('name') && t.tags.includes(gender) && !NPC_RACES.some((r) => t.tags.includes(r))
      )
    }
    const surnameTable = allTables.find((t) => t.tags.includes('name') && t.tags.includes('surname'))

    const nameTables = [firstNameTable, surnameTable].filter(Boolean) as typeof allTables
    if (nameTables.length > 0) {
      const chain = runTableChain(nameTables, rollDice)
      setName(Object.values(chain.summary).join(' '))
    }
  }

  // Generate All
  const handleGenerateAll = async () => {
    if (!activeRealmId || !systemConfig) return
    setIsGenerating(true)
    try {
      const autoFactionId = factions.length > 0
        ? factions[Math.floor(Math.random() * factions.length)].id
        : undefined
      const autoRegionId = regions.length > 0
        ? regions[Math.floor(Math.random() * regions.length)].id
        : undefined

      const npc = await executeGenerateNPC(
        { worldId: activeRealmId, systemConfig, factionId: autoFactionId, regionId: autoRegionId, customRaces: realm?.customRaces },
        { tableRepo: container.tableRepo }
      )

      // Spread generated NPC into state
      setName(npc.name)
      setRace(npc.race || 'human')
      setDescription(npc.description)
      setNotable(npc.notable ?? '')
      setTraits(npc.traits)
      setMotivation(npc.motivation)
      setAppearance(npc.appearance)
      setVoice(npc.voice)
      setWant(npc.want)
      setTags(npc.tags)
      setFactionIds(npc.factionIds)
      setRegionId(npc.regionId)
      setPoiId(npc.poiId)
      setLifeStatus(npc.lifeStatus)
      setMovementStatus(npc.movementStatus)

      // System block
      setStats(npc.systemBlock.stats)
      setHp(npc.systemBlock.hp)
      setMaxHp(npc.systemBlock.maxHp)
      setArmor(npc.systemBlock.armor)
      setLevel(npc.systemBlock.level ?? 1)
      setClassName(npc.systemBlock.className ?? '')
      setAttacks(npc.systemBlock.attacks)
      setInventory(npc.systemBlock.inventory)
      setAbilities(npc.systemBlock.abilities)
      setNotes(npc.systemBlock.notes)
    } finally {
      setIsGenerating(false)
    }
  }

  // Save
  const handleSave = async () => {
    if (!activeRealmId || !systemConfig) return
    setIsSaving(true)
    try {
      const systemBlock: SystemBlock = {
        stats,
        hp,
        maxHp,
        armor,
        level: systemConfig.hasLevel ? level : undefined,
        className: systemConfig.hasClass ? className || undefined : undefined,
        attacks,
        inventory,
        abilities,
        notes,
      }
      const now = Date.now()
      const npc: NPC = {
        id: newId(),
        worldId: activeRealmId,
        name: name.trim() || 'Unnamed NPC',
        race,
        factionIds,
        regionId,
        poiId,
        lifeStatus,
        movementStatus,
        description,
        notable: notable || undefined,
        traits,
        motivation,
        appearance,
        voice,
        want,
        tags,
        imageUrl,
        systemBlock,
        starred: false,
        createdAt: now,
        updatedAt: now,
      }
      await executeCreateNPC(npc, { npcRepo: container.npcRepo })
      navigate({ to: '/realms/npcs/$npcId', params: { npcId: npc.id } })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => navigate({ to: '/realms/npcs' })

  if (!activeRealmId || !systemConfig) {
    return <div className="py-8 text-center text-muted-foreground">Loading...</div>
  }

  const hpPercent = maxHp > 0 ? (hp / maxHp) * 100 : 0

  return (
    <div className="space-y-4 pb-20">
      <PageHeader
        title="New NPC"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateAll}
              disabled={isGenerating}
            >
              <Dices className="mr-2 size-4" />
              {isGenerating ? 'Generating...' : 'Generate All'}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              <X className="mr-2 size-4" />
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              <Save className="mr-2 size-4" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        }
      />

      {/* Identity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Identity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <div className="flex items-center gap-1">
                <Label htmlFor="npc-name">Name</Label>
                <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={handleRollName} title="Roll random name">
                  <Dices className="size-4" />
                </Button>
              </div>
              <Input id="npc-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="NPC name" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="npc-race">Race</Label>
              <Select value={race} onValueChange={(v) => setRace(v)}>
                <SelectTrigger id="npc-race"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {getAllRaces(realm?.customRaces ?? []).map((r) => (
                    <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Portrait</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              {imageUrl ? (
                <div className="relative inline-block">
                  <img src={imageUrl} alt={name} className="max-h-20 rounded-md border object-cover" />
                  <div className="absolute top-1 right-1 flex gap-1">
                    <Button size="icon" variant="secondary" className="size-6" onClick={() => fileInputRef.current?.click()}>
                      <ImageIcon className="size-3" />
                    </Button>
                    <Button size="icon" variant="secondary" className="size-6" onClick={() => setImageUrl(null)}>
                      <X className="size-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <ImageIcon className="mr-1.5 size-3.5" />
                  Add Image
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="npc-desc">Description</Label>
            <Textarea id="npc-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="NPC description (supports Markdown)" rows={3} />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="npc-notable">Notable</Label>
            <Textarea id="npc-notable" value={notable} onChange={(e) => setNotable(e.target.value)} placeholder="Mannerism, a carried item, a secret…" rows={2} />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="npc-appearance">Appearance</Label>
            <Input id="npc-appearance" value={appearance} onChange={(e) => setAppearance(e.target.value)} placeholder="Physical description" />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="npc-voice">Voice</Label>
            <Input id="npc-voice" value={voice} onChange={(e) => setVoice(e.target.value)} placeholder="How they speak" />
          </div>
        </CardContent>
      </Card>

      {/* Personality */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Personality</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-1.5">
            <Label>Traits</Label>
            <TagInput tags={traits} onChange={setTraits} placeholder="Add trait..." />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="npc-motivation">Motivation</Label>
            <Input id="npc-motivation" value={motivation} onChange={(e) => setMotivation(e.target.value)} placeholder="What drives this character?" />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="npc-want">Want</Label>
            <Input id="npc-want" value={want} onChange={(e) => setWant(e.target.value)} placeholder="Side quest hook" />
          </div>

          <div className="grid gap-1.5">
            <Label>Tags</Label>
            <TagInput tags={tags} onChange={setTags} placeholder="Add tag..." />
          </div>
        </CardContent>
      </Card>

      {/* Associations */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Associations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="grid gap-1.5 sm:col-span-3">
              <Label>Factions</Label>
              <div className="flex flex-wrap gap-1.5">
                {factions.map((f) => {
                  const active = factionIds.includes(f.id)
                  return (
                    <Badge
                      key={f.id}
                      variant={active ? 'default' : 'outline'}
                      className="cursor-pointer select-none"
                      onClick={() => setFactionIds(active ? factionIds.filter((id) => id !== f.id) : [...factionIds, f.id])}
                    >
                      {f.name}
                    </Badge>
                  )
                })}
                {factions.length === 0 && <span className="text-sm text-muted-foreground">No factions</span>}
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="npc-region">Region</Label>
              <Select value={regionId ?? 'none'} onValueChange={(v) => setRegionId(v === 'none' ? null : v)}>
                <SelectTrigger id="npc-region"><SelectValue placeholder="Select region" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {regions.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="npc-poi">POI</Label>
              <Select value={poiId ?? 'none'} onValueChange={(v) => setPoiId(v === 'none' ? null : v)}>
                <SelectTrigger id="npc-poi"><SelectValue placeholder="Select POI" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {pois.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="npc-life">Life Status</Label>
              <Select value={lifeStatus} onValueChange={(v) => setLifeStatus(v as LifeStatus)}>
                <SelectTrigger id="npc-life"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="alive">Alive</SelectItem>
                  <SelectItem value="dead">Dead</SelectItem>
                  <SelectItem value="undead">Undead</SelectItem>
                  <SelectItem value="ghost">Ghost</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="npc-movement">Movement Status</Label>
              <Select value={movementStatus} onValueChange={(v) => setMovementStatus(v as MovementStatus)}>
                <SelectTrigger id="npc-movement"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="traveling">Traveling</SelectItem>
                  <SelectItem value="missing">Missing</SelectItem>
                  <SelectItem value="captured">Captured</SelectItem>
                  <SelectItem value="hiding">Hiding</SelectItem>
                  <SelectItem value="escaping">Escaping</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Stats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">System Stats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Level & Class */}
          {(systemConfig.hasLevel || systemConfig.hasClass) && (
            <div className="grid grid-cols-2 gap-4">
              {systemConfig.hasLevel && (
                <div className="grid gap-1.5">
                  <Label htmlFor="npc-level">Level</Label>
                  <Input id="npc-level" type="number" min={1} value={level} onChange={(e) => setLevel(parseInt(e.target.value) || 1)} />
                </div>
              )}
              {systemConfig.hasClass && (
                <div className="grid gap-1.5">
                  <Label htmlFor="npc-class">Class</Label>
                  <Input id="npc-class" value={className} onChange={(e) => setClassName(e.target.value)} placeholder="Fighter, Thief..." />
                </div>
              )}
            </div>
          )}

          {/* Ability Scores */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {stats.map((stat) => {
              const def = systemConfig.statFields.find((f) => f.key === stat.key)
              return (
                <div key={stat.key} className="grid gap-1.5">
                  <Label htmlFor={`stat-${stat.key}`}>
                    {def?.label ?? stat.key}
                    {stat.modifier !== undefined && ` (${stat.modifier >= 0 ? '+' : ''}${stat.modifier})`}
                  </Label>
                  <Input
                    id={`stat-${stat.key}`}
                    type="number"
                    value={stat.value}
                    onChange={(e) => updateStat(stat.key, parseInt(e.target.value) || 0)}
                  />
                </div>
              )
            })}
          </div>

          {/* HP */}
          <div className="space-y-2">
            <Label>{systemConfig.hpLabel ?? 'HP'}: {hp}/{maxHp}</Label>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={`h-full transition-all ${hpPercent > 50 ? 'bg-green-500' : hpPercent > 25 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${Math.max(0, Math.min(100, hpPercent))}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="npc-hp">Current</Label>
                <Input id="npc-hp" type="number" value={hp} onChange={(e) => setHp(parseInt(e.target.value) || 0)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="npc-maxhp">Max</Label>
                <Input id="npc-maxhp" type="number" value={maxHp} onChange={(e) => setMaxHp(parseInt(e.target.value) || 0)} />
              </div>
            </div>
          </div>

          {/* Armor */}
          <div className="grid gap-1.5">
            <Label htmlFor="npc-armor">{systemConfig.armorLabel ?? 'Armor'}</Label>
            <Input id="npc-armor" type="number" value={armor} onChange={(e) => setArmor(parseInt(e.target.value) || 0)} />
          </div>
        </CardContent>
      </Card>

      {/* Combat */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Attacks</CardTitle>
            <Button size="sm" variant="outline" onClick={addAttack}><Plus className="mr-1 size-3" />Add</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {attacks.map((attack, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="flex-1 space-y-2">
                <Input placeholder="Attack name" value={attack.name} onChange={(e) => updateAttack(i, { name: e.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Damage" value={attack.damage} onChange={(e) => updateAttack(i, { damage: e.target.value })} />
                  <Input placeholder="Description" value={attack.description} onChange={(e) => updateAttack(i, { description: e.target.value })} />
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => removeAttack(i)}><Trash2 className="size-4" /></Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Inventory */}
      <Card>
        <CardContent className="pt-6">
          <NPCInventoryEditor
            inventory={inventory}
            onChange={setInventory}
            systemId={systemConfig.id}
            worldId={activeRealmId}
          />
        </CardContent>
      </Card>

      {/* Abilities & Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Abilities & Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-1.5">
            <Label>Abilities</Label>
            <TagInput tags={abilities} onChange={setAbilities} placeholder="Add ability..." />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="npc-notes">Notes</Label>
            <Textarea id="npc-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="System-specific notes" rows={3} />
          </div>
        </CardContent>
      </Card>

      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-0 right-0 z-10 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto max-w-screen-xl flex items-center gap-2 px-6 py-3">
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              <Save className="mr-2 size-4" />
              {isSaving ? 'Saving...' : 'Create NPC'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
