import { useEffect, useMemo, useReducer, type ReactNode } from 'react'
import { StoreContext } from './context'
import { defaultState } from './defaults'
import { reducer } from './reducer'
import { setChipsSaveFailed } from './storageStatus'
import type { AppState, Chip, Game, Prefs, SetupDraft } from './types'

const KEYS = {
  game: 'pokerpalooza.game.v1',
  chips: 'pokerpalooza.chips.v1',
  prefs: 'pokerpalooza.prefs.v1',
  setup: 'pokerpalooza.setup.v1',
} as const

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown): boolean {
  try {
    if (value == null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (err) {
    console.warn(`Could not save ${key}`, err)
    return false
  }
}

function isGame(g: Game | null): g is Game {
  return (
    !!g &&
    Array.isArray(g.players) &&
    Array.isArray(g.config?.levels) &&
    g.config.levels.length > 0 &&
    !!g.timer
  )
}

function loadState(): AppState {
  const d = defaultState()
  const game = read<Game>(KEYS.game)
  const chips = read<Chip[]>(KEYS.chips)
  const prefs = read<Partial<Prefs>>(KEYS.prefs)
  const setup = read<SetupDraft>(KEYS.setup)
  return {
    game: isGame(game) ? game : null,
    chips: Array.isArray(chips) ? chips : d.chips,
    prefs: { ...d.prefs, ...prefs },
    setup: setup?.config?.levels?.length
      ? {
          config: {
            ...d.setup.config,
            ...setup.config,
            rebuys: { ...d.setup.config.rebuys, ...setup.config.rebuys },
          },
          structure: { ...d.setup.structure, ...setup.structure },
          playerNames: Array.isArray(setup.playerNames) ? setup.playerNames : [],
        }
      : d.setup,
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState)

  useEffect(() => void write(KEYS.game, state.game), [state.game])
  useEffect(() => setChipsSaveFailed(!write(KEYS.chips, state.chips)), [state.chips])
  useEffect(() => void write(KEYS.prefs, state.prefs), [state.prefs])
  useEffect(() => void write(KEYS.setup, state.setup), [state.setup])

  const store = useMemo(() => ({ state, dispatch }), [state])
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}
