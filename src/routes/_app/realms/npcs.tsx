import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { useUIStore } from '~/ui/stores/uiStore'
import { useNPCs } from '~/ui/hooks/useNPCs'
import { useFactions } from '~/ui/hooks/useFactions'
import { useRegions } from '~/ui/hooks/useRegions'
import { useRealmPOIs } from '~/ui/hooks/usePOIs'
import { useContainer } from '~/ui/hooks/useContainer'
import { executeDeleteNPC } from '@application/use-cases/DeleteNPC'
import type { LifeStatus } from '@shared/constants'
import { PageHeader } from '~/components/shared/PageHeader'
import { EmptyState } from '~/components/shared/EmptyState'
import { FilterBar } from '~/components/shared/FilterBar'
import { ConfirmDialog } from '~/components/shared/ConfirmDialog'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '~/components/ui/table'
import { Button } from '~/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Badge } from '~/components/ui/badge'
import { Users, Plus, Trash2, Skull } from 'lucide-react'

export const Route = createFileRoute('/_app/realms/npcs')({
  component: NPCsPage,
})

function NPCsPage() {
  const activeRealmId = useUIStore((s) => s.activeRealmId)
  const npcs = useNPCs(activeRealmId)
  const factions = useFactions(activeRealmId)
  const regions = useRegions(activeRealmId)
  const pois = useRealmPOIs(activeRealmId)
  const container = useContainer()

  const [search, setSearch] = useState('')
  const [factionFilter, setFactionFilter] = useState<string>('all')
  const [lifeStatusFilter, setLifeStatusFilter] = useState<LifeStatus | 'all'>('all')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const filteredNPCs = useMemo(() => {
    return npcs.filter((npc) => {
      if (search && !npc.name.toLowerCase().includes(search.toLowerCase())) return false
      if (factionFilter !== 'all' && !npc.factionIds?.includes(factionFilter)) return false
      if (lifeStatusFilter !== 'all' && npc.lifeStatus !== lifeStatusFilter) return false
      return true
    })
  }, [npcs, search, factionFilter, lifeStatusFilter])

  const handleDeleteNPC = async () => {
    if (!deleteTarget) return
    await executeDeleteNPC(deleteTarget, { npcRepo: container.npcRepo })
    setDeleteTarget(null)
  }

  if (!activeRealmId) {
    return (
      <div>
        <PageHeader title="NPCs" description="Create and manage non-player characters." />
        <EmptyState
          icon={Users}
          title="No realm selected"
          description="Select a realm to manage NPCs."
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="NPCs"
        description="Create and manage non-player characters."
        actions={
          <Link to="/realms/npcs/new">
            <Button>
              <Plus className="mr-2 size-4" />
              Create NPC
            </Button>
          </Link>
        }
      />

      {npcs.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No NPCs yet"
          description="Generate or create your first NPC."
          action={
            <Link to="/realms/npcs/new">
              <Button>
                <Plus className="mr-2 size-4" />
                Create NPC
              </Button>
            </Link>
          }
        />
      ) : (
        <>
          <FilterBar search={search} onSearchChange={setSearch}>
            <Select value={factionFilter} onValueChange={setFactionFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Factions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Factions</SelectItem>
                {factions.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={lifeStatusFilter} onValueChange={(v) => setLifeStatusFilter(v as typeof lifeStatusFilter)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="alive">Alive</SelectItem>
                <SelectItem value="dead">Dead</SelectItem>
                <SelectItem value="undead">Undead</SelectItem>
                <SelectItem value="ghost">Ghost</SelectItem>
              </SelectContent>
            </Select>
          </FilterBar>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Faction</TableHead>
                  <TableHead className="hidden md:table-cell">Region</TableHead>
                  <TableHead className="hidden lg:table-cell">POI</TableHead>
                  <TableHead className="hidden lg:table-cell">Traits</TableHead>
                  <TableHead className="text-center hidden sm:table-cell">HP</TableHead>
                  <TableHead className="text-center hidden sm:table-cell">Armor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNPCs.map((npc) => {
                  const npcFactions = factions.filter((f) => npc.factionIds?.includes(f.id))
                  const region = regions.find((r) => r.id === npc.regionId)
                  const poi = pois.find((p) => p.id === npc.poiId)
                  return (
                    <TableRow key={npc.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <Link
                          to="/realms/npcs/$npcId"
                          params={{ npcId: npc.id }}
                          className="text-primary hover:underline"
                        >
                          {npc.name || 'Unnamed NPC'}
                        </Link>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {npcFactions.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {npcFactions.map((f) => (
                              <Badge key={f.id} variant="outline">{f.name}</Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {region ? (
                          <Badge variant="secondary">{region.name}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {poi ? (
                          <Badge variant="outline">{poi.name}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {npc.traits.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {npc.traits.slice(0, 3).map((trait) => (
                              <Badge key={trait} variant="secondary" className="text-xs">{trait}</Badge>
                            ))}
                            {npc.traits.length > 3 && (
                              <Badge variant="outline" className="text-xs">+{npc.traits.length - 3}</Badge>
                            )}
                          </div>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-center hidden sm:table-cell">
                        <span className={npc.systemBlock.hp <= 0 ? 'text-red-500 font-semibold' : ''}>
                          {npc.systemBlock.hp}/{npc.systemBlock.maxHp}
                        </span>
                      </TableCell>
                      <TableCell className="text-center hidden sm:table-cell">{npc.systemBlock.armor}</TableCell>
                      <TableCell>
                        {npc.lifeStatus === 'alive' ? (
                          <Badge variant="secondary" className="text-xs">Alive</Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs gap-1">
                            <Skull className="size-3" />{npc.lifeStatus.charAt(0).toUpperCase() + npc.lifeStatus.slice(1)}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" className="size-7" onClick={(e) => { e.stopPropagation(); setDeleteTarget(npc.id) }}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete NPC"
        description="Are you sure you want to delete this NPC? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDeleteNPC}
      />
    </div>
  )
}
