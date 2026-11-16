import { useState } from 'react'
import { alarms } from '../../audio/alarms'
import { formatChips, formatMoney } from '../../lib/format'
import { uid } from '../../lib/id'
import { navigate } from '../../lib/route'
import { DEFAULT_TITLE } from '../../state/defaults'
import { blindLevelCount } from '../../state/structure'
import { tableInfo } from '../../state/tables'
import type { GameConfig, SetupDraft } from '../../state/types'
import { serverNow } from '../../sync/clock'
import { useTable } from '../../sync/context'
import { markLegacyHandled, readLegacy, type LegacyData } from '../../sync/legacy'
import { ChipFace } from '../ChipFace'
import { ChipManager } from '../chips/ChipManager'
import { ConnectionBadge } from '../ConnectionBadge'
import { Icon } from '../Icon'
import { NeonSign } from '../NeonSign'
import { AlarmFields } from '../settings/AlarmFields'
import { RebuyFields } from '../settings/RebuyFields'
import { PayoutField, StakesFields } from '../settings/StakesFields'
import { StructureEditor } from '../settings/StructureEditor'
import { PlayerNames } from './PlayerNames'

function describeLegacy({ photos, players }: LegacyData): string {
  const parts = []
  if (photos > 0) parts.push(`${photos} chip photo${photos === 1 ? '' : 's'}`)
  if (players > 0) parts.push(`${players} player name${players === 1 ? '' : 's'}`)
  return parts.length > 0 ? parts.join(' and ') : 'your chip values'
}

export function SetupScreen() {
  const { state, dispatch, table, status } = useTable()
  const { setup, chips } = state
  const { config, structure, playerNames } = setup
  const [chipsOpen, setChipsOpen] = useState(false)
  const [legacy, setLegacy] = useState(readLegacy)
  const info = tableInfo(table)

  const importLegacy = (data: LegacyData) => {
    dispatch({ type: 'chips/set', chips: [] })
    // One chip per action keeps each request small; photos add up fast.
    for (const chip of data.chips) dispatch({ type: 'chips/add', chip })
    dispatch({ type: 'setup/update', patch: data.setup })
    markLegacyHandled()
    setLegacy(null)
  }
  const skipLegacy = () => {
    markLegacyHandled()
    setLegacy(null)
  }

  const update = (patch: Partial<SetupDraft>) => dispatch({ type: 'setup/update', patch })
  const setConfig = (next: GameConfig) => update({ config: next })

  const chipValues = chips.map((c) => c.value).filter((v) => v > 0)
  const smallestChip = chipValues.length ? Math.min(...chipValues) : structure.startSmall
  const sortedChips = chips.filter((c) => c.value > 0).sort((a, b) => a.value - b.value)
  const levelCount = blindLevelCount(config.levels)
  const pot = playerNames.length * config.buyIn

  const start = () => {
    alarms.unlock()
    dispatch({
      type: 'game/start',
      config: { ...config, title: config.title.trim() || DEFAULT_TITLE },
      structure,
      players: playerNames.map((name) => ({ id: uid(), name })),
      gameId: uid(),
      code: '',
      now: serverNow(),
    })
  }

  return (
    <div className="setup">
      <header className="setup__header">
        <button type="button" className="btn btn--small btn--ghost setup__back" onClick={() => navigate('/')}>
          <Icon name="swap" /> Tables
        </button>
        <NeonSign text={config.title.trim() || DEFAULT_TITLE} suit={info.suit} />
        <p className="setup__tagline">
          {info.name} table · Texas Hold'em tournament clock
        </p>
      </header>

      {legacy && (
        <div className="panel legacy-offer" role="region" aria-label="Bring over saved chips">
          <p>
            This browser still has {describeLegacy(legacy)} saved from before tables moved online. Bring them to the{' '}
            {info.name} table?
          </p>
          <div className="legacy-offer__actions">
            <button type="button" className="btn btn--small btn--primary" onClick={() => importLegacy(legacy)}>
              Bring them over
            </button>
            <button type="button" className="btn btn--small btn--ghost" onClick={skipLegacy}>
              No thanks
            </button>
          </div>
        </div>
      )}

      <main className="setup__grid">
        <div className="setup__col">
          <section className="panel setup__panel">
            <h2 className="panel__title">The stakes</h2>
            <StakesFields config={config} onChange={setConfig} />
          </section>

          <section className="panel setup__panel">
            <h2 className="panel__title">
              Players <span className="panel__count">{playerNames.length}</span>
            </h2>
            <PlayerNames names={playerNames} onChange={(names) => update({ playerNames: names })} />
          </section>

          <section className="panel setup__panel">
            <h2 className="panel__title">Rebuys</h2>
            <RebuyFields config={config} onChange={setConfig} />
          </section>
        </div>

        <div className="setup__col">
          <section className="panel setup__panel">
            <h2 className="panel__title">Blind structure</h2>
            <StructureEditor
              levels={config.levels}
              options={structure}
              smallestChip={smallestChip}
              startingStack={config.startingStack}
              levelMinutes={config.levelMinutes}
              onLevelsChange={(levels) => setConfig({ ...config, levels })}
              onOptionsChange={(options) => update({ structure: options })}
            />
          </section>

          <section className="panel setup__panel">
            <h2 className="panel__title">Chips</h2>
            <div className="setup__chips">
              <ul className="setup__chip-list">
                {sortedChips.map((chip) => (
                  <li key={chip.id}>
                    <ChipFace chip={chip} />
                    <span>{formatChips(chip.value)}</span>
                  </li>
                ))}
              </ul>
              <button type="button" className="btn" onClick={() => setChipsOpen(true)}>
                <Icon name="camera" /> Photos &amp; values
              </button>
            </div>
          </section>

          <section className="panel setup__panel">
            <h2 className="panel__title">Alarm &amp; payouts</h2>
            <AlarmFields />
            <PayoutField config={config} onChange={setConfig} />
          </section>
        </div>
      </main>

      <footer className="setup__footer">
        <div className="setup__summary">
          <span>
            <strong>{playerNames.length}</strong> player{playerNames.length === 1 ? '' : 's'}
          </span>
          <span>
            <strong>{formatMoney(pot)}</strong> pot
          </span>
          <span>
            <strong>{config.levelMinutes}</strong> min levels
          </span>
          <span>
            <strong>{config.rebuys.enabled ? 'Rebuys' : 'No rebuys'}</strong>
          </span>
        </div>
        <button type="button" className="btn btn--start btn--xl" onClick={start} disabled={levelCount === 0}>
          <Icon name="play" /> Deal 'em in
        </button>
      </footer>

      <ConnectionBadge status={status} />
      {chipsOpen && <ChipManager onClose={() => setChipsOpen(false)} />}
    </div>
  )
}
