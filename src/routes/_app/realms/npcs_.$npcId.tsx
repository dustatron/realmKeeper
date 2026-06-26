import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { useNPC, useNPCs } from '~/ui/hooks/useNPCs'
import { useNpcConnections } from '~/ui/hooks/useConnections'
import { useNpcHooks } from '~/ui/hooks/useHooks'
import { useFactions } from '~/ui/hooks/useFactions'
import { useRegion, useRegions } from '~/ui/hooks/useRegions'
import { usePOI, useRealmPOIs } from '~/ui/hooks/usePOIs'
import { useActiveRealm } from '~/ui/hooks/useActiveRealm'
import { useSystemConfig } from '~/ui/hooks/useSystemConfigs'
import { useUIStore } from '~/ui/stores/uiStore'
import { useContainer } from '~/ui/hooks/useContainer'
import { executeUpdateNPC } from '@application/use-cases/UpdateNPC'
import { executeDeleteNPC } from '@application/use-cases/DeleteNPC'
import { ConfirmDialog } from '~/components/shared/ConfirmDialog'
import { PageHeader } from '~/components/shared/PageHeader'
import { TagInput } from '~/components/shared/TagInput'
import { ImagePicker } from '~/components/shared/ImagePicker'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { ArrowLeft, Heart, Shield, Skull, Swords, Package, Sparkles, Handshake, Pencil, MapPin, ChevronUp, ChevronDown, Trash2, Plus, ChevronsUpDown, Check, Star, Dices } from 'lucide-react'
import { db } from '@infrastructure/dexie/db'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '~/components/ui/command'
import { cn } from '~/lib/utils'
import { CloudinaryImage } from '~/components/shared/CloudinaryImage'
import { getAllRaces, NPC_DISPOSITIONS } from '@shared/constants'
import { rollDisposition } from '@shared/dice'
import { DispositionBadge } from '~/components/shared/DispositionBadge'
import type { NPC } from '@domain/entities/NPC'
import type { SystemBlock, Attack, InventoryItem } from '@domain/value-objects/SystemBlock'
import type { Faction } from '@domain/entities/Faction'

export const Route = createFileRoute('/_app/realms/npcs_/$npcId')({
  component: NPCDetailPage,
})

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-600',
  dormant: 'bg-yellow-600',
  disbanded: 'bg-orange-600',
  destroyed: 'bg-red-600',
}

