import { useEffect, useState, type CSSProperties } from 'react'
import { formatClock } from '../../lib/format'
import { navigate } from '../../lib/route'
import { DEFAULT_TITLE } from '../../state/defaults'
import { TABLES, type TableSummary } from '../../state/tables'
import { serverNow, syncClock } from '../../sync/clock'
import { NeonSign } from '../NeonSign'

function statusLine(table: TableSummary | undefined, now: number): string {
  if (!table) return '…'
  const { status, timer, levelLabel } = table
  if (status === 'idle' || !timer) return 'Open table'
  if (status === 'running' && timer.endsAt != null) {
    return `${levelLabel} · ${formatClock(Math.max(0, timer.endsAt - now))} left`
  }
  return status === 'paused' ? `${levelLabel} · paused` : `${levelLabel} · waiting to start`
}

export function TablePicker() {
  const [tables, setTables] = useState<TableSummary[] | null>(null)
  const [offline, setOffline] = useState(false)
  const [now, setNow] = useState(serverNow)

  useEffect(() => {
    let stopped = false
    const load = async () => {
      try {
        const res = await fetch('/api/tables', { cache: 'no-store' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as { tables: TableSummary[] }
        if (!stopped) {
          setTables(data.tables)
          setOffline(false)
        }
      } catch {
        if (!stopped) setOffline(true)
      }
    }
    void load()
    void syncClock(2)
    const poll = window.setInterval(load, 5000)
    const tick = window.setInterval(() => setNow(serverNow()), 1000)
    return () => {
      stopped = true
      window.clearInterval(poll)
      window.clearInterval(tick)
    }
  }, [])

  useEffect(() => {
    document.title = 'Pokerpalooza · Pick a table'
  }, [])

  return (
    <div className="picker">
      <NeonSign text="Pokerpalooza" />
      <p className="picker__tagline">Pick your table</p>

      <ul className="picker__grid">
        {TABLES.map((info) => {
          const summary = tables?.find((t) => t.id === info.id)
          const live = summary && summary.status !== 'idle'
          return (
            <li key={info.id}>
              <a
                href={`/${info.id}`}
                className={`table-card ${live ? 'is-live' : ''}`}
                style={{ '--glow': info.glow } as CSSProperties}
                onClick={(e) => {
                  e.preventDefault()
                  navigate(`/${info.id}`)
                }}
              >
                <span className="table-card__suit" aria-hidden="true">
                  {info.suit}
                </span>
                <span className="table-card__name">{info.name}</span>
                {live && summary.title !== DEFAULT_TITLE && <span className="table-card__title">{summary.title}</span>}
                <span className="table-card__status">{statusLine(summary, now)}</span>
                {live && (
                  <span className="table-card__players">
                    {summary.alive} of {summary.entries} players left
                  </span>
                )}
              </a>
            </li>
          )
        })}
      </ul>

      {offline && <p className="notice notice--warn">Can't reach the server right now. Retrying…</p>}
    </div>
  )
}
