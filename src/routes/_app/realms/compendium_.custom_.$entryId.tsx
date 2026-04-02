import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { queryDb, Schema } from '@livestore/livestore'
import { useQuery } from '@livestore/react'
import { useContainer } from '~/ui/hooks/useContainer'
import { executeDeleteCustomCompendiumEntry } from '@application/use-cases/DeleteCustomCompendiumEntry'
import type { CustomCompendiumEntry } from '@domain/entities/CustomCompendiumEntry'
import { PageHeader } from '~/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export const Route = createFileRoute('/_app/realms/compendium_/custom_/$entryId')({
  component: CustomCompendiumDetailPage,
})

function CustomCompendiumDetailPage() {
  const { entryId } = Route.useParams()
  const navigate = useNavigate()
  const container = useContainer()

  const entryResults = useQuery(queryDb({
    query: 'SELECT * FROM customCompendiumEntries WHERE id = $id LIMIT 1',
    schema: Schema.Array(Schema.Unknown),
    bindValues: { id: entryId },
  }, { deps: [entryId] })) as CustomCompendiumEntry[]
  const entry = entryResults[0] ?? null

  if (!entry) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink />
        <div className="py-8 text-center text-muted-foreground">Entry not found.</div>
      </div>
    )
  }

  const handleDelete = async () => {
    await executeDeleteCustomCompendiumEntry(entry.id, container)
    navigate({ to: '/realms/compendium' })
  }

  const kindLabel = entry.kind === 'monster' ? 'Monster' : entry.kind === 'spell' ? 'Spell' : entry.kind === 'equipment' ? 'Equipment' : 'Magic Item'

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={entry.name}
        actions={
          <div className="flex items-center gap-2">
            <Link to="/realms/compendium/custom/$entryId/edit" params={{ entryId: entry.id }}>
              <Button variant="outline" size="sm">
                <Pencil className="mr-2 size-4" />
                Edit
              </Button>
            </Link>
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <Trash2 className="mr-2 size-4" />
              Delete
            </Button>
            <BackLink />
          </div>
        }
      />

      <div className="flex items-center gap-2">
        <Badge className="bg-green-500/15 text-green-700 dark:text-green-400">Custom</Badge>
        <Badge variant="outline">{kindLabel}</Badge>
      </div>

      {entry.description && (
        <Card>
          <CardHeader><CardTitle className="text-base">Description</CardTitle></CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{entry.description}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}

      {entry.kind === 'monster' && entry.monsterData && <MonsterBlock data={entry.monsterData} />}
      {entry.kind === 'spell' && entry.spellData && <SpellBlock data={entry.spellData} />}
      {entry.kind === 'magicItem' && entry.magicItemData && <MagicItemBlock data={entry.magicItemData} />}
      {entry.kind === 'equipment' && entry.equipmentData && <EquipmentBlock data={entry.equipmentData} />}
    </div>
  )
}

function MonsterBlock({ data }: { data: NonNullable<CustomCompendiumEntry['monsterData']> }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Stat Block</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {data.ac != null && <Stat label="AC" value={String(data.ac)} />}
          {data.hp != null && <Stat label="HP" value={String(data.hp)} />}
          {data.speed && <Stat label="Speed" value={data.speed} />}
          {data.cr && <Stat label="CR" value={data.cr} />}
        </div>
        {data.attacks && (
          <div className="text-sm">
            <span className="font-semibold">Attacks: </span>
            <span className="text-muted-foreground">{data.attacks}</span>
          </div>
        )}
        {data.abilities && (
          <div className="prose prose-sm dark:prose-invert max-w-none border-t pt-3">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.abilities}</ReactMarkdown>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SpellBlock({ data }: { data: NonNullable<CustomCompendiumEntry['spellData']> }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Spell Details</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {data.level && <Stat label="Level" value={data.level} />}
          {data.school && <Stat label="School" value={data.school} />}
          {data.castingTime && <Stat label="Casting Time" value={data.castingTime} />}
          {data.range && <Stat label="Range" value={data.range} />}
          {data.duration && <Stat label="Duration" value={data.duration} />}
          {data.components && <Stat label="Components" value={data.components} />}
        </div>
        {data.classes.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {data.classes.map((c) => (
              <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function MagicItemBlock({ data }: { data: NonNullable<CustomCompendiumEntry['magicItemData']> }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Item Details</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {data.rarity && <Stat label="Rarity" value={data.rarity} />}
          {data.itemType && <Stat label="Type" value={data.itemType} />}
          <Stat label="Attunement" value={data.attunement ? 'Yes' : 'No'} />
          {data.charges && <Stat label="Charges" value={data.charges} />}
        </div>
        {data.properties.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {data.properties.map((p) => (
              <Badge key={p} className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-xs">{p}</Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function EquipmentBlock({ data }: { data: NonNullable<CustomCompendiumEntry['equipmentData']> }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Equipment Details</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {data.category && <Stat label="Category" value={data.category} />}
          {data.cost && <Stat label="Cost" value={data.cost} />}
          {data.weight && <Stat label="Weight" value={data.weight} />}
          {data.damage && <Stat label="Damage" value={data.damage} />}
        </div>
        {data.properties.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {data.properties.map((p) => (
              <Badge key={p} className="bg-amber-500/15 text-amber-700 dark:text-amber-400 text-xs">{p}</Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
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
