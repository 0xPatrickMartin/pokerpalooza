import { DEFAULT_TITLE } from '../../state/defaults'
import { PAYOUT_LABELS } from '../../state/selectors'
import type { GameConfig, PayoutPreset } from '../../state/types'
import { NumberField } from '../NumberField'
import { Field } from './Field'

const QUICK_MINUTES = [10, 15, 20, 30]

interface Props {
  config: GameConfig
  onChange: (config: GameConfig) => void
}

export function StakesFields({ config, onChange }: Props) {
  const set = (patch: Partial<GameConfig>) => onChange({ ...config, ...patch })

  return (
    <div className="fields">
      <Field label="Game name" hint="Lit up on the neon sign">
        <input
          className="input"
          value={config.title}
          maxLength={26}
          placeholder={DEFAULT_TITLE}
          onChange={(e) => set({ title: e.target.value })}
        />
      </Field>
      <div className="fields__row">
        <Field label="Buy-in">
          <NumberField value={config.buyIn} min={0} prefix="$" onChange={(v) => v != null && set({ buyIn: v })} />
        </Field>
        <Field label="Starting chips">
          <NumberField
            value={config.startingStack}
            min={1}
            onChange={(v) => v != null && set({ startingStack: v })}
          />
        </Field>
      </div>
      <Field label="Blind level length" as="div">
        <div className="minutes-picker">
          <NumberField
            value={config.levelMinutes}
            min={0.1}
            max={600}
            suffix="min"
            aria-label="Minutes per blind level"
            onChange={(v) => v != null && set({ levelMinutes: v })}
          />
          <div className="segmented" role="group" aria-label="Common level lengths">
            {QUICK_MINUTES.map((m) => (
              <button
                key={m}
                type="button"
                className={config.levelMinutes === m ? 'is-selected' : ''}
                onClick={() => set({ levelMinutes: m })}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </Field>
    </div>
  )
}

export function PayoutField({ config, onChange }: Props) {
  return (
    <Field label="Payouts" hint="Auto: 1 paid up to 4 players, 2 up to 7, 3 up to 12, then 4">
      <select
        className="input"
        value={config.payouts}
        onChange={(e) => onChange({ ...config, payouts: e.target.value as PayoutPreset })}
      >
        {(Object.keys(PAYOUT_LABELS) as PayoutPreset[]).map((key) => (
          <option key={key} value={key}>
            {PAYOUT_LABELS[key]}
          </option>
        ))}
      </select>
    </Field>
  )
}
