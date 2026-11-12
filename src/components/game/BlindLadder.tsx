import { useEffect, useRef } from 'react'
import { formatChips, formatElapsed } from '../../lib/format'
import { timeToNextBreak } from '../../state/selectors'
import { blindLevelNumbers } from '../../state/structure'
import type { Game } from '../../state/types'
import { Icon } from '../Icon'

export function BlindLadder({ game, now }: { game: Game; now: number }) {
  const listRef = useRef<HTMLOListElement>(null)
  const { levels, levelMinutes } = game.config
  const hasAntes = levels.some((l) => l.kind === 'blinds' && l.ante > 0)
  const breakIn = timeToNextBreak(game, now)

  useEffect(() => {
    const list = listRef.current
    const row = list?.querySelector<HTMLElement>('.is-current')
    if (!list || !row) return
    // Scroll only the list; scrollIntoView would also scroll the page on small screens.
    list.scrollTo({ top: row.offsetTop - list.clientHeight / 2 + row.clientHeight / 2, behavior: 'smooth' })
  }, [game.levelIndex, levels.length])

  const numbers = blindLevelNumbers(levels)
  return (
    <section className="panel ladder" aria-label="Blind structure">
      <header className="panel__head">
        <h2 className="panel__title">Blinds</h2>
        <span className="panel__sub">{levelMinutes} min levels</span>
      </header>
      <div className="ladder__cols" aria-hidden="true">
        <span>Lvl</span>
        <span>Small / Big</span>
        {hasAntes && <span>Ante</span>}
      </div>
      <ol className={`ladder__list ${hasAntes ? 'has-antes' : ''}`} ref={listRef}>
        {levels.map((level, i) => {
          const state = i < game.levelIndex ? 'is-past' : i === game.levelIndex ? 'is-current' : ''
          if (level.kind === 'break') {
            return (
              <li key={level.id} className={`ladder__row ladder__row--break ${state}`}>
                <span className="ladder__no">
                  <Icon name="coffee" />
                </span>
                <span className="ladder__blinds">Break</span>
                <span className="ladder__ante">{level.minutes}m</span>
              </li>
            )
          }
          return (
            <li key={level.id} className={`ladder__row ${state}`} aria-current={state === 'is-current' ? 'step' : undefined}>
              <span className="ladder__no">{numbers[i]}</span>
              <span className="ladder__blinds">
                {formatChips(level.small)}
                <span className="ladder__slash">/</span>
                {formatChips(level.big)}
              </span>
              {hasAntes && <span className="ladder__ante">{level.ante > 0 ? formatChips(level.ante) : '—'}</span>}
            </li>
          )
        })}
      </ol>
      {breakIn != null && (
        <footer className="panel__foot ladder__foot">
          <Icon name="coffee" /> Break in <strong>{formatElapsed(breakIn)}</strong>
        </footer>
      )}
    </section>
  )
}
