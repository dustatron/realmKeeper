import { describe, it, expect } from 'vitest'
import { sortRows, type DataTableColumn } from './DataTable'

type Row = { name: string; n: number }
const rows: Row[] = [{ name: 'b', n: 2 }, { name: 'a', n: 3 }, { name: 'c', n: 1 }]
const col: DataTableColumn<Row> = { key: 'n', header: 'N', render: (r) => r.n, sortValue: (r) => r.n }

describe('sortRows', () => {
  it('sorts asc/desc by sortValue', () => {
    expect(sortRows(rows, col, 'asc').map((r) => r.n)).toEqual([1, 2, 3])
    expect(sortRows(rows, col, 'desc').map((r) => r.n)).toEqual([3, 2, 1])
  })
  it('returns input order when column has no sortValue', () => {
    const noSort: DataTableColumn<Row> = { key: 'name', header: 'Name', render: (r) => r.name }
    expect(sortRows(rows, noSort, 'asc')).toEqual(rows)
  })
})
