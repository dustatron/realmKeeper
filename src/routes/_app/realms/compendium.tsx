import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { useActiveRealm } from '~/ui/hooks/useActiveRealm'
import {
  getMonstersBySystemId,
  getSpellsBySystemId,
  getMagicItemsBySystemId,
  getEquipmentBySystemId,
} from '@domain/data/compendium'
import type {
  CompendiumMonster,
  CompendiumSpell,
  CompendiumMagicItem,
  CompendiumEquipment,
} from '@domain/entities/Compendium'
import { PageHeader } from '~/components/shared/PageHeader'
import { FilterBar } from '~/components/shared/FilterBar'
import { EmptyState } from '~/components/shared/EmptyState'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '~/components/ui/tabs'
import { ScrollArea } from '~/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table'
import { Book, Sword, Wand2, Gem, Shield } from 'lucide-react'

export const Route = createFileRoute('/_app/realms/compendium')({
  component: CompendiumPage,
})

function CompendiumPage() {
  const realm = useActiveRealm()
  const systemId = realm?.systemId ?? ''

  const monsters = useMemo(() => getMonstersBySystemId(systemId), [systemId])
  const spells = useMemo(() => getSpellsBySystemId(systemId), [systemId])
  const magicItems = useMemo(() => getMagicItemsBySystemId(systemId), [systemId])
  const equipment = useMemo(() => getEquipmentBySystemId(systemId), [systemId])

  const [monsterSearch, setMonsterSearch] = useState('')
  const [spellSearch, setSpellSearch] = useState('')
  const [magicItemSearch, setMagicItemSearch] = useState('')
  const [equipmentSearch, setEquipmentSearch] = useState('')

  const filteredMonsters = useMemo(() => {
    if (!monsterSearch) return monsters
    const q = monsterSearch.toLowerCase()
    return monsters.filter(
      (m) => m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q)
    )
  }, [monsters, monsterSearch])

  const filteredSpells = useMemo(() => {
    if (!spellSearch) return spells
    const q = spellSearch.toLowerCase()
    return spells.filter(
      (s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)
    )
  }, [spells, spellSearch])

  const filteredMagicItems = useMemo(() => {
    if (!magicItemSearch) return magicItems
    const q = magicItemSearch.toLowerCase()
    return magicItems.filter(
      (i) => i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q)
    )
  }, [magicItems, magicItemSearch])

  const filteredEquipment = useMemo(() => {
    if (!equipmentSearch) return equipment
    const q = equipmentSearch.toLowerCase()
    return equipment.filter(
      (e) => e.name.toLowerCase().includes(q) || e.description.toLowerCase().includes(q)
    )
  }, [equipment, equipmentSearch])

  type TabDef = { value: string; label: string; icon: typeof Book; count: number }
  const tabs: TabDef[] = [
    { value: 'monsters', label: 'Monsters', icon: Sword, count: monsters.length },
    { value: 'spells', label: 'Spells', icon: Wand2, count: spells.length },
    { value: 'magic-items', label: 'Magic Items', icon: Gem, count: magicItems.length },
    { value: 'equipment', label: 'Equipment', icon: Shield, count: equipment.length },
  ].filter((t) => t.count > 0)

  if (!realm) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Compendium" description="Browse game system reference data." />
        <EmptyState icon={Book} title="No realm selected" description="Select a realm to browse its compendium." />
      </div>
    )
  }

  if (tabs.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Compendium" description="Browse game system reference data." />
        <EmptyState icon={Book} title="No compendium data" description="This system has no compendium entries." />
      </div>
    )
  }

  const defaultTab = tabs[0].value

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Compendium" description="Browse game system reference data." />

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="gap-1.5">
              <t.icon className="size-4" />
              {t.label}
              <Badge variant="secondary" className="ml-1 text-xs">{t.count}</Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Monsters */}
        {monsters.length > 0 && (
          <TabsContent value="monsters">
            <div className="space-y-4">
              <FilterBar search={monsterSearch} onSearchChange={setMonsterSearch} />
              {filteredMonsters.length === 0 ? (
                <EmptyState icon={Sword} title="No matches" description="Try a different search." />
              ) : (
                <ScrollArea className="h-[calc(100vh-16rem)]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredMonsters.map((m) => (
                      <MonsterCard key={m.id} monster={m} />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </TabsContent>
        )}

        {/* Spells */}
        {spells.length > 0 && (
          <TabsContent value="spells">
            <div className="space-y-4">
              <FilterBar search={spellSearch} onSearchChange={setSpellSearch} />
              {filteredSpells.length === 0 ? (
                <EmptyState icon={Wand2} title="No matches" description="Try a different search." />
              ) : (
                <ScrollArea className="h-[calc(100vh-16rem)]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredSpells.map((s) => (
                      <SpellCard key={s.id} spell={s} />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </TabsContent>
        )}

        {/* Magic Items */}
        {magicItems.length > 0 && (
          <TabsContent value="magic-items">
            <div className="space-y-4">
              <FilterBar search={magicItemSearch} onSearchChange={setMagicItemSearch} />
              {filteredMagicItems.length === 0 ? (
                <EmptyState icon={Gem} title="No matches" description="Try a different search." />
              ) : (
                <ScrollArea className="h-[calc(100vh-16rem)]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredMagicItems.map((i) => (
                      <MagicItemCard key={i.id} item={i} />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </TabsContent>
        )}

        {/* Equipment */}
        {equipment.length > 0 && (
          <TabsContent value="equipment">
            <div className="space-y-4">
              <FilterBar search={equipmentSearch} onSearchChange={setEquipmentSearch} />
              {filteredEquipment.length === 0 ? (
                <EmptyState icon={Shield} title="No matches" description="Try a different search." />
              ) : (
                <ScrollArea className="h-[calc(100vh-16rem)]">
                  <EquipmentTable items={filteredEquipment} />
                </ScrollArea>
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

function MonsterCard({ monster }: { monster: CompendiumMonster }) {
  return (
    <Link
      to="/realms/compendium/monsters/$monsterId"
      params={{ monsterId: monster.id }}
      className="block"
    >
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="truncate">{monster.name}</span>
            <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-400 text-xs shrink-0 ml-2">
              {monster.systemData.system}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground line-clamp-2">{monster.description}</p>
        </CardContent>
      </Card>
    </Link>
  )
}

function SpellCard({ spell }: { spell: CompendiumSpell }) {
  const sd = spell.systemData
  return (
    <Link
      to="/realms/compendium/spells/$spellId"
      params={{ spellId: spell.id }}
      className="block"
    >
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between gap-2">
            <span className="truncate">{spell.name}</span>
            <div className="flex items-center gap-1 shrink-0">
              {sd.system === 'shadowdark' && (
                <>
                  <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 text-xs">
                    {sd.data.tier}
                  </Badge>
                  {sd.data.classes.map((c) => (
                    <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
                  ))}
                </>
              )}
              {sd.system === 'cairn' && (
                <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 text-xs">
                  #{sd.data.number}
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground line-clamp-2">{spell.description}</p>
        </CardContent>
      </Card>
    </Link>
  )
}

function MagicItemCard({ item }: { item: CompendiumMagicItem }) {
  const sd = item.systemData
  return (
    <Link
      to="/realms/compendium/magic-items/$itemId"
      params={{ itemId: item.id }}
      className="block"
    >
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between gap-2">
            <span className="truncate">{item.name}</span>
            {sd.system === 'cairn' && sd.data.charges && (
              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 text-xs shrink-0">
                {sd.data.charges} charges
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
        </CardContent>
      </Card>
    </Link>
  )
}

function EquipmentTable({ items }: { items: CompendiumEquipment[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Category</TableHead>
          <TableHead className="text-right">Cost</TableHead>
          <TableHead className="text-right">Damage</TableHead>
          <TableHead className="text-right">Armor</TableHead>
          <TableHead className="text-right">Slots</TableHead>
          <TableHead>Properties</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => {
          const sd = item.systemData
          const cost = sd.system === 'cairn'
            ? sd.data.cost ? `${sd.data.cost} gp` : '—'
            : `${sd.data.cost.amount} ${sd.data.cost.currency}`
          const category = sd.system === 'cairn' ? sd.data.category : sd.data.itemType
          const damage = sd.data.damage ?? '—'
          const armor = sd.system === 'cairn' ? (sd.data.armor != null ? String(sd.data.armor) : '—') : '—'
          const slots = sd.system === 'cairn'
            ? (sd.data.slots != null ? String(sd.data.slots) : '—')
            : (sd.data.slot > 0 ? String(sd.data.slot) : '—')
          const properties = sd.data.properties

          return (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.name}</TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">{category}</Badge>
              </TableCell>
              <TableCell className="text-right text-sm">{cost}</TableCell>
              <TableCell className="text-right text-sm">{damage}</TableCell>
              <TableCell className="text-right text-sm">{armor}</TableCell>
              <TableCell className="text-right text-sm">{slots}</TableCell>
              <TableCell>
                {properties.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {properties.map((p) => (
                      <Badge key={p} className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-xs">{p}</Badge>
                    ))}
                  </div>
                ) : '—'}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
