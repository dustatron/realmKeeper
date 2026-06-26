import type { NPC } from '@domain/entities/NPC'
import type { SystemBlock, Attack } from '@domain/value-objects/SystemBlock'
import type { SystemConfig } from '@domain/entities/SystemConfig'
import type { Faction } from '@domain/entities/Faction'
import type { Region } from '@domain/entities/Region'
import type { POI } from '@domain/entities/POI'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '~/components/ui/sheet'
import { Card, CardContent } from '~/components/ui/card'
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
import { Switch } from '~/components/ui/switch'
import { ScrollArea } from '~/components/ui/scroll-area'
import { TagInput } from '~/components/shared/TagInput'
import { getAllRaces } from '@shared/constants'
import { Badge } from '~/components/ui/badge'
import { Plus, Trash2, Sparkles } from 'lucide-react'
import { ImagePicker } from '~/components/shared/ImagePicker'
import { NPCInventoryEditor } from '~/components/shared/NPCInventoryEditor'

export interface NPCEditSheetProps {
  npc: NPC
  systemConfig: SystemConfig | null
  factions: Faction[]
  regions: Region[]
  pois: POI[]
  customRaces?: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: () => void
  onChange: (npc: NPC) => void
  onDelete?: () => void
  onGenerate?: () => void
  isGenerating?: boolean
}

