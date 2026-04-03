import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { queryDb, Schema } from '@livestore/livestore'
import { useQuery } from '@livestore/react'
import { parseJsonRows } from '@shared/parseJsonRow'
import { useContainer } from '~/ui/hooks/useContainer'
import { executeUpdateCustomCompendiumEntry } from '@application/use-cases/UpdateCustomCompendiumEntry'
import type { CustomMonsterData, CustomSpellData, CustomMagicItemData, CustomEquipmentData } from '@domain/entities/CustomCompendiumEntry'
import { PageHeader } from '~/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import { Switch } from '~/components/ui/switch'
import { TagInput } from '~/components/shared/TagInput'
import { ArrowLeft, Save } from 'lucide-react'

export const Route = createFileRoute('/_app/realms/compendium_/custom_/$entryId_/edit')({
  component: CustomCompendiumEditPage,
})

function CustomCompendiumEditPage() {
  const { entryId } = Route.useParams()
  const navigate = useNavigate()
  const container = useContainer()

  const entryResults = useQuery(queryDb({
    query: 'SELECT * FROM customCompendiumEntries WHERE id = $id LIMIT 1',
    schema: Schema.Array(Schema.Unknown),
    bindValues: { id: entryId },
  }, { deps: [entryId], map: parseJsonRows })) as import('@domain/entities/CustomCompendiumEntry').CustomCompendiumEntry[]
  const entry = entryResults[0] ?? null

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  // Monster
  const [ac, setAc] = useState('')
  const [hp, setHp] = useState('')
  const [speed, setSpeed] = useState('')
  const [attacks, setAttacks] = useState('')
  const [abilities, setAbilities] = useState('')
  const [cr, setCr] = useState('')

  // Spell
  const [level, setLevel] = useState('')
  const [school, setSchool] = useState('')
  const [castingTime, setCastingTime] = useState('')
  const [range, setRange] = useState('')
  const [duration, setDuration] = useState('')
  const [components, setComponents] = useState('')
  const [classes, setClasses] = useState<string[]>([])

  // Magic Item
  const [rarity, setRarity] = useState('')
  const [itemType, setItemType] = useState('')
  const [attunement, setAttunement] = useState(false)
  const [charges, setCharges] = useState('')
  const [properties, setProperties] = useState<string[]>([])

  // Equipment
  const [eqCost, setEqCost] = useState('')
  const [eqWeight, setEqWeight] = useState('')
  const [eqCategory, setEqCategory] = useState('')
  const [eqDamage, setEqDamage] = useState('')
  const [eqProperties, setEqProperties] = useState<string[]>([])

  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (entry && !loaded) {
      setName(entry.name)
      setDescription(entry.description)
      if (entry.kind === 'monster' && entry.monsterData) {
        setAc(entry.monsterData.ac != null ? String(entry.monsterData.ac) : '')
        setHp(entry.monsterData.hp != null ? String(entry.monsterData.hp) : '')
        setSpeed(entry.monsterData.speed)
        setAttacks(entry.monsterData.attacks)
        setAbilities(entry.monsterData.abilities)
        setCr(entry.monsterData.cr)
      }
      if (entry.kind === 'spell' && entry.spellData) {
        setLevel(entry.spellData.level)
        setSchool(entry.spellData.school)
        setCastingTime(entry.spellData.castingTime)
        setRange(entry.spellData.range)
        setDuration(entry.spellData.duration)
        setComponents(entry.spellData.components)
        setClasses(entry.spellData.classes)
      }
      if (entry.kind === 'magicItem' && entry.magicItemData) {
        setRarity(entry.magicItemData.rarity)
        setItemType(entry.magicItemData.itemType)
        setAttunement(entry.magicItemData.attunement)
        setCharges(entry.magicItemData.charges ?? '')
        setProperties(entry.magicItemData.properties)
      }
      if (entry.kind === 'equipment' && entry.equipmentData) {
        setEqCost(entry.equipmentData.cost)
        setEqWeight(entry.equipmentData.weight)
        setEqCategory(entry.equipmentData.category)
        setEqDamage(entry.equipmentData.damage)
        setEqProperties(entry.equipmentData.properties)
      }
      setLoaded(true)
    }
  }, [entry, loaded])

  if (!entry) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink entryId={entryId} />
        <div className="py-8 text-center text-muted-foreground">Entry not found.</div>
      </div>
    )
  }

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)

    const updated = { ...entry, name: name.trim(), description }

    if (entry.kind === 'monster') {
      const monsterData: CustomMonsterData = {
        ac: ac ? parseInt(ac) : null,
        hp: hp ? parseInt(hp) : null,
        speed, attacks, abilities, cr,
      }
      updated.monsterData = monsterData
    } else if (entry.kind === 'spell') {
      const spellData: CustomSpellData = {
        level, school, castingTime, range, duration, components, classes,
      }
      updated.spellData = spellData
    } else if (entry.kind === 'equipment') {
      const equipmentData: CustomEquipmentData = {
        cost: eqCost, weight: eqWeight, category: eqCategory, damage: eqDamage, properties: eqProperties,
      }
      updated.equipmentData = equipmentData
    } else {
      const magicItemData: CustomMagicItemData = {
        rarity, itemType, attunement,
        charges: charges || null,
        properties,
      }
      updated.magicItemData = magicItemData
    }

    await executeUpdateCustomCompendiumEntry(updated, container)
    navigate({ to: '/realms/compendium/custom/$entryId', params: { entryId: entry.id } })
  }

  const kindLabel = entry.kind === 'monster' ? 'Monster' : entry.kind === 'spell' ? 'Spell' : entry.kind === 'equipment' ? 'Equipment' : 'Magic Item'

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={`Edit ${kindLabel}`}
        actions={<BackLink entryId={entryId} />}
      />

      <Card>
        <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Description (Markdown)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
          </div>
        </CardContent>
      </Card>

      {entry.kind === 'monster' && (
        <Card>
          <CardHeader><CardTitle className="text-base">Monster Stats</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>AC</Label>
                <Input type="number" value={ac} onChange={(e) => setAc(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>HP</Label>
                <Input type="number" value={hp} onChange={(e) => setHp(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>CR</Label>
                <Input value={cr} onChange={(e) => setCr(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Speed</Label>
              <Input value={speed} onChange={(e) => setSpeed(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Attacks</Label>
              <Textarea value={attacks} onChange={(e) => setAttacks(e.target.value)} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Abilities (Markdown)</Label>
              <Textarea value={abilities} onChange={(e) => setAbilities(e.target.value)} rows={4} />
            </div>
          </CardContent>
        </Card>
      )}

      {entry.kind === 'spell' && (
        <Card>
          <CardHeader><CardTitle className="text-base">Spell Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Level</Label>
                <Input value={level} onChange={(e) => setLevel(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>School</Label>
                <Input value={school} onChange={(e) => setSchool(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Casting Time</Label>
                <Input value={castingTime} onChange={(e) => setCastingTime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Range</Label>
                <Input value={range} onChange={(e) => setRange(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Duration</Label>
                <Input value={duration} onChange={(e) => setDuration(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Components</Label>
                <Input value={components} onChange={(e) => setComponents(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Classes</Label>
              <TagInput tags={classes} onChange={setClasses} placeholder="Add class..." />
            </div>
          </CardContent>
        </Card>
      )}

      {entry.kind === 'magicItem' && (
        <Card>
          <CardHeader><CardTitle className="text-base">Magic Item Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Rarity</Label>
                <Input value={rarity} onChange={(e) => setRarity(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Item Type</Label>
                <Input value={itemType} onChange={(e) => setItemType(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Charges</Label>
                <Input value={charges} onChange={(e) => setCharges(e.target.value)} />
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

      {entry.kind === 'equipment' && (
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
        <Link to="/realms/compendium/custom/$entryId" params={{ entryId: entry.id }}>
          <Button variant="outline">Cancel</Button>
        </Link>
        <Button onClick={handleSave} disabled={!name.trim() || saving}>
          <Save className="mr-2 size-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}

function BackLink({ entryId }: { entryId: string }) {
  return (
    <Link to="/realms/compendium/custom/$entryId" params={{ entryId }}>
      <Button variant="ghost" size="sm">
        <ArrowLeft className="mr-2 size-4" />
        Back
      </Button>
    </Link>
  )
}
