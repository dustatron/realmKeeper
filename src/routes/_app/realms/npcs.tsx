import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { useUIStore } from '~/ui/stores/uiStore'
import { useNPCs } from '~/ui/hooks/useNPCs'
import { useFactions } from '~/ui/hooks/useFactions'
import { useRegions } from '~/ui/hooks/useRegions'
import { useActiveRealm } from '~/ui/hooks/useActiveRealm'
import { useSystemConfig } from '~/ui/hooks/useSystemConfigs'
import { useContainer } from '~/ui/hooks/useContainer'
import { executeCreateNPC } from '@application/use-cases/CreateNPC'
import { executeUpdateNPC } from '@application/use-cases/UpdateNPC'
import { executeDeleteNPC } from '@application/use-cases/DeleteNPC'
import { executeGenerateNPC } from '@application/use-cases/GenerateNPC'
import type { NPC } from '@domain/entities/NPC'
import type { SystemBlock } from '@domain/value-objects/SystemBlock'
import { newId } from '@shared/ulid'
import { PageHeader } from '~/components/shared/PageHeader'
import { EmptyState } from '~/components/shared/EmptyState'
import { FilterBar } from '~/components/shared/FilterBar'
import { ConfirmDialog } from '~/components/shared/ConfirmDialog'
import { TagInput } from '~/components/shared/TagInput'
import { NPCEditSheet } from '~/components/shared/NPCEditSheet'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '~/components/ui/dialog'
import { Card, CardContent } from '~/components/ui/card'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '~/components/ui/table'
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
import { Switch } from '~/components/ui/switch'
import { Users, Plus, Pencil, Trash2, Dices, Skull } from 'lucide-react'

export const Route = createFileRoute('/_app/realms/npcs')({
  component: NPCsPage,
})

