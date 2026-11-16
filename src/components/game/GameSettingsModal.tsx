import { useState } from 'react'
import type { Game, GameConfig } from '../../state/types'
import { useTable } from '../../sync/context'
import { Modal } from '../Modal'
import { AlarmFields } from '../settings/AlarmFields'
import { RebuyFields } from '../settings/RebuyFields'
import { PayoutField, StakesFields } from '../settings/StakesFields'
import { StructureEditor } from '../settings/StructureEditor'

const TABS = [
  { id: 'game', label: 'Game' },
  { id: 'blinds', label: 'Blinds' },
  { id: 'rebuys', label: 'Rebuys' },
  { id: 'alarm', label: 'Alarm' },
] as const

type Tab = (typeof TABS)[number]['id']

export function GameSettingsModal({ game, onClose, initialTab = 'game' }: { game: Game; onClose: () => void; initialTab?: Tab }) {
  const { state, dispatch } = useTable()
  const [config, setConfig] = useState<GameConfig>(game.config)
  const [structure, setStructure] = useState(state.setup.structure)
  const [tab, setTab] = useState<Tab>(initialTab)
  const chipValues = state.chips.map((c) => c.value).filter((v) => v > 0)
  const smallestChip = chipValues.length ? Math.min(...chipValues) : structure.startSmall
  const valid = config.levels.some((l) => l.kind === 'blinds')

  const save = () => {
    dispatch({ type: 'game/updateConfig', config })
    dispatch({ type: 'setup/update', patch: { structure } })
    onClose()
  }

  return (
    <Modal
      title="Game settings"
      size="lg"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn--primary" onClick={save} disabled={!valid}>
            Save changes
          </button>
        </>
      }
    >
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`tabs__tab ${tab === t.id ? 'is-selected' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="tabs__panel" role="tabpanel">
        {tab === 'game' && (
          <>
            <StakesFields config={config} onChange={setConfig} />
            <PayoutField config={config} onChange={setConfig} />
            <p className="field__hint">
              A new level length applies from the next level. Use −1:00 / +1:00 to nudge the one that's running.
            </p>
          </>
        )}
        {tab === 'blinds' && (
          <StructureEditor
            levels={config.levels}
            options={structure}
            smallestChip={smallestChip}
            startingStack={config.startingStack}
            levelMinutes={config.levelMinutes}
            currentIndex={game.levelIndex}
            onLevelsChange={(levels) => setConfig({ ...config, levels })}
            onOptionsChange={setStructure}
          />
        )}
        {tab === 'rebuys' && <RebuyFields config={config} onChange={setConfig} />}
        {tab === 'alarm' && (
          <>
            <AlarmFields />
            <p className="field__hint">Sound changes take effect right away.</p>
          </>
        )}
      </div>
    </Modal>
  )
}
