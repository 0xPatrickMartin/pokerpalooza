import { formatChips, formatMoney } from '../../lib/format'
import type { GameConfig, RebuyRules } from '../../state/types'
import { NumberField } from '../NumberField'
import { Toggle } from '../Toggle'
import { Field } from './Field'

export function RebuyFields({ config, onChange }: { config: GameConfig; onChange: (c: GameConfig) => void }) {
  const r = config.rebuys
  const set = (patch: Partial<RebuyRules>) => onChange({ ...config, rebuys: { ...r, ...patch } })

  return (
    <div className="fields">
      <Toggle checked={r.enabled} onChange={(enabled) => set({ enabled })} label={r.enabled ? 'Rebuys allowed' : 'No rebuys'} />
      {r.enabled && (
        <div className="fields__row fields__row--wrap">
          <Field label="Rebuy price" hint={r.cost == null ? 'Same as the buy-in' : undefined}>
            <NumberField
              value={r.cost}
              allowEmpty
              min={0}
              prefix="$"
              placeholder={formatMoney(config.buyIn).slice(1)}
              onChange={(cost) => set({ cost })}
            />
          </Field>
          <Field label="Rebuy chips" hint={r.chips == null ? 'Same as starting chips' : undefined}>
            <NumberField
              value={r.chips}
              allowEmpty
              min={1}
              placeholder={formatChips(config.startingStack)}
              onChange={(chips) => set({ chips })}
            />
          </Field>
          <Field label="Max per player" hint="Blank = unlimited">
            <NumberField
              value={r.maxPerPlayer}
              allowEmpty
              integer
              min={1}
              placeholder="∞"
              onChange={(maxPerPlayer) => set({ maxPerPlayer })}
            />
          </Field>
          <Field label="Allowed through level" hint="Blank = the whole game">
            <NumberField
              value={r.untilLevel}
              allowEmpty
              integer
              min={1}
              placeholder="All"
              onChange={(untilLevel) => set({ untilLevel })}
            />
          </Field>
        </div>
      )}
    </div>
  )
}