function NPCsPage() {
  const activeRealmId = useUIStore((s) => s.activeRealmId)
  const realm = useActiveRealm()
  const npcs = useNPCs(activeRealmId)
  const factions = useFactions(activeRealmId)
  const regions = useRegions(activeRealmId)
  const systemConfig = useSystemConfig(realm?.systemId ?? null)
  const container = useContainer()

  const [search, setSearch] = useState('')
  const [factionFilter, setFactionFilter] = useState<string>('all')
  const [aliveFilter, setAliveFilter] = useState<'all' | 'alive' | 'dead'>('all')
  const [editingNPC, setEditingNPC] = useState<NPC | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const filteredNPCs = useMemo(() => {
    return npcs.filter((npc) => {
      // Search filter
      if (search && !npc.name.toLowerCase().includes(search.toLowerCase())) {
        return false
      }
      // Faction filter
      if (factionFilter !== 'all' && npc.factionId !== factionFilter) {
        return false
      }
      // Alive filter
      if (aliveFilter === 'alive' && !npc.isAlive) {
        return false
      }
      if (aliveFilter === 'dead' && npc.isAlive) {
        return false
      }
      return true
    })
  }, [npcs, search, factionFilter, aliveFilter])

  const handleGenerateNPC = async () => {
    if (!activeRealmId || !systemConfig) return
    setIsGenerating(true)
    try {
      // Auto-select faction/region: use filter if set, otherwise pick a random one
      const autoFactionId = factionFilter !== 'all'
        ? factionFilter
        : factions.length > 0
          ? factions[Math.floor(Math.random() * factions.length)].id
          : undefined
      const autoRegionId = regions.length > 0
        ? regions[Math.floor(Math.random() * regions.length)].id
        : undefined
      const npc = await executeGenerateNPC(
        { realmId: activeRealmId, systemConfig, factionId: autoFactionId, regionId: autoRegionId },
        { tableRepo: container.tableRepo }
      )
      setEditingNPC(npc)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCreateNew = () => {
    if (!activeRealmId || !systemConfig) return
    const defaultSystemBlock: SystemBlock = {
      stats: systemConfig.statFields.map((f) => ({ key: f.key, value: 10 })),
      hp: 1,
      maxHp: 1,
      armor: 0,
      attacks: [],
      inventory: [],
      abilities: [],
      notes: '',
    }
    const newNPC: NPC = {
      id: newId(),
      realmId: activeRealmId,
      name: '',
      factionId: null,
      regionId: null,
      location: '',
      description: '',
      traits: [],
      motivation: '',
      appearance: '',
      voice: '',
      tags: [],
      systemBlock: defaultSystemBlock,
      isAlive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    setEditingNPC(newNPC)
    setShowCreate(true)
  }

  const handleSaveNPC = async () => {
    if (!editingNPC) return
    const isNew = !npcs.find((n) => n.id === editingNPC.id)
    if (isNew) {
      await executeCreateNPC(editingNPC, { npcRepo: container.npcRepo })
    } else {
      await executeUpdateNPC(editingNPC, { npcRepo: container.npcRepo })
    }
    setEditingNPC(null)
    setShowCreate(false)
  }

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

  if (!systemConfig) {
    return (
      <div>
        <PageHeader title="NPCs" description="Create and manage non-player characters." />
        <EmptyState
          icon={Users}
          title="Loading..."
          description="Loading system configuration."
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
          <div className="flex gap-2">
            <Button onClick={handleGenerateNPC} variant="outline" disabled={isGenerating}>
              <Dices className="mr-2 size-4" />
              {isGenerating ? 'Generating...' : 'Generate NPC'}
            </Button>
            <Button onClick={handleCreateNew}>
              <Plus className="mr-2 size-4" />
              New NPC
            </Button>
          </div>
        }
      />

      {npcs.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No NPCs yet"
          description="Generate or create your first NPC."
          action={
            <Button onClick={handleGenerateNPC} disabled={isGenerating}>
              <Dices className="mr-2 size-4" />
              {isGenerating ? 'Generating...' : 'Generate NPC'}
            </Button>
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
            <Select value={aliveFilter} onValueChange={(v) => setAliveFilter(v as typeof aliveFilter)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All NPCs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All NPCs</SelectItem>
                <SelectItem value="alive">Alive</SelectItem>
                <SelectItem value="dead">Dead</SelectItem>
              </SelectContent>
            </Select>
          </FilterBar>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Faction</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Traits</TableHead>
                <TableHead className="text-center">HP</TableHead>
                <TableHead className="text-center">Armor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredNPCs.map((npc) => {
                const faction = factions.find((f) => f.id === npc.factionId)
                const region = regions.find((r) => r.id === npc.regionId)
                return (
                  <TableRow
                    key={npc.id}
                    className="hover:bg-muted/50"
                  >
                    <TableCell className="font-medium">
                      <Link
                        to="/realms/npcs/$npcId"
                        params={{ npcId: npc.id }}
                        className="text-primary hover:underline"
                      >
                        {npc.name || 'Unnamed NPC'}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {faction ? (
                        <Badge variant="outline">{faction.name}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {region ? (
                        <Badge variant="secondary">{region.name}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {npc.location ? (
                        <span className="text-sm">{npc.location}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
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
                    <TableCell className="text-center">
                      <span className={npc.systemBlock.hp <= 0 ? 'text-red-500 font-semibold' : ''}>
                        {npc.systemBlock.hp}/{npc.systemBlock.maxHp}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">{npc.systemBlock.armor}</TableCell>
                    <TableCell>
                      {npc.isAlive ? (
                        <Badge variant="secondary" className="text-xs">Alive</Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs gap-1">
                          <Skull className="size-3" />Dead
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="size-7" onClick={(e) => { e.stopPropagation(); setEditingNPC(npc) }}>
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="size-7" onClick={(e) => { e.stopPropagation(); setDeleteTarget(npc.id) }}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </>
      )}

      {editingNPC && (
        <NPCEditSheet
          npc={editingNPC}
          systemConfig={systemConfig}
          factions={factions}
          regions={regions}
          open={!!editingNPC}
          onOpenChange={(open) => {
            if (!open) {
              setEditingNPC(null)
              setShowCreate(false)
            }
          }}
          onSave={handleSaveNPC}
          onChange={setEditingNPC}
        />
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