function NPCDetailPage() {
  const { npcId } = Route.useParams()
  const activeRealmId = useUIStore((s) => s.activeRealmId)
  const npc = useNPC(npcId)
  const realm = useActiveRealm()
  const systemConfig = useSystemConfig(realm?.systemId ?? null)
  const region = useRegion(npc?.regionId ?? null)
  const poi = usePOI(npc?.poiId ?? null)
  const factions = useFactions(activeRealmId)
  const regions = useRegions(activeRealmId)
  const pois = useRealmPOIs(activeRealmId)
  const allNpcs = useNPCs(activeRealmId)
  const connections = useNpcConnections(npc?.worldId ?? null, npcId)
  const hooks = useNpcHooks(npc?.worldId ?? null, npcId)
  const container = useContainer()

  // Build POI breadcrumb: walk parentPoiId chain from npc's poi up to root
  const poiBreadcrumb = useMemo(() => {
    if (!poi || pois.length === 0) return []
    const poiMap = new Map(pois.map((p) => [p.id, p]))
    const chain: typeof pois = []
    let current: typeof pois[number] | null = poi
    while (current) {
      chain.unshift(current)
      current = current.parentPoiId ? poiMap.get(current.parentPoiId) ?? null : null
    }
    return chain
  }, [poi, pois])

  const [editingNPC, setEditingNPC] = useState<NPC | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [poiSearchOpen, setPoiSearchOpen] = useState(false)

  const regionMap = useMemo(() => new Map(regions.map((r) => [r.id, r.name])), [regions])

  const handleSaveNPC = async () => {
    if (!editingNPC) return
    await executeUpdateNPC(editingNPC, { npcRepo: container.npcRepo })
    setEditingNPC(null)
  }

  const handleDeleteNPC = async () => {
    if (!npc) return
    await executeDeleteNPC(npc.id, { npcRepo: container.npcRepo })
    setDeleteConfirmOpen(false)
    setEditingNPC(null)
    window.history.back()
  }

  const adjustHp = async (delta: number) => {
    if (!npc) return
    const newHp = Math.max(0, Math.min(npc.systemBlock.maxHp, npc.systemBlock.hp + delta))
    if (newHp === npc.systemBlock.hp) return
    await executeUpdateNPC(
      { ...npc, systemBlock: { ...npc.systemBlock, hp: newHp }, updatedAt: Date.now() },
      { npcRepo: container.npcRepo }
    )
  }

  if (npc === undefined) {
    return <div className="py-8 text-center text-muted-foreground">Loading...</div>
  }

  if (npc === null) {
    return <div className="py-8 text-center text-muted-foreground">NPC not found.</div>
  }

  const sb = npc.systemBlock
  const hpPercent = sb.maxHp > 0 ? (sb.hp / sb.maxHp) * 100 : 0
  const hpLabel = systemConfig?.hpLabel ?? 'HP'
  const armorLabel = systemConfig?.armorLabel ?? 'Armor'

  // --- Inline edit helpers ---
  const updateField = (field: keyof NPC, value: any) => {
    if (!editingNPC) return
    setEditingNPC({ ...editingNPC, [field]: value })
  }

  const updateSystemBlock = (updates: Partial<SystemBlock>) => {
    if (!editingNPC) return
    setEditingNPC({
      ...editingNPC,
      systemBlock: { ...editingNPC.systemBlock, ...updates },
    })
  }

  const updateStat = (key: string, value: number) => {
    if (!editingNPC) return
    const stats = editingNPC.systemBlock.stats.map((s) =>
      s.key === key ? { ...s, value } : s
    )
    updateSystemBlock({ stats })
  }

  const addAttack = () => {
    if (!editingNPC) return
    updateSystemBlock({
      attacks: [...editingNPC.systemBlock.attacks, { name: '', damage: '', description: '' }],
    })
  }

  const updateAttack = (index: number, updates: Partial<Attack>) => {
    if (!editingNPC) return
    const attacks = editingNPC.systemBlock.attacks.map((a, i) =>
      i === index ? { ...a, ...updates } : a
    )
    updateSystemBlock({ attacks })
  }

  const removeAttack = (index: number) => {
    if (!editingNPC) return
    updateSystemBlock({
      attacks: editingNPC.systemBlock.attacks.filter((_, i) => i !== index),
    })
  }

  const addInventoryItem = () => {
    if (!editingNPC) return
    updateSystemBlock({
      inventory: [...editingNPC.systemBlock.inventory, { name: '', slots: 1, description: '' }],
    })
  }

  const updateInventoryItem = (index: number, updates: Partial<InventoryItem>) => {
    if (!editingNPC) return
    const inventory = editingNPC.systemBlock.inventory.map((item, i) =>
      i === index ? { ...item, ...updates } : item
    )
    updateSystemBlock({ inventory })
  }

  const removeInventoryItem = (index: number) => {
    if (!editingNPC) return
    updateSystemBlock({
      inventory: editingNPC.systemBlock.inventory.filter((_, i) => i !== index),
    })
  }

  // --- Inline Edit Mode ---
  if (editingNPC && systemConfig) {
    const editSb = editingNPC.systemBlock
    const editHpPercent = editSb.maxHp > 0 ? (editSb.hp / editSb.maxHp) * 100 : 0

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setEditingNPC(null)}>
            <ArrowLeft className="mr-1.5 size-4" />
            Back
          </Button>
          <span className="font-medium mr-auto">Edit NPC</span>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => { setEditingNPC(null); setDeleteConfirmOpen(true) }}
          >
            <Trash2 className="mr-2 size-4" />
            Delete
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditingNPC(null)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSaveNPC} disabled={!editingNPC.name.trim()}>
            Save
          </Button>
        </div>

        {/* Basic Info */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={editingNPC.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="NPC name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="race">Race</Label>
              <Select
                value={editingNPC.race ?? 'human'}
                onValueChange={(v) => updateField('race', v)}
              >
                <SelectTrigger id="race">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getAllRaces(realm?.customRaces ?? []).map((r) => (
                    <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Portrait</Label>
            <ImagePicker
              imageUrl={editingNPC.imageUrl}
              onImageChange={(url) => setEditingNPC({ ...editingNPC, imageUrl: url })}
              label="Portrait"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={editingNPC.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="NPC description"
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Traits</Label>
            <TagInput
              tags={editingNPC.traits}
              onChange={(traits) => updateField('traits', traits)}
              placeholder="Add trait..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="motivation">Motivation</Label>
              <Input
                id="motivation"
                value={editingNPC.motivation}
                onChange={(e) => updateField('motivation', e.target.value)}
                placeholder="What drives this character?"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="want">Want</Label>
              <Input
                id="want"
                value={editingNPC.want}
                onChange={(e) => updateField('want', e.target.value)}
                placeholder="Side quest hook"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="appearance">Appearance</Label>
              <Input
                id="appearance"
                value={editingNPC.appearance}
                onChange={(e) => updateField('appearance', e.target.value)}
                placeholder="Physical description"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="voice">Voice</Label>
              <Input
                id="voice"
                value={editingNPC.voice}
                onChange={(e) => updateField('voice', e.target.value)}
                placeholder="How they speak"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Tags</Label>
            <TagInput
              tags={editingNPC.tags}
              onChange={(tags) => updateField('tags', tags)}
              placeholder="Add tag..."
            />
          </div>

          <div className="space-y-1.5">
            <Label>Factions</Label>
            <div className="flex flex-wrap gap-1.5">
              {factions.map((f) => {
                const active = editingNPC.factionIds?.includes(f.id)
                return (
                  <Badge
                    key={f.id}
                    variant={active ? 'default' : 'outline'}
                    className="cursor-pointer select-none"
                    onClick={() => updateField('factionIds', active ? editingNPC.factionIds.filter((id: string) => id !== f.id) : [...editingNPC.factionIds, f.id])}
                  >
                    {f.name}
                  </Badge>
                )
              })}
              {factions.length === 0 && <span className="text-sm text-muted-foreground">No factions</span>}
            </div>
          </div>

          <div className="grid grid-cols-5 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="disposition">Disposition</Label>
              <div className="flex items-center gap-1">
                <Select
                  value={editingNPC.disposition ?? '__none__'}
                  onValueChange={(v) => updateField('disposition', v === '__none__' ? undefined : v)}
                >
                  <SelectTrigger id="disposition">
                    <SelectValue placeholder="Unknown" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Unknown</SelectItem>
                    {NPC_DISPOSITIONS.map((d) => (
                      <SelectItem key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  type="button"
                  onClick={() => updateField('disposition', rollDisposition())}
                  className="size-8 shrink-0 rounded flex items-center justify-center hover:bg-muted-foreground/20 text-muted-foreground transition-colors border"
                  title="Roll disposition (2d6)"
                >
                  <Dices className="size-4" />
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="region">Region</Label>
              <Select
                value={editingNPC.regionId ?? 'none'}
                onValueChange={(v) => updateField('regionId', v === 'none' ? null : v)}
              >
                <SelectTrigger id="region">
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {regions.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>POI</Label>
              <Popover open={poiSearchOpen} onOpenChange={setPoiSearchOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={poiSearchOpen} className="w-full justify-between font-normal">
                    <span className="truncate">{editingNPC.poiId
                      ? pois.find((p) => p.id === editingNPC.poiId)?.name ?? 'Unknown'
                      : 'Select POI...'}</span>
                    <ChevronsUpDown className="ml-1 size-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search POIs..." />
                    <CommandList>
                      <CommandEmpty>No POIs found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="__none__"
                          onSelect={() => {
                            updateField('poiId', null)
                            setPoiSearchOpen(false)
                          }}
                        >
                          <Check className={cn('mr-2 size-4', !editingNPC.poiId ? 'opacity-100' : 'opacity-0')} />
                          None
                        </CommandItem>
                        {pois.map((p) => (
                          <CommandItem
                            key={p.id}
                            value={`${p.name} ${regionMap.get(p.regionId) ?? ''}`}
                            onSelect={() => {
                              updateField('poiId', p.id)
                              setPoiSearchOpen(false)
                            }}
                          >
                            <Check className={cn('mr-2 size-4', editingNPC.poiId === p.id ? 'opacity-100' : 'opacity-0')} />
                            <span className="truncate">{p.name}</span>
                            {regionMap.get(p.regionId) && (
                              <span className="ml-auto text-xs text-muted-foreground">{regionMap.get(p.regionId)}</span>
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lifeStatus">Life Status</Label>
              <Select
                value={editingNPC.lifeStatus}
                onValueChange={(v) => updateField('lifeStatus', v)}
              >
                <SelectTrigger id="lifeStatus">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alive">Alive</SelectItem>
                  <SelectItem value="dead">Dead</SelectItem>
                  <SelectItem value="undead">Undead</SelectItem>
                  <SelectItem value="ghost">Ghost</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="movementStatus">Movement</Label>
              <Select
                value={editingNPC.movementStatus}
                onValueChange={(v) => updateField('movementStatus', v)}
              >
                <SelectTrigger id="movementStatus">
                  <SelectValue />
                </SelectTrigger>
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
        </div>

        {/* System Block */}
        <div className="space-y-4 border-t pt-4">
          <h3 className="font-semibold">System Stats</h3>

          {systemConfig.hasLevel && (
            <div className="space-y-1.5">
              <Label htmlFor="level">Level</Label>
              <Input
                id="level"
                type="number"
                min={1}
                value={editSb.level ?? 1}
                onChange={(e) => updateSystemBlock({ level: parseInt(e.target.value) || 1 })}
              />
            </div>
          )}
          {systemConfig.hasClass && (
            <div className="space-y-1.5">
              <Label htmlFor="className">Class</Label>
              <Input
                id="className"
                value={editSb.className ?? ''}
                onChange={(e) => updateSystemBlock({ className: e.target.value })}
                placeholder="Fighter, Thief, Priest, Wizard..."
              />
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            {editSb.stats.map((stat) => {
              const statDef = systemConfig.statFields.find((f: any) => f.key === stat.key)
              return (
                <div key={stat.key} className="space-y-1.5">
                  <Label htmlFor={`stat-${stat.key}`}>
                    {statDef?.label ?? stat.key}
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
          <div className="space-y-1.5">
            <Label>
              {systemConfig.hpLabel ?? 'HP'}: {editSb.hp}/{editSb.maxHp}
            </Label>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={`h-full transition-all ${
                  editHpPercent > 50 ? 'bg-green-500' : editHpPercent > 25 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.max(0, Math.min(100, editHpPercent))}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="hp">Current HP</Label>
                <Input
                  id="hp"
                  type="number"
                  value={editSb.hp}
                  onChange={(e) => updateSystemBlock({ hp: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="maxHp">Max HP</Label>
                <Input
                  id="maxHp"
                  type="number"
                  value={editSb.maxHp}
                  onChange={(e) => updateSystemBlock({ maxHp: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>

          {/* Armor */}
          <div className="space-y-1.5">
            <Label htmlFor="armor">{systemConfig.armorLabel ?? 'Armor'}</Label>
            <Input
              id="armor"
              type="number"
              value={editSb.armor}
              onChange={(e) => updateSystemBlock({ armor: parseInt(e.target.value) || 0 })}
            />
          </div>

          {/* Attacks */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Attacks</Label>
              <Button size="sm" variant="outline" onClick={addAttack}>
                <Plus className="mr-1 size-3" />
                Add
              </Button>
            </div>
            {editSb.attacks.map((attack, i) => (
              <Card key={i}>
                <CardContent className="space-y-2 pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <Input
                      placeholder="Attack name"
                      value={attack.name}
                      onChange={(e) => updateAttack(i, { name: e.target.value })}
                    />
                    <Button size="sm" variant="ghost" onClick={() => removeAttack(i)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <Input
                    placeholder="Damage"
                    value={attack.damage}
                    onChange={(e) => updateAttack(i, { damage: e.target.value })}
                  />
                  <Input
                    placeholder="Description"
                    value={attack.description}
                    onChange={(e) => updateAttack(i, { description: e.target.value })}
                  />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Inventory */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Inventory</Label>
              <Button size="sm" variant="outline" onClick={addInventoryItem}>
                <Plus className="mr-1 size-3" />
                Add
              </Button>
            </div>
            {editSb.inventory.map((item, i) => (
              <Card key={i}>
                <CardContent className="space-y-2 pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <Input
                      placeholder="Item name"
                      value={item.name}
                      onChange={(e) => updateInventoryItem(i, { name: e.target.value })}
                    />
                    <Button size="sm" variant="ghost" onClick={() => removeInventoryItem(i)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      type="number"
                      placeholder="Slots"
                      value={item.slots}
                      onChange={(e) => updateInventoryItem(i, { slots: parseInt(e.target.value) || 1 })}
                    />
                    <Input
                      className="col-span-2"
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => updateInventoryItem(i, { description: e.target.value })}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Abilities */}
          <div className="space-y-1.5">
            <Label>Abilities</Label>
            <TagInput
              tags={editSb.abilities}
              onChange={(abilities) => updateSystemBlock({ abilities })}
              placeholder="Add ability..."
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={editSb.notes}
              onChange={(e) => updateSystemBlock({ notes: e.target.value })}
              placeholder="System-specific notes"
              rows={3}
            />
          </div>
        </div>

        <ConfirmDialog
          open={deleteConfirmOpen}
          onOpenChange={setDeleteConfirmOpen}
          title="Delete NPC"
          description={`Are you sure you want to delete "${npc.name}"? This action cannot be undone.`}
          confirmLabel="Delete"
          variant="destructive"
          onConfirm={handleDeleteNPC}
        />
      </div>
    )
  }

  // --- Detail View ---
  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            {npc.lifeStatus !== 'alive' && <Skull className="size-5 text-red-500" />}
            {npc.name || 'Unnamed NPC'}
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link to="/realms/npcs">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 size-4" />
                Back
              </Button>
            </Link>
            <Button
              size="sm"
              variant="outline"
              onClick={() => db.npcs.update(npc.id, { starred: !npc.starred, updatedAt: Date.now() })}
              title={npc.starred ? 'Unstar' : 'Star'}
            >
              <Star className={`size-4 ${npc.starred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
            </Button>
            <Button size="sm" onClick={() => setEditingNPC({ ...npc })}>
              <Pencil className="mr-2 size-4" />
              Edit
            </Button>
          </div>
        }
      />

      <div className="space-y-4">
        {/* Portrait + Identity */}
        <div className={npc.imageUrl ? 'grid gap-4 md:grid-cols-[1fr_2fr] items-stretch' : ''}>
        {npc.imageUrl && (
          <div className="h-full">
            <CloudinaryImage
              src={npc.imageUrl}
              alt={npc.name}
              width={400}
              className="h-full w-full rounded-lg border object-cover"
            />
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Identity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {npc.race && npc.race !== 'human' && (
              <div className="flex items-start gap-2">
                <span className="text-sm font-medium text-muted-foreground w-24 shrink-0">Race</span>
                <Badge variant="secondary">{npc.race.charAt(0).toUpperCase() + npc.race.slice(1)}</Badge>
              </div>
            )}
            {npc.description && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Description</span>
                <p className="text-sm mt-1 whitespace-pre-wrap">{npc.description}</p>
              </div>
            )}
            {npc.appearance && (
              <div className="flex items-start gap-2">
                <span className="text-sm font-medium text-muted-foreground w-24 shrink-0">Appearance</span>
                <span className="text-sm">{npc.appearance}</span>
              </div>
            )}
            {npc.voice && (
              <div className="flex items-start gap-2">
                <span className="text-sm font-medium text-muted-foreground w-24 shrink-0">Voice</span>
                <span className="text-sm">{npc.voice}</span>
              </div>
            )}
            {(region || poi) && (
              <div className="flex items-start gap-2">
                <span className="text-sm font-medium text-muted-foreground w-24 shrink-0 pt-0.5">
                  <MapPin className="size-3.5 inline mr-1" />Location
                </span>
                <div className="flex flex-wrap items-center gap-1 text-sm">
                  {region && (
                    <Link to="/realms/regions/$regionId" params={{ regionId: region.id }}>
                      <Badge variant="secondary" className="hover:bg-secondary/80 cursor-pointer">{region.name}</Badge>
                    </Link>
                  )}
                  {poiBreadcrumb.map((p, i) => (
                    <span key={p.id} className="flex items-center gap-1">
                      {(i > 0 || region) && <span className="text-muted-foreground">/</span>}
                      <Link
                        to="/realms/pois/$poiId"
                        params={{ poiId: p.id }}
                        className="text-primary hover:underline"
                      >
                        {p.name}
                      </Link>
                    </span>
                  ))}
                </div>
              </div>
            )}
            {npc.motivation && (
              <div className="flex items-start gap-2">
                <span className="text-sm font-medium text-muted-foreground w-24 shrink-0">Motivation</span>
                <span className="text-sm">{npc.motivation}</span>
              </div>
            )}
            {npc.want && (
              <div className="flex items-start gap-2">
                <span className="text-sm font-medium text-muted-foreground w-24 shrink-0">Want</span>
                <span className="text-sm">{npc.want}</span>
              </div>
            )}
            {npc.traits.length > 0 && (
              <div className="flex items-start gap-2">
                <span className="text-sm font-medium text-muted-foreground w-24 shrink-0 pt-0.5">Traits</span>
                <div className="flex flex-wrap gap-1">
                  {npc.traits.map((trait) => (
                    <Badge key={trait} variant="secondary">{trait}</Badge>
                  ))}
                </div>
              </div>
            )}
            {npc.tags.length > 0 && (
              <div className="flex items-start gap-2">
                <span className="text-sm font-medium text-muted-foreground w-24 shrink-0 pt-0.5">Tags</span>
                <div className="flex flex-wrap gap-1">
                  {npc.tags.map((tag) => (
                    <Badge key={tag} variant="outline">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground w-24 shrink-0">Status</span>
              {npc.lifeStatus === 'alive' ? (
                <Badge variant="secondary">Alive</Badge>
              ) : (
                <Badge variant="destructive">{npc.lifeStatus.charAt(0).toUpperCase() + npc.lifeStatus.slice(1)}</Badge>
              )}
              <Badge variant="outline">{npc.movementStatus.charAt(0).toUpperCase() + npc.movementStatus.slice(1)}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground w-24 shrink-0">Disposition</span>
              <DispositionBadge
                npc={npc}
                size="sm"
                onUpdateNPC={async (updated) => {
                  await executeUpdateNPC(
                    { ...updated, updatedAt: Date.now() },
                    { npcRepo: container.npcRepo },
                  )
                }}
              />
            </div>

            {/* Level & Class */}
            {(sb.level !== undefined || sb.className) && (
              <div className="flex items-center gap-4">
                {sb.level !== undefined && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">Level</span>
                    <span className="text-sm font-bold">{sb.level}</span>
                  </div>
                )}
                {sb.className && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">Class</span>
                    <Badge variant="secondary">{sb.className}</Badge>
                  </div>
                )}
              </div>
            )}

            {/* Stats table */}
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    {sb.stats.map((stat) => {
                      const def = systemConfig?.statFields.find((f: any) => f.key === stat.key)
                      return (
                        <th key={stat.key} className="p-1.5 text-center text-xs font-medium text-muted-foreground uppercase">
                          {def?.label ?? stat.key}
                        </th>
                      )
                    })}
                    <th className="p-1.5 text-center text-xs font-medium text-muted-foreground uppercase">
                      <Heart className="size-3 inline text-red-500" /> HP
                    </th>
                    <th className="p-1.5 text-center text-xs font-medium text-muted-foreground uppercase">
                      <Shield className="size-3 inline text-blue-500" /> {armorLabel}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {sb.stats.map((stat) => (
                      <td key={stat.key} className="p-1.5 text-center font-bold">
                        {stat.value}
                        {stat.modifier !== undefined && (
                          <span className="text-xs font-normal text-muted-foreground ml-0.5">
                            ({stat.modifier >= 0 ? '+' : ''}{stat.modifier})
                          </span>
                        )}
                      </td>
                    ))}
                    <td className="p-1.5 text-center font-bold">
                      <div className="inline-flex items-center gap-0.5">
                        <button
                          onClick={() => adjustHp(-1)}
                          className="size-5 inline-flex items-center justify-center rounded hover:bg-muted-foreground/20 transition-colors text-muted-foreground"
                        >
                          <ChevronDown className="size-3.5" />
                        </button>
                        <span>{sb.hp}</span>
                        <button
                          onClick={() => adjustHp(1)}
                          className="size-5 inline-flex items-center justify-center rounded hover:bg-muted-foreground/20 transition-colors text-muted-foreground"
                        >
                          <ChevronUp className="size-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="p-1.5 text-center font-bold">{sb.armor}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* HP bar */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={`h-full transition-all ${
                  hpPercent > 50 ? 'bg-green-500' : hpPercent > 25 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.max(0, Math.min(100, hpPercent))}%` }}
              />
            </div>
          </CardContent>
        </Card>
        </div>

        {/* Factions */}
        <FactionBlurb factions={factions.filter((f) => npc.factionIds?.includes(f.id))} />

        {/* Connections */}
        {connections.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Handshake className="size-4" />
                Connections ({connections.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {connections.map((c) => {
                const outgoing = c.fromId === npcId
                const otherId = outgoing ? c.toId : c.fromId
                const other = allNpcs.find((n) => n.id === otherId)
                // "serves" is the only directional edge; phrase the inbound side.
                const verb = outgoing
                  ? c.label
                  : c.label === 'serves'
                    ? 'is served by'
                    : c.label
                return (
                  <div key={c.id} className="flex items-center gap-2 text-sm">
                    <Badge variant="outline" className="capitalize">{c.kind}</Badge>
                    <span className="text-muted-foreground">{verb}</span>
                    {other ? (
                      <Link
                        to="/realms/npcs/$npcId"
                        params={{ npcId: otherId }}
                        className="font-medium hover:underline"
                      >
                        {other.name}
                      </Link>
                    ) : (
                      <span className="font-medium text-muted-foreground">Unknown</span>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}

        {/* Quests & Hooks */}
        {hooks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="size-4" />
                Quests &amp; Hooks ({hooks.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {hooks.map((h) => (
                <div key={h.id} className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="capitalize">{h.type.replace(/_/g, ' ')}</Badge>
                    <Badge variant="secondary">{h.role === 'contact' ? 'Offers' : 'Subject'}</Badge>
                    <span className="text-sm font-medium">{h.title}</span>
                  </div>
                  {h.secret.detail && (
                    <p className="text-sm italic text-foreground/80 leading-relaxed border-l-2 border-muted pl-3">
                      {h.secret.detail}
                    </p>
                  )}
                  {h.secret.targetType === 'poi' && (() => {
                    const target = pois.find((p) => p.id === h.secret.targetId)
                    return target ? (
                      <p className="text-xs">
                        <span className="text-muted-foreground">Location: </span>
                        <Link
                          to="/realms/pois/$poiId"
                          params={{ poiId: target.id }}
                          className="font-medium hover:underline"
                        >
                          {target.name}
                        </Link>
                      </p>
                    ) : null
                  })()}
                  {h.secret.targetType === 'npc' && (() => {
                    const target = allNpcs.find((n) => n.id === h.secret.targetId)
                    return target ? (
                      <p className="text-xs">
                        <span className="text-muted-foreground">Target: </span>
                        <Link
                          to="/realms/npcs/$npcId"
                          params={{ npcId: target.id }}
                          className="font-medium hover:underline"
                        >
                          {target.name}
                        </Link>
                      </p>
                    ) : null
                  })()}
                  {h.rewardText && (
                    <p className="text-xs text-muted-foreground">Reward: {h.rewardText}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Attacks */}
        {sb.attacks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Swords className="size-4" />
                Attacks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-2 text-left font-medium">Name</th>
                      <th className="p-2 text-left font-medium">Damage</th>
                      <th className="p-2 text-left font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sb.attacks.map((atk, idx) => (
                      <tr key={idx} className={idx < sb.attacks.length - 1 ? 'border-b' : ''}>
                        <td className="p-2 font-medium">{atk.name}</td>
                        <td className="p-2"><Badge variant="outline">{atk.damage}</Badge></td>
                        <td className="p-2 text-muted-foreground">{atk.description || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Inventory */}
        {sb.inventory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="size-4" />
                Inventory
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-2 text-left font-medium">Item</th>
                      <th className="p-2 text-center font-medium w-16">Slots</th>
                      <th className="p-2 text-left font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sb.inventory.map((item, idx) => (
                      <tr key={idx} className={idx < sb.inventory.length - 1 ? 'border-b' : ''}>
                        <td className="p-2 font-medium">{item.name}</td>
                        <td className="p-2 text-center">{item.slots}</td>
                        <td className="p-2 text-muted-foreground">{item.description || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Abilities */}
        {sb.abilities.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="size-4" />
                Abilities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1">
                {sb.abilities.map((ability) => (
                  <Badge key={ability} variant="secondary">{ability}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {sb.notes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{sb.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete NPC"
        description={`Are you sure you want to delete "${npc.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDeleteNPC}
      />
    </div>
  )
}

function FactionBlurb({ factions }: { factions: Faction[] }) {
  if (factions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Handshake className="size-4" />
            Factions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Not affiliated with any faction.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Handshake className="size-4" />
          Factions ({factions.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {factions.map((faction) => (
          <div key={faction.id} className="space-y-1">
            <div className="flex items-center gap-2">
              <Link
                to="/realms/factions/$factionId"
                params={{ factionId: faction.id }}
                className="text-primary hover:underline font-medium text-sm"
              >
                {faction.name}
              </Link>
              <Badge className={STATUS_COLORS[faction.status] ?? 'bg-gray-600'}>
                {faction.status.charAt(0).toUpperCase() + faction.status.slice(1)}
              </Badge>
              {faction.type && <Badge variant="outline">{faction.type}</Badge>}
            </div>
            {faction.traits.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {faction.traits.map((trait) => (
                  <Badge key={trait} variant="secondary" className="text-xs">{trait}</Badge>
                ))}
              </div>
            )}
            {faction.description && (
              <p className="text-sm text-muted-foreground">{faction.description}</p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
