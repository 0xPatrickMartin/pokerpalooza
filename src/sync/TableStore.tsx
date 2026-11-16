import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import type { TableId } from '../state/types'
import { TableConnection } from './connection'
import { TableContext } from './context'

export function TableStoreProvider({ table, children }: { table: TableId; children: ReactNode }) {
  const [connection] = useState(() => new TableConnection(table))

  useEffect(() => {
    connection.start()
    return () => connection.stop()
  }, [connection])

  const snapshot = useSyncExternalStore(connection.subscribe, connection.getSnapshot)
  const store = useMemo(() => ({ ...snapshot, table, dispatch: connection.dispatch }), [snapshot, table, connection])

  return <TableContext.Provider value={store}>{children}</TableContext.Provider>
}
