import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useMemo } from 'react'
import { useNPC } from '~/ui/hooks/useNPCs'
import { useFaction, useFactions } from '~/ui/hooks/useFactions'
import { useRegion, useRegions } from '~/ui/hooks/useRegions'
import { usePOI, useRealmPOIs } from '~/ui/hooks/usePOIs'
import { useActiveRealm } from '~/ui/hooks/useActiveRealm'
import { useSystemConfig } from '~/ui/hooks/useSystemConfigs'
import { useUIStore } from '~/ui/stores/uiStore'
import { useContainer } from '~/ui/hooks/useContainer'
import { executeUpdateNPC } from '@application/use-cases/UpdateNPC'
import { executeDeleteNPC } from '@application/use-cases/DeleteNPC'
import { NPCEditSheet } from '~/components/shared/NPCEditSheet'
import { ConfirmDialog } from '~/components/shared/ConfirmDialog'
import { PageHeader } from '~/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { ArrowLeft, Heart, Shield, Skull, Swords, Package, Sparkles, Handshake, Pencil, MapPin, ImageIcon, ChevronUp, ChevronDown } from 'lucide-react'
import type { NPC } from '@domain/entities/NPC'
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
  const faction = useFaction(npc?.factionId ?? null)
  const region = useRegion(npc?.regionId ?? null)
  const poi = usePOI(npc?.poiId ?? null)
  const factions = useFactions(activeRealmId)
  const regions = useRegions(activeRealmId)
  const pois = useRealmPOIs(activeRealmId)
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
            <img
              src={npc.imageUrl}
              alt={npc.name}
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
                      const def = systemConfig?.statFields.find((f) => f.key === stat.key)
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

        {/* Faction */}
        <FactionBlurb faction={faction} />

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

      {editingNPC && systemConfig && (
        <NPCEditSheet
          npc={editingNPC}
          systemConfig={systemConfig}
          factions={factions}
          regions={regions}
          pois={pois}
          open={!!editingNPC}
          onOpenChange={(open) => { if (!open) setEditingNPC(null) }}
          onSave={handleSaveNPC}
          onChange={setEditingNPC}
          onDelete={() => { setEditingNPC(null); setDeleteConfirmOpen(true) }}
        />
      )}

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

function FactionBlurb({ faction }: { faction: Faction | null | undefined }) {
  if (!faction) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Handshake className="size-4" />
            Faction
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
          Faction
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
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
      </CardContent>
    </Card>
  )
}
