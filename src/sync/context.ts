import { createContext, useContext } from 'react'
import type { Action } from '../state/reducer'
import type { TableId, TableState } from '../state/types'
import type { TableSnapshot } from './connection'

export interface TableStore extends TableSnapshot {
  table: TableId
  dispatch: (action: Action) => void
}

export const TableContext = createContext<TableStore | null>(null)

export function useTableStore(): TableStore {
  const store = useContext(TableContext)
  if (!store) throw new Error('useTableStore must be used inside <TableStoreProvider>')
  return store
}

/** For screens that only render once the table has loaded. */
export function useTable(): TableStore & { state: TableState } {
  const store = useTableStore()
  if (!store.state) throw new Error('Table state is not loaded yet')
  return store as TableStore & { state: TableState }
}
