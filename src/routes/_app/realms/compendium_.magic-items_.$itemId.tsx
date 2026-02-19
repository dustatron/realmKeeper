import { createFileRoute, Link } from '@tanstack/react-router'
import { getCompendiumById } from '@domain/data/compendium'
import type { CompendiumMagicItem } from '@domain/entities/Compendium'
import { useActiveRealm } from '~/ui/hooks/useActiveRealm'
import { db } from '@infrastructure/dexie/db'
import { PageHeader } from '~/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { ArrowLeft, Star } from 'lucide-react'

export const Route = createFileRoute('/_app/realms/compendium_/magic-items_/$itemId')({
  component: MagicItemDetailPage,
})

function MagicItemDetailPage() {
  const { itemId } = Route.useParams()
  const entry = getCompendiumById(itemId)

  if (!entry || entry.kind !== 'magicItem') {
    return (
      <div className="flex flex-col gap-4">
        <BackLink />
        <div className="py-8 text-center text-muted-foreground">Magic item not found.</div>
      </div>
    )
  }

  const item = entry as CompendiumMagicItem
  const sd = item.systemData
  const realm = useActiveRealm()
  const starredIds = realm?.starredMagicItemIds ?? []
  const isStarred = starredIds.includes(item.id)

  const handleToggleStar = async () => {
    if (!realm) return
    const updated = isStarred
      ? starredIds.filter((id) => id !== item.id)
      : [...starredIds, item.id]
    await db.worlds.update(realm.id, {
      starredMagicItemIds: updated,
      updatedAt: Date.now(),
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={item.name}
        actions={
          <div className="flex items-center gap-2">
            <BackLink />
            <Button
              size="sm"
              variant="outline"
              onClick={handleToggleStar}
              title={isStarred ? 'Unstar' : 'Star'}
            >
              <Star className={`size-4 ${isStarred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Details
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
              <div className="flex flex-wrap gap-2">
                {sd.data.charges && (
                  <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 text-xs">
                    {sd.data.charges} charges
                  </Badge>
                )}
                {sd.data.recharge && (
                  <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 text-xs">
                    Recharge: {sd.data.recharge}
                  </Badge>
                )}
              </div>
              {sd.data.details.map((html, i) => (
                <div
                  key={i}
                  className="text-sm prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              ))}
            </div>
          )}

          {sd.system === 'shadowdark' && sd.data.traits.length > 0 && (
            <div className="space-y-2 border-t pt-3">
              {sd.data.traits.map((trait) => (
                <div key={trait.name} className="text-sm">
                  <span className="font-semibold">{trait.name}. </span>
                  <span className="text-muted-foreground">{trait.description}</span>
                </div>
              ))}
            </div>
          )}
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
