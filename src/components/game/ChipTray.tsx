import { formatChips } from '../../lib/format'
import type { Chip } from '../../state/types'
import { ChipFace } from '../ChipFace'
import { Icon } from '../Icon'

export function ChipTray({ chips, startingStack, onEdit }: { chips: Chip[]; startingStack: number; onEdit: () => void }) {
  const sorted = chips.filter((c) => c.value > 0).sort((a, b) => a.value - b.value)

  return (
    <section className="chip-tray" aria-label="Chip values">
      <h2 className="chip-tray__title">Chips</h2>
      {sorted.length > 0 ? (
        <ul className="chip-tray__list">
          {sorted.map((chip) => (
            <li key={chip.id} className="chip-tray__item">
              <ChipFace chip={chip} className="chip-tray__face" />
              <span className="chip-tray__value">{formatChips(chip.value)}</span>
              {chip.label && <span className="chip-tray__label">{chip.label}</span>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="chip-tray__empty">No chips set up yet.</p>
      )}
      <div className="chip-tray__side">
        <div className="chip-tray__stack">
          <span>Starting stack</span>
          <strong>{formatChips(startingStack)}</strong>
        </div>
        <button type="button" className="btn btn--small btn--ghost controls-fade" onClick={onEdit}>
          <Icon name="camera" /> Edit chips
        </button>
      </div>
    </section>
  )
}
