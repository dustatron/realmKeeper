import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useUIStore } from '~/ui/stores/uiStore'
import { useTableSets, useTablesInSet, useRollHistory } from '~/ui/hooks/useTableBrowser'
import { useContainer } from '~/ui/hooks/useContainer'
import { executeRollOnTable, type RollOnTableDeps } from '@application/use-cases/RollOnTable'
import { rollDice } from '@shared/dice'
import type { TableDef, TableSet, TableEntry } from '@domain/entities/TableDef'
import type { RollHistory } from '@domain/entities/RollHistory'
import { PageHeader } from '~/components/shared/PageHeader'
import { EmptyState } from '~/components/shared/EmptyState'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Button } from '~/components/ui/button'
import { Badge } from '~/components/ui/badge'
import { ScrollArea } from '~/components/ui/scroll-area'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '~/components/ui/collapsible'
import { TableProperties, Dices, ChevronRight, Clock } from 'lucide-react'

export const Route = createFileRoute('/_app/realms/tables')({
  component: TablesPage,
})

function TablesPage() {
  const activeRealmId = useUIStore((s) => s.activeRealmId)
  const container = useContainer()
  const tableSets = useTableSets()
  const rollHistory = useRollHistory(activeRealmId)

  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)
  const [lastRollResult, setLastRollResult] = useState<{ entry: TableEntry; rolls: number[]; total: number } | null>(null)
  const [rolling, setRolling] = useState(false)

  const handleRoll = async (tableId: string) => {
    setRolling(true)
    setLastRollResult(null)
    try {
      const result = await executeRollOnTable(tableId, activeRealmId ?? undefined, {
        tableRepo: container.tableRepo,
        rollHistoryRepo: container.rollHistoryRepo,
        eventBus: container.eventBus,
        rollDice,
      })
      if (result) {
        setLastRollResult({
          entry: result.entry,
          rolls: result.diceResult.rolls,
          total: result.diceResult.total,
        })
      }
    } finally {
      setRolling(false)
    }
  }

  if (tableSets.length === 0) {
    return (
      <div>
        <PageHeader title="Random Tables" description="Browse and roll on random tables." />
        <EmptyState icon={TableProperties} title="No tables loaded" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Random Tables" description="Browse and roll on random tables." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Table Browser */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Table Sets</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-16rem)]">
              <div className="space-y-2">
                {tableSets.map((set) => (
                  <TableSetItem
                    key={set.id}
                    set={set}
                    selectedTableId={selectedTableId}
                    onSelectTable={setSelectedTableId}
                  />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Selected Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              {selectedTableId ? 'Table Details' : 'Select a Table'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedTableId ? (
              <SelectedTableView
                tableId={selectedTableId}
                onRoll={handleRoll}
                rolling={rolling}
                lastRollResult={lastRollResult}
              />
            ) : (
              <EmptyState
                icon={TableProperties}
                title="No table selected"
                description="Choose a table from the left to view details and roll."
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Roll History */}
      {rollHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="size-4" />
              Recent Rolls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {rollHistory.map((roll) => (
                <RollHistoryItem key={roll.id} roll={roll} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function TableSetItem({
  set,
  selectedTableId,
  onSelectTable,
}: {
  set: TableSet
  selectedTableId: string | null
  onSelectTable: (id: string) => void
}) {
  const tables = useTablesInSet(set.id)
  const [open, setOpen] = useState(false)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-start gap-2">
          <ChevronRight className={`size-4 transition-transform ${open ? 'rotate-90' : ''}`} />
          <span className="flex-1 text-left font-medium">{set.name}</span>
          <Badge variant="outline" className="text-xs">
            {set.source}
          </Badge>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="ml-6 space-y-1 pt-1">
        {tables.map((table) => (
          <Button
            key={table.id}
            variant={selectedTableId === table.id ? 'secondary' : 'ghost'}
            size="sm"
            className="w-full justify-start gap-2"
            onClick={() => onSelectTable(table.id)}
          >
            <span className="flex-1 text-left">{table.name}</span>
            <Badge variant="outline" className="text-xs font-mono">
              {table.diceFormula}
            </Badge>
          </Button>
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}

function SelectedTableView({
  tableId,
  onRoll,
  rolling,
  lastRollResult,
}: {
  tableId: string
  onRoll: (tableId: string) => void
  rolling: boolean
  lastRollResult: { entry: TableEntry; rolls: number[]; total: number } | null
}) {
  const container = useContainer()
  const [table, setTable] = useState<TableDef | null>(null)

  // Load table on mount or when tableId changes
  useEffect(() => {
    container.tableRepo.getTableById(tableId).then((t) => setTable(t ?? null))
  }, [tableId, container.tableRepo])

  if (!table) {
    return <div className="text-muted-foreground">Loading table...</div>
  }

  return (
    <div className="space-y-4">
      {/* Table Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold">{table.name}</h3>
          <Badge variant="outline" className="mt-1 font-mono">
            {table.diceFormula}
          </Badge>
        </div>
        <Button onClick={() => onRoll(tableId)} disabled={rolling} size="lg">
          <Dices className="mr-2 size-4" />
          {rolling ? 'Rolling...' : 'Roll'}
        </Button>
      </div>

      {/* Last Roll Result */}
      {lastRollResult && (
        <Card className="bg-primary/10 border-primary animate-in fade-in duration-500">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <Dices className="size-5 text-primary mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-sm text-muted-foreground">
                    {lastRollResult.rolls.join(' + ')} = {lastRollResult.total}
                  </span>
                </div>
                <p className="text-sm">{lastRollResult.entry.text}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table Entries */}
      <ScrollArea className="h-[calc(100vh-28rem)]">
        <div className="space-y-1">
          {table.entries.map((entry, idx) => {
            const isLastRoll = lastRollResult?.entry === entry
            return (
              <div
                key={idx}
                className={`flex gap-3 p-2 rounded text-sm ${
                  isLastRoll
                    ? 'bg-primary/20 border border-primary'
                    : 'hover:bg-muted/50'
                }`}
              >
                <span className="font-mono text-muted-foreground min-w-[3rem]">
                  {entry.min === entry.max ? entry.min : `${entry.min}-${entry.max}`}
                </span>
                <span className={isLastRoll ? 'font-medium' : ''}>{entry.text}</span>
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}

function RollHistoryItem({ roll }: { roll: RollHistory }) {
  const date = new Date(roll.timestamp)
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="flex items-start gap-3 p-2 rounded hover:bg-muted/50 text-sm">
      <Clock className="size-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-medium truncate">{roll.tableName}</span>
          <span className="font-mono text-xs text-muted-foreground shrink-0">
            {roll.rolls.join(' + ')} = {roll.total}
          </span>
        </div>
        <p className="text-muted-foreground truncate">{roll.result}</p>
      </div>
      <span className="text-xs text-muted-foreground shrink-0">{timeStr}</span>
    </div>
  )
}
