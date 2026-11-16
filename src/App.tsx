import { useEffect } from 'react'
import { alarms } from './audio/alarms'
import { GameScreen } from './components/game/GameScreen'
import { TableLoading } from './components/picker/TableLoading'
import { TablePicker } from './components/picker/TablePicker'
import { SetupScreen } from './components/setup/SetupScreen'
import { usePathname } from './lib/route'
import { isTableId } from './state/tables'
import { useTableStore } from './sync/context'
import { usePrefs } from './sync/prefs'
import { TableStoreProvider } from './sync/TableStore'

function TableScreen() {
  const { state, table } = useTableStore()
  if (!state) return <TableLoading table={table} />
  return state.game ? <GameScreen game={state.game} /> : <SetupScreen />
}

export default function App() {
  const [prefs] = usePrefs()
  const table = usePathname().slice(1).replace(/\/+$/, '').toLowerCase()

  useEffect(() => alarms.setVolume(prefs.volume), [prefs.volume])

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

  if (!isTableId(table)) return <TablePicker />
  return (
    <TableStoreProvider key={table} table={table}>
      <TableScreen />
    </TableStoreProvider>
  )
}
