import { createFileRoute, Link } from '@tanstack/react-router'
import { useNPC } from '~/ui/hooks/useNPCs'
import { useFaction } from '~/ui/hooks/useFactions'
import { useRegion } from '~/ui/hooks/useRegions'
import { useActiveRealm } from '~/ui/hooks/useActiveRealm'
import { useSystemConfig } from '~/ui/hooks/useSystemConfigs'
import { PageHeader } from '~/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { ArrowLeft, Heart, Shield, Skull, Swords, Package, Sparkles, Handshake, Pencil, MapPin } from 'lucide-react'
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
  const npc = useNPC(npcId)
  const realm = useActiveRealm()
  const systemConfig = useSystemConfig(realm?.systemId ?? null)
  const faction = useFaction(npc?.factionId ?? null)
  const region = useRegion(npc?.regionId ?? null)

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
            {!npc.isAlive && <Skull className="size-5 text-red-500" />}
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
            <Link to="/realms/npcs">
              <Button size="sm">
                <Pencil className="mr-2 size-4" />
                Edit
              </Button>
            </Link>
          </div>
        }
      />

      <div className="space-y-4">
        {/* Identity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Identity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
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
            {(region || npc.location) && (
              <div className="flex items-start gap-2">
                <span className="text-sm font-medium text-muted-foreground w-24 shrink-0 pt-0.5">
                  <MapPin className="size-3.5 inline mr-1" />Location
                </span>
                <div className="flex flex-wrap gap-1.5 items-center">
                  {region && <Badge variant="secondary">{region.name}</Badge>}
                  {npc.location && <span className="text-sm">{npc.location}</span>}
                </div>
              </div>
            )}
            {npc.motivation && (
              <div className="flex items-start gap-2">
                <span className="text-sm font-medium text-muted-foreground w-24 shrink-0">Motivation</span>
                <span className="text-sm">{npc.motivation}</span>
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
              {npc.isAlive ? (
                <Badge variant="secondary">Alive</Badge>
              ) : (
                <Badge variant="destructive">Dead</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Faction */}
        <FactionBlurb faction={faction} />

        {/* Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Stat values */}
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              {sb.stats.map((stat) => {
                const def = systemConfig?.statFields.find((f) => f.key === stat.key)
                return (
                  <div key={stat.key} className="rounded-md border p-2 text-center">
                    <div className="text-xs font-medium text-muted-foreground uppercase">
                      {def?.label ?? stat.key}
                    </div>
                    <div className="text-xl font-bold">{stat.value}</div>
                    {stat.modifier !== undefined && (
                      <div className="text-xs text-muted-foreground">
                        {stat.modifier >= 0 ? '+' : ''}{stat.modifier}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* HP bar */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <Heart className="size-4 text-red-500" />
                <span className="font-medium">{hpLabel}: {sb.hp}/{sb.maxHp}</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={`h-full transition-all ${
                    hpPercent > 50 ? 'bg-green-500' : hpPercent > 25 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.max(0, Math.min(100, hpPercent))}%` }}
                />
              </div>
            </div>

            {/* Armor */}
            <div className="flex items-center gap-2 text-sm">
              <Shield className="size-4 text-blue-500" />
              <span className="font-medium">{armorLabel}: {sb.armor}</span>
            </div>
          </CardContent>
        </Card>

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
