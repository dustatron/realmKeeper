import { createFileRoute, Link } from '@tanstack/react-router'
import { getCompendiumById } from '@domain/data/compendium'
import type { CompendiumMonster } from '@domain/entities/Compendium'
import { PageHeader } from '~/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export const Route = createFileRoute('/_app/realms/compendium_/monsters_/$monsterId')({
  component: MonsterDetailPage,
})

function MonsterDetailPage() {
  const { monsterId } = Route.useParams()
  const entry = getCompendiumById(monsterId)

  if (!entry || entry.kind !== 'monster') {
    return (
      <div className="flex flex-col gap-4">
        <BackLink />
        <div className="py-8 text-center text-muted-foreground">Monster not found.</div>
      </div>
    )
  }

  const monster = entry as CompendiumMonster
  const sd = monster.systemData

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={monster.name}
        actions={<BackLink />}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Stat Block
            <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-400 text-xs">
              {sd.system}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {monster.description && (
            <p className="text-sm text-muted-foreground">{monster.description}</p>
          )}

          {sd.system === 'cairn' && <CairnMonsterBlock data={sd.data} />}
          {sd.system === 'shadowdark' && <ShadowdarkMonsterBlock data={sd.data} />}
        </CardContent>
      </Card>
    </div>
  )
}

function CairnMonsterBlock({ data }: { data: CompendiumMonster['systemData'] extends { system: 'cairn'; data: infer D } ? { data: D } : never extends { data: infer D } ? D : never }) {
  // Type workaround — just access directly
  const d = data as { stats: string; details: string[] }
  return (
    <div className="space-y-3">
      <p className="text-sm font-mono font-medium">{d.stats}</p>
      {d.details.map((html, i) => (
        <div
          key={i}
          className="text-sm prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ))}
    </div>
  )
}

function ShadowdarkMonsterBlock({ data }: { data: CompendiumMonster['systemData'] extends { system: 'shadowdark'; data: infer D } ? { data: D } : never extends { data: infer D } ? D : never }) {
  const d = data as {
    slug: string; armorClass: number; armorType: string | null; hitPoints: number
    attacks: string; movement: string; strength: number; dexterity: number
    constitution: number; intelligence: number; wisdom: number; charisma: number
    alignment: string; level: number; traits: { name: string; description: string }[]
  }

  const abilities = [
    { label: 'STR', value: d.strength },
    { label: 'DEX', value: d.dexterity },
    { label: 'CON', value: d.constitution },
    { label: 'INT', value: d.intelligence },
    { label: 'WIS', value: d.wisdom },
    { label: 'CHA', value: d.charisma },
  ]

  return (
    <div className="space-y-4">
      {/* Core stats */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <Stat label="AC" value={`${d.armorClass}${d.armorType ? ` (${d.armorType})` : ''}`} />
        <Stat label="HP" value={String(d.hitPoints)} />
        <Stat label="MV" value={d.movement} />
        <Stat label="LV" value={String(d.level)} />
        <Stat label="AL" value={d.alignment} />
      </div>

      {/* Attacks */}
      <div className="text-sm">
        <span className="font-semibold">Attacks: </span>
        <span className="text-muted-foreground">{d.attacks}</span>
      </div>

      {/* Ability scores */}
      <div className="grid grid-cols-6 gap-2">
        {abilities.map((a) => (
          <div key={a.label} className="text-center">
            <div className="text-xs font-semibold text-muted-foreground">{a.label}</div>
            <div className="text-sm font-mono font-medium">
              {a.value >= 0 ? `+${a.value}` : a.value}
            </div>
          </div>
        ))}
      </div>

      {/* Traits */}
      {d.traits.length > 0 && (
        <div className="space-y-2 border-t pt-3">
          {d.traits.map((trait) => (
            <div key={trait.name} className="text-sm">
              <span className="font-semibold">{trait.name}. </span>
              <span className="text-muted-foreground">{trait.description}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="font-semibold">{label} </span>
      <span className="text-muted-foreground">{value}</span>
    </div>
  )
}

function BackLink() {
  return (
    <Link to="/realms/compendium">
      <Button variant="ghost" size="sm">
        <ArrowLeft className="mr-2 size-4" />
        Back
      </Button>
    </Link>
  )
}
