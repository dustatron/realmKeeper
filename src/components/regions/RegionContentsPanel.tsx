import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import type { POI } from '@domain/entities/POI'
import type { NPC } from '@domain/entities/NPC'
import { Badge } from '~/components/ui/badge'
import { Switch } from '~/components/ui/switch'
import { Label } from '~/components/ui/label'
import { summarizeRegionContents } from './regionContents'
import { poiBreadcrumb } from './poiBreadcrumb'
import { compendiumHref } from '~/components/shared/compendiumHref'
import { DataTable, type DataTableColumn } from '~/components/shared/DataTable'

interface ContentRow {
  key: string
  kind: 'Treasure' | 'Magic' | 'Monster'
  name: string
  compendiumId: string | null
  poiId: string | null
  npcId?: string | null
  guardianNpcId?: string | null
  detail: string
  notable?: boolean
  big?: boolean
  collected?: boolean
}

export function RegionContentsPanel({ pois, npcs }: { pois: POI[]; npcs: NPC[] }) {
  const [showMundane, setShowMundane] = useState(true)

  const c = summarizeRegionContents(pois, npcs)
  if (c.treasures.length === 0 && c.magic.length === 0 && c.monsters.length === 0) return null

  const npcName = Object.fromEntries(npcs.map((n) => [n.id, n.name]))

  const allRows: ContentRow[] = [
    ...c.treasures.map((t, i) => ({
      key: `t-${i}`,
      kind: 'Treasure' as const,
      name: t.name,
      compendiumId: t.compendiumId,
      poiId: t.poiId,
      npcId: t.npcId,
      guardianNpcId: t.guardianNpcId,
      detail: t.value,
      notable: t.notable,
      collected: t.collected,
    })),
    ...c.magic.map((m, i) => ({
      key: `m-${i}`,
      kind: 'Magic' as const,
      name: m.name,
      compendiumId: m.compendiumId,
      poiId: m.poiId,
      npcId: m.npcId,
      detail: '',
      collected: m.collected,
    })),
    ...c.monsters.map((m, i) => ({
      key: `mo-${i}`,
      kind: 'Monster' as const,
      name: m.name,
      compendiumId: m.compendiumId,
      poiId: m.poiId,
      detail: `×${m.count}`,
      big: m.big,
    })),
  ]

  // Notable filter applies to Treasure only; Magic + Monster always shown
  const rows = allRows.filter((r) => {
    if (r.kind !== 'Treasure') return true
    return showMundane || r.notable
  })

  const hasTreasures = c.treasures.length > 0

  const columns: DataTableColumn<ContentRow>[] = [
    {
      key: 'kind',
      header: 'Kind',
      sortable: true,
      sortValue: (r) => r.kind,
      render: (r) => (
        <Badge
          variant={r.kind === 'Monster' ? 'destructive' : r.kind === 'Magic' ? 'secondary' : 'outline'}
          className="text-[10px]"
        >
          {r.kind}
        </Badge>
      ),
    },
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      sortValue: (r) => r.name,
      render: (r) => {
        const href = compendiumHref(r.compendiumId)
        return (
          <span className="flex flex-wrap items-center gap-1 text-xs">
            {href ? (
              <Link
                // compendiumHref returns a validated route+params pair (unit-tested); cast bypasses TanStack's literal-route typing.
                to={href.to as never}
                params={href.params as never}
                className={r.collected ? 'line-through text-primary/50 hover:underline' : 'text-primary hover:underline'}
              >
                {r.name}
              </Link>
            ) : (
              <span className={r.collected ? 'line-through text-muted-foreground' : ''}>
                {r.name}
              </span>
            )}
            {r.collected && (
              <span className="italic text-muted-foreground">looted</span>
            )}
          </span>
        )
      },
    },
    {
      key: 'location',
      header: 'Location',
      sortable: true,
      sortValue: (r) => {
        if (r.poiId) {
          const crumbs = poiBreadcrumb(r.poiId, pois)
          return crumbs.at(-1)?.name ?? ''
        }
        if (r.npcId) return npcName[r.npcId] ?? ''
        return ''
      },
      render: (r) => {
        if (r.poiId) {
          const crumbs = poiBreadcrumb(r.poiId, pois)
          if (crumbs.length === 0) return null
          return (
            <span className="flex flex-wrap items-center gap-0.5 text-xs">
              {crumbs.map((crumb, i) => (
                <span key={crumb.id} className="flex items-center gap-0.5">
                  {i > 0 && <span className="text-muted-foreground"> › </span>}
                  <Link
                    to="/realms/pois/$poiId"
                    params={{ poiId: crumb.id }}
                    className="text-primary hover:underline"
                  >
                    {crumb.name}
                  </Link>
                </span>
              ))}
            </span>
          )
        }
        if (r.npcId && npcName[r.npcId]) {
          return (
            <Link
              to="/realms/npcs/$npcId"
              params={{ npcId: r.npcId }}
              className="text-xs text-primary hover:underline"
            >
              {npcName[r.npcId]}
            </Link>
          )
        }
        return null
      },
    },
    {
      key: 'detail',
      header: 'Detail',
      sortable: true,
      sortValue: (r) => r.detail,
      render: (r) => <span className="text-xs text-muted-foreground">{r.detail}</span>,
    },
    {
      key: 'flags',
      header: 'Flags',
      render: (r) => (
        <span className="flex flex-wrap items-center gap-1">
          {r.notable && (
            <Badge variant="secondary" className="h-4 px-1 text-[10px]">notable</Badge>
          )}
          {r.guardianNpcId && npcName[r.guardianNpcId] && (
            <Link
              to="/realms/npcs/$npcId"
              params={{ npcId: r.guardianNpcId }}
            >
              <Badge variant="outline" className="h-4 cursor-pointer px-1 text-[10px] text-primary hover:underline">
                guardian: {npcName[r.guardianNpcId]}
              </Badge>
            </Link>
          )}
          {r.big && (
            <Badge variant="destructive" className="h-4 px-1 text-[10px]">big</Badge>
          )}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-3 rounded-md border bg-muted/30 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          What's Here
        </span>
        {hasTreasures && (
          <div className="flex items-center gap-2">
            <Switch id="show-mundane" checked={showMundane} onCheckedChange={setShowMundane} />
            <Label htmlFor="show-mundane" className="text-xs text-muted-foreground">Show mundane items</Label>
          </div>
        )}
      </div>
      <DataTable columns={columns} rows={rows} rowKey={(r) => r.key} />
    </div>
  )
}
