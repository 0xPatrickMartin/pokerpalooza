export interface BlindLevel {
  id: string
  kind: 'blinds'
  small: number
  big: number
  ante: number
}

export interface BreakLevel {
  id: string
  kind: 'break'
  minutes: number
}

export type Level = BlindLevel | BreakLevel

export interface RebuyRules {
  enabled: boolean
  /** null = same as the buy-in */
  cost: number | null
  /** null = same as the starting stack */
  chips: number | null
  /** null = unlimited */
  maxPerPlayer: number | null
  /** Last blind level (1-based) where rebuys are allowed; null = all game */
  untilLevel: number | null
}

export type PayoutPreset = 'auto' | 'wta' | 'top2' | 'top3' | 'top4'

export interface GameConfig {
  title: string
  buyIn: number
  startingStack: number
  levelMinutes: number
  rebuys: RebuyRules
  levels: Level[]
  payouts: PayoutPreset
}

export type Pace = 'standard' | 'turbo'

export interface StructureOptions {
  startSmall: number
  pace: Pace
  /** 0 = no breaks */
  breakEvery: number
  breakMinutes: number
  /** Blind level (1-based) where big-blind antes begin; null = no antes */
  antesFrom: number | null
}

export interface Player {
  id: string
  name: string
  rebuys: number
  /** Timestamp of elimination; null while still in the game */
  bustedAt: number | null
}

export type TimerStatus = 'ready' | 'running' | 'paused'

export interface TimerState {
  status: TimerStatus
  /** Authoritative while not running */
  remainingMs: number
  /** Wall-clock deadline while running */
  endsAt: number | null
}

export interface AlarmState {
  /** Increments every time a level runs out; used to trigger the sound exactly once */
  seq: number
  active: boolean
  fromIndex: number
  toIndex: number
}

export interface Game {
  id: string
  config: GameConfig
  players: Player[]
  levelIndex: number
  timer: TimerState
  alarm: AlarmState
  startedAt: number
  /** Clock time accumulated before the current run */
  playedMs: number
  runStartedAt: number | null
}

export interface Chip {
  id: string
  value: number
  label: string
  color: string
  /** JPEG data URL of the cropped photo */
  image: string | null
}

export type AlarmId = 'airhorn' | 'train' | 'gunfight' | 'klaxon' | 'stampede'

export interface Prefs {
  alarm: AlarmId
  volume: number
  muted: boolean
}

export interface SetupDraft {
  config: GameConfig
  structure: StructureOptions
  playerNames: string[]
}

export interface AppState {
  game: Game | null
  chips: Chip[]
  prefs: Prefs
  setup: SetupDraft
}
