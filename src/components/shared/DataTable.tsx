import * as React from 'react'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '~/components/ui/table'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

export interface DataTableColumn<T> {
  key: string
  header: string
  sortable?: boolean
  render: (row: T) => React.ReactNode
  sortValue?: (row: T) => string | number
  className?: string
}

export function sortRows<T>(rows: T[], col: DataTableColumn<T>, dir: 'asc' | 'desc'): T[] {
  if (!col.sortValue) return rows
  const sv = col.sortValue
  const arr = [...rows].sort((a, b) => {
    const av = sv(a), bv = sv(b)
    return av < bv ? -1 : av > bv ? 1 : 0
  })
  return dir === 'desc' ? arr.reverse() : arr
}

export function DataTable<T>({ columns, rows, rowKey, empty }: {
  columns: DataTableColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string
  empty?: React.ReactNode
}) {
  const [sort, setSort] = React.useState<{ key: string; dir: 'asc' | 'desc' } | null>(null)
  const sorted = React.useMemo(() => {
    if (!sort) return rows
    const col = columns.find((c) => c.key === sort.key)
    return col ? sortRows(rows, col, sort.dir) : rows
  }, [rows, sort, columns])

  if (rows.length === 0) {
    return <>{empty ?? <p className="text-sm text-muted-foreground">Nothing here.</p>}</>
  }

  const toggle = (key: string) =>
    setSort((s) => (s?.key === key ? (s.dir === 'asc' ? { key, dir: 'desc' } : null) : { key, dir: 'asc' }))

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((c) => (
            <TableHead key={c.key} className={c.className}>
              {c.sortable ? (
                <button type="button" onClick={() => toggle(c.key)} className="inline-flex items-center gap-1 hover:text-foreground">
                  {c.header}
                  {sort?.key === c.key ? (sort.dir === 'asc' ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />) : <ChevronsUpDown className="size-3 opacity-40" />}
                </button>
              ) : c.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((row) => (
          <TableRow key={rowKey(row)}>
            {columns.map((c) => (
              <TableCell key={c.key} className={c.className}>{c.render(row)}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
