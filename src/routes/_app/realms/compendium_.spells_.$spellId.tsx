import { createFileRoute, Link } from '@tanstack/react-router'
import { getCompendiumById } from '@domain/data/compendium'
import type { CompendiumSpell } from '@domain/entities/Compendium'
import { PageHeader } from '~/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export const Route = createFileRoute('/_app/realms/compendium_/spells_/$spellId')({
  component: SpellDetailPage,
})

function SpellDetailPage() {
  const { spellId } = Route.useParams()
  const entry = getCompendiumById(spellId)

  if (!entry || entry.kind !== 'spell') {
    return (
      <div className="flex flex-col gap-4">
        <BackLink />
        <div className="py-8 text-center text-muted-foreground">Spell not found.</div>
      </div>
    )
  }

  const spell = entry as CompendiumSpell
  const sd = spell.systemData

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={spell.name}
        actions={<BackLink />}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Details
            <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 text-xs">
              {sd.system}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {sd.system === 'cairn' && (
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 text-xs">
                #{sd.data.number}
              </Badge>
            </div>
          )}

          {sd.system === 'shadowdark' && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 text-xs">
                  Tier {sd.data.tier}
                </Badge>
                {sd.data.classes.map((c) => (
                  <Badge key={c} className="bg-violet-500/15 text-violet-700 dark:text-violet-400 text-xs">
                    {c}
                  </Badge>
                ))}
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <div>
                  <span className="font-semibold">Duration: </span>
                  <span className="text-muted-foreground">{sd.data.duration}</span>
                </div>
                <div>
                  <span className="font-semibold">Range: </span>
                  <span className="text-muted-foreground">{sd.data.range}</span>
                </div>
              </div>
            </div>
          )}

          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{spell.description}</p>
        </CardContent>
      </Card>
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
