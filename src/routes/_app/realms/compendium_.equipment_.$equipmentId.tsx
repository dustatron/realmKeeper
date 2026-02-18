import { createFileRoute, Link } from '@tanstack/react-router'
import { getCompendiumById } from '@domain/data/compendium'
import type { CompendiumEquipment } from '@domain/entities/Compendium'
import { PageHeader } from '~/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export const Route = createFileRoute('/_app/realms/compendium_/equipment_/$equipmentId')({
  component: EquipmentDetailPage,
})

function EquipmentDetailPage() {
  const { equipmentId } = Route.useParams()
  const entry = getCompendiumById(equipmentId)

  if (!entry || entry.kind !== 'equipment') {
    return (
      <div className="flex flex-col gap-4">
        <BackLink />
        <div className="py-8 text-center text-muted-foreground">Equipment not found.</div>
      </div>
    )
  }

  const item = entry as CompendiumEquipment
  const sd = item.systemData

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={item.name}
        actions={<BackLink />}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Equipment
            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 text-xs">
              {sd.system}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {item.description && (
            <p className="text-sm text-muted-foreground">{item.description}</p>
          )}

          {sd.system === 'cairn' && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <Stat label="Category" value={sd.data.category} />
                <Stat label="Cost" value={`${sd.data.cost} gp`} />
                {sd.data.slots != null && <Stat label="Slots" value={String(sd.data.slots)} />}
                {sd.data.damage && <Stat label="Damage" value={sd.data.damage} />}
                {sd.data.armor != null && <Stat label="Armor" value={String(sd.data.armor)} />}
              </div>
              {sd.data.properties.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {sd.data.properties.map((p) => (
                    <Badge key={p} className="bg-amber-500/15 text-amber-700 dark:text-amber-400 text-xs">{p}</Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {sd.system === 'shadowdark' && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <Stat label="Type" value={sd.data.itemType} />
                <Stat label="Cost" value={`${sd.data.cost.amount} ${sd.data.cost.currency}`} />
                <Stat label="Slots" value={String(sd.data.slot)} />
                {sd.data.damage && <Stat label="Damage" value={sd.data.damage} />}
                {sd.data.attackType && <Stat label="Attack" value={sd.data.attackType} />}
                {sd.data.range && <Stat label="Range" value={sd.data.range} />}
              </div>
              {sd.data.properties.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {sd.data.properties.map((p) => (
                    <Badge key={p} className="bg-amber-500/15 text-amber-700 dark:text-amber-400 text-xs">{p}</Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
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
