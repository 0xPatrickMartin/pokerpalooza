import { ALARMS, alarms } from '../../audio/alarms'
import type { AlarmId } from '../../state/types'
import { usePrefs } from '../../sync/prefs'
import { Icon } from '../Icon'
import { Toggle } from '../Toggle'

/** Alarm settings for this device only, so the TV can blare while the host's phone stays quiet. */
export function AlarmFields() {
  const [prefs, set] = usePrefs()

  const test = (id: AlarmId) => {
    alarms.unlock()
    alarms.play(id)
  }

  return (
    <div className="fields">
      <div className="alarm-picker" role="radiogroup" aria-label="Alarm sound">
        {ALARMS.map((a) => (
          <div key={a.id} className={`alarm-option ${prefs.alarm === a.id ? 'is-selected' : ''}`}>
            <label className="alarm-option__pick">
              <input
                type="radio"
                name="alarm-sound"
                checked={prefs.alarm === a.id}
                onChange={() => set({ alarm: a.id })}
              />
              <span className="alarm-option__name">{a.name}</span>
              <span className="alarm-option__blurb">{a.blurb}</span>
            </label>
            <button type="button" className="mini-btn" onClick={() => test(a.id)} title="Preview" aria-label={`Preview ${a.name}`}>
              <Icon name="play" />
            </button>
          </div>
        ))}
      </div>
      <div className="alarm-volume">
        <label className="alarm-volume__slider">
          <Icon name={prefs.muted ? 'mute' : 'volume'} />
          <span className="sr-only">Volume</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={prefs.volume}
            onChange={(e) => set({ volume: Number(e.target.value) })}
          />
        </label>
        <Toggle checked={!prefs.muted} onChange={(on) => set({ muted: !on })} label={prefs.muted ? 'Muted' : 'Sound on'} />
        <button type="button" className="btn btn--small btn--ghost" onClick={() => alarms.stop()}>
          Hush
        </button>
      </div>
    </div>
  )
}
