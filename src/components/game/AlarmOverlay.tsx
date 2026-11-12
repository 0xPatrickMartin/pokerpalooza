import { useEffect, useState } from 'react'
import { formatChips } from '../../lib/format'
import { blindLevelNumber } from '../../state/structure'
import type { Game } from '../../state/types'
import { Icon } from '../Icon'

const FLASH_MS = 6000

/** Render with `key={game.alarm.seq}` so every expiry starts flashing afresh. */
export function AlarmOverlay({ game, onStart, onDismiss }: { game: Game; onStart: () => void; onDismiss: () => void }) {
  const [flashing, setFlashing] = useState(true)
  const { levels } = game.config
  const { fromIndex, toIndex } = game.alarm
  const to = levels[toIndex]
  const stayed = toIndex === fromIndex
  const levelNo = blindLevelNumber(levels, toIndex)

  useEffect(() => {
    const t = window.setTimeout(() => setFlashing(false), FLASH_MS)
    return () => window.clearTimeout(t)
  }, [])

  let title = 'Blinds up!'
  if (to.kind === 'break') title = 'Break time!'
  else if (stayed) title = 'Time!'
  else if (levels[fromIndex]?.kind === 'break') title = 'Back to it!'

  return (
    <div className={`alarm ${flashing ? 'is-flashing' : ''}`} role="alertdialog" aria-labelledby="alarm-title" onMouseDown={onDismiss}>
      <div className="alarm__card" onMouseDown={(e) => e.stopPropagation()}>
        <div className="alarm__kicker">Time's up</div>
        <h2 id="alarm-title" className="alarm__title">
          {title}
        </h2>
        {to.kind === 'blinds' ? (
          <div className="alarm__blinds">
            <span className="alarm__level">{stayed ? `Still level ${levelNo} — that's the last one` : `Level ${levelNo}`}</span>
            <strong className="alarm__amounts">
              {formatChips(to.small)} / {formatChips(to.big)}
            </strong>
            {to.ante > 0 && <span className="alarm__ante">Ante {formatChips(to.ante)}</span>}
          </div>
        ) : (
          <div className="alarm__blinds">
            <strong className="alarm__amounts">{to.minutes} minutes</strong>
            <span className="alarm__level">Stretch your legs. Color up if you need to.</span>
          </div>
        )}
        <div className="alarm__actions">
          <button type="button" className="btn btn--start btn--xl" onClick={onStart} autoFocus>
            <Icon name="play" />
            {to.kind === 'break' ? 'Start the break' : `Start level ${levelNo}`}
          </button>
          <button type="button" className="btn" onClick={onDismiss}>
            Not yet
          </button>
        </div>
      </div>
    </div>
  )
}
