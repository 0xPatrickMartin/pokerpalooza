import { useEffect, useState } from 'react'
import { navigate } from '../../lib/route'
import { tableInfo } from '../../state/tables'
import type { TableId } from '../../state/types'
import { NeonSign } from '../NeonSign'

export function TableLoading({ table }: { table: TableId }) {
  const info = tableInfo(table)
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    const t = window.setTimeout(() => setSlow(true), 4000)
    return () => window.clearTimeout(t)
  }, [])

  return (
    <div className="picker">
      <NeonSign text="Pokerpalooza" suit={info.suit} />
      <p className="picker__tagline" role="status">
        {slow ? `Still trying to reach the ${info.name} table…` : `Pulling up a chair at ${info.name}…`}
      </p>
      {slow && (
        <button type="button" className="btn btn--small btn--ghost" onClick={() => navigate('/')}>
          Back to the tables
        </button>
      )}
    </div>
  )
}
