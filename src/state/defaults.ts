import { uid } from '../lib/id'
import { generateLevels } from './structure'
import type { Chip, GameConfig, Prefs, SetupDraft, StructureOptions, TableState } from './types'

export const DEFAULT_TITLE = 'Pokerpalooza'

export const DEFAULT_STRUCTURE: StructureOptions = {
  startSmall: 25,
  pace: 'standard',
  breakEvery: 0,
  breakMinutes: 10,
  antesFrom: null,
}

export function defaultChips(): Chip[] {
  return [
    { id: uid(), value: 25, label: 'Green', color: '#1e8f4e', image: null },
    { id: uid(), value: 100, label: 'Black', color: '#1c1a1a', image: null },
    { id: uid(), value: 500, label: 'Purple', color: '#6a2c9e', image: null },
    { id: uid(), value: 1000, label: 'Yellow', color: '#d9a514', image: null },
    { id: uid(), value: 5000, label: 'Orange', color: '#d8641a', image: null },
  ]
}

export function defaultConfig(): GameConfig {
  return {
    title: DEFAULT_TITLE,
    buyIn: 20,
    startingStack: 10_000,
    levelMinutes: 20,
    rebuys: { enabled: false, cost: null, chips: null, maxPerPlayer: null, untilLevel: 6 },
    levels: generateLevels(DEFAULT_STRUCTURE, 25, 10_000),
    payouts: 'auto',
  }
}

export const DEFAULT_PREFS: Prefs = { alarm: 'airhorn', volume: 0.85, muted: false }

export function defaultSetup(): SetupDraft {
  return { config: defaultConfig(), structure: { ...DEFAULT_STRUCTURE }, playerNames: [] }
}

export function defaultTableState(): TableState {
  return { game: null, chips: defaultChips(), setup: defaultSetup() }
}
