import type { CSSProperties } from 'react'
import { formatChips, formatClock } from '../../lib/format'
import { remainingMs, winner } from '../../state/selectors'
import { blindLevelNumber, levelDurationMs } from '../../state/structure'
import type { Game, Level } from '../../state/types'
import { Icon } from '../Icon'

interface Props {
  game: Game
  now: number
  onToggle: () => void
  onPrev: () => void
  onNext: () => void
  onReset: () => void
  onAdjust: (deltaMs: number) => void
}

function Clock({ ms }: { ms: number }) {
  const text = formatClock(ms)
  return (
    <div className="clock" role="timer" aria-label={`${text} remaining`}>
      {[...text].map((ch, i) => (
        <span key={i} className={ch === ':' ? 'clock__colon' : 'clock__digit'} aria-hidden="true">
          {ch}
        </span>
      ))}
    </div>
  )
}

function describe(level: Level | undefined, levels: Level[], index: number) {
  if (!level) return null
  if (level.kind === 'break') return <>Break · {level.minutes} min</>
  return (
    <>
      Level {blindLevelNumber(levels, index)} ·{' '}
      <strong>
        {formatChips(level.small)} / {formatChips(level.big)}
      </strong>
      {level.ante > 0 && <> · ante {formatChips(level.ante)}</>}
    </>
  )
}

export function TimerPanel({ game, now, onToggle, onPrev, onNext, onReset, onAdjust }: Props) {
  const { levels } = game.config
  const index = game.levelIndex
  const level = levels[index]
  const status = game.timer.status
  const remaining = remainingMs(game, now)
  const fraction = Math.min(1, Math.max(0, remaining / levelDurationMs(game.config, level)))
  const isLast = index === levels.length - 1
  const champ = winner(game)

  let urgency = ''
  if (status === 'running' && remaining <= 10_000) urgency = 'is-critical'
  else if (status === 'running' && remaining <= 60_000) urgency = 'is-warning'

  return (
    <section className={`timer-panel is-${status} ${urgency}`} aria-label="Level timer">
      <div className="timer-panel__level">
        {level.kind === 'break' ? 'Break time' : `Level ${blindLevelNumber(levels, index)}`}
      </div>

      <div className="timer-panel__clock-wrap">
        <Clock ms={remaining} />
        <div className="timer-panel__status" aria-live="polite">
          {status === 'paused' ? 'Paused' : status === 'ready' ? 'Press start' : '\u00a0'}
        </div>
      </div>

      <div className="progress" style={{ '--fraction': fraction } as CSSProperties} aria-hidden="true">
        <div className="progress__fill" />
      </div>

      {level.kind === 'blinds' ? (
        <div className="blinds">
          <div className="blinds__label">Blinds</div>
          <div className="blinds__value">
            {formatChips(level.small)}
            <span className="blinds__slash">/</span>
            {formatChips(level.big)}
          </div>
          {level.ante > 0 && <div className="blinds__ante">Ante {formatChips(level.ante)}</div>}
        </div>
      ) : (
        <div className="blinds blinds--break">
          <Icon name="coffee" />
          <div className="blinds__value">On a break</div>
        </div>
      )}

      <div className="timer-panel__next">
        {champ ? (
          <span className="timer-panel__winner">
            <Icon name="trophy" /> {champ.name} takes the pot!
          </span>
        ) : isLast ? (
          'Final level'
        ) : (
          <>
            <span className="timer-panel__next-label">Next up</span> {describe(levels[index + 1], levels, index + 1)}
          </>
        )}
      </div>

      <div className="timer-controls controls-fade">
        <button type="button" className="btn btn--icon" onClick={onPrev} disabled={index === 0} title="Previous level (←)" aria-label="Previous level">
          <Icon name="prev" />
        </button>
        <button type="button" className="btn btn--time" onClick={() => onAdjust(-60_000)} title="Take a minute off (−)">
          −1:00
        </button>
        <button
          type="button"
          className={`btn btn--start ${status === 'running' ? 'is-running' : ''}`}
          onClick={onToggle}
          title="Start / pause (space)"
        >
          <Icon name={status === 'running' ? 'pause' : 'play'} />
          {status === 'running' ? 'Pause' : status === 'paused' ? 'Resume' : 'Start'}
        </button>
        <button type="button" className="btn btn--time" onClick={() => onAdjust(60_000)} title="Add a minute (+)">
          +1:00
        </button>
        <button type="button" className="btn btn--icon" onClick={onNext} disabled={isLast} title="Next level (→)" aria-label="Next level">
          <Icon name="next" />
        </button>
        <button type="button" className="btn btn--icon" onClick={onReset} title="Restart this level" aria-label="Restart this level">
          <Icon name="reset" />
        </button>
      </div>
    </section>
  )
}