export function NPCEditSheet({
  npc,
  systemConfig,
  factions,
  regions,
  pois,
  customRaces = [],
  open,
  onOpenChange,
  onSave,
  onChange,
  onDelete,
  onGenerate,
  isGenerating,
}: NPCEditSheetProps) {
  const updateField = (field: keyof NPC, value: any) => {
    onChange({ ...npc, [field]: value })
  }

  const updateSystemBlock = (updates: Partial<SystemBlock>) => {
    onChange({
      ...npc,
      systemBlock: { ...npc.systemBlock, ...updates },
    })
  }

  const updateStat = (key: string, value: number) => {
    const stats = npc.systemBlock.stats.map((s) =>
      s.key === key ? { ...s, value } : s
    )
    updateSystemBlock({ stats })
  }

  const addAttack = () => {
    updateSystemBlock({
      attacks: [...npc.systemBlock.attacks, { name: '', damage: '', description: '' }],
    })
  }

  const updateAttack = (index: number, updates: Partial<Attack>) => {
    const attacks = npc.systemBlock.attacks.map((a, i) =>
      i === index ? { ...a, ...updates } : a
    )
    updateSystemBlock({ attacks })
  }

  const removeAttack = (index: number) => {
    updateSystemBlock({
      attacks: npc.systemBlock.attacks.filter((_, i) => i !== index),
    })
  }

  const hpPercent = npc.systemBlock.maxHp > 0 ? (npc.systemBlock.hp / npc.systemBlock.maxHp) * 100 : 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col h-full">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>{npc.name || 'New NPC'}</SheetTitle>
            {onGenerate && (
              <Button size="sm" variant="outline" onClick={onGenerate} disabled={isGenerating}>
                <Sparkles className="mr-1.5 size-3.5" />
                {isGenerating ? 'Generating...' : 'Auto Generate'}
              </Button>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-6 px-4 py-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={npc.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="NPC name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="race">Race</Label>
                <Select
                  value={npc.race ?? 'human'}
                  onValueChange={(v) => updateField('race', v)}
                >
                  <SelectTrigger id="race">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getAllRaces(customRaces).map((r) => (
                      <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Image */}
              <div className="space-y-2">
                <Label>Portrait</Label>
                <ImagePicker
                  imageUrl={npc.imageUrl}
                  onImageChange={(url) => onChange({ ...npc, imageUrl: url })}
                  label="Portrait"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={npc.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="NPC description (supports Markdown)"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Traits</Label>
                <TagInput
                  tags={npc.traits}
                  onChange={(traits) => updateField('traits', traits)}
                  placeholder="Add trait..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="motivation">Motivation</Label>
                <Input
                  id="motivation"
                  value={npc.motivation}
                  onChange={(e) => updateField('motivation', e.target.value)}
                  placeholder="What drives this character?"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="appearance">Appearance</Label>
                <Input
                  id="appearance"
                  value={npc.appearance}
                  onChange={(e) => updateField('appearance', e.target.value)}
                  placeholder="Physical description"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="voice">Voice</Label>
                <Input
                  id="voice"
                  value={npc.voice}
                  onChange={(e) => updateField('voice', e.target.value)}
                  placeholder="How they speak"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="want">Want</Label>
                <Input
                  id="want"
                  value={npc.want}
                  onChange={(e) => updateField('want', e.target.value)}
                  placeholder="Side quest hook — what they'd pay adventurers to do"
                />
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <TagInput
                  tags={npc.tags}
                  onChange={(tags) => updateField('tags', tags)}
                  placeholder="Add tag..."
                />
              </div>

              <div className="space-y-2">
                <Label>Factions</Label>
                <div className="flex flex-wrap gap-1.5">
                  {factions.map((f) => {
                    const active = npc.factionIds.includes(f.id)
                    return (
                      <Badge
                        key={f.id}
                        variant={active ? 'default' : 'outline'}
                        className="cursor-pointer select-none"
                        onClick={() => updateField('factionIds', active ? npc.factionIds.filter((id: string) => id !== f.id) : [...npc.factionIds, f.id])}
                      >
                        {f.name}
                      </Badge>
                    )
                  })}
                  {factions.length === 0 && <span className="text-sm text-muted-foreground">No factions</span>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="region">Region</Label>
                <Select
                  value={npc.regionId ?? 'none'}
                  onValueChange={(v) => updateField('regionId', v === 'none' ? null : v)}
                >
                  <SelectTrigger id="region">
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {regions.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="poi">POI</Label>
                <Select
                  value={npc.poiId ?? 'none'}
                  onValueChange={(v) => updateField('poiId', v === 'none' ? null : v)}
                >
                  <SelectTrigger id="poi">
                    <SelectValue placeholder="Select POI" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {pois.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lifeStatus">Life Status</Label>
                <Select
                  value={npc.lifeStatus}
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

              <div className="space-y-2">
                <Label htmlFor="movementStatus">Movement Status</Label>
                <Select
                  value={npc.movementStatus}
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

            {/* System Block */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold">System Stats</h3>

              {/* Level & Class */}
              {systemConfig?.hasLevel && (
                <div className="space-y-2">
                  <Label htmlFor="level">Level</Label>
                  <Input
                    id="level"
                    type="number"
                    min={1}
                    value={npc.systemBlock.level ?? 1}
                    onChange={(e) => updateSystemBlock({ level: parseInt(e.target.value) || 1 })}
                  />
                </div>
              )}
              {systemConfig?.hasClass && (
                <div className="space-y-2">
                  <Label htmlFor="className">Class</Label>
                  <Input
                    id="className"
                    value={npc.systemBlock.className ?? ''}
                    onChange={(e) => updateSystemBlock({ className: e.target.value })}
                    placeholder="Fighter, Thief, Priest, Wizard..."
                  />
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                {npc.systemBlock.stats.map((stat) => {
                  const statDef = systemConfig?.statFields.find((f) => f.key === stat.key)
                  return (
                    <div key={stat.key} className="space-y-2">
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
              <div className="space-y-2">
                <Label>
                  {systemConfig?.hpLabel ?? 'HP'}: {npc.systemBlock.hp}/{npc.systemBlock.maxHp}
                </Label>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className={`h-full transition-all ${
                      hpPercent > 50
                        ? 'bg-green-500'
                        : hpPercent > 25
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.max(0, Math.min(100, hpPercent))}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hp">Current HP</Label>
                    <Input
                      id="hp"
                      type="number"
                      value={npc.systemBlock.hp}
                      onChange={(e) => updateSystemBlock({ hp: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxHp">Max HP</Label>
                    <Input
                      id="maxHp"
                      type="number"
                      value={npc.systemBlock.maxHp}
                      onChange={(e) => updateSystemBlock({ maxHp: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              </div>

              {/* Armor */}
              <div className="space-y-2">
                <Label htmlFor="armor">{systemConfig?.armorLabel ?? 'Armor'}</Label>
                <Input
                  id="armor"
                  type="number"
                  value={npc.systemBlock.armor}
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
                <div className="space-y-2">
                  {npc.systemBlock.attacks.map((attack, i) => (
                    <Card key={i}>
                      <CardContent className="space-y-2 pt-4">
                        <div className="flex items-start justify-between gap-2">
                          <Input
                            placeholder="Attack name"
                            value={attack.name}
                            onChange={(e) => updateAttack(i, { name: e.target.value })}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeAttack(i)}
                          >
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
              </div>

              {/* Inventory */}
              <NPCInventoryEditor
                inventory={npc.systemBlock.inventory}
                onChange={(inventory) => updateSystemBlock({ inventory })}
                systemId={systemConfig?.id}
                worldId={npc.worldId}
              />

              {/* Abilities */}
              <div className="space-y-2">
                <Label>Abilities</Label>
                <TagInput
                  tags={npc.systemBlock.abilities}
                  onChange={(abilities) => updateSystemBlock({ abilities })}
                  placeholder="Add ability..."
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={npc.systemBlock.notes}
                  onChange={(e) => updateSystemBlock({ notes: e.target.value })}
                  placeholder="System-specific notes"
                  rows={3}
                />
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="flex shrink-0 items-center gap-2 border-t px-4 pt-4 pb-4">
          {onDelete && (
            <Button variant="destructive" size="sm" onClick={onDelete} className="mr-auto">
              <Trash2 className="mr-2 size-4" />
              Delete
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={onSave}>Save</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
