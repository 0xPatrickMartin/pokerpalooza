import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { ChipFace } from '../components/ChipFace'
import { Clock } from '../components/Clock'
import { useTicker } from '../hooks/useTicker'
import { useWakeLock } from '../hooks/useWakeLock'
import { formatChips, formatClock } from '../lib/format'
import { tableInfo } from '../state/tables'
import type { ViewerLevel, ViewerSnapshot } from '../state/viewer'
import { serverNow, syncClock } from '../sync/clock'
import { CodeEntry } from './CodeEntry'

type Phase = 'loading' | 'live' | 'reconnecting' | 'missing' | 'ended'

function levelText(level: ViewerLevel): string {
  if (level.kind === 'break') return `Break · ${level.minutes} min`
  const ante = level.ante > 0 ? ` · ante ${formatChips(level.ante)}` : ''
  return `Level ${level.number} · ${formatChips(level.small)} / ${formatChips(level.big)}${ante}`
}

/** Read-only screen for players: just the clock, the blinds and the chips. */
export function ViewerScreen({ code }: { code: string }) {
  const [snap, setSnap] = useState<ViewerSnapshot | null>(null)
  const [phase, setPhase] = useState<Phase>('loading')
  const [now, setNow] = useState(serverNow)
  const [blindsUp, setBlindsUp] = useState(false)
  const lastAlarmSeq = useRef<number | null>(null)
  const bannerTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    let source: EventSource | null = null
    let retry: number | undefined
    let stopped = false

    const receive = (next: ViewerSnapshot) => {
      // Flash "Blinds up!" when a level runs out while someone is watching.
      if (lastAlarmSeq.current != null && next.alarmSeq > lastAlarmSeq.current) {
        setBlindsUp(true)
        window.clearTimeout(bannerTimer.current)
        bannerTimer.current = window.setTimeout(() => setBlindsUp(false), 6000)
      }
      lastAlarmSeq.current = next.alarmSeq
      setSnap(next)
      setPhase('live')
    }

    const open = async () => {
      window.clearTimeout(retry)
      try {
        const res = await fetch(`/api/view/${code}`, { cache: 'no-store' })
        if (stopped) return
        if (res.status === 404) {
          setPhase((p) => (p === 'loading' || p === 'missing' ? 'missing' : 'ended'))
          return
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
      } catch {
        if (stopped) return
        setPhase((p) => (p === 'loading' ? p : 'reconnecting'))
        retry = window.setTimeout(open, 3000)
        return
      }
      source?.close()
      source = new EventSource(`/api/view/${code}/stream`)
      source.addEventListener('snapshot', (e) => receive(JSON.parse((e as MessageEvent<string>).data)))
      source.addEventListener('ended', () => {
        source?.close()
        setPhase('ended')
      })
      source.onerror = () => {
        if (stopped) return
        setPhase((p) => (p === 'ended' ? p : 'reconnecting'))
        if (source?.readyState === EventSource.CLOSED) retry = window.setTimeout(open, 3000)
      }
    }

    // Phones freeze background tabs; reconnect as soon as the screen is looked at again.
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || stopped) return
      void syncClock(1)
      if (!source || source.readyState === EventSource.CLOSED) void open()
    }

    void syncClock()
    void open()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      stopped = true
      source?.close()
      window.clearTimeout(retry)
      window.clearTimeout(bannerTimer.current)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [code])

  const timer = snap?.timer
  const running = timer?.status === 'running'
  useTicker(running, 250, () => setNow(serverNow()))
  useWakeLock(phase === 'live')

  const remaining = timer ? (running && timer.endsAt != null ? Math.max(0, timer.endsAt - now) : timer.remainingMs) : 0
  useEffect(() => {
    document.title = snap ? `${formatClock(remaining)} · ${snap.title} · Live` : 'Pokerpalooza · Live'
  }, [remaining, snap])

  if (phase === 'missing') return <CodeEntry notice={`No game is running with code ${code}. Check the host's screen.`} />
  if (phase === 'ended') return <CodeEntry notice="That game has wrapped up. Got a new code?" />
  if (!snap || !timer) {
    return (
      <div className="viewer viewer--entry">
        <p className="picker__tagline" role="status">
          {phase === 'reconnecting' ? 'Trying to reach the table…' : 'Finding the game…'}
        </p>
      </div>
    )
  }

  const info = tableInfo(snap.table)
  const { current, next } = snap
  const fraction = Math.min(1, Math.max(0, remaining / snap.durationMs))
  let urgency = ''
  if (running && remaining <= 10_000) urgency = 'is-critical'
  else if (running && remaining <= 60_000) urgency = 'is-warning'

  return (
    <div className={`viewer ${urgency}`}>
      {blindsUp && (
        <div className="viewer__banner" role="alert">
          {current.kind === 'break' ? 'Break time!' : 'Blinds up!'}
        </div>
      )}

      <header className="viewer__head">
        <span className="viewer__suit" style={{ '--glow': info.glow } as CSSProperties} aria-hidden="true">
          {info.suit}
        </span>
        <h1 className="viewer__title">{snap.title}</h1>
      </header>

      <main className="viewer__main">
        <div className="viewer__level">
          {current.kind === 'break' ? 'Break' : `Level ${current.number}`}
          {current.kind === 'blinds' && <small> of {snap.levelCount}</small>}
        </div>

        <Clock ms={remaining} />
        <div className="viewer__status">
          {timer.status === 'paused' ? 'Paused' : timer.status === 'ready' ? 'Waiting for the host to start' : '\u00a0'}
        </div>
        <div className="progress" style={{ '--fraction': fraction } as CSSProperties} aria-hidden="true">
          <div className="progress__fill" />
        </div>

        {current.kind === 'blinds' ? (
          <section className="blinds" aria-label="Current blinds">
            <div className="blinds__label">Blinds</div>
            <div className="blinds__value">
              {formatChips(current.small)}
              <span className="blinds__slash">/</span>
              {formatChips(current.big)}
            </div>
            {current.ante > 0 && <div className="blinds__ante">Ante {formatChips(current.ante)}</div>}
          </section>
        ) : (
          <section className="blinds blinds--break" aria-label="Break">
            <div className="blinds__value">On a break</div>
          </section>
        )}

        <div className="viewer__next">
          {next ? (
            <>
              <span className="timer-panel__next-label">Next up</span> {levelText(next)}
            </>
          ) : (
            'Final level'
          )}
        </div>

        {snap.chips.length > 0 && (
          <ul className="viewer__chips" aria-label="Chip values">
            {snap.chips.map((chip) => (
              <li key={chip.id}>
                <ChipFace chip={chip} />
                <span className="viewer__chip-value">{formatChips(chip.value)}</span>
              </li>
            ))}
          </ul>
        )}
      </main>

      <footer className="viewer__foot">
        Code {snap.code}
        {phase === 'reconnecting' && ' · reconnecting…'}
      </footer>
    </div>
  )
}
