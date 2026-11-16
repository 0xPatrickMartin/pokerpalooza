import { formatClock } from '../lib/format'

/** The big neon countdown. Each digit gets a fixed-width slot so the numbers don't jiggle as they change. */
export function Clock({ ms, className }: { ms: number; className?: string }) {
  const text = formatClock(ms)
  return (
    <div className={`clock ${className ?? ''}`} role="timer" aria-label={`${text} remaining`}>
      {[...text].map((ch, i) => (
        <span key={i} className={ch === ':' ? 'clock__colon' : 'clock__digit'} aria-hidden="true">
          {ch}
        </span>
      ))}
    </div>
  )
}
