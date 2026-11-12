import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { alarms } from '../../audio/alarms'
import { useFullscreen } from '../../hooks/useFullscreen'
import { useIdle } from '../../hooks/useIdle'
import { useTicker } from '../../hooks/useTicker'
import { useWakeLock } from '../../hooks/useWakeLock'
import { formatChips, formatClock, formatElapsed } from '../../lib/format'
import { useStore } from '../../state/context'
import { elapsedMs, remainingMs, totals } from '../../state/selectors'
import { blindLevelCount, blindLevelNumber } from '../../state/structure'
import type { Game } from '../../state/types'
import { ChipManager } from '../chips/ChipManager'
import { Icon } from '../Icon'
import { NeonSign } from '../NeonSign'
import { AlarmOverlay } from './AlarmOverlay'
import { BlindLadder } from './BlindLadder'
import { ChipTray } from './ChipTray'
import { EndGameModal, GameMenu, ShortcutsModal, type MenuChoice } from './GameMenu'
import { GameSettingsModal } from './GameSettingsModal'
import { PlayersPanel } from './PlayersPanel'
import { TimerPanel } from './TimerPanel'

type Dialog = 'menu' | MenuChoice | null

const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && !!el.closest('input, textarea, select, [contenteditable="true"]')

export function GameScreen({ game }: { game: Game }) {
  const { state, dispatch } = useStore()
  const { prefs, chips } = state
  const [now, setNow] = useState(() => Date.now())
  const [dialog, setDialog] = useState<Dialog>(null)
  const fullscreen = useFullscreen()
  const running = game.timer.status === 'running'
  const idle = useIdle(4000, running && dialog == null && !game.alarm.active)

  useWakeLock(true)

  useTicker(running, 250, () => {
    const t = Date.now()
    setNow(t)
    dispatch({ type: 'timer/tick', now: t })
  })

  // Sound the alarm once per expiry. Starting from the stored seq means a page reload won't replay it.
  const alarmSeq = useRef(game.alarm.seq)
  useEffect(() => {
    if (game.alarm.seq > alarmSeq.current && !prefs.muted) alarms.play(prefs.alarm)
    alarmSeq.current = game.alarm.seq
  }, [game.alarm.seq, prefs.alarm, prefs.muted])

  useEffect(() => {
    if (!game.alarm.active) alarms.stop()
  }, [game.alarm.active])

  const remaining = remainingMs(game, now)
  const level = game.config.levels[game.levelIndex]
  const blindsText = level.kind === 'blinds' ? `${formatChips(level.small)}/${formatChips(level.big)}` : 'Break'
  const clockText = formatClock(remaining)
  useEffect(() => {
    document.title = `${clockText} · ${blindsText} — ${game.config.title || 'Pokerpalooza'}`
  }, [clockText, blindsText, game.config.title])
  useEffect(() => () => void (document.title = 'Pokerpalooza'), [])

  // Every clock action carries one timestamp so the display and the state agree on "now".
  const stamp = () => {
    const t = Date.now()
    setNow(t)
    return t
  }
  const toggle = () => {
    alarms.unlock()
    dispatch({ type: running ? 'timer/pause' : 'timer/start', now: stamp() })
  }
  const goto = (index: number) => dispatch({ type: 'level/goto', index, now: stamp() })
  const adjust = (deltaMs: number) => dispatch({ type: 'timer/adjust', deltaMs, now: stamp() })
  const reset = () => dispatch({ type: 'timer/reset', now: stamp() })
  const toggleMute = () => dispatch({ type: 'prefs/set', patch: { muted: !prefs.muted } })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return
      if (document.querySelector('dialog[open]')) return
      // Let a focused button handle its own space/enter.
      if ((e.key === ' ' || e.key === 'Enter') && e.target instanceof HTMLButtonElement) return
      switch (e.key) {
        case ' ':
          e.preventDefault()
          toggle()
          break
        case 'ArrowRight':
          goto(game.levelIndex + 1)
          break
        case 'ArrowLeft':
          goto(game.levelIndex - 1)
          break
        case '+':
        case '=':
          adjust(60_000)
          break
        case '-':
        case '_':
          adjust(-60_000)
          break
        case 'f':
        case 'F':
          fullscreen.toggle()
          break
        case 'm':
        case 'M':
          toggleMute()
          break
        case 'Escape':
          dispatch({ type: 'alarm/dismiss' })
          break
        case '?':
          setDialog('help')
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // Clicking a control shouldn't leave it focused, or the next space bar press would "click" it again.
  const keepFocusOffButtons = (e: MouseEvent) => {
    if (e.target instanceof Element && e.target.closest('.game button')) e.preventDefault()
  }

  const soundLocked = running && !prefs.muted && !alarms.ready
  const levels = game.config.levels
  const t = totals(game)

  return (
    <div className={`game ${idle ? 'is-idle' : ''}`} onMouseDown={keepFocusOffButtons}>
      <header className="game__header">
        <div className="game__stats">
          <div className="stat">
            <span className="stat__label">Level</span>
            <span className="stat__value">
              {blindLevelNumber(levels, game.levelIndex)}
              <small> / {blindLevelCount(levels)}</small>
            </span>
          </div>
          <div className="stat">
            <span className="stat__label">Played</span>
            <span className="stat__value">{formatElapsed(elapsedMs(game, now))}</span>
          </div>
        </div>
        <NeonSign text={game.config.title || 'Pokerpalooza'} />
        <div className="game__right">
          <div className="stat stat--right">
            <span className="stat__label">Avg stack</span>
            <span className="stat__value">{t.alive > 0 ? formatChips(Math.round(t.avgStack)) : '—'}</span>
          </div>
          <div className="game__tools controls-fade">
            <button
              type="button"
              className={`icon-btn ${prefs.muted ? 'is-off' : ''}`}
              onClick={toggleMute}
              title={prefs.muted ? 'Unmute alarm (M)' : 'Mute alarm (M)'}
              aria-label={prefs.muted ? 'Unmute alarm' : 'Mute alarm'}
            >
              <Icon name={prefs.muted ? 'mute' : 'volume'} />
            </button>
            {fullscreen.supported && (
              <button
                type="button"
                className="icon-btn"
                onClick={fullscreen.toggle}
                title="Full screen (F)"
                aria-label={fullscreen.isFullscreen ? 'Exit full screen' : 'Full screen'}
              >
                <Icon name={fullscreen.isFullscreen ? 'shrink' : 'expand'} />
              </button>
            )}
            <button type="button" className="icon-btn" onClick={() => setDialog('menu')} title="Menu" aria-label="Menu">
              <Icon name="menu" />
            </button>
          </div>
        </div>
      </header>

      <BlindLadder game={game} now={now} />
      <TimerPanel
        game={game}
        now={now}
        onToggle={toggle}
        onPrev={() => goto(game.levelIndex - 1)}
        onNext={() => goto(game.levelIndex + 1)}
        onReset={reset}
        onAdjust={adjust}
      />
      <PlayersPanel game={game} />
      <ChipTray chips={chips} startingStack={game.config.startingStack} onEdit={() => setDialog('chips')} />

      {soundLocked && (
        <button type="button" className="sound-banner" onClick={() => alarms.unlock()}>
          <Icon name="mute" /> Tap anywhere to arm the alarm sound
        </button>
      )}

      {game.alarm.active && (
        <AlarmOverlay
          key={game.alarm.seq}
          game={game}
          onStart={() => {
            alarms.unlock()
            dispatch({ type: 'timer/start', now: stamp() })
          }}
          onDismiss={() => dispatch({ type: 'alarm/dismiss' })}
        />
      )}

      {dialog === 'menu' && <GameMenu onChoose={setDialog} onClose={() => setDialog(null)} />}
      {dialog === 'settings' && <GameSettingsModal game={game} onClose={() => setDialog(null)} />}
      {dialog === 'alarm' && <GameSettingsModal game={game} initialTab="alarm" onClose={() => setDialog(null)} />}
      {dialog === 'chips' && <ChipManager onClose={() => setDialog(null)} />}
      {dialog === 'help' && <ShortcutsModal onClose={() => setDialog(null)} />}
      {dialog === 'end' && (
        <EndGameModal
          onClose={() => setDialog(null)}
          onConfirm={() => {
            alarms.stop()
            dispatch({ type: 'game/end' })
          }}
        />
      )}
    </div>
  )
}
