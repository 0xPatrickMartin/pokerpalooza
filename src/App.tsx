import { useEffect } from 'react'
import { alarms } from './audio/alarms'
import { GameScreen } from './components/game/GameScreen'
import { SetupScreen } from './components/setup/SetupScreen'
import { useStore } from './state/context'

export default function App() {
  const { state } = useStore()

  useEffect(() => alarms.setVolume(state.prefs.volume), [state.prefs.volume])

  // Browsers keep audio locked until the first interaction; arm the alarm on any click or key.
  useEffect(() => {
    const unlock = () => alarms.unlock()
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [])

  return state.game ? <GameScreen game={state.game} /> : <SetupScreen />
}
