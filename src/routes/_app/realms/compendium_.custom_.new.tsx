import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useUIStore } from '~/ui/stores/uiStore'
import { useContainer } from '~/ui/hooks/useContainer'
import { executeCreateCustomCompendiumEntry } from '@application/use-cases/CreateCustomCompendiumEntry'
import type { CustomCompendiumEntry, CustomMonsterData, CustomSpellData, CustomMagicItemData, CustomEquipmentData } from '@domain/entities/CustomCompendiumEntry'
import { newId } from '@shared/ulid'
import { PageHeader } from '~/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { Switch } from '~/components/ui/switch'
import { TagInput } from '~/components/shared/TagInput'
import { ArrowLeft, Save } from 'lucide-react'

export const Route = createFileRoute('/_app/realms/compendium_/custom_/new')({
  component: CustomCompendiumNewPage,
})

type Kind = 'monster' | 'spell' | 'magicItem' | 'equipment'

function CustomCompendiumNewPage() {
  const navigate = useNavigate()
  const activeRealmId = useUIStore((s) => s.activeRealmId)
  const container = useContainer()

  const [kind, setKind] = useState<Kind>('monster')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  // Monster fields
  const [ac, setAc] = useState('')
  const [hp, setHp] = useState('')
  const [speed, setSpeed] = useState('')
  const [attacks, setAttacks] = useState('')
  const [abilities, setAbilities] = useState('')
  const [cr, setCr] = useState('')

  // Spell fields
  const [level, setLevel] = useState('')
  const [school, setSchool] = useState('')
  const [castingTime, setCastingTime] = useState('')
  const [range, setRange] = useState('')
  const [duration, setDuration] = useState('')
  const [components, setComponents] = useState('')
  const [classes, setClasses] = useState<string[]>([])

  // Magic Item fields
  const [rarity, setRarity] = useState('')
  const [itemType, setItemType] = useState('')
  const [attunement, setAttunement] = useState(false)
  const [charges, setCharges] = useState('')
  const [properties, setProperties] = useState<string[]>([])

  // Equipment fields
  const [eqCost, setEqCost] = useState('')
  const [eqWeight, setEqWeight] = useState('')
  const [eqCategory, setEqCategory] = useState('')
  const [eqDamage, setEqDamage] = useState('')
  const [eqProperties, setEqProperties] = useState<string[]>([])

  const [saving, setSaving] = useState(false)

  if (!activeRealmId) {
    return <div className="py-8 text-center text-muted-foreground">No realm selected.</div>
  }

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)

    const now = Date.now()
    const entry: CustomCompendiumEntry = {
      id: newId(),
      worldId: activeRealmId,
      kind,
      name: name.trim(),
      description,
      createdAt: now,
      updatedAt: now,
    }

    if (kind === 'monster') {
      const monsterData: CustomMonsterData = {
        ac: ac ? parseInt(ac) : null,
        hp: hp ? parseInt(hp) : null,
        speed, attacks, abilities, cr,
      }
      entry.monsterData = monsterData
    } else if (kind === 'spell') {
      const spellData: CustomSpellData = {
        level, school, castingTime, range, duration, components, classes,
      }
      entry.spellData = spellData
    } else if (kind === 'equipment') {
      const equipmentData: CustomEquipmentData = {
        cost: eqCost, weight: eqWeight, category: eqCategory, damage: eqDamage, properties: eqProperties,
      }
      entry.equipmentData = equipmentData
    } else {
      const magicItemData: CustomMagicItemData = {
        rarity, itemType, attunement,
        charges: charges || null,
        properties,
      }
      entry.magicItemData = magicItemData
    }

    await executeCreateCustomCompendiumEntry(entry, container)
    navigate({ to: '/realms/compendium/custom/$entryId', params: { entryId: entry.id } })
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="New Custom Entry"
        actions={
          <Link to="/realms/compendium">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 size-4" />
              Back
            </Button>
          </Link>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as Kind)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monster">Monster</SelectItem>
                  <SelectItem value="spell">Spell</SelectItem>
                  <SelectItem value="magicItem">Magic Item</SelectItem>
                  <SelectItem value="equipment">Equipment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Entry name" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description (Markdown)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Description..." />
          </div>
        </CardContent>
      </Card>

      {kind === 'monster' && (
        <Card>
          <CardHeader><CardTitle className="text-base">Monster Stats</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>AC</Label>
                <Input type="number" value={ac} onChange={(e) => setAc(e.target.value)} placeholder="—" />
              </div>
              <div className="space-y-2">
                <Label>HP</Label>
                <Input type="number" value={hp} onChange={(e) => setHp(e.target.value)} placeholder="—" />
              </div>
              <div className="space-y-2">
                <Label>CR</Label>
                <Input value={cr} onChange={(e) => setCr(e.target.value)} placeholder="—" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Speed</Label>
              <Input value={speed} onChange={(e) => setSpeed(e.target.value)} placeholder="30 ft." />
            </div>
            <div className="space-y-2">
              <Label>Attacks</Label>
              <Textarea value={attacks} onChange={(e) => setAttacks(e.target.value)} rows={2} placeholder="Attack descriptions..." />
            </div>
            <div className="space-y-2">
              <Label>Abilities (Markdown)</Label>
              <Textarea value={abilities} onChange={(e) => setAbilities(e.target.value)} rows={4} placeholder="Special abilities..." />
            </div>
          </CardContent>
        </Card>
      )}

      {kind === 'spell' && (
        <Card>
          <CardHeader><CardTitle className="text-base">Spell Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Level</Label>
                <Input value={level} onChange={(e) => setLevel(e.target.value)} placeholder="1st" />
              </div>
              <div className="space-y-2">
                <Label>School</Label>
                <Input value={school} onChange={(e) => setSchool(e.target.value)} placeholder="Evocation" />
              </div>
              <div className="space-y-2">
                <Label>Casting Time</Label>
                <Input value={castingTime} onChange={(e) => setCastingTime(e.target.value)} placeholder="1 action" />
              </div>
              <div className="space-y-2">
                <Label>Range</Label>
                <Input value={range} onChange={(e) => setRange(e.target.value)} placeholder="60 ft." />
              </div>
              <div className="space-y-2">
                <Label>Duration</Label>
                <Input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="Instantaneous" />
              </div>
              <div className="space-y-2">
                <Label>Components</Label>
                <Input value={components} onChange={(e) => setComponents(e.target.value)} placeholder="V, S, M" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Classes</Label>
              <TagInput tags={classes} onChange={setClasses} placeholder="Add class..." />
            </div>
          </CardContent>
        </Card>
      )}

      {kind === 'magicItem' && (
        <Card>
          <CardHeader><CardTitle className="text-base">Magic Item Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Rarity</Label>
                <Input value={rarity} onChange={(e) => setRarity(e.target.value)} placeholder="Uncommon" />
              </div>
              <div className="space-y-2">
                <Label>Item Type</Label>
                <Input value={itemType} onChange={(e) => setItemType(e.target.value)} placeholder="Wondrous Item" />
              </div>
              <div className="space-y-2">
                <Label>Charges</Label>
                <Input value={charges} onChange={(e) => setCharges(e.target.value)} placeholder="—" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={attunement} onCheckedChange={setAttunement} />
              <Label>Requires Attunement</Label>
            </div>
            <div className="space-y-2">
              <Label>Properties</Label>
              <TagInput tags={properties} onChange={setProperties} placeholder="Add property..." />
            </div>
          </CardContent>
        </Card>
      )}

      {kind === 'equipment' && (
        <Card>
          <CardHeader><CardTitle className="text-base">Equipment Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Input value={eqCategory} onChange={(e) => setEqCategory(e.target.value)} placeholder="Weapon, Armor, Gear..." />
              </div>
              <div className="space-y-2">
                <Label>Cost</Label>
                <Input value={eqCost} onChange={(e) => setEqCost(e.target.value)} placeholder="10 gp" />
              </div>
              <div className="space-y-2">
                <Label>Weight</Label>
                <Input value={eqWeight} onChange={(e) => setEqWeight(e.target.value)} placeholder="5 lb" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Damage</Label>
              <Input value={eqDamage} onChange={(e) => setEqDamage(e.target.value)} placeholder="1d8 slashing" />
            </div>
            <div className="space-y-2">
              <Label>Properties</Label>
              <TagInput tags={eqProperties} onChange={setEqProperties} placeholder="Add property..." />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-2">
        <Link to="/realms/compendium">
          <Button variant="outline">Cancel</Button>
        </Link>
        <Button onClick={handleSave} disabled={!name.trim() || saving}>
          <Save className="mr-2 size-4" />
          {saving ? 'Saving...' : 'Create Entry'}
        </Button>
      </div>
    </div>
  )
}
