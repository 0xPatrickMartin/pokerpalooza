import { Icon, type IconName } from '../Icon'
import { Modal } from '../Modal'

export type MenuChoice = 'settings' | 'chips' | 'alarm' | 'help' | 'switch' | 'end'

const ITEMS: { id: MenuChoice; icon: IconName; label: string; detail: string }[] = [
  { id: 'settings', icon: 'sliders', label: 'Game settings', detail: 'Buy-in, level length, blinds, rebuys, payouts' },
  { id: 'chips', icon: 'camera', label: 'Chips', detail: 'Upload chip photos and set their values' },
  { id: 'alarm', icon: 'volume', label: 'Alarm sound', detail: 'Pick your poison for this screen and test it' },
  { id: 'help', icon: 'keyboard', label: 'Keyboard shortcuts', detail: 'Run the clock without the mouse' },
  { id: 'switch', icon: 'swap', label: 'Switch table', detail: 'Back to the tables; this game keeps running' },
  { id: 'end', icon: 'exit', label: 'End game', detail: 'Clear the clock and start fresh' },
]

export function GameMenu({ onChoose, onClose }: { onChoose: (choice: MenuChoice) => void; onClose: () => void }) {
  return (
    <Modal title="Menu" size="sm" onClose={onClose}>
      <div className="menu-list">
        {ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`menu-item ${item.id === 'end' ? 'menu-item--danger' : ''}`}
            onClick={() => onChoose(item.id)}
          >
            <Icon name={item.icon} />
            <span className="menu-item__text">
              <span className="menu-item__label">{item.label}</span>
              <span className="menu-item__detail">{item.detail}</span>
            </span>
          </button>
        ))}
      </div>
    </Modal>
  )
}

export function EndGameModal({ onConfirm, onClose }: { onConfirm: () => void; onClose: () => void }) {
  return (
    <Modal
      title="End this game?"
      size="sm"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} autoFocus>
            Keep playing
          </button>
          <button type="button" className="btn btn--danger" onClick={onConfirm}>
            End game
          </button>
        </>
      }
    >
      <p className="modal__intro">
        The clock, players and pot will be cleared. Your settings, player names and chip photos stay put for next time.
      </p>
    </Modal>
  )
}

const SHORTCUTS: [string, string][] = [
  ['Space', 'Start / pause the clock'],
  ['→', 'Next level'],
  ['←', 'Previous level'],
  ['+', 'Add a minute'],
  ['−', 'Take a minute off'],
  ['M', 'Mute / unmute the alarm'],
  ['F', 'Full screen'],
  ['Esc', 'Dismiss the alarm'],
  ['?', 'This list'],
]

export function ShortcutsModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Keyboard shortcuts" size="sm" onClose={onClose}>
      <dl className="shortcuts">
        {SHORTCUTS.map(([key, action]) => (
          <div key={key} className="shortcuts__row">
            <dt>
              <kbd>{key}</kbd>
            </dt>
            <dd>{action}</dd>
          </div>
        ))}
      </dl>
      <p className="field__hint">The controls fade away after a few seconds of no mouse movement while the clock runs.</p>
    </Modal>
  )
}
