import { uid } from '../../lib/id'
import { blindLevelCount, blindLevelNumbers, generateLevels, levelAfter } from '../../state/structure'
import type { BlindLevel, BreakLevel, Level, StructureOptions } from '../../state/types'
import { Icon } from '../Icon'
import { NumberField } from '../NumberField'
import { Field } from './Field'

interface Props {
  levels: Level[]
  options: StructureOptions
  smallestChip: number
  startingStack: number
  levelMinutes: number
  /** Highlights past/current rows when editing mid-game */
  currentIndex?: number
  onLevelsChange: (levels: Level[]) => void
  onOptionsChange: (options: StructureOptions) => void
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export function StructureEditor({
  levels,
  options,
  smallestChip,
  startingStack,
  levelMinutes,
  currentIndex,
  onLevelsChange,
  onOptionsChange,
}: Props) {
  const rebuild = (o: StructureOptions) => {
    onOptionsChange(o)
    onLevelsChange(generateLevels(o, smallestChip, startingStack))
  }
  const setOption = (patch: Partial<StructureOptions>) => rebuild({ ...options, ...patch })

  const patchBlinds = (id: string, patch: Partial<BlindLevel>) =>
    onLevelsChange(levels.map((l) => (l.id === id && l.kind === 'blinds' ? { ...l, ...patch } : l)))
  const patchBreak = (id: string, patch: Partial<BreakLevel>) =>
    onLevelsChange(levels.map((l) => (l.id === id && l.kind === 'break' ? { ...l, ...patch } : l)))
  const remove = (id: string) => onLevelsChange(levels.filter((l) => l.id !== id))
  const newBreak = (): BreakLevel => ({ id: uid(), kind: 'break', minutes: options.breakMinutes })
  const insertBreakAfter = (index: number) =>
    onLevelsChange([...levels.slice(0, index + 1), newBreak(), ...levels.slice(index + 1)])
  const addLevel = () => {
    const lastBlinds = levels.findLast((l): l is BlindLevel => l.kind === 'blinds')
    onLevelsChange([...levels, levelAfter(lastBlinds)])
  }

  const blindCount = blindLevelCount(levels)
  const totalMinutes = levels.reduce((sum, l) => sum + (l.kind === 'break' ? l.minutes : levelMinutes), 0)

  const numbers = blindLevelNumbers(levels)
  return (
    <div className="structure">
      <div className="structure__generator">
        <Field label="First small blind">
          <NumberField value={options.startSmall} min={0.01} onChange={(v) => v != null && setOption({ startSmall: v })} />
        </Field>
        <Field label="Pace" as="div">
          <div className="segmented" role="group" aria-label="Pace">
            {(['standard', 'turbo'] as const).map((pace) => (
              <button
                key={pace}
                type="button"
                className={options.pace === pace ? 'is-selected' : ''}
                onClick={() => setOption({ pace })}
              >
                {pace === 'standard' ? 'Standard' : 'Turbo'}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Breaks">
          <select
            className="input"
            value={options.breakEvery}
            onChange={(e) => setOption({ breakEvery: Number(e.target.value) })}
          >
            <option value={0}>No breaks</option>
            {[4, 5, 6, 8].map((n) => (
              <option key={n} value={n}>
                Every {n} levels
              </option>
            ))}
          </select>
        </Field>
        {options.breakEvery > 0 && (
          <Field label="Break length">
            <NumberField
              value={options.breakMinutes}
              min={1}
              suffix="min"
              onChange={(v) => v != null && setOption({ breakMinutes: v })}
            />
          </Field>
        )}
        <Field label="Antes">
          <select
            className="input"
            value={options.antesFrom ?? 0}
            onChange={(e) => setOption({ antesFrom: Number(e.target.value) || null })}
          >
            <option value={0}>No antes</option>
            {[3, 4, 5, 6, 8, 10].map((n) => (
              <option key={n} value={n}>
                Big-blind ante from level {n}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <p className="structure__note">
        Changing these rebuilds the table using your smallest chip ({smallestChip.toLocaleString()}).{' '}
        <button type="button" className="link-btn" onClick={() => rebuild(options)}>
          Rebuild now
        </button>{' '}
        or edit any row by hand.
      </p>

      <div className="structure__table-wrap">
        <table className="structure__table">
          <thead>
            <tr>
              <th scope="col">Lvl</th>
              <th scope="col">Small</th>
              <th scope="col">Big</th>
              <th scope="col">Ante</th>
              <th scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {levels.map((level, i) => {
              const rowState =
                currentIndex == null ? '' : i < currentIndex ? 'is-past' : i === currentIndex ? 'is-current' : ''
              if (level.kind === 'break') {
                return (
                  <tr key={level.id} className={`is-break ${rowState}`}>
                    <td className="structure__no">
                      <Icon name="coffee" />
                    </td>
                    <td colSpan={3}>
                      <span className="structure__break">
                        Break
                        <NumberField
                          value={level.minutes}
                          min={1}
                          suffix="min"
                          aria-label="Break length in minutes"
                          onChange={(v) => v != null && patchBreak(level.id, { minutes: v })}
                        />
                      </span>
                    </td>
                    <td className="structure__row-actions">
                      <button
                        type="button"
                        className="mini-btn mini-btn--danger"
                        onClick={() => remove(level.id)}
                        aria-label="Remove break"
                      >
                        <Icon name="trash" />
                      </button>
                    </td>
                  </tr>
                )
              }
              const n = numbers[i]
              return (
                <tr key={level.id} className={rowState}>
                  <td className="structure__no">{n}</td>
                  <td>
                    <NumberField
                      value={level.small}
                      min={0}
                      aria-label={`Level ${n} small blind`}
                      onChange={(v) => v != null && patchBlinds(level.id, { small: v })}
                    />
                  </td>
                  <td>
                    <NumberField
                      value={level.big}
                      min={0}
                      aria-label={`Level ${n} big blind`}
                      onChange={(v) => v != null && patchBlinds(level.id, { big: v })}
                    />
                  </td>
                  <td>
                    <NumberField
                      value={level.ante}
                      min={0}
                      aria-label={`Level ${n} ante`}
                      onChange={(v) => v != null && patchBlinds(level.id, { ante: v })}
                    />
                  </td>
                  <td className="structure__row-actions">
                    <button
                      type="button"
                      className="mini-btn"
                      onClick={() => insertBreakAfter(i)}
                      title="Add a break after this level"
                      aria-label={`Add a break after level ${n}`}
                    >
                      <Icon name="coffee" />
                    </button>
                    <button
                      type="button"
                      className="mini-btn mini-btn--danger"
                      onClick={() => remove(level.id)}
                      disabled={blindCount <= 1}
                      aria-label={`Remove level ${n}`}
                    >
                      <Icon name="trash" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="structure__actions">
        <button type="button" className="btn btn--small" onClick={addLevel}>
          <Icon name="plus" /> Level
        </button>
        <button type="button" className="btn btn--small" onClick={() => onLevelsChange([...levels, newBreak()])}>
          <Icon name="coffee" /> Break
        </button>
        <span className="structure__summary">
          {blindCount} levels · {formatDuration(totalMinutes)} total
        </span>
      </div>
    </div>
  )
}
